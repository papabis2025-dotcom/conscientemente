import { supabase } from './supabase';
import { api } from '../modules/estudos/services/api';

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
  };
  localSettings: Record<string, string | null>;
}

export const backupService = {
  async exportBackup(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
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

    if (user) {
      const [
        cRes, sessRes, simRes, schedRes, goalRes,
        habRes, habLogRes, finRes, saudeRes, tarRes, prefRes
      ] = await Promise.allSettled([
        supabase.from('concursos').select('*').eq('user_id', user.id),
        supabase.from('study_sessions').select('*').eq('user_id', user.id),
        supabase.from('simulados').select('*').eq('user_id', user.id),
        supabase.from('scheduled_studies').select('*').eq('user_id', user.id),
        supabase.from('daily_goals').select('*').eq('user_id', user.id),
        supabase.from('habits').select('*').eq('user_id', user.id),
        supabase.from('habit_logs').select('*').eq('user_id', user.id),
        supabase.from('financas_transacoes').select('*').eq('user_id', user.id),
        supabase.from('saude_treinos').select('*').eq('user_id', user.id),
        supabase.from('tarefas').select('*').eq('user_id', user.id),
        supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle()
      ]);

      if (cRes.status === 'fulfilled' && !cRes.value.error) concursos = cRes.value.data || [];
      if (sessRes.status === 'fulfilled' && !sessRes.value.error) sessions = sessRes.value.data || [];
      if (simRes.status === 'fulfilled' && !simRes.value.error) simulados = simRes.value.data || [];
      if (schedRes.status === 'fulfilled' && !schedRes.value.error) scheduledStudies = schedRes.value.data || [];
      if (goalRes.status === 'fulfilled' && !goalRes.value.error) dailyGoals = goalRes.value.data || [];
      if (habRes.status === 'fulfilled' && !habRes.value.error) habits = habRes.value.data || [];
      if (habLogRes.status === 'fulfilled' && !habLogRes.value.error) habitLogs = habLogRes.value.data || [];
      if (finRes.status === 'fulfilled' && !finRes.value.error) financasTransacoes = finRes.value.data || [];
      if (saudeRes.status === 'fulfilled' && !saudeRes.value.error) saudeTreinos = saudeRes.value.data || [];
      if (tarRes.status === 'fulfilled' && !tarRes.value.error) tarefas = tarRes.value.data || [];
      if (prefRes.status === 'fulfilled' && !prefRes.value.error) userPreferences = prefRes.value.data;
    } else {
      // Fallback offline
      try { concursos = await api.concursos.list(); } catch {}
      try { sessions = await api.sessions.list(); } catch {}
      try { simulados = await api.simulados.list(); } catch {}
      try { scheduledStudies = await api.schedule.list(); } catch {}
      try { dailyGoals = await api.dailyGoals.list(); } catch {}
    }

    // Capture all localStorage settings
    const localSettings: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        localSettings[key] = localStorage.getItem(key);
      }
    }

    const exportPayload: BackupData = {
      version: '2.0',
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
        userPreferences
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
    const text = await file.text();
    const parsed: BackupData = JSON.parse(text);

    if (!parsed || !parsed.data) {
      throw new Error('Formato de arquivo de backup inválido.');
    }

    const { data: { session } } = await supabase.auth.getSession();
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
      userPreferences
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
        await supabase.from('concursos').upsert(formatted, { onConflict: 'id' });
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
        await supabase.from('study_sessions').upsert(formatted, { onConflict: 'id' });
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
        await supabase.from('simulados').upsert(formatted, { onConflict: 'id' });
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
        await supabase.from('scheduled_studies').upsert(formatted, { onConflict: 'id' });
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
        await supabase.from('daily_goals').upsert(formatted, { onConflict: 'user_id, date' });
        itemCount += formatted.length;
      }

      // 6. Habits & Habit logs
      if (Array.isArray(habits) && habits.length > 0) {
        const formatted = habits.map((h: any) => ({
          id: h.id,
          user_id: user.id,
          name: h.name
        }));
        await supabase.from('habits').upsert(formatted, { onConflict: 'id' });
        itemCount += formatted.length;
      }
      if (Array.isArray(habitLogs) && habitLogs.length > 0) {
        const formatted = habitLogs.map((hl: any) => ({
          user_id: user.id,
          habit_id: hl.habit_id || hl.habitId,
          logged_date: hl.logged_date || hl.loggedDate || hl.date
        }));
        await supabase.from('habit_logs').upsert(formatted, { onConflict: 'user_id, habit_id, logged_date' });
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
        await supabase.from('financas_transacoes').upsert(formatted, { onConflict: 'id' });
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
        await supabase.from('saude_treinos').upsert(formatted, { onConflict: 'id' });
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
        await supabase.from('tarefas').upsert(formatted, { onConflict: 'id' });
        itemCount += formatted.length;
      }

      // 10. User preferences
      if (userPreferences) {
        const prefPayload = { ...userPreferences, user_id: user.id };
        await supabase.from('user_preferences').upsert(prefPayload, { onConflict: 'user_id' });
      }
    } else {
      // Offline fallback
      if (concursos) for (const c of concursos) await api.concursos.upsert(c);
      if (sessions) for (const s of sessions) await api.sessions.create(s);
      if (simulados) for (const s of simulados) await api.simulados.create(s);
      if (scheduledStudies) for (const s of scheduledStudies) await api.schedule.create(s);
      if (dailyGoals) for (const g of dailyGoals) await api.dailyGoals.upsert(g);
    }

    // 11. Restore localSettings into localStorage
    if (parsed.localSettings && typeof parsed.localSettings === 'object') {
      Object.entries(parsed.localSettings).forEach(([key, val]) => {
        if (val !== null && val !== undefined) {
          localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
        }
      });
      window.dispatchEvent(new Event('local-storage-sync'));
      window.dispatchEvent(new Event('local-settings-changed'));
    }

    return { success: true, itemCount };
  }
};
