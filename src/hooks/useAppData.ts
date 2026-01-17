import { useState, useEffect, useCallback, useMemo } from 'react';
import { Subject, StudySession, Concurso, ScheduledStudy, DailyGoal, LogEntry, User, Simulado } from '../types';
import { INITIAL_CONCURSOS } from '../constants';
import { supabase } from '../services/supabase';

export const useAppData = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]); // Keeping for legacy/compatibility if needed, but primary auth is Supabase

    const [concursos, setConcursos] = useState<Concurso[]>([]);
    const [selectedConcursoId, setSelectedConcursoId] = useState<string | 'all'>('all');
    const [sessions, setSessions] = useState<StudySession[]>([]);
    const [simulados, setSimulados] = useState<Simulado[]>([]);
    const [scheduledStudies, setScheduledStudies] = useState<ScheduledStudy[]>([]);
    const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const [autoSave, setAutoSave] = useState<boolean>(true);
    const [lastSaved, setLastSaved] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
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

    // Supabase Auth Listener
    useEffect(() => {
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setCurrentUser({
                    id: session.user.id,
                    name: session.user.email?.split('@')[0] || 'Estudante',
                    password: '', // Not needed
                    avatar: '🎓'
                });
            }
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setCurrentUser({
                    id: session.user.id,
                    name: session.user.email?.split('@')[0] || 'Estudante',
                    password: '',
                    avatar: '🎓'
                });
            } else {
                setCurrentUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load User Data based on UID
    useEffect(() => {
        if (!currentUser) return;
        const uid = currentUser.id;

        // In the future, these would be supabase.from('...').select() calls
        // For now, we keep localStorage but keyed by the Supabase UID
        setConcursos(JSON.parse(localStorage.getItem(`cp_concursos_${uid}`) || JSON.stringify(INITIAL_CONCURSOS)));
        setSessions(JSON.parse(localStorage.getItem(`cp_sessions_${uid}`) || '[]'));
        setSimulados(JSON.parse(localStorage.getItem(`cp_simulados_${uid}`) || '[]'));
        setScheduledStudies(JSON.parse(localStorage.getItem(`cp_schedule_${uid}`) || '[]'));
        setDailyGoals(JSON.parse(localStorage.getItem(`cp_daily_goals_${uid}`) || '[]'));
        setLogs(JSON.parse(localStorage.getItem(`cp_logs_${uid}`) || '[]'));
        setSelectedConcursoId(localStorage.getItem(`cp_active_concurso_id_${uid}`) || 'all');
        setLastSaved(new Date().toLocaleTimeString());
    }, [currentUser]);

    // Save Data
    const handleManualSave = useCallback(() => {
        if (!currentUser) return;
        setIsSaving(true);
        const uid = currentUser.id;
        // In the future: await supabase.from('...').upsert(...)
        localStorage.setItem(`cp_concursos_${uid}`, JSON.stringify(concursos));
        localStorage.setItem(`cp_sessions_${uid}`, JSON.stringify(sessions));
        localStorage.setItem(`cp_simulados_${uid}`, JSON.stringify(simulados));
        localStorage.setItem(`cp_schedule_${uid}`, JSON.stringify(scheduledStudies));
        localStorage.setItem(`cp_daily_goals_${uid}`, JSON.stringify(dailyGoals));
        localStorage.setItem(`cp_logs_${uid}`, JSON.stringify(logs));
        localStorage.setItem(`cp_active_concurso_id_${uid}`, selectedConcursoId);
        setTimeout(() => {
            setLastSaved(new Date().toLocaleTimeString());
            setIsSaving(false);
        }, 400);
    }, [currentUser, concursos, sessions, simulados, scheduledStudies, dailyGoals, logs, selectedConcursoId]);

    // Auto Save
    useEffect(() => {
        if (currentUser && autoSave) {
            const timer = setTimeout(() => handleManualSave(), 3000);
            return () => clearTimeout(timer);
        }
    }, [concursos, sessions, simulados, scheduledStudies, dailyGoals, logs, selectedConcursoId, autoSave, handleManualSave, currentUser]);

    const activeConcurso = useMemo(() => concursos.find(c => c.id === selectedConcursoId), [concursos, selectedConcursoId]);

    const filteredSubjects = useMemo(() => {
        if (selectedConcursoId === 'all') {
            const allSubs = concursos.flatMap(c => c.subjects);
            const uniqueIds = new Set();
            return allSubs.filter(s => {
                if (uniqueIds.has(s.id)) return false;
                uniqueIds.add(s.id);
                return true;
            });
        }
        return activeConcurso?.subjects || [];
    }, [concursos, selectedConcursoId, activeConcurso]);

    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

    const updateUser = (users: User[]) => {
        setUsers(users);
    };

    const handleLogout = async () => {
        handleManualSave();
        await supabase.auth.signOut();
        setCurrentUser(null);
    };

    const addSession = (session: StudySession) => {
        setSessions(prev => [...prev, session]);

        const sessionDate = session.date.split('T')[0];
        const activityType = session.isSimulado ? 'Simulado' : session.questionsDone !== undefined ? 'Questões' : 'Leitura';

        setScheduledStudies(prev => {
            const alreadyExists = prev.some(s =>
                s.date === sessionDate &&
                s.subjectId === session.subjectId &&
                s.activityType === activityType &&
                (s.topicId === session.topicId)
            );

            if (alreadyExists) return prev;

            const newScheduled: ScheduledStudy = {
                id: `sync-cal-${Date.now()}-${Math.random()}`,
                date: sessionDate,
                subjectId: session.subjectId,
                topicId: session.topicId,
                activityType: activityType,
                durationInMinutes: session.durationInMinutes,
                questionsDone: session.questionsDone,
                questionsCorrect: session.questionsCorrect
            };
            return [...prev, newScheduled];
        });
    };

    const addSimulado = (sim: Simulado) => {
        setSimulados(prev => [...prev, sim]);
        sim.results.forEach(res => {
            const session: StudySession = {
                id: `sim-res-${sim.id}-${res.subjectId}`,
                subjectId: res.subjectId,
                date: new Date(`${sim.date}T12:00:00`).toISOString(),
                durationInMinutes: 0,
                questionsDone: res.done,
                questionsCorrect: res.correct,
                isSimulado: true
            };
            addSession(session);
        });
    };

    return {
        currentUser, setCurrentUser,
        users, setUsers: updateUser,
        concursos, setConcursos,
        selectedConcursoId, setSelectedConcursoId,
        sessions, setSessions,
        simulados, setSimulados,
        scheduledStudies, setScheduledStudies,
        dailyGoals, setDailyGoals,
        logs, setLogs,
        theme, toggleTheme,
        lastSaved, isSaving,
        filteredSubjects,
        activeConcurso,
        handleManualSave,
        handleLogout,
        addSession,
        addSimulado
    };
};
