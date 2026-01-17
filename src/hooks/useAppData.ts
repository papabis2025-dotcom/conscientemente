import { useState, useEffect, useCallback, useMemo } from 'react';
import { Subject, StudySession, Concurso, ScheduledStudy, DailyGoal, LogEntry, User, Simulado } from '../types';
import { INITIAL_CONCURSOS } from '../constants';
import { supabase } from '../services/supabase';
import { api } from '../services/api';

export const useAppData = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]); // Keeping for legacy/compatibility
    const [isLoading, setIsLoading] = useState(true);

    const [concursos, setConcursos] = useState<Concurso[]>([]);
    const [selectedConcursoId, setSelectedConcursoId] = useState<string | 'all'>('all');
    const [sessions, setSessions] = useState<StudySession[]>([]);
    const [simulados, setSimulados] = useState<Simulado[]>([]);
    const [scheduledStudies, setScheduledStudies] = useState<ScheduledStudy[]>([]);
    const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const [autoSave, setAutoSave] = useState<boolean>(true); // Kept for UI compatibility, but save is now distinct
    const [lastSaved, setLastSaved] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

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
            if (scheduleData) setScheduledStudies(scheduleData);
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
                    avatar: '🎓'
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
                    avatar: '🎓'
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

    const filteredSubjects = useMemo(() => {
        if (selectedConcursoId === 'all') {
            const allSubs = concursos.flatMap(c => c.subjects);
            // Unique by ID
            const uniqueMap = new Map();
            allSubs.forEach(s => uniqueMap.set(s.id, s));
            return Array.from(uniqueMap.values());
        }
        return activeConcurso?.subjects || [];
    }, [concursos, selectedConcursoId, activeConcurso]);

    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

    const updateUser = (users: User[]) => setUsers(users); // Legacy

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
    };

    // Actions that now persist immediately
    const addSession = async (session: StudySession) => {
        setSessions(prev => [...prev, session]);
        try {
            await api.sessions.create(session);
            const sessionDate = session.date.split('T')[0];
            const activityType = session.isSimulado ? 'Simulado' : session.questionsDone !== undefined ? 'Questões' : 'Leitura';

            const alreadyExists = scheduledStudies.some(s =>
                s.date === sessionDate &&
                s.subjectId === session.subjectId &&
                s.activityType === activityType &&
                (s.topicId === session.topicId)
            );

            if (!alreadyExists) {
                const newScheduled: ScheduledStudy = {
                    id: `temp-${Date.now()}`,
                    date: sessionDate,
                    subjectId: session.subjectId,
                    topicId: session.topicId,
                    activityType: activityType as any,
                    durationInMinutes: session.durationInMinutes,
                    questionsDone: session.questionsDone,
                    questionsCorrect: session.questionsCorrect
                };
                setScheduledStudies(prev => [...prev, newScheduled]);
                await api.schedule.create(newScheduled);
            }
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error adding session:', e);
        }
    };

    const addSimulado = async (sim: Simulado) => {
        setSimulados(prev => [...prev, sim]);
        try {
            await api.simulados.create(sim);
            sim.results.forEach(async res => {
                const session: StudySession = {
                    id: `temp-sim-${sim.id}-${res.subjectId}`,
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
        }
    };

    const deleteSimulado = async (id: string) => {
        setSimulados(prev => prev.filter(s => s.id !== id));
        try {
            await api.simulados.delete(id);
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error deleting simulado:', e);
        }
    };

    const deleteSession = async (id: string) => {
        setSessions(prev => prev.filter(s => s.id !== id));
        try {
            await api.sessions.delete(id);
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error deleting session:', e);
        }
    };

    const updateConcursos = async (newConcursos: Concurso[]) => {
        // This is a bulk setter. To persist, we need to find what changed.
        // For simplicity, we'll upsert all of them (Supabase handles it) or find the new ones.
        setConcursos(newConcursos);
        setIsSaving(true);
        try {
            // Find deleted ones
            const deletedIds = concursos.filter(c => !newConcursos.find(nc => nc.id === c.id)).map(c => c.id);
            for (const id of deletedIds) await api.concursos.delete(id);

            // Upsert remaining/new
            for (const conc of newConcursos) {
                await api.concursos.upsert(conc);
            }
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error updating concursos:', e);
        } finally {
            setIsSaving(false);
        }
    };

    const updateScheduledStudies = async (newSchedule: ScheduledStudy[]) => {
        setScheduledStudies(newSchedule);
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
        }
    };

    const updateDailyGoals = async (newGoals: DailyGoal[]) => {
        setDailyGoals(newGoals);
        try {
            for (const goal of newGoals) await api.dailyGoals.upsert(goal);
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error updating goals:', e);
        }
    };

    const clearLogs = async () => {
        setLogs([]);
        try {
            await api.logs.clear();
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error clearing logs:', e);
        }
    };

    const deleteLog = async (id: string) => {
        // Logs don't have individual delete in my schema yet, but for UI:
        setLogs(prev => prev.filter(l => l.id !== id));
    };

    return {
        currentUser, setCurrentUser,
        users, setUsers: updateUser,
        concursos, setConcursos: updateConcursos,
        selectedConcursoId, setSelectedConcursoId,
        sessions, setSessions: (s: any) => s, // Disabled direct set
        simulados, setSimulados: (s: any) => s, // Disabled direct set
        scheduledStudies, setScheduledStudies: updateScheduledStudies,
        dailyGoals, setDailyGoals: updateDailyGoals,
        logs, setLogs: (s: any) => s, // Disabled direct set
        theme, toggleTheme,
        lastSaved, isSaving,
        filteredSubjects,
        activeConcurso,
        handleManualSave,
        handleLogout,
        addSession,
        addSimulado,
        deleteSimulado,
        deleteSession,
        clearLogs,
        deleteLog
    };
};
