import { supabase } from './supabase';
import { Concurso, StudySession, Simulado, ScheduledStudy, DailyGoal, LogEntry, Profile } from '../types';

// Generic helper for error handling
const handleRequest = async <T>(request: PromiseLike<{ data: T | null; error: any }> | any): Promise<T | null> => {
    const { data, error } = await request;
    if (error) {
        console.error('Supabase API Error:', JSON.stringify(error, null, 2));
        throw error;
    }
    return data;
};

export const api = {
    // Profiles
    profiles: {
        get: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            return handleRequest(supabase.from('profiles').select('*').eq('id', user.id).single());
        },
        update: async (updates: Partial<Profile>) => handleRequest(supabase.from('profiles').update(updates).eq('id', (await supabase.auth.getUser()).data.user?.id)),
    },

    // Concursos
    concursos: {
        list: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            const data = await handleRequest<any[]>(supabase.from('concursos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }));
            return (data || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                banca: c.banca,
                startDate: c.start_date,
                targetDate: c.target_date,
                subjects: c.subjects || [],
                categoryId: c.category_id
            }));
        },
        upsert: async (concurso: Concurso) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Map camelCase to snake_case for DB
            const dbPayload = {
                // Include ID if it exists and is not a temp ID
                // Supabase will use it for update, or generate new UUID if undefined
                id: (concurso.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(concurso.id)) ? concurso.id : undefined,
                user_id: user.id,
                name: concurso.name,
                banca: concurso.banca,
                start_date: concurso.startDate || null,
                target_date: concurso.targetDate || null,
                category_id: concurso.categoryId,
                subjects: concurso.subjects || [] // JSONB supported directly, default to empty array
            };

            console.log('Upserting concurso to DB:', { id: dbPayload.id, name: dbPayload.name, subjectsCount: concurso.subjects?.length });
            return handleRequest<Concurso>(supabase.from('concursos').upsert(dbPayload).select().single());
        },
        delete: async (id: string) => handleRequest(supabase.from('concursos').delete().eq('id', id)),
        deleteAll: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) return handleRequest(supabase.from('concursos').delete().eq('user_id', user.id));
        },
    },

    // Study Sessions
    sessions: {
        list: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            const data = await handleRequest<any[]>(supabase.from('study_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }));
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
        create: async (session: Omit<StudySession, 'id' | 'user_id' | 'created_at'> & { id?: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const dbPayload = {
                id: session.id, // Allow explicit ID
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
        update: async (id: string, updates: Partial<StudySession>) => {
            const dbPayload: any = {};
            if (updates.subjectId) dbPayload.subject_id = updates.subjectId;
            if (updates.topicId !== undefined) dbPayload.topic_id = updates.topicId;
            if (updates.durationInMinutes !== undefined) dbPayload.duration_minutes = updates.durationInMinutes;
            if (updates.date) dbPayload.date = updates.date;
            if (updates.questionsDone !== undefined) dbPayload.questions_done = updates.questionsDone;
            if (updates.questionsCorrect !== undefined) dbPayload.questions_correct = updates.questionsCorrect;
            if (updates.isSimulado !== undefined) dbPayload.is_simulado = updates.isSimulado;

            return handleRequest(supabase.from('study_sessions').update(dbPayload).eq('id', id));
        },
        delete: async (id: string) => handleRequest(supabase.from('study_sessions').delete().eq('id', id)),
        deleteBySubject: async (subjectId: string) => handleRequest(supabase.from('study_sessions').delete().eq('subject_id', subjectId)),
        deleteAll: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) return handleRequest(supabase.from('study_sessions').delete().eq('user_id', user.id));
        },
    },

    // Simulados
    simulados: {
        list: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            const data = await handleRequest<any[]>(supabase.from('simulados').select('*').eq('user_id', user.id).order('date', { ascending: false }));
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
        deleteAll: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) return handleRequest(supabase.from('simulados').delete().eq('user_id', user.id));
        },
        // Note: Simulados effectively embed subjects in JSON 'results', so we can't simple delete by subject_id column
        // Handling must be done application side or by updating the JSONB
    },

    // Scheduled Studies
    schedule: {
        list: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            const data = await handleRequest<any[]>(supabase.from('scheduled_studies').select('*').eq('user_id', user.id).order('date', { ascending: true }));
            return (data || []).map((i: any) => ({
                id: i.id,
                date: i.date.split('T')[0], // Ensure YYYY-MM-DD only
                subjectId: i.subject_id,
                topicId: i.topic_id,
                activityType: i.activity_type,
                notes: i.notes,
                durationInMinutes: i.duration_minutes,
                questionsDone: i.questions_done,
                questionsCorrect: i.questions_correct,
                // 'status' column does NOT exist in the DB table.
                // Status is managed purely on the client side (localStorage).
                status: 'realizado' as const
            }));
        },
        create: async (item: Omit<ScheduledStudy, 'id' | 'user_id' | 'created_at'> & { id?: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Do NOT send 'status' — that column does not exist in the DB table.
            const result = await handleRequest<any>(supabase.from('scheduled_studies').insert({
                id: item.id,
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
            
            if (!result) return null;
            
            return {
                id: result.id,
                date: result.date.split('T')[0],
                subjectId: result.subject_id,
                topicId: result.topic_id,
                activityType: result.activity_type,
                notes: result.notes,
                durationInMinutes: result.duration_minutes,
                questionsDone: result.questions_done,
                questionsCorrect: result.questions_correct,
                status: item.status || 'realizado'
            } as ScheduledStudy;
        },
        update: async (id: string, updates: Partial<ScheduledStudy>) => {
            const dbPayload: any = {};
            if (updates.subjectId) dbPayload.subject_id = updates.subjectId;
            if (updates.topicId) dbPayload.topic_id = updates.topicId;
            if (updates.activityType) dbPayload.activity_type = updates.activityType;
            if (updates.notes !== undefined) dbPayload.notes = updates.notes;
            if (updates.durationInMinutes !== undefined) dbPayload.duration_minutes = updates.durationInMinutes;
            if (updates.questionsDone !== undefined) dbPayload.questions_done = updates.questionsDone;
            if (updates.questionsCorrect !== undefined) dbPayload.questions_correct = updates.questionsCorrect;
            // Do NOT send 'status' — column does not exist in DB
            if (updates.date) dbPayload.date = updates.date;

            return handleRequest(supabase.from('scheduled_studies').update(dbPayload).eq('id', id));
        },
        delete: async (id: string) => handleRequest(supabase.from('scheduled_studies').delete().eq('id', id)),
        deleteBySubject: async (subjectId: string) => handleRequest(supabase.from('scheduled_studies').delete().eq('subject_id', subjectId)),
        deleteAll: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) return handleRequest(supabase.from('scheduled_studies').delete().eq('user_id', user.id));
        },
    },

    // Daily Goals
    dailyGoals: {
        list: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            const data = await handleRequest<any[]>(supabase.from('daily_goals').select('*').eq('user_id', user.id).order('date', { ascending: false }));
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
        },
        deleteAll: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) return handleRequest(supabase.from('daily_goals').delete().eq('user_id', user.id));
        }
    },

    // Logs
    logs: {
        list: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            return handleRequest<LogEntry[]>(supabase.from('logs').select('*').eq('user_id', user.id).order('timestamp', { ascending: false }).limit(50));
        },
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
