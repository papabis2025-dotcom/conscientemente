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
        // Optimistic Update
        setSessions(prev => [...prev, session]);

        try {
            await api.sessions.create(session);

            // Auto schedule logic preserved
            const sessionDate = session.date.split('T')[0];
            const activityType = session.isSimulado ? 'Simulado' : session.questionsDone !== undefined ? 'Questões' : 'Leitura';

            // Check existence locally to save a read
            const alreadyExists = scheduledStudies.some(s =>
                s.date === sessionDate &&
                s.subjectId === session.subjectId &&
                s.activityType === activityType &&
                (s.topicId === session.topicId)
            );

            if (!alreadyExists) {
                const newScheduled: ScheduledStudy = {
                    id: `temp-${Date.now()}`, // Temp ID
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
        } catch (e) {
            console.error('Error adding session:', e);
            // Revert optimistic update if needed or show toast
        }
    };

    const addSimulado = async (sim: Simulado) => {
        setSimulados(prev => [...prev, sim]);
        try {
            await api.simulados.create(sim);
            // Also add implied sessions
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
                addSession(session); // This handles API call for session
            });
        } catch (e) {
            console.error('Error adding simulado:', e);
        }
    };

    // Legacy support for setting concursos directly (e.g. from UI import)
    // We strictly should create API methods for this, but for now let's wrap it
    const updateConcursos = async (newConcursos: Concurso[]) => {
        setConcursos(newConcursos);
        // This is complex because determining which one is new/updated/deleted from a full array replace is hard.
        // Ideally UI calls addConcurso or updateConcurso.
        // For now, we assume this is mostly used for adding/editing active one or initial setup.
        // We will just log a warning that bulk update is not fully sync-safe yet.
        console.warn('Bulk update of concursos is local-only optimized. Use specific methods for persistence.');
    };

    return {
        currentUser, setCurrentUser,
        users, setUsers: updateUser,
        concursos, setConcursos: updateConcursos,
        selectedConcursoId, setSelectedConcursoId,
        sessions, setSessions,
        simulados, setSimulados,
        scheduledStudies, setScheduledStudies,
        dailyGoals, setDailyGoals,
        logs, setLogs,
        theme, toggleTheme,
        lastSaved, isSaving: isLoading, // Reusing isSaving to show loading state
        filteredSubjects,
        activeConcurso,
        handleManualSave,
        handleLogout,
        addSession,
        addSimulado
    };
};
