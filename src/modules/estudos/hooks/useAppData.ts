import { useState, useEffect, useCallback, useMemo } from 'react';
import { Subject, StudySession, Concurso, ScheduledStudy, DailyGoal, LogEntry, User, Simulado, ActivityType } from '../types';
import { supabase } from '../services/supabase';
import { api } from '../services/api';

export const useAppData = (externalTheme?: 'light' | 'dark', externalToggleTheme?: () => void) => {
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

    const updateStudyTasks = (newTasks: { id: string, subjectId: string, subjectName: string, topicId?: string, topicName?: string, done: boolean, date: string }[]) => {
        const subIds = new Set((concursos.find(c => c.id === selectedConcursoId)?.subjects || []).map(s => s.id));
        setStudyTasks(prev => {
            const preserved = prev.filter(t => !subIds.has(t.subjectId));
            const updated = [...preserved, ...newTasks];
            localStorage.setItem('cp_study_tasks', JSON.stringify(updated));
            return updated;
        });
    };

    useEffect(() => {
        const handleSync = () => {
            try {
                const savedConcurso = localStorage.getItem('cp_selected_concurso_id');
                if (savedConcurso) setSelectedConcursoIdState(savedConcurso);
                
                const savedScheduled = localStorage.getItem('cp_scheduled_studies');
                if (savedScheduled) setScheduledStudies(JSON.parse(savedScheduled));
                
                const savedGoal = localStorage.getItem('cp_global_daily_goal');
                if (savedGoal) setGlobalDailyGoalState(parseInt(savedGoal));
                
                const savedTasks = localStorage.getItem('cp_study_tasks');
                if (savedTasks) setStudyTasks(JSON.parse(savedTasks));
            } catch (e) {
                console.error('Error syncing estudos app data:', e);
            }
        };
        window.addEventListener('local-storage-sync', handleSync);
        window.addEventListener('storage', handleSync);
        return () => {
            window.removeEventListener('local-storage-sync', handleSync);
            window.removeEventListener('storage', handleSync);
        };
    }, []);

    // Theme logic remains local for now to avoid flickering before auth loads
    const [localTheme, setLocalTheme] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('cn_theme');
        return (saved === 'dark' || saved === 'light') ? saved : 'dark';
    });

    const theme = externalTheme || localTheme;
    const toggleTheme = externalToggleTheme || (() => setLocalTheme(t => t === 'dark' ? 'light' : 'dark'));

    // Theme Sync
    useEffect(() => {
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('cn_theme', theme);
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
                // Server is the source of truth for WHICH items exist.
                // Reconstruct status based on matching session existence, falling back to local state.
                const localRaw = localStorage.getItem('cp_scheduled_studies');
                const localStudies: ScheduledStudy[] = localRaw ? JSON.parse(localRaw) : [];
                const localStatusMap = new Map(localStudies.map(s => [s.id, s.status]));
                const sessionIds = new Set(sessionsData?.map(s => s.id) || []);

                const finalSchedule: ScheduledStudy[] = scheduleData.map(s => {
                    let status: 'planejado' | 'realizado' = 'planejado';
                    if (localStatusMap.has(s.id)) {
                        status = localStatusMap.get(s.id) as 'planejado' | 'realizado';
                    } else if (sessionIds.has(s.id)) {
                        status = 'realizado';
                    }
                    return {
                        ...s,
                        status
                    };
                });

                setScheduledStudies(finalSchedule);
                localStorage.setItem('cp_scheduled_studies', JSON.stringify(finalSchedule));
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
        let subscription: any = null;

        supabase.auth.getSession()
            .then(({ data }) => {
                const session = data?.session;
                if (session?.user) {
                    setCurrentUser({
                        id: session.user.id,
                        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Estudante',
                        password: '',
                        avatar: session.user.user_metadata?.avatar || '🎓',
                        email: session.user.email
                    });
                } else {
                    setIsLoading(false);
                }
            })
            .catch(err => {
                console.error('Error in studies getSession:', err);
                setIsLoading(false);
            });

        try {
            const { data } = supabase.auth.onAuthStateChange((_event, session) => {
                if (session?.user) {
                    setCurrentUser({
                        id: session.user.id,
                        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Estudante',
                        password: '',
                        avatar: session.user.user_metadata?.avatar || '🎓',
                        email: session.user.email
                    });
                } else {
                    setCurrentUser(null);
                    setConcursos([]);
                    setSessions([]);
                    setSimulados([]);
                    setIsLoading(false);
                }
            });
            subscription = data?.subscription;
        } catch (err) {
            console.error('Error in studies onAuthStateChange:', err);
        }

        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
        };
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

    const filteredSessions = useMemo(() => {
        if (selectedConcursoId === 'all') return sessions;
        const subIds = new Set((activeConcurso?.subjects || []).map(s => s.id));
        return sessions.filter(s => subIds.has(s.subjectId));
    }, [sessions, selectedConcursoId, activeConcurso]);

    const filteredSimulados = useMemo(() => {
        if (selectedConcursoId === 'all') return simulados;
        const subIds = new Set((activeConcurso?.subjects || []).map(s => s.id));
        return simulados.filter(sim => 
            sim.results && sim.results.some(r => subIds.has(r.subjectId))
        );
    }, [simulados, selectedConcursoId, activeConcurso]);

    const filteredScheduledStudies = useMemo(() => {
        if (selectedConcursoId === 'all') return scheduledStudies;
        const subIds = new Set((activeConcurso?.subjects || []).map(s => s.id));
        return scheduledStudies.filter(s => subIds.has(s.subjectId));
    }, [scheduledStudies, selectedConcursoId, activeConcurso]);

    const filteredStudyTasks = useMemo(() => {
        if (selectedConcursoId === 'all') return studyTasks;
        const subIds = new Set((activeConcurso?.subjects || []).map(s => s.id));
        return studyTasks.filter(t => subIds.has(t.subjectId));
    }, [studyTasks, selectedConcursoId, activeConcurso]);

    const updateUser = (users: User[]) => setUsers(users); // Legacy

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
    };

    // Actions that now persist immediately
    const addSession = async (session: StudySession) => {
        setSaveError(null);
        // Optimistically add session to local state
        setSessions(prev => [...prev, session]);

        const sessionDate = session.date.split('T')[0];
        const activityType = session.activityType || (session.isSimulado ? 'Simulado' : session.questionsDone !== undefined ? 'Questões' : 'Leitura');

        // Use the same ID to link the session and the scheduled entry.
        const scheduleId = session.id;
        const newScheduled: ScheduledStudy = {
            id: scheduleId,
            date: sessionDate,
            subjectId: session.subjectId,
            topicId: session.topicId,
            activityType: activityType as ActivityType,
            durationInMinutes: session.durationInMinutes,
            questionsDone: session.questionsDone,
            questionsCorrect: session.questionsCorrect,
            status: 'realizado'
        };

        // Optimistically add schedule entry to local state
        setScheduledStudies(prev => {
            const updated = [...prev, newScheduled];
            localStorage.setItem('cp_scheduled_studies', JSON.stringify(updated));
            return updated;
        });

        // Persist session to DB
        try {
            await api.sessions.create(session);
        } catch (e) {
            console.error('Error saving session to DB:', e);
            // Don't block schedule creation — local state already updated
        }

        // Persist schedule entry to DB
        try {
            const saved = await api.schedule.create(newScheduled);
            if (saved && saved.id && saved.id !== scheduleId) {
                // If server assigned a different ID, sync it locally
                const syncedEntry: ScheduledStudy = { ...newScheduled, id: saved.id };
                setScheduledStudies(prev => {
                    const updated = prev.map(s => s.id === scheduleId ? syncedEntry : s);
                    localStorage.setItem('cp_scheduled_studies', JSON.stringify(updated));
                    return updated;
                });
            }
        } catch (e) {
            console.error('Error saving schedule entry to DB:', e);
            // Local state already updated; schedule entry survives in localStorage
        }

        // Log
        try {
            addLog({
                message: `Sessão de ${activityType} registrada: ${session.durationInMinutes} min`,
                type: 'success'
            });
        } catch (e) { /* non-critical */ }

        setLastSaved(new Date().toLocaleTimeString());
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
        const simToDelete = simulados.find(s => s.id === id);
        setSimulados(prev => prev.filter(s => s.id !== id));
        try {
            await api.simulados.delete(id);
            
            // Delete associated sessions that were automatically created
            if (simToDelete) {
                // The exact date string used when creating the session
                const targetDate = new Date(`${simToDelete.date}T12:00:00`).toISOString();
                const sessionsToDelete = sessions.filter(s => s.isSimulado && s.date === targetDate);
                
                for (const sess of sessionsToDelete) {
                    await deleteSession(sess.id);
                }
            }
            
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

    const updateScheduledStudy = async (id: string, updates: Partial<ScheduledStudy>) => {
        setSaveError(null);
        const existing = scheduledStudies.find(s => s.id === id);
        if (!existing) return;

        const merged = { ...existing, ...updates };

        setScheduledStudies(prev => {
            const updated = prev.map(s => s.id === id ? merged : s);
            localStorage.setItem('cp_scheduled_studies', JSON.stringify(updated));
            return updated;
        });

        if (merged.status === 'realizado') {
            const existingSession = sessions.find(s => s.id === id);
            const newSessionPayload: StudySession = {
                id: id,
                subjectId: merged.subjectId,
                topicId: merged.topicId,
                durationInMinutes: merged.durationInMinutes || 0,
                date: new Date(`${merged.date}T12:00:00`).toISOString(),
                questionsDone: merged.questionsDone,
                questionsCorrect: merged.questionsCorrect,
                activityType: merged.activityType
            };

            if (existingSession) {
                setSessions(prev => prev.map(s => s.id === id ? newSessionPayload : s));
                try {
                    await api.sessions.update(id, newSessionPayload);
                } catch (e) {
                    console.error('Error updating study session:', e);
                }
            } else {
                setSessions(prev => [...prev, newSessionPayload]);
                try {
                    await api.sessions.create(newSessionPayload);
                } catch (e) {
                    console.error('Error creating study session:', e);
                }
            }
        } else {
            const existingSession = sessions.find(s => s.id === id);
            if (existingSession) {
                setSessions(prev => prev.filter(s => s.id !== id));
                try {
                    await api.sessions.delete(id);
                } catch (e) {
                    console.error('Error deleting study session:', e);
                }
            }
        }

        try {
            await api.schedule.update(id, updates);
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error updating scheduled study:', e);
            setSaveError('Erro ao atualizar item na agenda.');
        }
    };

    const updateScheduledStudies = async (newSchedule: ScheduledStudy[]) => {
        setSaveError(null);
        const subIds = new Set((concursos.find(c => c.id === selectedConcursoId)?.subjects || []).map(s => s.id));
        const previousIds = new Set(scheduledStudies.filter(s => subIds.has(s.subjectId)).map(s => s.id));
        
        setScheduledStudies(prev => {
            const preserved = prev.filter(s => !subIds.has(s.subjectId));
            const updated = [...preserved, ...newSchedule];
            localStorage.setItem('cp_scheduled_studies', JSON.stringify(updated));
            return updated;
        });

        const newItems = newSchedule.filter(item => !previousIds.has(item.id));
        try {
            for (const item of newItems) {
                await api.schedule.create(item);
            }
            if (newItems.length > 0) setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error creating schedule items:', e);
            setSaveError('Erro ao salvar item na agenda.');
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

    const toggleScheduledStudyStatus = async (id: string) => {
        const study = scheduledStudies.find(s => s.id === id);
        if (!study) return;

        const newStatus: 'planejado' | 'realizado' = study.status === 'realizado' ? 'planejado' : 'realizado';

        // Status is purely client-side (DB has no 'status' column).
        // Update local state + localStorage only.
        setScheduledStudies(prev => {
            const updated = prev.map(s => s.id === id ? { ...s, status: newStatus } : s);
            localStorage.setItem('cp_scheduled_studies', JSON.stringify(updated));
            return updated;
        });

        if (newStatus === 'planejado') {
            setSessions(prev => prev.filter(s => s.id !== id));
            try { await api.sessions.delete(id); } catch(e) {}
        } else {
            const newSession: StudySession = {
                id: study.id,
                subjectId: study.subjectId,
                topicId: study.topicId,
                durationInMinutes: study.durationInMinutes || 0,
                date: new Date(`${study.date}T12:00:00`).toISOString(),
                questionsDone: study.questionsDone,
                questionsCorrect: study.questionsCorrect,
                activityType: study.activityType
            };
            setSessions(prev => [...prev, newSession]);
            try { await api.sessions.create(newSession); } catch(e) {}
        }
    };

    return {
        currentUser, setCurrentUser,
        users, setUsers: updateUser,
        concursos, setConcursos: updateConcursos,
        selectedConcursoId, setSelectedConcursoId,
        sessions: filteredSessions, setSessions: (s: any) => s, // Disabled direct set
        simulados: filteredSimulados, setSimulados: (s: any) => s, // Disabled direct set
        scheduledStudies: filteredScheduledStudies, setScheduledStudies: updateScheduledStudies, deleteScheduledStudy, updateScheduledStudy,
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
        studyTasks: filteredStudyTasks,
        setStudyTasks: updateStudyTasks,
        toggleScheduledStudyStatus,
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
                // Clear all data - robust deletion via API
                await api.concursos.deleteAll();
                await api.sessions.deleteAll();
                await api.simulados.deleteAll();
                await api.schedule.deleteAll();
                await api.dailyGoals.deleteAll();
                await api.logs.clear();

                setConcursos([]);
                setSessions([]);
                setSimulados([]);
                setScheduledStudies([]);
                setDailyGoals([]);
                setLogs([]);
                setStudyTasks([]);
                setGlobalDailyGoal(20);
                localStorage.removeItem('cp_scheduled_studies');
                localStorage.removeItem('cp_study_tasks');
                localStorage.removeItem('cp_global_daily_goal');
                setLastSaved(new Date().toLocaleTimeString());
                return true;
            } catch (e) {
                console.error("Error resetting data:", e);
                return false;
            } finally {
                setIsLoading(false);
            }
        },
        resetStudyHubDataOnly: async () => {
            setIsLoading(true);
            try {
                await api.sessions.deleteAll();
                await api.simulados.deleteAll();
                await api.schedule.deleteAll();
                await api.dailyGoals.deleteAll();
                await api.logs.clear();

                setSessions([]);
                setSimulados([]);
                setScheduledStudies([]);
                setDailyGoals([]);
                setLogs([]);
                setStudyTasks([]);
                setGlobalDailyGoal(20);
                localStorage.removeItem('cp_scheduled_studies');
                localStorage.removeItem('cp_study_tasks');
                localStorage.removeItem('cp_global_daily_goal');
                setLastSaved(new Date().toLocaleTimeString());
                return true;
            } catch (e) {
                console.error("Error resetting study hub data:", e);
                return false;
            } finally {
                setIsLoading(false);
            }
        }
    };
};
