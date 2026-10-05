import { supabase } from './supabase';
import { api } from '../modules/estudos/services/api';
import { sanitizeHtml } from '../utils/sanitizeHtml';

export interface BackupData {
  version: string;
  exportDate: string;
  data: {
    concursos?: any[];
    sessions?: any[];
    simulados?: any[];
    scheduledStudies?: any[];
    dailyGoals?: any[];
    habits?: any[];
    habitLogs?: any[];
    financasTransacoes?: any[];
    saudeTreinos?: any[];
    tarefas?: any[];
    userPreferences?: any;
    flashcardDecks?: any[];
    flashcardCards?: any[];
    flashcardSchedulingState?: any[];
    flashcardReviewLogs?: any[];
    flashcardSettings?: any;
  };
  localSettings: Record<string, string | null>;
}

const BACKUP_VERSION = '2.0';
const MAX_BACKUP_FILE_BYTES = 25 * 1024 * 1024;

const APP_STORAGE_PREFIXES = [
  'cn_',
  'cp_',
  'gp_',
  'estudos_',
  'financas_',
  'saude_',
  'tarefas_',
  'anotacoes_',
  'global_',
  'isSidebarCollapsed_',
] as const;

const isAppStorageKey = (key: string): boolean =>
  APP_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix))
  || key.endsWith('ActiveTab')
  || key.includes('active_tab');

const BACKUP_ARRAY_FIELDS = [
  'concursos',
  'sessions',
  'simulados',
  'scheduledStudies',
  'dailyGoals',
  'habits',
  'habitLogs',
  'financasTransacoes',
  'saudeTreinos',
  'tarefas',
  'flashcardDecks',
  'flashcardCards',
  'flashcardSchedulingState',
  'flashcardReviewLogs'
] as const;

const BACKUP_OBJECT_FIELDS = ['userPreferences', 'flashcardSettings'] as const;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const describeError = (error: unknown): string => {
  if (error instanceof Error) return error.message;

  if (isRecord(error)) {
    const details = ['message', 'code', 'details', 'hint']
      .map((key) => error[key])
      .filter((value): value is string => typeof value === 'string' && value.length > 0);

    if (details.length > 0) return details.join(' | ');
  }

  try {
    return JSON.stringify(error) || String(error);
  } catch {
    return String(error);
  }
};

const runStage = async <T>(stage: string, operation: () => PromiseLike<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    throw new Error(`Falha na etapa "${stage}": ${describeError(error)}`);
  }
};

const getSupabaseData = async <TResult extends { data: unknown; error: unknown }>(
  stage: string,
  request: PromiseLike<TResult>
): Promise<TResult['data']> => runStage(stage, async () => {
  const result = await request;

  if (result.error) {
    throw result.error;
  }

  return result.data;
});

const validateBackup = (value: unknown): BackupData => {
  if (!isRecord(value)) {
    throw new Error('Formato de arquivo de backup inválido: o conteúdo deve ser um objeto JSON.');
  }

  if (typeof value.version !== 'string') {
    throw new Error('Formato de arquivo de backup inválido: versão ausente.');
  }

  if (value.version !== BACKUP_VERSION) {
    throw new Error(
      `Versão de backup não suportada (${value.version}). Versão esperada: ${BACKUP_VERSION}.`
    );
  }

  if (typeof value.exportDate !== 'string' || Number.isNaN(Date.parse(value.exportDate))) {
    throw new Error('Formato de arquivo de backup inválido: data de exportação ausente ou inválida.');
  }

  if (!isRecord(value.data)) {
    throw new Error('Formato de arquivo de backup inválido: campo "data" ausente ou inválido.');
  }

  for (const field of BACKUP_ARRAY_FIELDS) {
    const entries = value.data[field];
    if (entries === undefined) continue;

    if (!Array.isArray(entries)) {
      throw new Error(`Formato de arquivo de backup inválido: "data.${field}" deve ser uma lista.`);
    }

    const invalidIndex = entries.findIndex((entry) => !isRecord(entry));
    if (invalidIndex >= 0) {
      throw new Error(
        `Formato de arquivo de backup inválido: "data.${field}[${invalidIndex}]" deve ser um objeto.`
      );
    }
  }

  for (const field of BACKUP_OBJECT_FIELDS) {
    const entry = value.data[field];
    if (entry !== undefined && entry !== null && !isRecord(entry)) {
      throw new Error(`Formato de arquivo de backup inválido: "data.${field}" deve ser um objeto.`);
    }
  }

  if (!isRecord(value.localSettings)) {
    throw new Error('Formato de arquivo de backup inválido: campo "localSettings" ausente ou inválido.');
  }

  for (const [key, settingValue] of Object.entries(value.localSettings)) {
    // Backups antigos podiam conter chaves de bibliotecas. Elas são aceitas para
    // compatibilidade, mas nunca restauradas nem incluídas em novos backups.
    if (!isAppStorageKey(key)) continue;
    if (settingValue !== null && typeof settingValue !== 'string') {
      throw new Error(
        `Formato de arquivo de backup inválido: "localSettings.${key}" deve ser texto ou nulo.`
      );
    }
  }

  return value as unknown as BackupData;
};

export const backupService = {
  async exportBackup(): Promise<void> {
    const { session } = await getSupabaseData(
      'verificar a sessão para exportação',
      supabase.auth.getSession()
    );
    const user = session?.user;

    let concursos: any[] = [];
    let sessions: any[] = [];
    let simulados: any[] = [];
    let scheduledStudies: any[] = [];
    let dailyGoals: any[] = [];
    let habits: any[] = [];
    let habitLogs: any[] = [];
    let financasTransacoes: any[] = [];
    let saudeTreinos: any[] = [];
    let tarefas: any[] = [];
    let userPreferences: any = null;
    let flashcardDecks: any[] = [];
    let flashcardCards: any[] = [];
    let flashcardSchedulingState: any[] = [];
    let flashcardReviewLogs: any[] = [];
    let flashcardSettings: any = null;

    if (user) {
      const [
        loadedConcursos,
        loadedSessions,
        loadedSimulados,
        loadedScheduledStudies,
        loadedDailyGoals,
        loadedHabits,
        loadedHabitLogs,
        loadedFinancasTransacoes,
        loadedSaudeTreinos,
        loadedTarefas,
        loadedUserPreferences,
        loadedFlashcardDecks,
        loadedFlashcardCards,
        loadedFlashcardSchedulingState,
        loadedFlashcardReviewLogs,
        loadedFlashcardSettings
      ] = await Promise.all([
        getSupabaseData('exportar concursos', supabase.from('concursos').select('*').eq('user_id', user.id)),
        getSupabaseData('exportar sessões de estudo', supabase.from('study_sessions').select('*').eq('user_id', user.id)),
        getSupabaseData('exportar simulados', supabase.from('simulados').select('*').eq('user_id', user.id)),
        getSupabaseData('exportar estudos agendados', supabase.from('scheduled_studies').select('*').eq('user_id', user.id)),
        getSupabaseData('exportar metas diárias', supabase.from('daily_goals').select('*').eq('user_id', user.id)),
        getSupabaseData('exportar hábitos', supabase.from('habits').select('*').eq('user_id', user.id)),
        getSupabaseData('exportar registros de hábitos', supabase.from('habit_logs').select('*').eq('user_id', user.id)),
        getSupabaseData('exportar transações financeiras', supabase.from('financas_transacoes').select('*').eq('user_id', user.id)),
        getSupabaseData('exportar treinos de saúde', supabase.from('saude_treinos').select('*').eq('user_id', user.id)),
        getSupabaseData('exportar tarefas', supabase.from('tarefas').select('*').eq('user_id', user.id)),
        getSupabaseData('exportar preferências do usuário', supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle()),
        getSupabaseData('exportar baralhos de flashcards', supabase.from('flashcard_decks').select('*').eq('user_id', user.id)),
        getSupabaseData('exportar flashcards', supabase.from('flashcard_cards').select('*').eq('user_id', user.id)),
        getSupabaseData('exportar agendamentos de flashcards', supabase.from('flashcard_scheduling_state').select('*').eq('user_id', user.id)),
        getSupabaseData('exportar revisões de flashcards', supabase.from('flashcard_review_logs').select('*').eq('user_id', user.id)),
        getSupabaseData('exportar configurações de flashcards', supabase.from('flashcard_settings').select('*').eq('user_id', user.id).maybeSingle())
      ]);

      concursos = loadedConcursos || [];
      sessions = loadedSessions || [];
      simulados = loadedSimulados || [];
      scheduledStudies = loadedScheduledStudies || [];
      dailyGoals = loadedDailyGoals || [];
      habits = loadedHabits || [];
      habitLogs = loadedHabitLogs || [];
      financasTransacoes = loadedFinancasTransacoes || [];
      saudeTreinos = loadedSaudeTreinos || [];
      tarefas = loadedTarefas || [];
      userPreferences = loadedUserPreferences;
      flashcardDecks = loadedFlashcardDecks || [];
      flashcardCards = loadedFlashcardCards || [];
      flashcardSchedulingState = loadedFlashcardSchedulingState || [];
      flashcardReviewLogs = loadedFlashcardReviewLogs || [];
      flashcardSettings = loadedFlashcardSettings;
    } else {
      // Fallback offline
      [concursos, sessions, simulados, scheduledStudies, dailyGoals] = await Promise.all([
        runStage('exportar concursos no modo offline', () => api.concursos.list()),
        runStage('exportar sessões de estudo no modo offline', () => api.sessions.list()),
        runStage('exportar simulados no modo offline', () => api.simulados.list()),
        runStage('exportar estudos agendados no modo offline', () => api.schedule.list()),
        runStage('exportar metas diárias no modo offline', () => api.dailyGoals.list())
      ]);
    }

    // Capture all localStorage settings
    const localSettings: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isAppStorageKey(key)) {
        localSettings[key] = localStorage.getItem(key);
      }
    }

    const exportPayload: BackupData = {
      version: BACKUP_VERSION,
      exportDate: new Date().toISOString(),
      data: {
        concursos,
        sessions,
        simulados,
        scheduledStudies,
        dailyGoals,
        habits,
        habitLogs,
        financasTransacoes,
        saudeTreinos,
        tarefas,
        userPreferences,
        flashcardDecks,
        flashcardCards,
        flashcardSchedulingState,
        flashcardReviewLogs,
        flashcardSettings
      },
      localSettings
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conscientemente-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async importBackup(file: File): Promise<{ success: boolean; itemCount: number }> {
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      throw new Error('O arquivo de backup excede o limite de 25 MB.');
    }
    const text = await runStage('ler o arquivo de backup', () => file.text());
    let rawBackup: unknown;

    try {
      rawBackup = JSON.parse(text);
    } catch {
      throw new Error('Formato de arquivo de backup inválido: o arquivo não contém um JSON válido.');
    }

    // A validação acontece integralmente antes de qualquer mutação local ou remota.
    const parsed = validateBackup(rawBackup);

    const { session } = await getSupabaseData(
      'verificar a sessão para importação',
      supabase.auth.getSession()
    );
    const user = session?.user;

    const {
      concursos,
      sessions,
      simulados,
      scheduledStudies,
      dailyGoals,
      habits,
      habitLogs,
      financasTransacoes,
      saudeTreinos,
      tarefas,
      userPreferences,
      flashcardDecks,
      flashcardCards,
      flashcardSchedulingState,
      flashcardReviewLogs,
      flashcardSettings
    } = parsed.data;

    let itemCount = 0;

    if (user) {
      // 1. Concursos
      if (Array.isArray(concursos) && concursos.length > 0) {
        const formatted = concursos.map((c: any) => ({
          id: c.id,
          user_id: user.id,
          name: c.name,
          banca: c.banca,
          start_date: c.startDate || c.start_date || null,
          target_date: c.targetDate || c.target_date || null,
          category_id: c.categoryId || c.category_id || null,
          image_url: c.imageUrl || c.image_url || null,
          subjects: c.subjects || []
        }));
        await getSupabaseData(
          'importar concursos',
          supabase.from('concursos').upsert(formatted, { onConflict: 'id' })
        );
        itemCount += formatted.length;
      }

      // 2. Study sessions
      if (Array.isArray(sessions) && sessions.length > 0) {
        const formatted = sessions.map((s: any) => ({
          id: s.id,
          user_id: user.id,
          subject_id: s.subjectId || s.subject_id,
          topic_id: s.topicId || s.topic_id || null,
          duration_minutes: s.durationInMinutes || s.duration_minutes || 0,
          date: s.date,
          questions_done: s.questionsDone || s.questions_done || 0,
          questions_correct: s.questionsCorrect || s.questions_correct || 0,
          is_simulado: s.isSimulado !== undefined ? s.isSimulado : (s.is_simulado || false),
          activity_type: s.activityType || s.activity_type || null,
          questions_link: s.questionsLink || s.questions_link || null
        }));
        await getSupabaseData(
          'importar sessões de estudo',
          supabase.from('study_sessions').upsert(formatted, { onConflict: 'id' })
        );
        itemCount += formatted.length;
      }

      // 3. Simulados
      if (Array.isArray(simulados) && simulados.length > 0) {
        const formatted = simulados.map((sim: any) => ({
          id: sim.id,
          user_id: user.id,
          name: sim.name,
          date: sim.date,
          total_questions: sim.totalQuestions || sim.total_questions || 0,
          results: sim.results || {}
        }));
        await getSupabaseData(
          'importar simulados',
          supabase.from('simulados').upsert(formatted, { onConflict: 'id' })
        );
        itemCount += formatted.length;
      }

      // 4. Scheduled studies
      if (Array.isArray(scheduledStudies) && scheduledStudies.length > 0) {
        const formatted = scheduledStudies.map((item: any) => ({
          id: item.id,
          user_id: user.id,
          date: item.date,
          subject_id: item.subjectId || item.subject_id,
          topic_id: item.topicId || item.topic_id || null,
          activity_type: item.activityType || item.activity_type || null,
          notes: item.notes || null,
          duration_minutes: item.durationInMinutes || item.duration_minutes || 0,
          questions_done: item.questionsDone || item.questions_done || 0,
          questions_correct: item.questionsCorrect || item.questions_correct || 0,
          questions_link: item.questionsLink || item.questions_link || null,
          status: item.status || 'planejado'
        }));
        await getSupabaseData(
          'importar estudos agendados',
          supabase.from('scheduled_studies').upsert(formatted, { onConflict: 'id' })
        );
        itemCount += formatted.length;
      }

      // 5. Daily goals
      if (Array.isArray(dailyGoals) && dailyGoals.length > 0) {
        const formatted = dailyGoals.map((g: any) => ({
          id: g.id || `${user.id}_${g.date}`,
          user_id: user.id,
          date: g.date,
          questions_target: g.questionsTarget || g.questions_target || 0
        }));
        await getSupabaseData(
          'importar metas diárias',
          supabase.from('daily_goals').upsert(formatted, { onConflict: 'user_id, date' })
        );
        itemCount += formatted.length;
      }

      // 6. Habits & Habit logs
      if (Array.isArray(habits) && habits.length > 0) {
        const formatted = habits.map((h: any) => ({
          id: h.id,
          user_id: user.id,
          name: h.name
        }));
        await getSupabaseData(
          'importar hábitos',
          supabase.from('habits').upsert(formatted, { onConflict: 'id' })
        );
        itemCount += formatted.length;
      }
      if (Array.isArray(habitLogs) && habitLogs.length > 0) {
        const formatted = habitLogs.map((hl: any) => ({
          user_id: user.id,
          habit_id: hl.habit_id || hl.habitId,
          logged_date: hl.logged_date || hl.loggedDate || hl.date
        }));
        await getSupabaseData(
          'importar registros de hábitos',
          supabase.from('habit_logs').upsert(formatted, { onConflict: 'user_id, habit_id, logged_date' })
        );
        itemCount += formatted.length;
      }

      // 7. Finanças
      if (Array.isArray(financasTransacoes) && financasTransacoes.length > 0) {
        const formatted = financasTransacoes.map((t: any) => ({
          id: t.id,
          user_id: user.id,
          type: t.type,
          date: t.date,
          day_only: t.dayOnly !== undefined ? t.dayOnly : t.day_only,
          name: t.name,
          amount: t.amount,
          category: t.category,
          payment_method: t.paymentMethod || t.payment_method || null,
          pending: t.pending
        }));
        await getSupabaseData(
          'importar transações financeiras',
          supabase.from('financas_transacoes').upsert(formatted, { onConflict: 'id' })
        );
        itemCount += formatted.length;
      }

      // 8. Saúde
      if (Array.isArray(saudeTreinos) && saudeTreinos.length > 0) {
        const formatted = saudeTreinos.map((t: any) => ({
          id: t.id,
          user_id: user.id,
          type: t.type,
          date: t.date,
          time_in_minutes: t.timeInMinutes || t.time_in_minutes || 0,
          status: t.status,
          distance_km: t.distanceKm || t.distance_km || 0,
          cardio_level: t.level || t.cardio_level || 0,
          muscles: t.muscles || []
        }));
        await getSupabaseData(
          'importar treinos de saúde',
          supabase.from('saude_treinos').upsert(formatted, { onConflict: 'id' })
        );
        itemCount += formatted.length;
      }

      // 9. Tarefas
      if (Array.isArray(tarefas) && tarefas.length > 0) {
        const formatted = tarefas.map((t: any) => ({
          id: t.id,
          user_id: user.id,
          text: t.text,
          completed: t.completed,
          due_date: t.dueDate || t.due_date || null,
          due_time: t.dueTime || t.due_time || null,
          category: t.category || null,
          created_at: t.createdAt || t.created_at || Date.now(),
          recurrence_type: t.recurrenceType || t.recurrence_type || 'none',
          recurrence_value: t.recurrenceValue || t.recurrence_value || null
        }));
        await getSupabaseData(
          'importar tarefas',
          supabase.from('tarefas').upsert(formatted, { onConflict: 'id' })
        );
        itemCount += formatted.length;
      }

      // 10. User preferences
      if (userPreferences) {
        const prefPayload = { ...userPreferences, user_id: user.id };
        await getSupabaseData(
          'importar preferências do usuário',
          supabase.from('user_preferences').upsert(prefPayload, { onConflict: 'user_id' })
        );
        itemCount += 1;
      }

      // 11. Flashcards (Decks, Cards, Scheduling State, Review Logs, Settings)
      if (Array.isArray(flashcardDecks) && flashcardDecks.length > 0) {
        const formatted = flashcardDecks.map((d: any) => ({ ...d, user_id: user.id }));
        await getSupabaseData(
          'importar baralhos de flashcards',
          supabase.from('flashcard_decks').upsert(formatted, { onConflict: 'id' })
        );
        itemCount += formatted.length;
      }
      if (Array.isArray(flashcardCards) && flashcardCards.length > 0) {
        const formatted = flashcardCards.map((c: any) => ({
          ...c,
          user_id: user.id,
          front: sanitizeHtml(typeof c.front === 'string' ? c.front : '').trim(),
          back: sanitizeHtml(typeof c.back === 'string' ? c.back : '').trim(),
          cloze_text: typeof c.cloze_text === 'string'
            ? sanitizeHtml(c.cloze_text).trim() || null
            : null,
        }));
        await getSupabaseData(
          'importar flashcards',
          supabase.from('flashcard_cards').upsert(formatted, { onConflict: 'id' })
        );
        itemCount += formatted.length;
      }
      if (Array.isArray(flashcardSchedulingState) && flashcardSchedulingState.length > 0) {
        const formatted = flashcardSchedulingState.map((s: any) => ({ ...s, user_id: user.id }));
        await getSupabaseData(
          'importar agendamentos de flashcards',
          supabase.from('flashcard_scheduling_state').upsert(formatted, { onConflict: 'card_id' })
        );
        itemCount += formatted.length;
      }
      if (Array.isArray(flashcardReviewLogs) && flashcardReviewLogs.length > 0) {
        const formatted = flashcardReviewLogs.map((l: any) => ({ ...l, user_id: user.id }));
        await getSupabaseData(
          'importar revisões de flashcards',
          supabase.from('flashcard_review_logs').upsert(formatted, { onConflict: 'id' })
        );
        itemCount += formatted.length;
      }
      if (flashcardSettings) {
        const settingsPayload = { ...flashcardSettings, user_id: user.id };
        await getSupabaseData(
          'importar configurações de flashcards',
          supabase.from('flashcard_settings').upsert(settingsPayload, { onConflict: 'user_id' })
        );
        itemCount += 1;
      }
    } else {
      // Offline fallback
      if (concursos) {
        for (const [index, concurso] of concursos.entries()) {
          await runStage(
            `importar concurso no modo offline (${index + 1}/${concursos.length})`,
            () => api.concursos.upsert(concurso)
          );
          itemCount += 1;
        }
      }

      if (sessions) {
        for (const [index, sessionItem] of sessions.entries()) {
          await runStage(
            `importar sessão de estudo no modo offline (${index + 1}/${sessions.length})`,
            () => api.sessions.create(sessionItem)
          );
          itemCount += 1;
        }
      }

      if (simulados) {
        for (const [index, simulado] of simulados.entries()) {
          await runStage(
            `importar simulado no modo offline (${index + 1}/${simulados.length})`,
            () => api.simulados.create(simulado)
          );
          itemCount += 1;
        }
      }

      if (scheduledStudies) {
        for (const [index, scheduledStudy] of scheduledStudies.entries()) {
          await runStage(
            `importar estudo agendado no modo offline (${index + 1}/${scheduledStudies.length})`,
            () => api.schedule.create(scheduledStudy)
          );
          itemCount += 1;
        }
      }

      if (dailyGoals) {
        for (const [index, dailyGoal] of dailyGoals.entries()) {
          await runStage(
            `importar meta diária no modo offline (${index + 1}/${dailyGoals.length})`,
            () => api.dailyGoals.upsert(dailyGoal)
          );
          itemCount += 1;
        }
      }
    }

    // Restore localSettings into localStorage only after all data writes succeed.
    await runStage('restaurar configurações locais', async () => {
      Object.entries(parsed.localSettings).forEach(([key, val]) => {
        if (val !== null && isAppStorageKey(key)) {
          localStorage.setItem(key, val);
        }
      });
      window.dispatchEvent(new Event('local-storage-sync'));
      window.dispatchEvent(new Event('local-settings-changed'));
    });

    return { success: true, itemCount };
  }
};
