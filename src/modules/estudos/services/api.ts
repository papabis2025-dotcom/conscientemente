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
            // Try selecting with questions_link and activity_type; fall back if columns don't exist
            let result = await supabase.from('study_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false });
            if (result.error && result.error.code === '42703') {
                result = await supabase.from('study_sessions')
                    .select('id,user_id,subject_id,topic_id,duration_minutes,date,questions_done,questions_correct,is_simulado,activity_type')
                    .eq('user_id', user.id).order('date', { ascending: false });
                
                if (result.error && result.error.code === '42703') {
                    result = await supabase.from('study_sessions')
                        .select('id,user_id,subject_id,topic_id,duration_minutes,date,questions_done,questions_correct,is_simulado')
                        .eq('user_id', user.id).order('date', { ascending: false });
                }
            }
            const data = result.error ? null : result.data;
            if (result.error && result.error.code !== '42703') {
                console.error('Supabase API Error:', JSON.stringify(result.error, null, 2));
                throw result.error;
            }
            return (data || []).map((s: any) => ({
                id: s.id,
                subjectId: s.subject_id,
                topicId: s.topic_id,
                durationInMinutes: s.duration_minutes,
                date: s.date,
                questionsDone: s.questions_done,
                questionsCorrect: s.questions_correct,
                isSimulado: s.is_simulado,
                activityType: s.activity_type,
                questionsLink: s.questions_link || undefined
            }));
        },
        create: async (session: Omit<StudySession, 'id' | 'user_id' | 'created_at'> & { id?: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const rawDate = session.date;
            // Normaliza para ISO string com hora fixa (meio-dia UTC) para evitar ambiguidade de fuso horario.
            // Se ja e ISO completo (tem 'T'), usa diretamente; se e so data (YYYY-MM-DD), adiciona T12:00:00Z.
            const normalizedDate = rawDate.includes('T')
                ? rawDate
                : `${rawDate}T12:00:00.000Z`;

            const dbPayload = {
                id: session.id, // Allow explicit ID
                user_id: user.id,
                subject_id: session.subjectId,
                topic_id: session.topicId,
                duration_minutes: session.durationInMinutes,
                date: normalizedDate,
                questions_done: session.questionsDone,
                questions_correct: session.questionsCorrect,
                is_simulado: session.isSimulado,
                activity_type: session.activityType || null,
                questions_link: session.questionsLink || null
            };

            // Try with questions_link and activity_type first
            let result = await supabase.from('study_sessions').insert(dbPayload).select().single();
            if (result.error && result.error.code === '42703') {
                // Column questions_link doesn't exist yet — retry without it
                const { questions_link, ...payloadWithoutLink } = dbPayload as any;
                result = await supabase.from('study_sessions').insert(payloadWithoutLink).select().single();
                
                if (result.error && result.error.code === '42703') {
                    // activity_type column also doesn't exist yet
                    const { activity_type, ...payloadWithoutBoth } = payloadWithoutLink;
                    result = await supabase.from('study_sessions').insert(payloadWithoutBoth).select().single();
                }
            }
            return handleRequest(Promise.resolve(result));
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
            if (updates.activityType !== undefined) {
                dbPayload.activity_type = updates.activityType;
            }
            if (updates.questionsLink !== undefined) {
                dbPayload.questions_link = updates.questionsLink;
            }

            let updateResult = await supabase.from('study_sessions').update(dbPayload).eq('id', id);
            if (updateResult.error && updateResult.error.code === '42703') {
                const { questions_link, ...payloadWithoutLink } = dbPayload;
                updateResult = await supabase.from('study_sessions').update(payloadWithoutLink).eq('id', id);
                if (updateResult.error && updateResult.error.code === '42703') {
                    const { activity_type, ...payloadWithoutBoth } = payloadWithoutLink;
                    updateResult = await supabase.from('study_sessions').update(payloadWithoutBoth).eq('id', id);
                }
            }
            return handleRequest(Promise.resolve(updateResult));
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
            return (data || []).map((s: any) => {
                let durationInMinutes = 0;
                let results = s.results;
                
                // Se results for um objeto com a estrutura nova
                if (s.results && !Array.isArray(s.results) && typeof s.results === 'object') {
                    durationInMinutes = s.results.durationInMinutes || 0;
                    results = s.results.subjectResults || [];
                }
                
                return {
                    id: s.id,
                    name: s.name,
                    date: s.date,
                    totalQuestions: s.total_questions,
                    results: results,
                    durationInMinutes: durationInMinutes
                };
            });
        },
        create: async (simulado: Omit<Simulado, 'user_id' | 'created_at'> & { id?: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const payloadResults = {
                durationInMinutes: simulado.durationInMinutes || 0,
                subjectResults: simulado.results || []
            };

            const data = await handleRequest<any>(supabase.from('simulados').insert({
                id: simulado.id || crypto.randomUUID(),
                user_id: user.id,
                name: simulado.name,
                date: simulado.date,
                total_questions: simulado.totalQuestions,
                results: payloadResults
            }).select().single());

            if (!data) return null;

            return {
                id: data.id,
                name: data.name,
                date: data.date,
                totalQuestions: data.total_questions,
                results: simulado.results,
                durationInMinutes: simulado.durationInMinutes || 0
            } as any;
        },
        update: async (id: string, simulado: Simulado) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const payloadResults = {
                durationInMinutes: simulado.durationInMinutes || 0,
                subjectResults: simulado.results || []
            };

            return handleRequest(supabase.from('simulados').update({
                name: simulado.name,
                date: simulado.date,
                total_questions: simulado.totalQuestions,
                results: payloadResults
            }).eq('id', id));
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

            // Limit to scheduled studies from 6 months ago to optimize Supabase Egress
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const dateLimit = sixMonthsAgo.toISOString().split('T')[0];

            let result = await supabase.from('scheduled_studies')
                .select('*')
                .eq('user_id', user.id)
                .gte('date', dateLimit)
                .order('date', { ascending: true });

            if (result.error && result.error.code === '42703') {
                result = await supabase.from('scheduled_studies')
                    .select('id,date,subject_id,topic_id,activity_type,notes,duration_minutes,questions_done,questions_correct')
                    .eq('user_id', user.id)
                    .gte('date', dateLimit)
                    .order('date', { ascending: true });
            }
            const data = result.error ? null : result.data;
            if (result.error && result.error.code !== '42703') {
                console.error('Supabase API Error:', JSON.stringify(result.error, null, 2));
                throw result.error;
            }
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
                questionsLink: i.questions_link || undefined,
                status: 'planejado' as const
            }));
        },
        create: async (item: Omit<ScheduledStudy, 'id' | 'status'> & { id?: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Do NOT send 'status' — that column does not exist in the DB table.
            const dbPayload = {
                id: item.id,
                user_id: user.id,
                date: item.date,
                subject_id: item.subjectId,
                topic_id: item.topicId,
                activity_type: item.activityType,
                notes: item.notes,
                duration_minutes: item.durationInMinutes,
                questions_done: item.questionsDone,
                questions_correct: item.questionsCorrect,
                questions_link: item.questionsLink || null
            };

            let result = await supabase.from('scheduled_studies').insert(dbPayload).select().single();
            if (result.error && result.error.code === '42703') {
                const { questions_link, ...payloadWithout } = dbPayload as any;
                result = await supabase.from('scheduled_studies').insert(payloadWithout).select().single();
            }
            
            const rData = result.error ? null : result.data;
            if (result.error) {
                console.error('Supabase API Error:', JSON.stringify(result.error, null, 2));
                throw result.error;
            }
            
            return {
                id: rData.id,
                date: rData.date.split('T')[0],
                subjectId: rData.subject_id,
                topicId: rData.topic_id,
                activityType: rData.activity_type,
                notes: rData.notes,
                durationInMinutes: rData.duration_minutes,
                questionsDone: rData.questions_done,
                questionsCorrect: rData.questions_correct,
                questionsLink: rData.questions_link || undefined,
                status: item.status || 'planejado'
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
            if (updates.date) dbPayload.date = updates.date;
            if (updates.questionsLink !== undefined) {
                dbPayload.questions_link = updates.questionsLink;
            }

            let result = await supabase.from('scheduled_studies').update(dbPayload).eq('id', id);
            if (result.error && result.error.code === '42703') {
                const { questions_link, ...payloadWithout } = dbPayload;
                result = await supabase.from('scheduled_studies').update(payloadWithout).eq('id', id);
            }
            return handleRequest(Promise.resolve(result));
        },
        delete: async (id: string) => handleRequest(supabase.from('scheduled_studies').delete().eq('id', id)),
        deleteBySubject: async (subjectId: string) => handleRequest(supabase.from('scheduled_studies').delete().eq('subject_id', subjectId)),
        deleteAll: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) return handleRequest(supabase.from('scheduled_studies').delete().eq('user_id', user.id));
        },
        createBatch: async (items: (Omit<ScheduledStudy, 'id' | 'status'> & { id?: string })[]) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const dbPayloads = items.map(item => ({
                id: item.id || crypto.randomUUID(),
                user_id: user.id,
                date: item.date,
                subject_id: item.subjectId,
                topic_id: item.topicId || null,
                activity_type: item.activityType || null,
                notes: item.notes || null,
                duration_minutes: item.durationInMinutes || 0,
                questions_done: item.questionsDone || 0,
                questions_correct: item.questionsCorrect || 0,
                questions_link: item.questionsLink || null
            }));

            let result = await supabase.from('scheduled_studies').insert(dbPayloads).select();
            if (result.error && result.error.code === '42703') {
                const payloadsWithout = dbPayloads.map(({ questions_link, ...rest }) => rest);
                result = await supabase.from('scheduled_studies').insert(payloadsWithout).select();
            }
            
            const rData = result.error ? null : result.data;
            if (result.error) {
                console.error('Supabase API Error:', JSON.stringify(result.error, null, 2));
                throw result.error;
            }

            return rData.map((r: any) => ({
                id: r.id,
                date: r.date.split('T')[0],
                subjectId: r.subject_id,
                topicId: r.topic_id,
                activityType: r.activity_type,
                notes: r.notes,
                durationInMinutes: r.duration_minutes,
                questionsDone: r.questions_done,
                questionsCorrect: r.questions_correct,
                questionsLink: r.questions_link || undefined,
                status: 'planejado' as const
            }));
        },
        deleteBatch: async (ids: string[]) => {
            if (ids.length === 0) return;
            return handleRequest(supabase.from('scheduled_studies').delete().in('id', ids));
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
