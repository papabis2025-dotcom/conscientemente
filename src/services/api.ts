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
        list: async () => handleRequest(supabase.from('concursos').select('*').order('created_at', { ascending: false })),
        create: async (concurso: Omit<Concurso, 'id' | 'user_id' | 'created_at'>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // For JSONB compatibility, ensure subjects is stringified if needed by your logic, 
            // but Supabase JS client handles objects for JSONB columns automatically.
            return handleRequest(supabase.from('concursos').insert({
                user_id: user.id,
                ...concurso
            }).select().single());
        },
        update: async (id: string, updates: Partial<Concurso>) => handleRequest(supabase.from('concursos').update(updates).eq('id', id).select().single()),
        delete: async (id: string) => handleRequest(supabase.from('concursos').delete().eq('id', id)),
    },

    // Study Sessions
    sessions: {
        list: async () => handleRequest(supabase.from('study_sessions').select('*').order('date', { ascending: false })),
        create: async (session: Omit<StudySession, 'id' | 'user_id' | 'created_at'>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Map frontend camelCase to snake_case if strictly typed, 
            // but here we used snake_case in SQL and the client usually expects matching names.
            // We need to map camelCase (frontend) to snake_case (DB) manually or assume automated mapper.
            // Let's map manually to be safe.
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

            return handleRequest(supabase.from('study_sessions').insert(dbPayload).select().single());
        }
    },

    // Simulados
    simulados: {
        list: async () => handleRequest(supabase.from('simulados').select('*').order('date', { ascending: false })),
        create: async (simulado: Omit<Simulado, 'id' | 'user_id' | 'created_at'>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            return handleRequest(supabase.from('simulados').insert({
                user_id: user.id,
                name: simulado.name,
                date: simulado.date,
                total_questions: simulado.totalQuestions,
                results: simulado.results // JSONB
            }).select().single());
        },
        delete: async (id: string) => handleRequest(supabase.from('simulados').delete().eq('id', id)),
    },

    // Scheduled Studies
    schedule: {
        list: async () => handleRequest(supabase.from('scheduled_studies').select('*').order('date', { ascending: true })),
        create: async (item: Omit<ScheduledStudy, 'id' | 'user_id' | 'created_at'>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            return handleRequest(supabase.from('scheduled_studies').insert({
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
            // Need to map keys if partial updates
            const dbPayload: any = {};
            if (updates.subjectId) dbPayload.subject_id = updates.subjectId;
            if (updates.topicId) dbPayload.topic_id = updates.topicId;
            if (updates.activityType) dbPayload.activity_type = updates.activityType;
            // ... map others loop or explicitly
            // simpler to just spread if keys matched, but they don't.
            // For now, assume this function implies specific known updates or full re-sync.
            // Let's keep it simple: mapped manually
            if (updates.questionsDone !== undefined) dbPayload.questions_done = updates.questionsDone;
            if (updates.questionsCorrect !== undefined) dbPayload.questions_correct = updates.questionsCorrect;

            return handleRequest(supabase.from('scheduled_studies').update(dbPayload).eq('id', id));
        }
    },

    // Daily Goals
    dailyGoals: {
        list: async () => handleRequest(supabase.from('daily_goals').select('*').order('date', { ascending: false })),
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
        }
    }
};
