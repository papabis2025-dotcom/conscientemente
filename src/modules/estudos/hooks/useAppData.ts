import { useState, useEffect, useCallback, useMemo } from 'react';
import { Subject, StudySession, Concurso, ScheduledStudy, DailyGoal, LogEntry, User, Simulado, ActivityType } from '../types';
import { supabase } from '../services/supabase';
import { api } from '../services/api';

const getDeterministicSessionId = (simId: string, subjectId: string): string => {
    if (simId.length < 36 || subjectId.length < 36) {
        return crypto.randomUUID();
    }
    return `${simId.substring(0, 18)}${subjectId.substring(18)}`;
};

const getDeterministicReviewId = (subId: string, topicId: string | undefined, lastSessId: string, idx: number): string => {
    const cleanSub = subId.toLowerCase().replace(/-/g, '').padEnd(32, '0');
    const cleanTopic = (topicId || 'geral').toLowerCase().replace(/-/g, '').padEnd(32, '0');
    const cleanSess = lastSessId.toLowerCase().replace(/-/g, '').padEnd(32, '0');
    
    const part1 = cleanSub.substring(0, 8);
    const part2 = cleanTopic.substring(8, 12);
    const part3 = cleanSess.substring(12, 16);
    const part4 = `400${idx}`;
    const part5 = cleanSess.substring(16, 28);
    return `${part1}-${part2}-${part3}-${part4}-${part5}`;
};


const parseNotesGroup = (notes: string) => {
    const match = notes?.match(/^\[groupId:([^\]]+)\](.*)/s);
    if (match) {
        return { groupId: match[1], cleanNotes: match[2].trim() };
    }
    return { groupId: null, cleanNotes: notes || '' };
};

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
        window.dispatchEvent(new Event('local-settings-changed'));
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
        window.dispatchEvent(new Event('local-settings-changed'));
    };

    const getLocalDateString = (dateStr: string | undefined): string => {
        if (!dateStr) return '';
        if (dateStr.length === 10) return dateStr;
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr.split('T')[0];
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        } catch (e) {
            return dateStr.split('T')[0];
        }
    };

    const getActivityTag = useCallback((subjectId: string | undefined, dateStr: string | undefined, topicTitle?: string | undefined): string => {
        if (!subjectId || !dateStr) return '';
        
        let foundConcurso: Concurso | undefined;
        let foundSubject: Subject | undefined;
        
        for (const c of concursos) {
            const s = (c.subjects || []).find(sub => sub.id === subjectId);
            if (s) {
                foundConcurso = c;
                foundSubject = s;
                break;
            }
        }
        
        if (!foundConcurso || !foundSubject) {
            return '';
        }
        
        let concursoPart = foundConcurso.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase();
        
        let subjectPart = 'MAT';
        if (foundSubject.name) {
            const words = foundSubject.name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9\s]/g, '')
                .split(/\s+/);
                
            const ignoreList = ['de', 'do', 'da', 'e', 'em', 'para', 'com', 'por', 'o', 'a', 'os', 'as', 'dos', 'das'];
            const filteredWords = words.filter(w => w && !ignoreList.includes(w.toLowerCase()));
            
            if (filteredWords.length > 1) {
                subjectPart = filteredWords.map(w => w[0]).join('').toUpperCase();
            } else if (filteredWords.length === 1) {
                const singleWord = filteredWords[0];
                if (singleWord.length <= 3) {
                    subjectPart = singleWord.toUpperCase();
                } else {
                    subjectPart = singleWord.substring(0, 3).toUpperCase();
                }
            }
        }
        
        let topicPart = '';
        if (topicTitle && topicTitle !== 'Geral / Outros') {
            const cleanedTopic = topicTitle
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9]/g, '')
                .toUpperCase();
            if (cleanedTopic.length > 0) {
                topicPart = cleanedTopic.substring(0, 3);
            }
        }
        
        let datePart = '';
        try {
            const cleanDate = dateStr.split('T')[0];
            const parts = cleanDate.split('-');
            if (parts.length === 3) {
                const year = parts[0].substring(2);
                const month = parts[1];
                const day = parts[2];
                datePart = `${day}${month}${year}`;
            }
        } catch (e) {
            console.error('Error formatting date for tag:', e);
        }
        
        return `#${concursoPart}${subjectPart}${topicPart}${datePart}`;
    }, [concursos]);

    // Study Plan Tasks State
    const [studyTasks, setStudyTasks] = useState<{ id: string, subjectId: string, subjectName: string, topicId?: string, topicName?: string, done: boolean, date: string }[]>(() => {
        const saved = localStorage.getItem('cp_study_tasks');
        return saved ? JSON.parse(saved) : [];
    });

    const updateStudyTasks = (newTasks: { id: string, subjectId: string, subjectName: string, topicId?: string, topicName?: string, done: boolean, date: string }[]) => {
        const subIds = new Set((concursos.find(c => c.id === selectedConcursoId)?.subjects || []).map(s => s.id));
        
        // Find deleted tasks: tasks for these subjects that are not in newTasks
        const tasksToDelete = studyTasks.filter(t => subIds.has(t.subjectId) && !newTasks.find(nt => nt.id === t.id));
        if (tasksToDelete.length > 0) {
            try {
                const deletedRaw = localStorage.getItem('cp_deleted_study_task_ids') || '[]';
                const deletedList = JSON.parse(deletedRaw);
                let modified = false;
                tasksToDelete.forEach(t => {
                    if (!deletedList.includes(t.id)) {
                        deletedList.push(t.id);
                        modified = true;
                    }
                });
                if (modified) {
                    localStorage.setItem('cp_deleted_study_task_ids', JSON.stringify(deletedList));
                }
            } catch (e) {
                console.error('Error tracking deleted study tasks:', e);
            }
        }

        setStudyTasks(prev => {
            const preserved = prev.filter(t => !subIds.has(t.subjectId));
            const updated = [...preserved, ...newTasks];
            localStorage.setItem('cp_study_tasks', JSON.stringify(updated));
            window.dispatchEvent(new Event('local-settings-changed'));
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

    const syncSimuladoSessions = useCallback(async (activeSims: Simulado[], allSess: StudySession[]) => {
        const expectedSessions: StudySession[] = [];
        activeSims.forEach(sim => {
            const totalQuestionsDone = sim.results.reduce((sum, r) => sum + (r.done || 0), 0);
            sim.results.forEach(res => {
                let durationPerSubject = 0;
                if (sim.durationInMinutes) {
                    if (totalQuestionsDone > 0) {
                        durationPerSubject = Math.round(sim.durationInMinutes * (res.done || 0) / totalQuestionsDone);
                    } else {
                        durationPerSubject = Math.round(sim.durationInMinutes / sim.results.length);
                    }
                }
                expectedSessions.push({
                    id: getDeterministicSessionId(sim.id, res.subjectId),
                    subjectId: res.subjectId,
                    date: new Date(`${sim.date}T12:00:00`).toISOString(),
                    durationInMinutes: durationPerSubject,
                    questionsDone: res.done,
                    questionsCorrect: res.correct,
                    isSimulado: true
                });
            });
        });

        const expectedIds = new Set(expectedSessions.map(s => s.id));

        const sessionsToDelete = allSess.filter(s => 
            (s.isSimulado || s.activityType === 'Simulado') && !expectedIds.has(s.id)
        );

        const currentIds = new Set(allSess.map(s => s.id));
        const sessionsToCreate = expectedSessions.filter(s => !currentIds.has(s.id));

        const sessionsToUpdate: StudySession[] = [];
        expectedSessions.forEach(es => {
            const existing = allSess.find(s => s.id === es.id);
            if (existing) {
                if (existing.durationInMinutes !== es.durationInMinutes || 
                    existing.questionsDone !== es.questionsDone || 
                    existing.questionsCorrect !== es.questionsCorrect) {
                    sessionsToUpdate.push(es);
                }
            }
        });

        if (sessionsToDelete.length > 0) {
            console.log('Syncing simulados: deleting obsolete sessions:', sessionsToDelete.map(s => s.id));
            for (const s of sessionsToDelete) {
                try {
                    await api.sessions.delete(s.id);
                    await api.schedule.delete(s.id);
                } catch (e) {
                    console.error('Error deleting obsolete session:', s.id, e);
                }
            }
        }

        if (sessionsToCreate.length > 0) {
            console.log('Syncing simulados: creating missing sessions:', sessionsToCreate.map(s => s.id));
            for (const s of sessionsToCreate) {
                try {
                    await api.sessions.create(s);
                    const sessionDate = s.date.split('T')[0];
                    const newScheduled: ScheduledStudy = {
                        id: s.id,
                        date: sessionDate,
                        subjectId: s.subjectId,
                        activityType: 'Simulado',
                        durationInMinutes: s.durationInMinutes,
                        questionsDone: s.questionsDone,
                        questionsCorrect: s.questionsCorrect,
                        status: 'realizado'
                    };
                    await api.schedule.create(newScheduled);
                } catch (e) {
                    console.error('Error creating missing session:', s.id, e);
                }
            }
        }

        if (sessionsToUpdate.length > 0) {
            console.log('Syncing simulados: updating modified sessions:', sessionsToUpdate.map(s => s.id));
            for (const s of sessionsToUpdate) {
                try {
                    await api.sessions.update(s.id, s);
                    await api.schedule.update(s.id, {
                        durationInMinutes: s.durationInMinutes,
                        questionsDone: s.questionsDone,
                        questionsCorrect: s.questionsCorrect
                    });
                } catch (e) {
                    console.error('Error updating modified session:', s.id, e);
                }
            }
        }

        if (sessionsToDelete.length > 0 || sessionsToCreate.length > 0 || sessionsToUpdate.length > 0) {
            setSessions(prev => {
                const filtered = prev.filter(s => !sessionsToDelete.some(td => td.id === s.id) && !sessionsToUpdate.some(tu => tu.id === s.id));
                const combined = [...filtered, ...sessionsToCreate, ...sessionsToUpdate];
                return combined;
            });

            setScheduledStudies(prev => {
                const filtered = prev.filter(s => !sessionsToDelete.some(td => td.id === s.id) && !sessionsToUpdate.some(tu => tu.id === s.id));
                const newScheduledItems = [...sessionsToCreate, ...sessionsToUpdate].map(s => ({
                    id: s.id,
                    date: s.date.split('T')[0],
                    subjectId: s.subjectId,
                    activityType: 'Simulado' as const,
                    durationInMinutes: s.durationInMinutes,
                    questionsDone: s.questionsDone,
                    questionsCorrect: s.questionsCorrect,
                    status: 'realizado' as const
                }));
                const combined = [...filtered, ...newScheduledItems];
                localStorage.setItem('cp_scheduled_studies', JSON.stringify(combined));
                window.dispatchEvent(new Event('local-settings-changed'));
                return combined;
            });
        }
    }, []);

    const syncPlannedReviewsDb = useCallback(async (allSess: StudySession[], allSchedule: ScheduledStudy[], allConcursos: Concurso[]) => {
        let customReviewDays = [7, 30, 90, 15, 45];
        try {
            const saved = localStorage.getItem('estudos_custom_review_days');
            if (saved) customReviewDays = JSON.parse(saved);
        } catch (e) {
            console.error('Error reading custom review days:', e);
        }

        const expectedReviews: ScheduledStudy[] = [];

        allConcursos.forEach(concurso => {
            const isReviewsDisabled = localStorage.getItem(`estudos_disabled_reviews_${concurso.id}`) === 'true';
            if (isReviewsDisabled) return;

            (concurso.subjects || []).forEach(subject => {
                const topicsList = [{ id: 'geral', title: 'Geral / Outros' }, ...(subject.topics || [])];
                topicsList.forEach(topic => {
                    const isSimuladoSession = (s: StudySession) => s.isSimulado || s.activityType === 'Simulado';
                    const isRevisaoSession = (s: StudySession) => {
                        const isRevType = s.activityType && (
                            s.activityType.toLowerCase().includes('revisão') || 
                            s.activityType.toLowerCase().includes('revisao')
                        );
                        const isRevNotes = (s as any).notes && (
                            (s as any).notes.toLowerCase().includes('revisão') || 
                            (s as any).notes.toLowerCase().includes('revisao')
                        );
                        const matchingSched = allSchedule.find(sched => sched.id === s.id);
                        const isRevId = matchingSched && matchingSched.activityType && (
                            matchingSched.activityType.toLowerCase().includes('revisão') || 
                            matchingSched.activityType.toLowerCase().includes('revisao')
                        );
                        const isRevCompleted = matchingSched && 
                            matchingSched.status === 'realizado' &&
                            matchingSched.activityType && (
                                matchingSched.activityType.toLowerCase().includes('revisão') || 
                                matchingSched.activityType.toLowerCase().includes('revisao')
                            );
                        const isDeterministic = s.id && s.id.split('-')[3]?.startsWith('400');
                        return !!(isRevType || isRevNotes || isRevId || isRevCompleted || isDeterministic);
                    };

                    const topicSessions = allSess.filter(s =>
                        s.subjectId === subject.id &&
                        (topic.id === 'geral' ? !s.topicId : s.topicId === topic.id) &&
                        !isSimuladoSession(s) &&
                        !isRevisaoSession(s)
                    );

                    if (topicSessions.length > 0) {
                        const sorted = [...topicSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        const latestSession = sorted[0];
                        
                        const sessionDateStr = getLocalDateString(latestSession.date);
                        const parts = sessionDateStr.split('-');
                        const year = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1;
                        const day = parseInt(parts[2], 10);

                        customReviewDays.forEach((days, idx) => {
                            const plannedDate = new Date(year, month, day);
                            plannedDate.setDate(plannedDate.getDate() + days);

                            const yyyy = plannedDate.getFullYear();
                            const mm = String(plannedDate.getMonth() + 1).padStart(2, '0');
                            const dd = String(plannedDate.getDate()).padStart(2, '0');
                            const dateStr = `${yyyy}-${mm}-${dd}`;

                            if (concurso.targetDate) {
                                const examDateStr = concurso.targetDate.split('T')[0];
                                if (dateStr > examDateStr) return;
                            }

                            const reviewId = getDeterministicReviewId(subject.id, topic.id === 'geral' ? undefined : topic.id, latestSession.id, idx);
                            
                            const tag = getActivityTag(subject.id, dateStr, topic.id === 'geral' ? undefined : topic.title);

                            // A partir de 10/07/2026, revisões originadas de dias de estudos diferentes não se agrupam.
                            // Para isso, anexamos a data do estudo de origem (sessionDateStr) ao groupId.
                            const isAfterTargetDate = dateStr >= '2026-07-10';
                            const groupSuffix = isAfterTargetDate ? `_from_${sessionDateStr}` : '';
                            const groupId = `rev_${subject.id}_${dateStr}${groupSuffix}`;

                            expectedReviews.push({
                                id: reviewId,
                                date: dateStr,
                                subjectId: subject.id,
                                topicId: topic.id === 'geral' ? undefined : topic.id,
                                activityType: 'Revisão',
                                notes: `[groupId:${groupId}] ${tag} - Revisão automática (${days}d)`,
                                durationInMinutes: 30,
                                questionsDone: 10,
                                questionsCorrect: 8,
                                status: 'planejado',
                                questionsLink: latestSession.questionsLink
                            });
                        });
                    }
                });
            });
        });

        const expectedIds = new Set(expectedReviews.map(r => r.id));

        // Deduplicação ativa por tag de negócio para evitar duplicidade de revisões planejadas
        const activeReviewTagsFound = new Set<string>();
        const duplicateReviewsToDelete: ScheduledStudy[] = [];

        allSchedule.forEach(s => {
            const isReview = s.activityType && (
                s.activityType.toLowerCase().includes('revisão') || 
                s.activityType.toLowerCase().includes('revisao')
            );
            if (isReview && s.status === 'planejado') {
                let topicTitle: string | undefined;
                if (s.topicId) {
                    const conc = allConcursos.find(c => (c.subjects || []).some(sub => sub.id === s.subjectId));
                    const subj = conc?.subjects.find(sub => sub.id === s.subjectId);
                    const top = subj?.topics.find(t => t.id === s.topicId);
                    topicTitle = top?.title;
                }
                const tag = getActivityTag(s.subjectId, s.date, topicTitle);
                
                if (tag) {
                    if (activeReviewTagsFound.has(tag)) {
                        duplicateReviewsToDelete.push(s);
                    } else {
                        activeReviewTagsFound.add(tag);
                    }
                }
            }
        });

        const uniqueToDeleteMap = new Map<string, ScheduledStudy>();
        
        // 1. Adicionar revisões obsoletas (cujo ID determinístico não é mais esperado)
        allSchedule.forEach(s => {
            const isObsolete = s.activityType && (
                s.activityType.toLowerCase().includes('revisão') || 
                s.activityType.toLowerCase().includes('revisao')
            ) && 
            s.status === 'planejado' && 
            s.id && s.id.split('-')[3]?.startsWith('400') &&
            !expectedIds.has(s.id);
            
            if (isObsolete) {
                uniqueToDeleteMap.set(s.id, s);
            }
        });

        // 2. Adicionar as duplicadas ativas
        duplicateReviewsToDelete.forEach(s => {
            uniqueToDeleteMap.set(s.id, s);
        });

        const reviewsToDelete = Array.from(uniqueToDeleteMap.values());

        const completedReviewIds = new Set(
            allSchedule
                .filter(s => s.status === 'realizado' && s.activityType && (
                    s.activityType.toLowerCase().includes('revisão') || 
                    s.activityType.toLowerCase().includes('revisao')
                ))
                .map(s => s.id)
        );

        const completedReviewKeys = new Set(
            allSchedule
                .filter(s => s.status === 'realizado' && s.activityType && (
                    s.activityType.toLowerCase().includes('revisão') || 
                    s.activityType.toLowerCase().includes('revisao')
                ))
                .map(s => `${s.subjectId}_${s.topicId || 'geral'}_${s.date}`)
        );

        let deletedReviewIds: string[] = [];
        try {
            const savedDeleted = localStorage.getItem('estudos_deleted_review_ids');
            if (savedDeleted) deletedReviewIds = JSON.parse(savedDeleted);
        } catch (e) {
            console.error('Error reading deleted review IDs:', e);
        }

        // Tags de revisões planejadas remanescentes que não serão deletadas
        const remainingPlannedTags = new Set<string>();
        allSchedule.forEach(s => {
            const isReview = s.activityType && (
                s.activityType.toLowerCase().includes('revisão') || 
                s.activityType.toLowerCase().includes('revisao')
            );
            if (isReview && s.status === 'planejado' && !uniqueToDeleteMap.has(s.id)) {
                let topicTitle: string | undefined;
                if (s.topicId) {
                    const conc = allConcursos.find(c => (c.subjects || []).some(sub => sub.id === s.subjectId));
                    const subj = conc?.subjects.find(sub => sub.id === s.subjectId);
                    const top = subj?.topics.find(t => t.id === s.topicId);
                    topicTitle = top?.title;
                }
                const tag = getActivityTag(s.subjectId, s.date, topicTitle);
                if (tag) remainingPlannedTags.add(tag);
            }
        });

        const currentIds = new Set(allSchedule.map(s => s.id));
        
        // Só criamos a revisão esperada se a tag de negócio planejada correspondente ainda não existir no cronograma
        const reviewsToCreate = expectedReviews.filter(r => {
            let expectedTopicTitle: string | undefined;
            if (r.topicId) {
                const conc = allConcursos.find(c => (c.subjects || []).some(sub => sub.id === r.subjectId));
                const subj = conc?.subjects.find(sub => sub.id === r.subjectId);
                const top = subj?.topics.find(t => t.id === r.topicId);
                expectedTopicTitle = top?.title;
            }
            const expectedTag = getActivityTag(r.subjectId, r.date, expectedTopicTitle);

            return !currentIds.has(r.id) && 
                   !deletedReviewIds.includes(r.id) &&
                   !completedReviewIds.has(r.id) &&
                   !completedReviewKeys.has(`${r.subjectId}_${r.topicId || 'geral'}_${r.date}`) &&
                   !remainingPlannedTags.has(expectedTag);
        });

        const currentScheduleMap = new Map(allSchedule.map(s => [s.id, s]));
        const reviewsToUpdate: ScheduledStudy[] = [];
        expectedReviews.forEach(expected => {
            const current = currentScheduleMap.get(expected.id);
            if (current && current.status !== 'realizado' && (current.notes !== expected.notes || current.date !== expected.date)) {
                reviewsToUpdate.push({
                    ...current,
                    notes: expected.notes,
                    date: expected.date
                });
            }
        });

        if (reviewsToDelete.length > 0) {
            console.log('Syncing planned reviews: deleting obsolete/duplicate reviews:', reviewsToDelete.map(r => r.id));
            for (const r of reviewsToDelete) {
                try {
                    await api.schedule.delete(r.id);
                } catch (e) {
                    console.error('Error deleting obsolete/duplicate review:', r.id, e);
                }
            }
        }

        if (reviewsToCreate.length > 0) {
            console.log('Syncing planned reviews: creating missing reviews:', reviewsToCreate.map(r => r.id));
            for (const r of reviewsToCreate) {
                try {
                    await api.schedule.create(r);
                } catch (e) {
                    console.error('Error creating missing review:', r.id, e);
                }
            }
        }

        if (reviewsToUpdate.length > 0) {
            console.log('Syncing planned reviews: updating review notes/dates:', reviewsToUpdate.map(r => r.id));
            for (const r of reviewsToUpdate) {
                try {
                    await api.schedule.update(r.id, { notes: r.notes, date: r.date });
                } catch (e) {
                    console.error('Error updating review notes/date:', r.id, e);
                }
            }
        }

        if (reviewsToDelete.length > 0 || reviewsToCreate.length > 0 || reviewsToUpdate.length > 0) {
            const deleteIds = new Set(reviewsToDelete.map(r => r.id));
            const updateMap = new Map(reviewsToUpdate.map(r => [r.id, r]));
            setScheduledStudies(prev => {
                let filtered = prev.filter(s => !deleteIds.has(s.id));
                filtered = filtered.map(s => {
                    const updated = updateMap.get(s.id);
                    return updated ? { ...s, notes: updated.notes, date: updated.date } : s;
                });
                const existingIds = new Set(filtered.map(s => s.id));
                const toAdd = reviewsToCreate.filter(r => !existingIds.has(r.id));
                const combined = [...filtered, ...toAdd];
                localStorage.setItem('cp_scheduled_studies', JSON.stringify(combined));
                window.dispatchEvent(new Event('local-settings-changed'));
                return combined;
            });
        }
    }, [getActivityTag]);

    const syncPlannedReviews = useCallback(async (forceRecalculate: boolean = false) => {
        if (forceRecalculate) {
            localStorage.removeItem('estudos_deleted_review_ids');
        }
        await syncPlannedReviewsDb(sessions, scheduledStudies, concursos);
    }, [sessions, scheduledStudies, concursos, syncPlannedReviewsDb]);

    useEffect(() => {
        const handleReviewsToggle = () => {
            syncPlannedReviews();
        };
        window.addEventListener('local-reviews-toggled', handleReviewsToggle);
        return () => window.removeEventListener('local-reviews-toggled', handleReviewsToggle);
    }, [syncPlannedReviews]);

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

            if (concursosData) {
                const loadedConcursos = concursosData.map(c => {
                    const localImg = localStorage.getItem(`gp_concurso_img_${c.id}`);
                    return localImg ? { ...c, imageUrl: localImg } : c;
                });
                setConcursos(loadedConcursos);
            }
            if (sessionsData) setSessions(sessionsData);
            if (simuladosData) setSimulados(simuladosData);
            let finalSchedule: ScheduledStudy[] = [];
            if (scheduleData) {
                // Server is the source of truth for WHICH items exist.
                // Reconstruct status based on matching session existence, falling back to local state.
                const localRaw = localStorage.getItem('cp_scheduled_studies');
                const localStudies: ScheduledStudy[] = localRaw ? JSON.parse(localRaw) : [];
                const localStatusMap = new Map(localStudies.map(s => [s.id, s.status]));
                const sessionIds = new Set(sessionsData?.map(s => s.id) || []);

                finalSchedule = scheduleData.map(s => {
                    let status: 'planejado' | 'realizado' = 'planejado';
                    if (sessionIds.has(s.id)) {
                        status = 'realizado';
                    } else if (localStatusMap.has(s.id)) {
                        status = localStatusMap.get(s.id) as 'planejado' | 'realizado';
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

            // Sync simulated sessions
            await syncSimuladoSessions(simuladosData || [], sessionsData || []);

            // Sync planned reviews
            await syncPlannedReviewsDb(sessionsData || [], finalSchedule, concursosData || []);

            setLastSaved(new Date().toLocaleTimeString());
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, syncSimuladoSessions, syncPlannedReviewsDb]);

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
                        avatar: session.user.user_metadata?.avatar || 'student',
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
                        avatar: session.user.user_metadata?.avatar || 'student',
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
        // Keep all valid sessions (simulados are already deleted from state when deleted in UI)
        const validSessions = sessions;

        // Deduplicate simulado sessions — keep only one per (simDate, subjectId) combination
        // to avoid double-counting when old random-ID sessions coexist with new deterministic-ID ones
        const seenSimKeys = new Set<string>();
        const deduped = validSessions.filter(s => {
            if (s.isSimulado || s.activityType === 'Simulado') {
                const sDate = s.date.split('T')[0];
                const key = `${sDate}__${s.subjectId}`;
                if (seenSimKeys.has(key)) return false;
                seenSimKeys.add(key);
            }
            return true;
        });

        if (selectedConcursoId === 'all') return deduped;
        const subIds = new Set((activeConcurso?.subjects || []).map(s => s.id));
        return deduped.filter(s => subIds.has(s.subjectId));
    }, [sessions, selectedConcursoId, activeConcurso]);

    const filteredSimulados = useMemo(() => {
        if (selectedConcursoId === 'all') return simulados;
        const subIds = new Set((activeConcurso?.subjects || []).map(s => s.id));
        return simulados.filter(sim => 
            sim.results && sim.results.some(r => subIds.has(r.subjectId))
        );
    }, [simulados, selectedConcursoId, activeConcurso]);

    const filteredScheduledStudies = useMemo(() => {
        const activeSimDates = new Set((simulados || []).map(sim => sim.date?.split('T')[0]).filter(Boolean));
        const validScheduled = scheduledStudies.filter(s => {
            if (s.activityType === 'Simulado' && s.status === 'realizado') {
                const sDate = s.date?.split('T')[0];
                return activeSimDates.has(sDate);
            }
            return true;
        });

        if (selectedConcursoId === 'all') return validScheduled;
        const subIds = new Set((activeConcurso?.subjects || []).map(s => s.id));
        return validScheduled.filter(s => subIds.has(s.subjectId));
    }, [scheduledStudies, simulados, selectedConcursoId, activeConcurso]);

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

        let existingPlanned = scheduledStudies.find(s => s.id === session.id && s.status === 'planejado');
        if (!existingPlanned && activityType && (activityType.toLowerCase().includes('revisão') || activityType.toLowerCase().includes('revisao'))) {
            // Prefer a review on the same date; fallback to any pending review for same subject/topic
            existingPlanned = scheduledStudies.find(s =>
                s.subjectId === session.subjectId &&
                s.topicId === session.topicId &&
                s.activityType && (s.activityType.toLowerCase().includes('revisão') || s.activityType.toLowerCase().includes('revisao')) &&
                s.status === 'planejado' &&
                s.date === sessionDate
            ) || scheduledStudies.find(s =>
                s.subjectId === session.subjectId &&
                s.topicId === session.topicId &&
                s.activityType && (s.activityType.toLowerCase().includes('revisão') || s.activityType.toLowerCase().includes('revisao')) &&
                s.status === 'planejado'
            );
        }

        let newScheduled: ScheduledStudy;
        let isUpdatingExisting = false;

        if (existingPlanned) {
            isUpdatingExisting = true;
            newScheduled = {
                ...existingPlanned,
                date: sessionDate,
                status: 'realizado',
                durationInMinutes: session.durationInMinutes,
                questionsDone: session.questionsDone,
                questionsCorrect: session.questionsCorrect,
                notes: (session as any).notes || existingPlanned.notes,
                questionsLink: session.questionsLink || existingPlanned.questionsLink
            };
        } else {
            newScheduled = {
                id: session.id,
                date: sessionDate,
                subjectId: session.subjectId,
                topicId: session.topicId,
                activityType: activityType as ActivityType,
                durationInMinutes: session.durationInMinutes,
                questionsDone: session.questionsDone,
                questionsCorrect: session.questionsCorrect,
                status: 'realizado',
                notes: (session as any).notes,
                questionsLink: session.questionsLink
            };
        }

        if (existingPlanned && session.id !== existingPlanned.id) {
            setSessions(prev => prev.map(s => s.id === session.id ? { ...s, id: existingPlanned!.id } : s));
            session.id = existingPlanned.id;
        }

        const scheduleId = newScheduled.id;

        // Optimistically update/add schedule entry in local state
        setScheduledStudies(prev => {
            let updated: ScheduledStudy[];
            if (prev.some(s => s.id === scheduleId)) {
                updated = prev.map(s => s.id === scheduleId ? newScheduled : s);
            } else {
                updated = [...prev, newScheduled];
            }
            localStorage.setItem('cp_scheduled_studies', JSON.stringify(updated));
            return updated;
        });

        // Persist session to DB
        try {
            await api.sessions.create(session);
        } catch (e) {
            console.error('Error saving session to DB:', e);
        }

        // Persist/Update schedule entry in DB
        try {
            if (isUpdatingExisting) {
                await api.schedule.update(scheduleId, {
                    status: 'realizado',
                    date: newScheduled.date,
                    durationInMinutes: newScheduled.durationInMinutes,
                    questionsDone: newScheduled.questionsDone,
                    questionsCorrect: newScheduled.questionsCorrect,
                    notes: newScheduled.notes,
                    questionsLink: newScheduled.questionsLink
                });
            } else {
                const saved = await api.schedule.create(newScheduled);
                if (saved && saved.id && saved.id !== scheduleId) {
                    const syncedEntry: ScheduledStudy = { ...newScheduled, id: saved.id };
                    setScheduledStudies(prev => {
                        const updated = prev.map(s => s.id === scheduleId ? syncedEntry : s);
                        localStorage.setItem('cp_scheduled_studies', JSON.stringify(updated));
                        return updated;
                    });
                }
            }
        } catch (e) {
            console.error('Error saving/updating schedule entry in DB:', e);
        }

        // Log
        try {
            addLog({
                message: `Sessão de ${activityType} registrada: ${session.durationInMinutes} min`,
                type: 'success'
            });
        } catch (e) { /* non-critical */ }

        // Sync planned reviews immediately
        await syncPlannedReviewsDb([...sessions, session], [...scheduledStudies, newScheduled], concursos);

        setLastSaved(new Date().toLocaleTimeString());
    };

    const addSessionsBatch = async (sessionsList: StudySession[]) => {
        if (sessionsList.length === 0) return;
        setSaveError(null);

        // Optimistically add all sessions to local state
        setSessions(prev => [...prev, ...sessionsList]);

        const newScheduledList: ScheduledStudy[] = [];
        const updatesList: { id: string; updates: any }[] = [];
        const creationsList: ScheduledStudy[] = [];

        let currentLocalSchedule = [...scheduledStudies];

        for (const session of sessionsList) {
            const sessionDate = session.date.split('T')[0];
            const activityType = session.activityType || (session.isSimulado ? 'Simulado' : session.questionsDone !== undefined ? 'Questões' : 'Leitura');

            let existingPlanned = currentLocalSchedule.find(s => s.id === session.id && s.status === 'planejado');
            if (!existingPlanned && activityType && (activityType.toLowerCase().includes('revisão') || activityType.toLowerCase().includes('revisao'))) {
                const sessionDate = session.date.split('T')[0];
                // Prefer a review on the same date; fallback to any pending review for same subject/topic
                existingPlanned = currentLocalSchedule.find(s =>
                    s.subjectId === session.subjectId &&
                    s.topicId === session.topicId &&
                    s.activityType && (s.activityType.toLowerCase().includes('revisão') || s.activityType.toLowerCase().includes('revisao')) &&
                    s.status === 'planejado' &&
                    s.date === sessionDate &&
                    !newScheduledList.some(ns => ns.id === s.id)
                ) || currentLocalSchedule.find(s =>
                    s.subjectId === session.subjectId &&
                    s.topicId === session.topicId &&
                    s.activityType && (s.activityType.toLowerCase().includes('revisão') || s.activityType.toLowerCase().includes('revisao')) &&
                    s.status === 'planejado' &&
                    !newScheduledList.some(ns => ns.id === s.id)
                );
            }

            let newScheduled: ScheduledStudy;
            if (existingPlanned) {
                newScheduled = {
                    ...existingPlanned,
                    date: sessionDate,
                    status: 'realizado',
                    durationInMinutes: session.durationInMinutes,
                    questionsDone: session.questionsDone,
                    questionsCorrect: session.questionsCorrect,
                    notes: (session as any).notes || existingPlanned.notes
                };
                updatesList.push({
                    id: existingPlanned.id,
                    updates: {
                        status: 'realizado',
                        date: newScheduled.date,
                        durationInMinutes: newScheduled.durationInMinutes,
                        questionsDone: newScheduled.questionsDone,
                        questionsCorrect: newScheduled.questionsCorrect,
                        notes: newScheduled.notes
                    }
                });
            } else {
                newScheduled = {
                    id: session.id,
                    date: sessionDate,
                    subjectId: session.subjectId,
                    topicId: session.topicId,
                    activityType: activityType as ActivityType,
                    durationInMinutes: session.durationInMinutes,
                    questionsDone: session.questionsDone,
                    questionsCorrect: session.questionsCorrect,
                    status: 'realizado',
                    notes: (session as any).notes
                };
                creationsList.push(newScheduled);
            }

            if (existingPlanned && session.id !== existingPlanned.id) {
                session.id = existingPlanned.id;
            }

            newScheduledList.push(newScheduled);

            if (existingPlanned) {
                currentLocalSchedule = currentLocalSchedule.map(s => s.id === newScheduled.id ? newScheduled : s);
            } else {
                currentLocalSchedule.push(newScheduled);
            }
        }

        // Optimistically update/add all schedule entries in local state
        setScheduledStudies(prev => {
            let updated = [...prev];
            newScheduledList.forEach(ns => {
                if (updated.some(s => s.id === ns.id)) {
                    updated = updated.map(s => s.id === ns.id ? ns : s);
                } else {
                    updated.push(ns);
                }
            });
            localStorage.setItem('cp_scheduled_studies', JSON.stringify(updated));
            return updated;
        });

        // Persist all sessions to DB
        for (const session of sessionsList) {
            try {
                await api.sessions.create(session);
            } catch (e) {
                console.error('Error saving batch session to DB:', e);
            }
        }

        // Persist updates to DB
        for (const up of updatesList) {
            try {
                await api.schedule.update(up.id, up.updates);
            } catch (e) {
                console.error('Error updating batch schedule in DB:', e);
            }
        }

        // Persist creations to DB
        for (const cr of creationsList) {
            try {
                const saved = await api.schedule.create(cr);
                if (saved && saved.id && saved.id !== cr.id) {
                    const syncedEntry = { ...cr, id: saved.id };
                    setScheduledStudies(prev => {
                        const updated = prev.map(s => s.id === cr.id ? syncedEntry : s);
                        localStorage.setItem('cp_scheduled_studies', JSON.stringify(updated));
                        return updated;
                    });
                }
            } catch (e) {
                console.error('Error creating batch schedule in DB:', e);
            }
        }

        // Log
        try {
            addLog({
                message: `${sessionsList.length} sessões de estudos registradas em lote`,
                type: 'success'
            });
        } catch (e) { /* non-critical */ }

        // Sync planned reviews once for the entire batch
        const finalSessions = [...sessions, ...sessionsList];
        const finalSchedule = [...scheduledStudies];
        newScheduledList.forEach(ns => {
            const idx = finalSchedule.findIndex(s => s.id === ns.id);
            if (idx !== -1) finalSchedule[idx] = ns;
            else finalSchedule.push(ns);
        });

        await syncPlannedReviewsDb(finalSessions, finalSchedule, concursos);

        setLastSaved(new Date().toLocaleTimeString());
    };

    const addSimulado = async (sim: Simulado) => {
        setSaveError(null);
        const updatedSims = [...simulados, sim];
        setSimulados(updatedSims);
        try {
            await api.simulados.create(sim);
            await syncSimuladoSessions(updatedSims, sessions);
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error adding simulado:', e);
            setSaveError('Erro ao salvar simulado.');
        }
    };

    const updateSimulado = async (id: string, updatedSim: Simulado) => {
        setSaveError(null);
        const updatedSims = simulados.map(s => s.id === id ? updatedSim : s);
        setSimulados(updatedSims);
        try {
            await api.simulados.update(id, updatedSim);
            await syncSimuladoSessions(updatedSims, sessions);
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error updating simulado:', e);
            setSaveError('Erro ao atualizar simulado.');
        }
    };

    const deleteSimulado = async (id: string) => {
        setSaveError(null);
        const updatedSims = simulados.filter(s => s.id !== id);
        setSimulados(updatedSims);
        try {
            await api.simulados.delete(id);
            await syncSimuladoSessions(updatedSims, sessions);
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
            // Sync planned reviews immediately
            await syncPlannedReviewsDb(sessions.filter(s => s.id !== id), scheduledStudies.filter(s => s.id !== id), concursos);
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
            for (const id of deletedIds) {
                await api.concursos.delete(id);
                localStorage.removeItem(`gp_concurso_img_${id}`);
            }

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
                }
            }

            // Find changed/new concursos by comparing with previous state
            for (const newConc of newConcursos) {
                // Sync image to localStorage
                if (newConc.imageUrl) {
                    localStorage.setItem(`gp_concurso_img_${newConc.id}`, newConc.imageUrl);
                } else {
                    localStorage.removeItem(`gp_concurso_img_${newConc.id}`);
                }

                const oldConc = concursos.find(c => c.id === newConc.id);

                // If it's new or if subjects/name/banca/imageUrl changed, upsert it
                if (!oldConc || 
                    JSON.stringify(oldConc.subjects) !== JSON.stringify(newConc.subjects) ||
                    oldConc.name !== newConc.name || 
                    oldConc.banca !== newConc.banca ||
                    oldConc.imageUrl !== newConc.imageUrl) {
                    console.log('Upserting concurso:', newConc.id, newConc.name);
                    const upserted = await api.concursos.upsert(newConc);
                    if (upserted && upserted.id !== newConc.id) {
                        // Update local ID if it changed (e.g. from ai-... to uuid)
                        if (newConc.imageUrl) {
                            localStorage.setItem(`gp_concurso_img_${upserted.id}`, newConc.imageUrl);
                            localStorage.removeItem(`gp_concurso_img_${newConc.id}`);
                        }
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

    const deleteScheduledStudy = async (idOrIds: string | string[]) => {
        const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
        if (ids.length === 0) return;
        setSaveError(null);

        // If any of them are reviews, track them as deleted so they are not auto-recreated
        const reviewsToDelete = scheduledStudies.filter(s => ids.includes(s.id) && s.activityType && (s.activityType.toLowerCase().includes('revisão') || s.activityType.toLowerCase().includes('revisao')));
        if (reviewsToDelete.length > 0) {
            try {
                const deletedRaw = localStorage.getItem('estudos_deleted_review_ids') || '[]';
                const deletedList = JSON.parse(deletedRaw);
                let changed = false;
                reviewsToDelete.forEach(r => {
                    if (!deletedList.includes(r.id)) {
                        deletedList.push(r.id);
                        changed = true;
                    }
                });
                if (changed) {
                    localStorage.setItem('estudos_deleted_review_ids', JSON.stringify(deletedList));
                }
            } catch (e) {
                console.error('Error saving deleted review IDs:', e);
            }
        }

        const updatedSchedule = scheduledStudies.filter(s => !ids.includes(s.id));
        const updatedSessions = sessions.filter(s => !ids.includes(s.id));

        // Cascade: Remove from schedule AND sessions in local state
        setScheduledStudies(updatedSchedule);
        localStorage.setItem('cp_scheduled_studies', JSON.stringify(updatedSchedule));
        setSessions(updatedSessions);

        try {
            await Promise.all(ids.map(async id => {
                await api.schedule.delete(id);
                await api.sessions.delete(id);
            }));

            // Sync planned reviews with the correct arrays
            await syncPlannedReviewsDb(updatedSessions, updatedSchedule, concursos);

            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error deleting scheduled studies:', e);
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

        let updatedSessionsForSync = sessions;

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
                activityType: merged.activityType,
                questionsLink: merged.questionsLink
            };

            if (existingSession) {
                setSessions(prev => prev.map(s => s.id === id ? newSessionPayload : s));
                updatedSessionsForSync = sessions.map(s => s.id === id ? newSessionPayload : s);
                try {
                    await api.sessions.update(id, newSessionPayload);
                } catch (e) {
                    console.error('Error updating study session:', e);
                }
            } else {
                setSessions(prev => [...prev, newSessionPayload]);
                updatedSessionsForSync = [...sessions, newSessionPayload];
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
                updatedSessionsForSync = sessions.filter(s => s.id !== id);
                try {
                    await api.sessions.delete(id);
                } catch (e) {
                    console.error('Error deleting study session:', e);
                }
            }
        }

        const updatedScheduleForSync = scheduledStudies.map(s => s.id === id ? merged : s);
        await syncPlannedReviewsDb(updatedSessionsForSync, updatedScheduleForSync, concursos);

        try {
            await api.schedule.update(id, updates);
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error updating scheduled study:', e);
            setSaveError('Erro ao atualizar item na agenda.');
        }
    };

    const saveCalendarActivity = async (
        editingTaskId: string | null,
        formData: {
            subjectId: string;
            subjectIds: string[];
            topicIds: string[];
            activityTypes: string[];
            duration: string;
            questionsDone: string;
            questionsCorrect: string;
            notes: string;
            status: 'planejado' | 'realizado';
        },
        selectedDayKey: string
    ) => {
        setSaveError(null);

        const isAulao = formData.activityTypes.includes('Aulão de Revisão');
        const selectedSubjects = isAulao ? formData.subjectIds : (formData.subjectId ? [formData.subjectId] : []);
        if (selectedSubjects.length === 0 || !selectedDayKey) return;

        const durationVal = parseInt(formData.duration) || 0;
        const selectedTypes = formData.activityTypes;
        const hasQuestions = selectedTypes.includes('Questões') || selectedTypes.includes('Flashcards') || selectedTypes.includes('Revisão');
        const questionsDoneVal = hasQuestions ? (parseInt(formData.questionsDone) || undefined) : undefined;
        const questionsCorrectRaw = hasQuestions ? (parseInt(formData.questionsCorrect) || undefined) : undefined;
        // Acertos não podem superar o total de questões feitas
        const questionsCorrectVal = (questionsCorrectRaw !== undefined && questionsDoneVal !== undefined)
            ? Math.min(questionsCorrectRaw, questionsDoneVal)
            : questionsCorrectRaw;
        const activityTypesStr = selectedTypes.join(', ');

        const selectedTopicIds = isAulao ? [] : formData.topicIds;
        const topicIdsToSave = selectedTopicIds.length > 0 ? selectedTopicIds : [undefined];

        // 1. In-place update for simple single-topic tasks (to prevent duplication)
        const editingTask = editingTaskId ? scheduledStudies.find(s => s.id === editingTaskId) : null;
        if (editingTask && !isAulao && selectedSubjects.length === 1 && topicIdsToSave.length === 1 && !(editingTask as any).isGroupedVirtual) {
            const subId = selectedSubjects[0];
            const topicId = topicIdsToSave[0];
            const updates: Partial<ScheduledStudy> = {
                date: selectedDayKey,
                subjectId: subId,
                topicId: topicId,
                activityType: activityTypesStr,
                notes: formData.notes,
                durationInMinutes: durationVal || undefined,
                questionsDone: questionsDoneVal,
                questionsCorrect: questionsCorrectVal,
                status: formData.status
            };
            await updateScheduledStudy(editingTask.id, updates);
            return;
        }

        // 2. Determine which old tasks to delete
        const tasksToDeleteIds: string[] = [];
        if (editingTask) {
            const gId = (editingTask as any).groupId || (editingTask.notes ? parseNotesGroup(editingTask.notes).groupId : null);
            if (gId) {
                const groupTasks = scheduledStudies.filter(t => t.notes && parseNotesGroup(t.notes).groupId === gId);
                tasksToDeleteIds.push(...groupTasks.map(t => t.id));
            } else {
                tasksToDeleteIds.push(editingTask.id);
            }
        }

        // 3. Build new entries
        const newGroupId = (selectedSubjects.length > 1 || topicIdsToSave.length > 1) ? crypto.randomUUID() : null;
        const notesToSave = newGroupId ? `[groupId:${newGroupId}] ${formData.notes}`.trim() : formData.notes;

        const totalCount = selectedSubjects.length * topicIdsToSave.length;
        const baseDuration = Math.floor(durationVal / totalCount);
        const remDuration = durationVal % totalCount;

        const itemDones: (number | undefined)[] = [];
        if (questionsDoneVal !== undefined) {
            const baseDone = Math.floor(questionsDoneVal / totalCount);
            const remDone = questionsDoneVal % totalCount;
            for (let i = 0; i < totalCount; i++) {
                itemDones.push(baseDone + (i < remDone ? 1 : 0));
            }
        } else {
            for (let i = 0; i < totalCount; i++) {
                itemDones.push(undefined);
            }
        }

        const itemCorrects: (number | undefined)[] = [];
        if (questionsCorrectVal !== undefined && questionsDoneVal !== undefined) {
            const correctList = new Array(totalCount).fill(0);
            let remainingCorrect = questionsCorrectVal;
            let added = true;
            while (remainingCorrect > 0 && added) {
                added = false;
                for (let i = 0; i < totalCount; i++) {
                    if (remainingCorrect > 0 && correctList[i] < (itemDones[i] || 0)) {
                        correctList[i] += 1;
                        remainingCorrect -= 1;
                        added = true;
                    }
                }
            }
            for (let i = 0; i < totalCount; i++) {
                itemCorrects.push(correctList[i]);
            }
        } else {
            for (let i = 0; i < totalCount; i++) {
                itemCorrects.push(questionsCorrectVal !== undefined ? Math.floor(questionsCorrectVal / totalCount) : undefined);
            }
        }

        const newEntries: ScheduledStudy[] = [];
        const sessionsList: StudySession[] = [];
        let itemIndex = 0;

        for (const subId of selectedSubjects) {
            for (const topicId of topicIdsToSave) {
                const itemDuration = itemIndex === 0 ? baseDuration + remDuration : baseDuration;
                const itemDone = itemDones[itemIndex];
                const itemCorrect = itemCorrects[itemIndex];
                itemIndex++;

                if (formData.status === 'realizado') {
                    sessionsList.push({
                        id: totalCount === 1 && editingTask ? editingTask.id : crypto.randomUUID(),
                        subjectId: subId,
                        topicId: topicId,
                        durationInMinutes: itemDuration,
                        date: new Date(`${selectedDayKey}T12:00:00`).toISOString(),
                        questionsDone: itemDone,
                        questionsCorrect: itemCorrect,
                        activityType: activityTypesStr,
                        notes: notesToSave,
                        questionsLink: formData.questionsLink
                    } as any);
                } else {
                    newEntries.push({
                        id: crypto.randomUUID(),
                        date: selectedDayKey,
                        subjectId: subId,
                        topicId: topicId,
                        activityType: activityTypesStr,
                        notes: notesToSave,
                        durationInMinutes: itemDuration || undefined,
                        questionsDone: itemDone,
                        questionsCorrect: itemCorrect,
                        status: formData.status,
                        questionsLink: formData.questionsLink
                    });
                }
            }
        }

        // --- Execute Deletion and Insertion atomically for State & DB ---

        let updatedSchedule = scheduledStudies.filter(s => !tasksToDeleteIds.includes(s.id));
        let updatedSessions = sessions.filter(s => !tasksToDeleteIds.includes(s.id));

        if (formData.status === 'realizado') {
            const sessionsToCreateSchedule: ScheduledStudy[] = sessionsList.map(session => {
                const sessionDate = session.date.split('T')[0];
                return {
                    id: session.id,
                    date: sessionDate,
                    subjectId: session.subjectId,
                    topicId: session.topicId,
                    activityType: session.activityType as ActivityType,
                    durationInMinutes: session.durationInMinutes,
                    questionsDone: session.questionsDone,
                    questionsCorrect: session.questionsCorrect,
                    status: 'realizado',
                    notes: (session as any).notes,
                    questionsLink: session.questionsLink
                };
            });

            updatedSchedule = [...updatedSchedule, ...sessionsToCreateSchedule];
            updatedSessions = [...updatedSessions, ...sessionsList];
        } else {
            updatedSchedule = [...updatedSchedule, ...newEntries];
        }

        // 1. Update React local states and LocalStorage
        setScheduledStudies(updatedSchedule);
        localStorage.setItem('cp_scheduled_studies', JSON.stringify(updatedSchedule));
        setSessions(updatedSessions);

        // 2. Perform DB operations
        try {
            // Deletes
            if (tasksToDeleteIds.length > 0) {
                await Promise.all(tasksToDeleteIds.map(async id => {
                    await api.schedule.delete(id);
                    await api.sessions.delete(id);
                }));
            }

            // Insertions / Updates
            if (formData.status === 'realizado') {
                for (const session of sessionsList) {
                    await api.sessions.create(session);

                    const matchingSchedule: ScheduledStudy = {
                        id: session.id,
                        date: session.date.split('T')[0],
                        subjectId: session.subjectId,
                        topicId: session.topicId,
                        activityType: session.activityType as ActivityType,
                        durationInMinutes: session.durationInMinutes,
                        questionsDone: session.questionsDone,
                        questionsCorrect: session.questionsCorrect,
                        status: 'realizado',
                        notes: (session as any).notes,
                        questionsLink: session.questionsLink
                    };
                    await api.schedule.create(matchingSchedule);
                }
            } else {
                for (const entry of newEntries) {
                    await api.schedule.create(entry);
                }
            }

            addLog({
                message: editingTaskId 
                    ? `Atividade do Planner atualizada` 
                    : `Nova atividade adicionada ao Planner`,
                type: 'success'
            });

            setLastSaved(new Date().toLocaleTimeString());
        } catch (err) {
            console.error('Error saving activity to database:', err);
            setSaveError('Erro ao salvar alterações no banco de dados.');
        }

        // 3. Sync reviews with the EXACT final updated states
        await syncPlannedReviewsDb(updatedSessions, updatedSchedule, concursos);
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

    const toggleScheduledStudyStatus = async (idOrIds: string | string[]) => {
        const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
        if (ids.length === 0) return;

        const studies = scheduledStudies.filter(s => ids.includes(s.id));
        if (studies.length === 0) return;

        const targetStatus: 'planejado' | 'realizado' = studies[0].status === 'realizado' ? 'planejado' : 'realizado';

        // Save status synchronously to localStorage FIRST to avoid race conditions.
        // If fetchData runs between here and the async React state update,
        // it will still read the correct status from localStorage.
        try {
            const currentRaw = localStorage.getItem('cp_scheduled_studies');
            const currentList: ScheduledStudy[] = currentRaw ? JSON.parse(currentRaw) : scheduledStudies;
            const updatedList = currentList.map(s => ids.includes(s.id) ? { ...s, status: targetStatus } : s);
            localStorage.setItem('cp_scheduled_studies', JSON.stringify(updatedList));
        } catch (e) {
            console.error('Error saving status to localStorage:', e);
        }

        setScheduledStudies(prev => {
            const updated = prev.map(s => ids.includes(s.id) ? { ...s, status: targetStatus } : s);
            // localStorage already updated above, but sync again to be safe
            localStorage.setItem('cp_scheduled_studies', JSON.stringify(updated));
            window.dispatchEvent(new Event('local-settings-changed'));
            return updated;
        });

        if (targetStatus === 'planejado') {
            setSessions(prev => prev.filter(s => !ids.includes(s.id)));
            for (const id of ids) {
                try { await api.sessions.delete(id); } catch(e) {}
            }
            // Sync planned reviews immediately (when toggling back to planejado)
            const updatedSessions = sessions.filter(s => !ids.includes(s.id));
            const updatedSchedule = scheduledStudies.map(s => ids.includes(s.id) ? { ...s, status: targetStatus } : s);
            await syncPlannedReviewsDb(updatedSessions, updatedSchedule, concursos);
        } else {
            const newSessions: StudySession[] = [];
            for (const study of studies) {
                const newSession: StudySession = {
                    id: study.id,
                    subjectId: study.subjectId,
                    topicId: study.topicId,
                    durationInMinutes: study.durationInMinutes ?? 0,
                    date: new Date(`${study.date}T12:00:00`).toISOString(),
                    questionsDone: study.questionsDone,
                    questionsCorrect: study.questionsCorrect,
                    activityType: study.activityType,
                    questionsLink: study.questionsLink
                };
                newSessions.push(newSession);
                // Persist session to study_sessions table
                try { await api.sessions.create(newSession); } catch(e) {
                    console.error('Error creating session on toggle:', study.id, e);
                }
                // Also persist the updated scheduled_study entry to DB
                // (update questionsDone, questionsCorrect, durationInMinutes which may have been defaults)
                try {
                    await api.schedule.update(study.id, {
                        durationInMinutes: newSession.durationInMinutes,
                        questionsDone: newSession.questionsDone,
                        questionsCorrect: newSession.questionsCorrect,
                        questionsLink: newSession.questionsLink
                    });
                } catch(e) {
                    console.error('Error updating schedule on toggle realizado:', study.id, e);
                }
            }
            setSessions(prev => [...prev, ...newSessions]);

            // Sync planned reviews immediately
            const updatedSessions = [...sessions, ...newSessions];
            const updatedSchedule = scheduledStudies.map(s => ids.includes(s.id) ? { ...s, status: targetStatus } : s);
            await syncPlannedReviewsDb(updatedSessions, updatedSchedule, concursos);
        }
    };

    const addScheduledStudiesBatch = useCallback(async (items: (Omit<ScheduledStudy, 'id' | 'status'> & { id?: string })[]) => {
        setIsSaving(true);
        setSaveError(null);
        try {
            const savedItems = await api.schedule.createBatch(items);
            setScheduledStudies(prev => {
                const combined = [...prev, ...savedItems];
                localStorage.setItem('cp_scheduled_studies', JSON.stringify(combined));
                return combined;
            });
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error adding scheduled studies batch:', e);
            setSaveError('Erro ao salvar cronograma.');
            throw e;
        } finally {
            setIsSaving(false);
        }
    }, [api.schedule]);

    const deleteScheduledStudiesBatch = useCallback(async (ids: string[]) => {
        if (ids.length === 0) return;
        setIsSaving(true);
        setSaveError(null);
        try {
            await api.schedule.deleteBatch(ids);
            // Also delete corresponding sessions if they exist
            for (const id of ids) {
                try { await api.sessions.delete(id); } catch(e) {}
            }
            setScheduledStudies(prev => {
                const filtered = prev.filter(s => !ids.includes(s.id));
                localStorage.setItem('cp_scheduled_studies', JSON.stringify(filtered));
                return filtered;
            });
            setSessions(prev => prev.filter(s => !ids.includes(s.id)));
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error deleting scheduled studies batch:', e);
            setSaveError('Erro ao deletar itens do cronograma.');
            throw e;
        } finally {
            setIsSaving(false);
        }
    }, [api.schedule]);

    return {
        currentUser, setCurrentUser,
        users, setUsers: updateUser,
        concursos, setConcursos: updateConcursos,
        selectedConcursoId, setSelectedConcursoId,
        sessions: filteredSessions, setSessions: (s: any) => s, // Disabled direct set
        simulados: filteredSimulados, setSimulados: (s: any) => s, // Disabled direct set
        scheduledStudies: filteredScheduledStudies, setScheduledStudies: updateScheduledStudies, deleteScheduledStudy, updateScheduledStudy, saveCalendarActivity,
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
        addSessionsBatch,
        addSimulado,
        updateSimulado,
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
        addScheduledStudiesBatch,
        deleteScheduledStudiesBatch,
        syncPlannedReviews,
        getActivityTag,
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
