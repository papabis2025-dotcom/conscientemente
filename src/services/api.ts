import { supabase } from './supabase';
import { Concurso, StudySession, Simulado, ScheduledStudy, DailyGoal, LogEntry, Profile } from '../types';

// Generic helper for error handling
const handleRequest = async <T>(request: PromiseLike<{ data: T | null; error: any }> | any): Promise<T | null> => {
    const { data, error } = await request;
    if (error) {
        console.error('Supabase API Error:', error);
        throw error;
    }
    return data;
};

export const api = {
    // Profiles
    profiles: {
        get: async () => handleRequest(supabase.from('profiles').select('*').single()),
        update: async (updates: Partial<Profile>) => handleRequest(supabase.from('profiles').update(updates).eq('id', (await supabase.auth.getUser()).data.user?.id)),
    },

    // Concursos
    concursos: {
        list: async () => {
            const data = await handleRequest<any[]>(supabase.from('concursos').select('*').order('created_at', { ascending: false }));
            return (data || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                banca: c.banca,
                startDate: c.start_date,
                targetDate: c.target_date,
                subjects: c.subjects,
                categoryId: c.category_id
            }));
        },
        upsert: async (concurso: Concurso) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Map camelCase to snake_case for DB
            const dbPayload = {
                id: (concurso.id && !concurso.id.includes('temp-') && concurso.id.length > 20) ? concurso.id : undefined,
                user_id: user.id,
                name: concurso.name,
                banca: concurso.banca,
                start_date: concurso.startDate,
                target_date: concurso.targetDate,
                category_id: concurso.categoryId,
                subjects: concurso.subjects // JSONB supported directly
            };

            return handleRequest<Concurso>(supabase.from('concursos').upsert(dbPayload).select().single());
        },
        delete: async (id: string) => handleRequest(supabase.from('concursos').delete().eq('id', id)),
    },

    // Study Sessions
    sessions: {
        list: async () => {
            const data = await handleRequest<any[]>(supabase.from('study_sessions').select('*').order('date', { ascending: false }));
            return (data || []).map((s: any) => ({
                id: s.id,
                subjectId: s.subject_id,
                topicId: s.topic_id,
                durationInMinutes: s.duration_minutes,
                date: s.date,
                questionsDone: s.questions_done,
                questionsCorrect: s.questions_correct,
                isSimulado: s.is_simulado
            }));
        },
        create: async (session: Omit<StudySession, 'id' | 'user_id' | 'created_at'>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const dbPayload = {
                user_id: user.id,
                subject_id: session.subjectId,
                topic_id: session.topicId,
                duration_minutes: session.durationInMinutes,
                date: session.date,
                questions_done: session.questionsDone,
                questions_correct: session.questionsCorrect,
                is_simulado: session.isSimulado
            };

            return handleRequest<StudySession>(supabase.from('study_sessions').insert(dbPayload).select().single());
        },
        delete: async (id: string) => handleRequest(supabase.from('study_sessions').delete().eq('id', id)),
    },

    // Simulados
    simulados: {
        list: async () => {
            const data = await handleRequest<any[]>(supabase.from('simulados').select('*').order('date', { ascending: false }));
            return (data || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                date: s.date,
                totalQuestions: s.total_questions,
                results: s.results
            }));
        },
        create: async (simulado: Omit<Simulado, 'id' | 'user_id' | 'created_at'>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            return handleRequest<Simulado>(supabase.from('simulados').insert({
                user_id: user.id,
                name: simulado.name,
                date: simulado.date,
                total_questions: simulado.totalQuestions,
                results: simulado.results
            }).select().single());
        },
        delete: async (id: string) => handleRequest(supabase.from('simulados').delete().eq('id', id)),
    },

    // Scheduled Studies
    schedule: {
        list: async () => {
            const data = await handleRequest<any[]>(supabase.from('scheduled_studies').select('*').order('date', { ascending: true }));
            return (data || []).map((i: any) => ({
                id: i.id,
                date: i.date,
                subjectId: i.subject_id,
                topicId: i.topic_id,
                activityType: i.activity_type,
                notes: i.notes,
                durationInMinutes: i.duration_minutes,
                questionsDone: i.questions_done,
                questionsCorrect: i.questions_correct
            }));
        },
        create: async (item: Omit<ScheduledStudy, 'id' | 'user_id' | 'created_at'>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            return handleRequest<ScheduledStudy>(supabase.from('scheduled_studies').insert({
                user_id: user.id,
                date: item.date,
                subject_id: item.subjectId,
                topic_id: item.topicId,
                activity_type: item.activityType,
                notes: item.notes,
                duration_minutes: item.durationInMinutes,
                questions_done: item.questionsDone,
                questions_correct: item.questionsCorrect
            }).select().single());
        },
        update: async (id: string, updates: Partial<ScheduledStudy>) => {
            const dbPayload: any = {};
            if (updates.subjectId) dbPayload.subject_id = updates.subjectId;
            if (updates.topicId) dbPayload.topic_id = updates.topicId;
            if (updates.activityType) dbPayload.activity_type = updates.activityType;
            if (updates.questionsDone !== undefined) dbPayload.questions_done = updates.questionsDone;
            if (updates.questionsCorrect !== undefined) dbPayload.questions_correct = updates.questionsCorrect;

            return handleRequest(supabase.from('scheduled_studies').update(dbPayload).eq('id', id));
        },
        delete: async (id: string) => handleRequest(supabase.from('scheduled_studies').delete().eq('id', id)),
    },

    // Daily Goals
    dailyGoals: {
        list: async () => {
            const data = await handleRequest<any[]>(supabase.from('daily_goals').select('*').order('date', { ascending: false }));
            return (data || []).map((g: any) => ({
                date: g.date,
                questionsTarget: g.questions_target
            }));
        },
        upsert: async (goal: DailyGoal) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            return handleRequest(supabase.from('daily_goals').upsert({
                user_id: user.id,
                date: goal.date,
                questions_target: goal.questionsTarget
            }, { onConflict: 'user_id, date' }));
        }
    },

    // Logs
    logs: {
        list: async () => handleRequest(supabase.from('logs').select('*').order('timestamp', { ascending: false }).limit(50)),
        create: async (log: LogEntry) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null; // Silent fail if no user

            return handleRequest(supabase.from('logs').insert({
                user_id: user.id,
                message: log.message,
                type: log.type
            }));
        },
        clear: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            return handleRequest(supabase.from('logs').delete().eq('user_id', user.id));
        }
    }
};
