// ==============================================================================
// SERVIÇO DE API DO SISTEMA DE FLASHCARDS (SUPABASE)
// ==============================================================================

import { supabase } from '../../../../services/supabase';
import {
  FlashcardDeck,
  Flashcard,
  CardSchedulingState,
  FlashcardReviewLog,
  FlashcardSettings,
  CardWithState,
  State,
  Rating,
  FlashcardSessionSummary
} from '../../types/flashcards';
import { defaultScheduler } from './scheduler/fsrs';

// Helper leve para obter o usuário da sessão local sem chamadas de rede extras
const getAuthUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
};

export const flashcardsApi = {
  // ----------------------------------------------------------------------------
  // BARALHOS (DECKS)
  // ----------------------------------------------------------------------------
  decks: {
    list: async (): Promise<FlashcardDeck[]> => {
      const user = await getAuthUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('flashcard_decks')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao listar baralhos:', error);
        return [];
      }

      const decks: FlashcardDeck[] = data || [];

      // Carregar contadores rápidos de cartões por baralho
      try {
        const { data: cardsCount } = await supabase
          .from('flashcard_cards')
          .select('deck_id, id, is_suspended, is_deleted')
          .eq('user_id', user.id)
          .eq('is_deleted', false);

        const { data: states } = await supabase
          .from('flashcard_scheduling_state')
          .select('card_id, state, due_at')
          .eq('user_id', user.id);

        const now = new Date();
        const dueCardsSet = new Set(
          (states || [])
            .filter(s => new Date(s.due_at) <= now || s.state === State.New)
            .map(s => s.card_id)
        );

        const newCardsSet = new Set(
          (states || []).filter(s => s.state === State.New).map(s => s.card_id)
        );

        const countMap: Record<string, { total: number; due: number; new: number }> = {};
        (cardsCount || []).forEach(c => {
          if (!countMap[c.deck_id]) {
            countMap[c.deck_id] = { total: 0, due: 0, new: 0 };
          }
          if (!c.is_suspended) {
            countMap[c.deck_id].total += 1;
            if (dueCardsSet.has(c.id)) countMap[c.deck_id].due += 1;
            if (newCardsSet.has(c.id)) countMap[c.deck_id].new += 1;
          }
        });

        decks.forEach(d => {
          d.card_count = countMap[d.id]?.total || 0;
          d.due_count = countMap[d.id]?.due || 0;
          d.new_count = countMap[d.id]?.new || 0;
        });
      } catch (e) {
        console.warn('Não foi possível computar contadores detalhados de baralhos:', e);
      }

      return decks;
    },

    create: async (deck: Partial<FlashcardDeck>): Promise<FlashcardDeck | null> => {
      const user = await getAuthUser();
      if (!user) return null;

      const payload = {
        name: deck.name?.trim() || 'Novo Baralho',
        description: deck.description || null,
        color: deck.color || '#6366f1',
        parent_id: deck.parent_id || null,
        concurso_id: deck.concurso_id || null,
        subject_id: deck.subject_id || null,
        topic_id: deck.topic_id || null,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('flashcard_decks')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar baralho:', error);
        throw error;
      }
      return data;
    },

    update: async (id: string, updates: Partial<FlashcardDeck>): Promise<FlashcardDeck | null> => {
      const user = await getAuthUser();
      if (!user) return null;

      const payload = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('flashcard_decks')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar baralho:', error);
        throw error;
      }
      return data;
    },

    delete: async (id: string): Promise<boolean> => {
      const user = await getAuthUser();
      if (!user) return false;

      const { error } = await supabase
        .from('flashcard_decks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao deletar baralho:', error);
        throw error;
      }
      return true;
    }
  },

  // ----------------------------------------------------------------------------
  // CARTÕES (CARDS)
  // ----------------------------------------------------------------------------
  cards: {
    list: async (options?: {
      deckId?: string;
      subjectId?: string;
      topicId?: string;
      search?: string;
      tag?: string;
      isSuspended?: boolean;
    }): Promise<CardWithState[]> => {
      const user = await getAuthUser();
      if (!user) return [];

      let query = supabase
        .from('flashcard_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false);

      if (options?.deckId) query = query.eq('deck_id', options.deckId);
      if (options?.subjectId) query = query.eq('subject_id', options.subjectId);
      if (options?.topicId) query = query.eq('topic_id', options.topicId);
      if (options?.isSuspended !== undefined) query = query.eq('is_suspended', options.isSuspended);

      const { data: cards, error } = await query.order('created_at', { ascending: false });

      if (error || !cards) {
        console.error('Erro ao listar cartões:', error);
        return [];
      }

      const cardIds = cards.map(c => c.id);
      if (cardIds.length === 0) return [];

      const { data: states } = await supabase
        .from('flashcard_scheduling_state')
        .select('*')
        .in('card_id', cardIds)
        .eq('user_id', user.id);

      const stateMap = new Map<string, CardSchedulingState>();
      (states || []).forEach(s => stateMap.set(s.card_id, s));

      let result: CardWithState[] = cards.map(card => ({
        card,
        scheduling: stateMap.get(card.id) || defaultScheduler.getInitialSchedulingState(card.id, user.id)
      }));

      // Filtro em memória para busca textual e tags
      if (options?.search?.trim()) {
        const s = options.search.toLowerCase();
        result = result.filter(item =>
          item.card.front.toLowerCase().includes(s) ||
          item.card.back.toLowerCase().includes(s) ||
          (item.card.cloze_text && item.card.cloze_text.toLowerCase().includes(s)) ||
          item.card.tags.some(t => t.toLowerCase().includes(s))
        );
      }

      if (options?.tag?.trim()) {
        const targetTag = options.tag.toLowerCase();
        result = result.filter(item =>
          item.card.tags.some(t => t.toLowerCase() === targetTag)
        );
      }

      return result;
    },

    create: async (card: Partial<Flashcard>): Promise<CardWithState[]> => {
      const user = await getAuthUser();
      if (!user) return [];

      const results: CardWithState[] = [];

      // Caso seja Básico Invertido, cria dois cartões: A -> B e B -> A
      const isReversed = card.card_type === 'reversed';
      const cardsToCreate = isReversed ? [
        { ...card, card_type: 'basic' as const, front: card.front || '', back: card.back || '' },
        { ...card, card_type: 'basic' as const, front: card.back || '', back: card.front || '' }
      ] : [card];

      for (const item of cardsToCreate) {
        const cardPayload = {
          deck_id: item.deck_id,
          user_id: user.id,
          card_type: item.card_type || 'basic',
          front: item.front?.trim() || '',
          back: item.back?.trim() || '',
          cloze_text: item.cloze_text?.trim() || null,
          tags: item.tags || [],
          concurso_id: item.concurso_id || null,
          subject_id: item.subject_id || null,
          topic_id: item.topic_id || null,
          source_type: item.source_type || 'manual',
          source_id: item.source_id || null,
          is_suspended: false,
          is_deleted: false,
        };

        const { data: newCard, error: cardErr } = await supabase
          .from('flashcard_cards')
          .insert(cardPayload)
          .select()
          .single();

        if (cardErr || !newCard) {
          console.error('Erro ao criar cartão:', cardErr);
          throw cardErr;
        }

        // Criar estado inicial do FSRS
        const initialSched = defaultScheduler.getInitialSchedulingState(newCard.id, user.id);
        const { data: newSched, error: schedErr } = await supabase
          .from('flashcard_scheduling_state')
          .insert(initialSched)
          .select()
          .single();

        if (schedErr) {
          console.error('Erro ao inicializar agendador FSRS:', schedErr);
        }

        results.push({
          card: newCard,
          scheduling: newSched || initialSched
        });
      }

      return results;
    },

    update: async (id: string, updates: Partial<Flashcard>): Promise<Flashcard | null> => {
      const user = await getAuthUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('flashcard_cards')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar cartão:', error);
        throw error;
      }
      return data;
    },

    toggleSuspend: async (id: string, isSuspended: boolean): Promise<boolean> => {
      const user = await getAuthUser();
      if (!user) return false;

      const { error } = await supabase
        .from('flashcard_cards')
        .update({ is_suspended: isSuspended, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      return !error;
    },

    delete: async (id: string, soft: boolean = true): Promise<boolean> => {
      const user = await getAuthUser();
      if (!user) return false;

      if (soft) {
        const { error } = await supabase
          .from('flashcard_cards')
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id);
        return !error;
      } else {
        const { error } = await supabase
          .from('flashcard_cards')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        return !error;
      }
    }
  },

  // ----------------------------------------------------------------------------
  // FILA INTELIGENTE DE REVISÃO (STUDY QUEUE)
  // ----------------------------------------------------------------------------
  queue: {
    getStudyQueue: async (options?: {
      deckId?: string;
      subjectId?: string;
      topicId?: string;
    }): Promise<{
      dueCards: CardWithState[];
      counts: { overdue: number; learning: number; review: number; newCards: number; total: number };
    }> => {
      const user = await getAuthUser();
      if (!user) {
        return {
          dueCards: [],
          counts: { overdue: 0, learning: 0, review: 0, newCards: 0, total: 0 }
        };
      }

      // 1. Obter cartões não suspensos e não deletados
      let query = supabase
        .from('flashcard_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .eq('is_suspended', false);

      if (options?.deckId) query = query.eq('deck_id', options.deckId);
      if (options?.subjectId) query = query.eq('subject_id', options.subjectId);
      if (options?.topicId) query = query.eq('topic_id', options.topicId);

      const { data: cards } = await query;
      if (!cards || cards.length === 0) {
        return {
          dueCards: [],
          counts: { overdue: 0, learning: 0, review: 0, newCards: 0, total: 0 }
        };
      }

      const cardIds = cards.map(c => c.id);
      const { data: states } = await supabase
        .from('flashcard_scheduling_state')
        .select('*')
        .in('card_id', cardIds)
        .eq('user_id', user.id);

      const stateMap = new Map<string, CardSchedulingState>();
      (states || []).forEach(s => stateMap.set(s.card_id, s));

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      // Obter preferências de limites
      const settings = await flashcardsApi.settings.get();
      const maxNew = settings?.new_cards_per_day ?? 20;
      const maxReviews = settings?.max_reviews_per_day ?? 200;

      const overdueCards: CardWithState[] = [];
      const learningCards: CardWithState[] = [];
      const reviewDueCards: CardWithState[] = [];
      const newCards: CardWithState[] = [];

      cards.forEach(card => {
        const sched = stateMap.get(card.id) || defaultScheduler.getInitialSchedulingState(card.id, user.id);
        const item: CardWithState = { card, scheduling: sched };
        const dueDate = new Date(sched.due_at);

        if (sched.state === State.New) {
          newCards.push(item);
        } else if (sched.state === State.Learning || sched.state === State.Relearning) {
          if (dueDate <= now) {
            learningCards.push(item);
          }
        } else if (sched.state === State.Review) {
          if (dueDate < startOfToday) {
            overdueCards.push(item);
          } else if (dueDate <= endOfToday) {
            reviewDueCards.push(item);
          }
        }
      });

      // Ordenar por prioridade Anki/FSRS:
      // 1. Atrasados (mais antigos primeiro)
      overdueCards.sort((a, b) => new Date(a.scheduling.due_at).getTime() - new Date(b.scheduling.due_at).getTime());
      // 2. Aprendendo
      learningCards.sort((a, b) => new Date(a.scheduling.due_at).getTime() - new Date(b.scheduling.due_at).getTime());
      // 3. Revisões de hoje
      reviewDueCards.sort((a, b) => new Date(a.scheduling.due_at).getTime() - new Date(b.scheduling.due_at).getTime());
      // 4. Novos (respeitando limite de novos por dia)
      const limitedNewCards = newCards.slice(0, maxNew);

      // Montar a fila respeitando o limite diário de revisões
      const allDueReviews = [...overdueCards, ...learningCards, ...reviewDueCards].slice(0, maxReviews);
      const finalQueue = [...allDueReviews, ...limitedNewCards];

      return {
        dueCards: finalQueue,
        counts: {
          overdue: overdueCards.length,
          learning: learningCards.length,
          review: reviewDueCards.length,
          newCards: limitedNewCards.length,
          total: finalQueue.length
        }
      };
    }
  },

  // ----------------------------------------------------------------------------
  // RESPOSTA DE REVISÃO (COM HISTÓRICO IMUTÁVEL)
  // ----------------------------------------------------------------------------
  answerCard: async (
    cardId: string,
    rating: Rating,
    responseTimeMs: number = 0
  ): Promise<CardSchedulingState | null> => {
    const user = await getAuthUser();
    if (!user) return null;

    // 1. Obter estado atual de agendamento
    const { data: currentSched, error: schedError } = await supabase
      .from('flashcard_scheduling_state')
      .select('*')
      .eq('card_id', cardId)
      .eq('user_id', user.id)
      .single();

    const currentState: CardSchedulingState = currentSched || defaultScheduler.getInitialSchedulingState(cardId, user.id);

    // 2. Obter configurações de retenção alvo
    const settings = await flashcardsApi.settings.get();
    const desiredRetention = settings?.request_retention ?? 0.9;

    // 3. Executar o scheduler FSRS
    const { nextScheduling, logData } = defaultScheduler.answerCard(
      currentState,
      rating,
      responseTimeMs,
      new Date(),
      desiredRetention
    );

    // 4. Inserir o Event Log IMUTÁVEL (NUNCA sobrescreve histórico)
    const { error: logErr } = await supabase
      .from('flashcard_review_logs')
      .insert(logData);

    if (logErr) {
      console.error('Erro ao gravar log imutável de revisão:', logErr);
    }

    // 5. Atualizar o Scheduling State atual
    const { data: updatedSched, error: updateErr } = await supabase
      .from('flashcard_scheduling_state')
      .upsert(nextScheduling, { onConflict: 'card_id' })
      .select()
      .single();

    if (updateErr) {
      console.error('Erro ao atualizar estado de agendamento:', updateErr);
      throw updateErr;
    }

    return updatedSched;
  },

  // ----------------------------------------------------------------------------
  // CONFIGURAÇÕES (SETTINGS)
  // ----------------------------------------------------------------------------
  settings: {
    get: async (): Promise<FlashcardSettings | null> => {
      const user = await getAuthUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('flashcard_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) {
        return {
          new_cards_per_day: 20,
          max_reviews_per_day: 200,
          request_retention: 0.9,
          show_next_review_time: true,
          enable_keyboard_shortcuts: true,
        };
      }
      return data;
    },

    update: async (updates: Partial<FlashcardSettings>): Promise<FlashcardSettings | null> => {
      const user = await getAuthUser();
      if (!user) return null;

      const payload = {
        ...updates,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('flashcard_settings')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        console.error('Erro ao salvar configurações de flashcards:', error);
        throw error;
      }
      return data;
    }
  },

  // ----------------------------------------------------------------------------
  // ESTATÍSTICAS E HEATMAP
  // ----------------------------------------------------------------------------
  stats: {
    getSummary: async (): Promise<{
      reviewedToday: number;
      streak: number;
      retentionRate: number;
      totalCards: number;
      newCount: number;
      learningCount: number;
      reviewCount: number;
      suspendedCount: number;
      recentLogs: FlashcardReviewLog[];
    }> => {
      const user = await getAuthUser();
      if (!user) {
        return {
          reviewedToday: 0,
          streak: 0,
          retentionRate: 0,
          totalCards: 0,
          newCount: 0,
          learningCount: 0,
          reviewCount: 0,
          suspendedCount: 0,
          recentLogs: []
        };
      }

      const now = new Date();
      const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      // Logs de hoje
      const { data: todayLogs } = await supabase
        .from('flashcard_review_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('reviewed_at', todayIso);

      // Cartões e estados para contagens
      const { data: cards } = await supabase
        .from('flashcard_cards')
        .select('id, is_suspended')
        .eq('user_id', user.id)
        .eq('is_deleted', false);

      const { data: states } = await supabase
        .from('flashcard_scheduling_state')
        .select('card_id, state')
        .eq('user_id', user.id);

      const stateMap = new Map<string, State>();
      (states || []).forEach(s => stateMap.set(s.card_id, s.state));

      let newCount = 0;
      let learningCount = 0;
      let reviewCount = 0;
      let suspendedCount = 0;

      (cards || []).forEach(c => {
        if (c.is_suspended) {
          suspendedCount++;
        } else {
          const st = stateMap.get(c.id) ?? State.New;
          if (st === State.New) newCount++;
          else if (st === State.Learning || st === State.Relearning) learningCount++;
          else if (st === State.Review) reviewCount++;
        }
      });

      // Cálculo de retenção recente (últimos 30 dias)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: monthLogs } = await supabase
        .from('flashcard_review_logs')
        .select('rating, reviewed_at')
        .eq('user_id', user.id)
        .gte('reviewed_at', thirtyDaysAgo);

      const totalMonthReviews = monthLogs?.length || 0;
      const successMonthReviews = (monthLogs || []).filter(l => l.rating > 1).length;
      const retentionRate = totalMonthReviews > 0 ? Math.round((successMonthReviews / totalMonthReviews) * 100) : 100;

      // Cálculo de Streak
      const { data: allDatesLogs } = await supabase
        .from('flashcard_review_logs')
        .select('reviewed_at')
        .eq('user_id', user.id)
        .order('reviewed_at', { ascending: false });

      const distinctDays = new Set(
        (allDatesLogs || []).map(l => l.reviewed_at.split('T')[0])
      );

      let streak = 0;
      const checkDate = new Date();
      // Se não estudou hoje ainda, permite verificar se a sequência continua de ontem
      const todayStr = checkDate.toISOString().split('T')[0];
      if (!distinctDays.has(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      while (distinctDays.has(checkDate.toISOString().split('T')[0])) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      return {
        reviewedToday: todayLogs?.length || 0,
        streak,
        retentionRate,
        totalCards: cards?.length || 0,
        newCount,
        learningCount,
        reviewCount,
        suspendedCount,
        recentLogs: todayLogs || []
      };
    },

    getForecast: async (days: number = 30): Promise<{ date: string; count: number }[]> => {
      const user = await getAuthUser();
      if (!user) return [];

      const { data: states } = await supabase
        .from('flashcard_scheduling_state')
        .select('due_at')
        .eq('user_id', user.id)
        .neq('state', State.New);

      const map: Record<string, number> = {};
      const now = new Date();

      for (let i = 0; i <= days; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        map[d.toISOString().split('T')[0]] = 0;
      }

      (states || []).forEach(s => {
        const day = s.due_at.split('T')[0];
        if (map[day] !== undefined) {
          map[day] += 1;
        }
      });

      return Object.entries(map).map(([date, count]) => ({ date, count }));
    },

    getHeatmapData: async (): Promise<Record<string, number>> => {
      const user = await getAuthUser();
      if (!user) return {};

      // Últimos 365 dias
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data: logs } = await supabase
        .from('flashcard_review_logs')
        .select('reviewed_at')
        .eq('user_id', user.id)
        .gte('reviewed_at', oneYearAgo.toISOString());

      const heatmap: Record<string, number> = {};
      (logs || []).forEach(l => {
        const day = l.reviewed_at.split('T')[0];
        heatmap[day] = (heatmap[day] || 0) + 1;
      });

      return heatmap;
    }
  }
};
