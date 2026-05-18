import { useState, useEffect, useCallback, useMemo } from 'react';
import { Subject, StudySession, Concurso, ScheduledStudy, DailyGoal, LogEntry, User, Simulado } from '../types';
import { supabase } from '../services/supabase';
import { api } from '../services/api';

export const useAppData = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]); // Keeping for legacy/compatibility
    const [isLoading, setIsLoading] = useState(true);

    const [concursos, setConcursos] = useState<Concurso[]>([]);
    const [selectedConcursoId, setSelectedConcursoIdState] = useState<string | 'all'>(() => {
        const saved = localStorage.getItem('cp_selected_concurso_id');
        return saved || 'all';
    });

    const setSelectedConcursoId = (id: string | 'all') => {
        setSelectedConcursoIdState(id);
        localStorage.setItem('cp_selected_concurso_id', id);
    };
    const [sessions, setSessions] = useState<StudySession[]>([]);
    const [simulados, setSimulados] = useState<Simulado[]>([]);
    const [scheduledStudies, setScheduledStudies] = useState<ScheduledStudy[]>(() => {
        const saved = localStorage.getItem('cp_scheduled_studies');
        return saved ? JSON.parse(saved) : [];
    });
    const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // AutoSave removed as per new architecture (save-on-action)
    const [lastSaved, setLastSaved] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Global Daily Goal (persisted in localStorage for simplicity as per plan)
    const [globalDailyGoal, setGlobalDailyGoalState] = useState<number>(() => {
        const saved = localStorage.getItem('cp_global_daily_goal');
        return saved ? parseInt(saved) : 20; // Default 20
    });

    const setGlobalDailyGoal = (goal: number) => {
        setGlobalDailyGoalState(goal);
        localStorage.setItem('cp_global_daily_goal', goal.toString());
    };

    // Study Plan Tasks State
    const [studyTasks, setStudyTasks] = useState<{ id: string, subjectId: string, subjectName: string, topicId?: string, topicName?: string, done: boolean, date: string }[]>(() => {
        const saved = localStorage.getItem('cp_study_tasks');
        return saved ? JSON.parse(saved) : [];
    });

    const updateStudyTasks = (tasks: { id: string, subjectId: string, subjectName: string, topicId?: string, topicName?: string, done: boolean, date: string }[]) => {
        setStudyTasks(tasks);
        localStorage.setItem('cp_study_tasks', JSON.stringify(tasks));
    };

    // Theme logic remains local for now to avoid flickering before auth loads
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('cp_theme');
        return (saved === 'dark' || saved === 'light') ? saved : 'light';
    });

    // Theme Sync
    useEffect(() => {
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('cp_theme', theme);
    }, [theme]);

    // Initial Data Fetch
    const fetchData = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const [concursosData, sessionsData, simuladosData, scheduleData, goalsData, logsData] = await Promise.all([
                api.concursos.list(),
                api.sessions.list(),
                api.simulados.list(),
                api.schedule.list(),
                api.dailyGoals.list(),
                api.logs.list()
            ]);

            if (concursosData) setConcursos(concursosData);
            if (sessionsData) setSessions(sessionsData);
            if (simuladosData) setSimulados(simuladosData);
            if (scheduleData) {
                setScheduledStudies(scheduleData);
                localStorage.setItem('cp_scheduled_studies', JSON.stringify(scheduleData));
            }
            if (goalsData) setDailyGoals(goalsData);
            if (logsData) setLogs(logsData);

            setLastSaved(new Date().toLocaleTimeString());
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    // Supabase Auth and User Setup
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setCurrentUser({
                    id: session.user.id,
                    name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Estudante',
                    password: '',
                    avatar: session.user.user_metadata?.avatar || '🎓'
                });
            } else {
                setIsLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setCurrentUser({
                    id: session.user.id,
                    name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Estudante',
                    password: '',
                    avatar: session.user.user_metadata?.avatar || '🎓'
                });
            } else {
                setCurrentUser(null);
                setConcursos([]);
                setSessions([]);
                setSimulados([]);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Trigger Fetch on User Change
    useEffect(() => {
        if (currentUser) {
            fetchData();
        }
    }, [currentUser, fetchData]);


    // Wrapper for legacy compatibility in UI (handleManualSave was used for everything)
    // Now creates a sync effect or does nothing as we save on action
    const handleManualSave = useCallback(async () => {
        // In this new architecture, save happens on action. 
        // We can use this to perhaps force a re-fetch or sync check.
        await fetchData();
        setLastSaved(new Date().toLocaleTimeString());
    }, [fetchData]);


    const activeConcurso = useMemo(() => concursos.find(c => c.id === selectedConcursoId), [concursos, selectedConcursoId]);

    const allSubjects = useMemo(() => {
        const allSubs = concursos.flatMap(c => c.subjects || []);
        // Unique by ID to avoid duplicates if any (though rare in this schema)
        const uniqueMap = new Map();
        allSubs.forEach(s => uniqueMap.set(s.id, s));
        return Array.from(uniqueMap.values());
    }, [concursos]);

    const filteredSubjects = useMemo(() => {
        if (selectedConcursoId === 'all') {
            return allSubjects;
        }
        return activeConcurso?.subjects || [];
    }, [selectedConcursoId, activeConcurso, allSubjects]);

    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

    const updateUser = (users: User[]) => setUsers(users); // Legacy

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
    };

    // Actions that now persist immediately
    const addSession = async (session: StudySession) => {
        setSaveError(null);
        setSessions(prev => [...prev, session]);
        try {
            await api.sessions.create(session);
            const sessionDate = session.date.split('T')[0];
            // Use provided activityType if available, otherwise infer
            const activityType = session.activityType || (session.isSimulado ? 'Simulado' : session.questionsDone !== undefined ? 'Questões' : 'Leitura');

            // Now we rely on the user's intent. If they added it, we show it.
            // SHARED ID: Use session.id so that deleting one can delete the other
            const sharedId = session.id;
            const newScheduled: ScheduledStudy = {
                id: sharedId,
                date: sessionDate,
                subjectId: session.subjectId,
                topicId: session.topicId,
                activityType: activityType as any,
                durationInMinutes: session.durationInMinutes,
                questionsDone: session.questionsDone,
                questionsCorrect: session.questionsCorrect
            };
            setScheduledStudies(prev => {
                const updated = [...prev, newScheduled];
                localStorage.setItem('cp_scheduled_studies', JSON.stringify(updated));
                return updated;
            });

            // Generate automatic log for the session
            addLog({
                message: `Sessão de ${activityType} registrada: ${session.durationInMinutes} min`,
                type: 'success'
            });

            // ...
            /* 
              We expect `saved` to have the correct ID and DATE.
            */
            const saved = await api.schedule.create(newScheduled);

            if (saved) {
                // Ensure date match to avoid disappearing items if server returns full timestamp
                const normalizedSaved = { ...saved, date: saved.date.split('T')[0] };
                setScheduledStudies(prev => prev.map(s => s.id === sharedId ? normalizedSaved : s));
            }

            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error adding session:', e);
            setSaveError('Erro ao salvar sessão. Tente novamente.');
        }
    };

    const addSimulado = async (sim: Simulado) => {
        setSaveError(null);
        setSimulados(prev => [...prev, sim]);
        try {
            await api.simulados.create(sim);
            sim.results.forEach(async res => {
                const session: StudySession = {
                    id: crypto.randomUUID(),
                    subjectId: res.subjectId,
                    date: new Date(`${sim.date}T12:00:00`).toISOString(),
                    durationInMinutes: 0,
                    questionsDone: res.done,
                    questionsCorrect: res.correct,
                    isSimulado: true
                };
                addSession(session);
            });
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error adding simulado:', e);
            setSaveError('Erro ao salvar simulado.');
        }
    };

    const deleteSimulado = async (id: string) => {
        setSaveError(null);
        setSimulados(prev => prev.filter(s => s.id !== id));
        try {
            await api.simulados.delete(id);
            // Also delete linked sessions? Simulado sessions are distinct in current implementation (separate copies)
            // But if they are linked by an ID we could. Currently addSimulado creates new sessions with NEW IDs.
            // So no direct link to delete them unless we track them. For now, we leave them or standard deletion applies.
            // User requested: "remova todas questões... dessa disciplina". Simulado is higher level.
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error deleting simulado:', e);
            setSaveError('Erro ao excluir simulado.');
        }
    };

    const deleteSession = async (id: string) => {
        setSaveError(null);
        // Cascade: Remove from sessions AND schedule
        setSessions(prev => prev.filter(s => s.id !== id));
        setScheduledStudies(prev => {
            const updated = prev.filter(s => s.id !== id);
            localStorage.setItem('cp_scheduled_studies', JSON.stringify(updated));
            return updated;
        }); // Assumes shared ID
        try {
            await api.sessions.delete(id);
            await api.schedule.delete(id); // Cascade
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error deleting session:', e);
            setSaveError('Erro ao excluir sessão.');
        }
    };

    const updateConcursos = async (newConcursos: Concurso[]) => {
        setSaveError(null);
        setConcursos(newConcursos);
        setIsSaving(true);
        try {
            // Find deleted concursos
            const deletedIds = concursos.filter(c => !newConcursos.find(nc => nc.id === c.id)).map(c => c.id);
            for (const id of deletedIds) await api.concursos.delete(id);

            // Find removed subjects (Cascading Delete)
            const oldSubjects = concursos.flatMap(c => c.subjects || []);
            const newSubjects = newConcursos.flatMap(c => c.subjects || []);
            const removedSubjectIds = oldSubjects.filter(os => !newSubjects.find(ns => ns.id === os.id)).map(s => s.id);

            if (removedSubjectIds.length > 0) {
                console.log('Cascading delete for subjects:', removedSubjectIds);
                // Update local state
                setSessions(prev => prev.filter(s => !removedSubjectIds.includes(s.subjectId)));
                setScheduledStudies(prev => prev.filter(s => !removedSubjectIds.includes(s.subjectId)));
                // Simulados: Remove result rows for this subject
                setSimulados(prev => prev.map(sim => ({
                    ...sim,
                    results: sim.results.filter(r => !removedSubjectIds.includes(r.subjectId))
                })));

                // Update DB
                for (const subId of removedSubjectIds) {
                    await api.sessions.deleteBySubject(subId);
                    await api.schedule.deleteBySubject(subId);
                    // For simulados, we'd need to update each simulado's JSON.
                    // Since specific API for "delete result from simulado" doesn't exist, we rely on the simulado object update later if needed?
                    // Or we just accept they might have stale data in JSON until updated. 
                    // Given the prompt, cleaning sessions/schedule is the priority.
                }
            }

            // Find changed/new concursos by comparing with previous state
            for (const newConc of newConcursos) {
                const oldConc = concursos.find(c => c.id === newConc.id);

                // If it's new or if subjects changed, upsert it
                if (!oldConc || JSON.stringify(oldConc.subjects) !== JSON.stringify(newConc.subjects) ||
                    oldConc.name !== newConc.name || oldConc.banca !== newConc.banca) {
                    console.log('Upserting concurso:', newConc.id, newConc.name);
                    const upserted = await api.concursos.upsert(newConc);
                    if (upserted && upserted.id !== newConc.id) {
                        // Update local ID if it changed (e.g. from ai-... to uuid)
                        setConcursos(prev => prev.map(c => c.id === newConc.id ? { ...c, id: upserted.id } : c));
                    }
                }
            }
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error updating concursos:', e);
            setSaveError('Erro ao atualizar concursos.');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteScheduledStudy = async (id: string) => {
        setSaveError(null);
        // Cascade: Remove from schedule AND sessions
        setScheduledStudies(prev => {
            const updated = prev.filter(s => s.id !== id);
            localStorage.setItem('cp_scheduled_studies', JSON.stringify(updated));
            return updated;
        });
        setSessions(prev => prev.filter(s => s.id !== id)); // Assumes shared ID
        try {
            await api.schedule.delete(id);
            await api.sessions.delete(id); // Cascade
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error deleting schedule item:', e);
            setSaveError('Erro ao excluir item da agenda.');
        }
    };

    const updateScheduledStudies = async (newSchedule: ScheduledStudy[]) => {
        setSaveError(null);
        setScheduledStudies(newSchedule);
        localStorage.setItem('cp_scheduled_studies', JSON.stringify(newSchedule));
        // Handle as bulk for now, but better would be specific actions
        try {
            // Very basic sync for schedule
            for (const item of newSchedule) {
                if (item.id.includes('temp-')) {
                    await api.schedule.create(item);
                } else {
                    await api.schedule.update(item.id, item);
                }
            }
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error updating schedule:', e);
            setSaveError('Erro ao atualizar agenda.');
        }
    };

    const updateDailyGoals = async (newGoals: DailyGoal[]) => {
        setSaveError(null);
        setDailyGoals(newGoals);
        try {
            for (const goal of newGoals) await api.dailyGoals.upsert(goal);
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error updating goals:', e);
            setSaveError('Erro ao atualizar metas.');
        }
    };

    const clearLogs = async () => {
        setSaveError(null);
        setLogs([]);
        try {
            await api.logs.clear();
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error clearing logs:', e);
            setSaveError('Erro ao limpar logs.');
        }
    };

    const deleteLog = async (id: string) => {
        // Logs don't have individual delete in my schema yet, but for UI:
        setLogs(prev => prev.filter(l => l.id !== id));
    };

    const addLog = async (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
        const newLog: LogEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            ...entry
        };
        setLogs(prev => [newLog, ...prev]);
        try {
            await api.logs.create(newLog);
        } catch (e) {
            console.error('Error adding log:', e);
        }
    };

    return {
        currentUser, setCurrentUser,
        users, setUsers: updateUser,
        concursos, setConcursos: updateConcursos,
        selectedConcursoId, setSelectedConcursoId,
        sessions, setSessions: (s: any) => s, // Disabled direct set
        simulados, setSimulados: (s: any) => s, // Disabled direct set
        scheduledStudies, setScheduledStudies: updateScheduledStudies, deleteScheduledStudy,
        dailyGoals, setDailyGoals: updateDailyGoals,
        logs, setLogs: (s: any) => s, // Disabled direct set
        theme, toggleTheme,
        lastSaved, isSaving, saveError,
        filteredSubjects,
        allSubjects,
        activeConcurso,
        handleManualSave,
        handleLogout,
        addSession,
        addSimulado,
        deleteSimulado,
        deleteSession,
        clearLogs,
        deleteLog,
        addLog,
        globalDailyGoal,
        setGlobalDailyGoal,
        studyTasks,
        setStudyTasks: updateStudyTasks,
        updateProfile: async (name: string, avatar: string) => {
            if (!currentUser) return;
            const updated = { ...currentUser, name, avatar };
            setCurrentUser(updated);
            try {
                // Update specific table
                await api.profiles.update({ name, avatar });
                // ALSO update auth metadata so it loads correctly on session refresh
                await supabase.auth.updateUser({
                    data: { name, avatar }
                });
            } catch (e) {
                console.error('Error updating profile:', e);
            }
        },
        resetAllData: async () => {
            setIsLoading(true);
            try {
                // Clear all data - robust deletion via API loops
                for (const c of concursos) await api.concursos.delete(c.id);
                for (const s of sessions) await api.sessions.delete(s.id);
                for (const s of simulados) await api.simulados.delete(s.id);
                for (const s of scheduledStudies) await api.schedule.delete(s.id);
                for (const g of dailyGoals) await api.dailyGoals.upsert({ ...g, questionsTarget: 0 }); // or delete logic
                await api.logs.clear();

                setConcursos([]);
                setSessions([]);
                setSimulados([]);
                setScheduledStudies([]);
                setDailyGoals([]);
                setLogs([]);
                setLastSaved(new Date().toLocaleTimeString());
                return true;
            } catch (e) {
                console.error("Error resetting data:", e);
                return false;
            } finally {
                setIsLoading(false);
            }
        }
    };
};
