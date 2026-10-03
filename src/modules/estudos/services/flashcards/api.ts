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

// Helper para normalizar e restaurar deck_ids e subject_ids (tanto de colunas nativas quanto do source_id JSON)
export const hydrateCardMeta = (c: any): Flashcard => {
  if (!c) return c;

  let deckIds: string[] = Array.isArray(c.deck_ids) && c.deck_ids.length > 0 ? [...c.deck_ids] : [];
  let subjectIds: string[] = Array.isArray(c.subject_ids) && c.subject_ids.length > 0 ? [...c.subject_ids] : [];

  if (typeof c.source_id === 'string' && c.source_id.startsWith('{')) {
    try {
      const parsed = JSON.parse(c.source_id);
      if (deckIds.length === 0 && Array.isArray(parsed.deck_ids)) {
        deckIds = parsed.deck_ids;
      }
      if (subjectIds.length === 0 && Array.isArray(parsed.subject_ids)) {
        subjectIds = parsed.subject_ids;
      }
    } catch {
      // Ignora se não for JSON válido
    }
  }

  if (c.deck_id && !deckIds.includes(c.deck_id)) {
    deckIds.unshift(c.deck_id);
  }
  if (c.subject_id && !subjectIds.includes(c.subject_id)) {
    subjectIds.unshift(c.subject_id);
  }

  return {
    ...c,
    deck_ids: deckIds,
    subject_ids: subjectIds
  };
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
        let cardsCount: any[] | null = null;
        const resWithDeckIds = await supabase
          .from('flashcard_cards')
          .select('deck_id, deck_ids, id, is_suspended, is_deleted, source_id')
          .eq('user_id', user.id)
          .eq('is_deleted', false);

        if (resWithDeckIds.error) {
          const resFallback = await supabase
            .from('flashcard_cards')
            .select('deck_id, id, is_suspended, is_deleted, source_id')
            .eq('user_id', user.id)
            .eq('is_deleted', false);
          cardsCount = (resFallback.data || []).map(hydrateCardMeta);
        } else {
          cardsCount = (resWithDeckIds.data || []).map(hydrateCardMeta);
        }

        const { data: states } = await supabase
          .from('flashcard_scheduling_state')
          .select('card_id, state, due_at')
          .eq('user_id', user.id);

        const now = new Date();
        const stateMap = new Map((states || []).map(s => [s.card_id, s]));

        const countMap: Record<string, { total: number; new: number; learning: number; review: number }> = {};
        decks.forEach(d => {
          countMap[d.id] = { total: 0, new: 0, learning: 0, review: 0 };
        });

        (cardsCount || []).forEach(c => {
          const linkedDecks = new Set<string>();
          if (c.deck_id) linkedDecks.add(c.deck_id);
          if (Array.isArray(c.deck_ids)) {
            c.deck_ids.forEach((id: string) => { if (id) linkedDecks.add(id); });
          }

          linkedDecks.forEach(dId => {
            if (!countMap[dId]) {
              countMap[dId] = { total: 0, new: 0, learning: 0, review: 0 };
            }
            if (!c.is_suspended) {
              countMap[dId].total += 1;
              const st = stateMap.get(c.id);
              if (!st || st.state === State.New) {
                countMap[dId].new += 1;
              } else if (st.state === State.Learning || st.state === State.Relearning) {
                if (new Date(st.due_at) <= now) {
                  countMap[dId].learning += 1;
                }
              } else if (st.state === State.Review) {
                if (new Date(st.due_at) <= now) {
                  countMap[dId].review += 1;
                }
              }
            }
          });
        });

        decks.forEach(d => {
          d.card_count = countMap[d.id]?.total || 0;
          d.new_count = countMap[d.id]?.new || 0;
          d.learning_count = countMap[d.id]?.learning || 0;
          d.due_count = countMap[d.id]?.review || 0;
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

      if (options?.topicId) query = query.eq('topic_id', options.topicId);
      if (options?.isSuspended !== undefined) query = query.eq('is_suspended', options.isSuspended);

      const { data: rawCards, error } = await query.order('created_at', { ascending: false });

      if (error || !rawCards) {
        console.error('Erro ao listar cartões:', error);
        return [];
      }

      let cards = rawCards.map(hydrateCardMeta);

      // Filtragem que contempla múltiplos baralhos e múltiplas disciplinas
      if (options?.deckId) {
        cards = cards.filter(c =>
          c.deck_id === options.deckId ||
          (Array.isArray(c.deck_ids) && c.deck_ids.includes(options.deckId))
        );
      }

      if (options?.subjectId) {
        cards = cards.filter(c =>
          c.subject_id === options.subjectId ||
          (Array.isArray(c.subject_ids) && c.subject_ids.includes(options.subjectId))
        );
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
        const primaryDeckId = item.deck_id || (item.deck_ids && item.deck_ids[0]) || '';
        const deckIdsList = item.deck_ids && item.deck_ids.length > 0 ? item.deck_ids : (primaryDeckId ? [primaryDeckId] : []);
        const primarySubjectId = item.subject_id || (item.subject_ids && item.subject_ids[0]) || null;
        const subjectIdsList = item.subject_ids && item.subject_ids.length > 0 ? item.subject_ids : (primarySubjectId ? [primarySubjectId] : []);

        const metaJson = JSON.stringify({
          deck_ids: deckIdsList,
          subject_ids: subjectIdsList,
          orig_source_id: item.source_id || null
        });

        const safePayload: any = {
          deck_id: primaryDeckId,
          user_id: user.id,
          card_type: item.card_type || 'basic',
          front: item.front?.trim() || '',
          back: item.back?.trim() || '',
          cloze_text: item.cloze_text?.trim() || null,
          tags: item.tags || [],
          concurso_id: item.concurso_id || null,
          subject_id: primarySubjectId,
          topic_id: item.topic_id || null,
          source_type: item.source_type || 'manual',
          source_id: metaJson,
          is_suspended: false,
          is_deleted: false,
        };

        let newCard: any = null;
        let cardErr: any = null;

        const insertRes = await supabase
          .from('flashcard_cards')
          .insert({
            ...safePayload,
            deck_ids: deckIdsList,
            subject_ids: subjectIdsList
          })
          .select()
          .single();

        newCard = insertRes.data;
        cardErr = insertRes.error;

        // Fallback defensivo caso o banco ainda não tenha as colunas nativas deck_ids/subject_ids
        if (cardErr) {
          const errMsg = cardErr.message || '';
          const isMissingCol =
            cardErr.code === '42703' ||
            cardErr.code === 'PGRST204' ||
            errMsg.includes('deck_ids') ||
            errMsg.includes('subject_ids') ||
            errMsg.includes('schema cache');

          if (isMissingCol) {
            const retry = await supabase
              .from('flashcard_cards')
              .insert(safePayload)
              .select()
              .single();
            newCard = retry.data;
            cardErr = retry.error;
          }
        }

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
          card: hydrateCardMeta(newCard),
          scheduling: newSched || initialSched
        });
      }

      return results;
    },

    update: async (id: string, updates: Partial<Flashcard>): Promise<Flashcard | null> => {
      const user = await getAuthUser();
      if (!user) return null;

      const primaryDeckId = updates.deck_id || (updates.deck_ids && updates.deck_ids[0]) || '';
      const deckIdsList = updates.deck_ids && updates.deck_ids.length > 0 ? updates.deck_ids : (primaryDeckId ? [primaryDeckId] : []);
      const primarySubjectId = updates.subject_id !== undefined ? updates.subject_id : ((updates.subject_ids && updates.subject_ids[0]) || null);
      const subjectIdsList = updates.subject_ids && updates.subject_ids.length > 0 ? updates.subject_ids : (primarySubjectId ? [primarySubjectId] : []);

      const metaJson = JSON.stringify({
        deck_ids: deckIdsList,
        subject_ids: subjectIdsList,
        orig_source_id: updates.source_id || null
      });

      const safePayload: any = {
        updated_at: new Date().toISOString()
      };

      if (primaryDeckId) safePayload.deck_id = primaryDeckId;
      if (updates.card_type !== undefined) safePayload.card_type = updates.card_type;
      if (updates.front !== undefined) safePayload.front = updates.front.trim();
      if (updates.back !== undefined) safePayload.back = updates.back.trim();
      if (updates.cloze_text !== undefined) safePayload.cloze_text = updates.cloze_text?.trim() || null;
      if (updates.tags !== undefined) safePayload.tags = updates.tags;
      if (updates.concurso_id !== undefined) safePayload.concurso_id = updates.concurso_id;
      if (primarySubjectId !== undefined) safePayload.subject_id = primarySubjectId;
      if (updates.topic_id !== undefined) safePayload.topic_id = updates.topic_id;
      if (updates.is_suspended !== undefined) safePayload.is_suspended = updates.is_suspended;
      if (updates.is_deleted !== undefined) safePayload.is_deleted = updates.is_deleted;
      safePayload.source_id = metaJson;

      let result = await supabase
        .from('flashcard_cards')
        .update({
          ...safePayload,
          deck_ids: deckIdsList,
          subject_ids: subjectIdsList
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      // Fallback defensivo caso as colunas deck_ids/subject_ids ainda não existam no banco remoto
      if (result.error) {
        const errMsg = result.error.message || '';
        const isMissingCol =
          result.error.code === '42703' ||
          result.error.code === 'PGRST204' ||
          errMsg.includes('deck_ids') ||
          errMsg.includes('subject_ids') ||
          errMsg.includes('schema cache');

        if (isMissingCol) {
          result = await supabase
            .from('flashcard_cards')
            .update(safePayload)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();
        }
      }

      if (result.error) {
        console.error('Erro ao atualizar cartão:', result.error);
        throw result.error;
      }

      return hydrateCardMeta(result.data);
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

      if (options?.topicId) query = query.eq('topic_id', options.topicId);

      const { data: rawCards } = await query;
      if (!rawCards || rawCards.length === 0) {
        return {
          dueCards: [],
          counts: { overdue: 0, learning: 0, review: 0, newCards: 0, total: 0 }
        };
      }

      let cards = (rawCards || []).map(hydrateCardMeta);
      if (options?.deckId) {
        cards = cards.filter(c =>
          c.deck_id === options.deckId ||
          (Array.isArray(c.deck_ids) && c.deck_ids.includes(options.deckId))
        );
      }
      if (options?.subjectId) {
        cards = cards.filter(c =>
          c.subject_id === options.subjectId ||
          (Array.isArray(c.subject_ids) && c.subject_ids.includes(options.subjectId))
        );
      }

      if (cards.length === 0) {
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

      let localSpacing: any = {};
      try {
        const raw = localStorage.getItem('cp_flashcard_spacing_settings');
        if (raw) localSpacing = JSON.parse(raw);
      } catch {}

      const { data } = await supabase
        .from('flashcard_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const againSpacing = localSpacing.again_spacing || {
        value: localSpacing.again_interval_minutes || 10,
        unit: 'minutes' as const
      };
      const hardSpacing = localSpacing.hard_spacing || {
        value: 1,
        unit: 'days' as const
      };
      const goodSpacing = localSpacing.good_spacing || {
        value: 3,
        unit: 'days' as const
      };
      const easySpacing = localSpacing.easy_spacing || {
        value: 7,
        unit: 'days' as const
      };

      const settings: FlashcardSettings = {
        new_cards_per_day: data?.new_cards_per_day ?? 20,
        max_reviews_per_day: data?.max_reviews_per_day ?? 200,
        request_retention: data?.request_retention ?? 0.9,
        show_next_review_time: data?.show_next_review_time ?? true,
        enable_keyboard_shortcuts: data?.enable_keyboard_shortcuts ?? true,
        again_spacing: againSpacing,
        hard_spacing: hardSpacing,
        good_spacing: goodSpacing,
        easy_spacing: easySpacing,
        maximum_interval_days: localSpacing.maximum_interval_days ?? 36500,
      };

      defaultScheduler.updateParameters({
        requestRetention: settings.request_retention,
        againSpacing: settings.again_spacing,
        hardSpacing: settings.hard_spacing,
        goodSpacing: settings.good_spacing,
        easySpacing: settings.easy_spacing,
        maximumInterval: settings.maximum_interval_days,
      });

      return settings;
    },

    update: async (updates: Partial<FlashcardSettings>): Promise<FlashcardSettings | null> => {
      const user = await getAuthUser();
      if (!user) return null;

      // Salvar espaçamento de classificação no cache local
      let existingSpacing: any = {};
      try {
        const raw = localStorage.getItem('cp_flashcard_spacing_settings');
        if (raw) existingSpacing = JSON.parse(raw);
      } catch {}

      const spacingPayload = {
        again_spacing: updates.again_spacing ?? existingSpacing.again_spacing ?? { value: 10, unit: 'minutes' as const },
        hard_spacing: updates.hard_spacing ?? existingSpacing.hard_spacing ?? { value: 1, unit: 'days' as const },
        good_spacing: updates.good_spacing ?? existingSpacing.good_spacing ?? { value: 3, unit: 'days' as const },
        easy_spacing: updates.easy_spacing ?? existingSpacing.easy_spacing ?? { value: 7, unit: 'days' as const },
        maximum_interval_days: updates.maximum_interval_days ?? existingSpacing.maximum_interval_days ?? 36500,
      };
      localStorage.setItem('cp_flashcard_spacing_settings', JSON.stringify(spacingPayload));

      defaultScheduler.updateParameters({
        requestRetention: updates.request_retention,
        againSpacing: spacingPayload.again_spacing,
        hardSpacing: spacingPayload.hard_spacing,
        goodSpacing: spacingPayload.good_spacing,
        easySpacing: spacingPayload.easy_spacing,
        maximumInterval: spacingPayload.maximum_interval_days,
      });

      const basePayload: any = {
        user_id: user.id,
        updated_at: new Date().toISOString()
      };
      if (updates.new_cards_per_day !== undefined) basePayload.new_cards_per_day = updates.new_cards_per_day;
      if (updates.max_reviews_per_day !== undefined) basePayload.max_reviews_per_day = updates.max_reviews_per_day;
      if (updates.request_retention !== undefined) basePayload.request_retention = updates.request_retention;
      if (updates.show_next_review_time !== undefined) basePayload.show_next_review_time = updates.show_next_review_time;
      if (updates.enable_keyboard_shortcuts !== undefined) basePayload.enable_keyboard_shortcuts = updates.enable_keyboard_shortcuts;

      const { data, error } = await supabase
        .from('flashcard_settings')
        .upsert(basePayload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        console.error('Erro ao salvar configurações de flashcards:', error);
      }

      return {
        ...(data || basePayload),
        ...spacingPayload
      };
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

    getForecast: async (days: number = 14): Promise<{ date: string; count: number }[]> => {
      const user = await getAuthUser();
      if (!user) return [];

      // Buscar cartões ativos para não contabilizar cartões deletados ou suspensos
      const { data: activeCards } = await supabase
        .from('flashcard_cards')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .eq('is_suspended', false);

      const activeIds = new Set((activeCards || []).map(c => c.id));
      const targetDays = Math.max(1, Math.min(days, 30));

      const now = new Date();
      // Criar mapa ordenado dos próximos 14 dias em horário local
      const forecastDays: { dateKey: string; start: Date; end: Date; count: number }[] = [];

      for (let i = 0; i < targetDays; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${dayNum}`;

        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

        forecastDays.push({ dateKey, start, end, count: 0 });
      }

      if (activeIds.size === 0) {
        return forecastDays.map(f => ({ date: f.dateKey, count: 0 }));
      }

      const { data: states } = await supabase
        .from('flashcard_scheduling_state')
        .select('card_id, due_at, state')
        .eq('user_id', user.id)
        .neq('state', State.New);

      (states || []).forEach(s => {
        if (!activeIds.has(s.card_id)) return;
        const dueDate = new Date(s.due_at);

        // Se venceu no passado ou hoje, agrupa no Dia 0 (Hoje)
        if (dueDate <= forecastDays[0].end) {
          forecastDays[0].count += 1;
        } else {
          // Dias futuros (1 a targetDays - 1)
          for (let i = 1; i < forecastDays.length; i++) {
            if (dueDate >= forecastDays[i].start && dueDate <= forecastDays[i].end) {
              forecastDays[i].count += 1;
              break;
            }
          }
        }
      });

      return forecastDays.map(f => ({ date: f.dateKey, count: f.count }));
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
