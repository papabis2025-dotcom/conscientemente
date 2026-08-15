import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Subject, StudySession, Concurso, ScheduledStudy, DailyGoal, LogEntry, User, Simulado, ActivityType } from '../types';
import { supabase } from '../services/supabase';
import { api } from '../services/api';

const getDeterministicSessionId = (simId: string, subjectId: string): string => {
    if (simId.length < 36 || subjectId.length < 36) {
        return crypto.randomUUID();
    }
    return `${simId.substring(0, 18)}${subjectId.substring(18)}`;
};

export const getDeterministicReviewId = (subId: string, topicId: string | undefined, lastSessId: string, idx: number): string => {
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
    let currentNotes = notes || '';
    let groupId = null;
    let tag = null;

    // 1. Extrair groupId se houver
    const groupMatch = currentNotes.match(/^\[groupId:([^\]]+)\](.*)/s);
    if (groupMatch) {
        groupId = groupMatch[1];
        currentNotes = groupMatch[2].trim();
    }

    // 2. Extrair tag se houver (ex: #OAB47DPCON080726 - Texto ou #OAB47DPCON080726 Texto)
    const tagMatch = currentNotes.match(/^(#[A-Za-z0-9_]+)(?:\s*-\s*|\s+)(.*)/s) || currentNotes.match(/^(#[A-Za-z0-9_]+)$/s);
    if (tagMatch) {
        tag = tagMatch[1];
        currentNotes = tagMatch[2] ? tagMatch[2].trim() : '';
    }

    return { groupId, tag, cleanNotes: currentNotes };
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
        api.settings.update({ selectedConcursoId: id }).catch(() => {});
        window.dispatchEvent(new Event('local-storage-sync'));
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
        api.settings.update({ globalDailyGoal: goal }).catch(() => {});
        window.dispatchEvent(new Event('local-settings-changed'));
    };

    const getLocalDateString = (dateStr: string | undefined): string => {
        if (!dateStr) return '';
        if (dateStr.includes('T')) {
            return dateStr.split('T')[0];
        }
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

    const updateStudyTasks = (newTasks: { id: string, subjectId: string, subjectName: string, topicId?: string, topicName?: string, done: boolean, date: string, concursoId?: string }[]) => {
        const selectedConc = concursos.find(c => c.id === selectedConcursoId);
        const subIds = new Set((selectedConc?.subjects || []).map(s => s.id));

        const tasksWithConcurso = newTasks.map(t => ({
            ...t,
            concursoId: t.concursoId || selectedConcursoId
        }));
        
        // Find deleted tasks: tasks for these subjects that are not in newTasks
        const tasksToDelete = studyTasks.filter(t => subIds.has(t.subjectId) && !tasksWithConcurso.find(nt => nt.id === t.id));
        if (tasksToDelete.length > 0) {
            const deleteIds = tasksToDelete.map(t => t.id);
            api.studyPlanTasks.deleteBatch(deleteIds).catch(e => console.error('Error deleting study plan tasks from Supabase:', e));
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

        // Upsert new and updated tasks to Supabase
        if (tasksWithConcurso.length > 0) {
            api.studyPlanTasks.upsertBatch(tasksWithConcurso).catch(e => console.error('Error upserting study plan tasks to Supabase:', e));
        }

        setStudyTasks(prev => {
            const preserved = prev.filter(t => !subIds.has(t.subjectId));
            const updated = [...preserved, ...tasksWithConcurso];
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
                    date: sim.date ? sim.date.split('T')[0] : '',
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
                const existingDateStr = existing.date ? existing.date.split('T')[0] : '';
                const expectedDateStr = es.date ? es.date.split('T')[0] : '';
                if (existing.durationInMinutes !== es.durationInMinutes || 
                    existing.questionsDone !== es.questionsDone || 
                    existing.questionsCorrect !== es.questionsCorrect ||
                    existingDateStr !== expectedDateStr) {
                    sessionsToUpdate.push(es);
                }
            }
        });

        if (sessionsToDelete.length > 0) {
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
            for (const s of sessionsToUpdate) {
                try {
                    await api.sessions.update(s.id, s);
                    const sessionDate = s.date.split('T')[0];
                    await api.schedule.update(s.id, {
                        date: sessionDate,
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

        // Marcar também tarefas agendadas de Simulado para datas onde o simulado foi realizado
        const completedSimuladoDates = new Set(
            activeSims
                .filter(sim => (sim.results || []).some(r => (r.done || 0) > 0))
                .map(sim => sim.date ? sim.date.split('T')[0] : '')
        );

        if (completedSimuladoDates.size > 0) {
            setScheduledStudies(prev => {
                let hasChanges = false;
                const updated = prev.map(s => {
                    if (s.activityType === 'Simulado' && s.status === 'planejado' && completedSimuladoDates.has(s.date)) {
                        hasChanges = true;
                        api.schedule.update(s.id, { status: 'realizado' }).catch(() => {});
                        return { ...s, status: 'realizado' as const };
                    }
                    return s;
                });
                if (hasChanges) {
                    localStorage.setItem('cp_scheduled_studies', JSON.stringify(updated));
                    window.dispatchEvent(new Event('local-settings-changed'));
                }
                return updated;
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
                        return !!(isRevType || isRevId || isRevCompleted || isDeterministic);
                    };

                    const topicSessions = allSess.filter(s =>
                        s.subjectId === subject.id &&
                        (topic.id === 'geral' ? !s.topicId : s.topicId === topic.id) &&
                        !isSimuladoSession(s) &&
                        !isRevisaoSession(s)
                    );

                    if (topicSessions.length > 0) {
                        // Sugestão A: Agrupar por data de estudo (para pegar a sessão mais recente de cada dia de estudo)
                        // e gerar revisões para CADA data de estudo distinta!
                        const sessionsByDateMap = new Map<string, StudySession>();
                        topicSessions.forEach(sess => {
                            const dStr = getLocalDateString(sess.date);
                            if (dStr) {
                                const existing = sessionsByDateMap.get(dStr);
                                if (!existing || new Date(sess.date).getTime() > new Date(existing.date).getTime()) {
                                    sessionsByDateMap.set(dStr, sess);
                                }
                            }
                        });

                        sessionsByDateMap.forEach((latestSession) => {
                            const sessionDateStr = getLocalDateString(latestSession.date);
                            const parts = sessionDateStr.split('-');
                            const year = parseInt(parts[0], 10);
                            const month = parseInt(parts[1], 10) - 1;
                            const day = parseInt(parts[2], 10);

                            customReviewDays.forEach((days, idx) => {
                                if (!days || days <= 0) return;
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

                                // Se este dia for dia de Simulado, não agendar revisão neste dia
                                const isSimuladoDay = allSchedule.some(sched => 
                                    sched.activityType === 'Simulado' && sched.date === dateStr
                                );
                                if (isSimuladoDay) return;

                                const reviewId = getDeterministicReviewId(subject.id, topic.id === 'geral' ? undefined : topic.id, latestSession.id, idx);
                                
                                const tag = getActivityTag(subject.id, sessionDateStr, topic.id === 'geral' ? undefined : topic.title);

                                // Agrupamos as revisões com base na data do estudo de origem (sessionDateStr)
                                // anexando-a ao groupId de forma universal.
                                const groupId = `rev_${subject.id}_${dateStr}_from_${sessionDateStr}`;
                                
                                const originText = `${parts[2]} ${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][parseInt(parts[1], 10) - 1]} ${parts[0].substring(2)}`;

                                expectedReviews.push({
                                    id: reviewId,
                                    date: dateStr,
                                    subjectId: subject.id,
                                    topicId: topic.id === 'geral' ? undefined : topic.id,
                                    activityType: 'Revisão',
                                    notes: `[groupId:${groupId}] ${tag} - Revisão automática (${days}d) | Origem: ${originText}`,
                                    status: 'planejado',
                                    questionsLink: latestSession.questionsLink
                                });
                            });
                        });
                    }
                });
            });
        });

        const expectedIds = new Set(expectedReviews.map(r => r.id));

        // Limpar os IDs das revisões esperadas dos caches de exclusão para permitir sua criação
        try {
            const savedDeletedRev = localStorage.getItem('estudos_deleted_review_ids');
            if (savedDeletedRev) {
                const arr: string[] = JSON.parse(savedDeletedRev);
                const filteredArr = arr.filter(id => !expectedIds.has(id));
                localStorage.setItem('estudos_deleted_review_ids', JSON.stringify(filteredArr));
            }
            const savedDeletedSched = localStorage.getItem('cp_deleted_scheduled_ids');
            if (savedDeletedSched) {
                const arr: string[] = JSON.parse(savedDeletedSched);
                const filteredArr = arr.filter(id => !expectedIds.has(id));
                localStorage.setItem('cp_deleted_scheduled_ids', JSON.stringify(filteredArr));
            }
        } catch (e) {}

        // Deduplicação ativa por chave única (disciplina, tópico, data e origem) para evitar duplicidade de revisões planejadas
        const activeReviewKeysFound = new Set<string>();
        const duplicateReviewsToDelete: ScheduledStudy[] = [];

        allSchedule.forEach(s => {
            const isReview = s.activityType && (
                s.activityType.toLowerCase().includes('revisão') || 
                s.activityType.toLowerCase().includes('revisao')
            );
            if (isReview && s.status === 'planejado') {
                let originTag = '';
                if (s.notes) {
                    const match = s.notes.match(/_from_([0-9-]{10})/);
                    if (match) originTag = match[1];
                }
                const key = `${s.subjectId}_${s.topicId || 'geral'}_${s.date}_from_${originTag || s.id}`;
                if (activeReviewKeysFound.has(key)) {
                    duplicateReviewsToDelete.push(s);
                } else {
                    activeReviewKeysFound.add(key);
                }
            }
        });

        const uniqueToDeleteMap = new Map<string, ScheduledStudy>();
        
        // 1. Adicionar revisões obsoletas (cujo ID determinístico não é mais esperado) ou geradas indevidamente por antecipação sem sessão concluída
        allSchedule.forEach(s => {
            const isReview = s.activityType && (
                s.activityType.toLowerCase().includes('revisão') || 
                s.activityType.toLowerCase().includes('revisao')
            );
            if (!isReview || s.status === 'realizado') return;

            const isDeterministicObsolete = !!(s.id && s.id.split('-')[3]?.startsWith('400') && !expectedIds.has(s.id));
            const isSpeculativeObsolete = !!(s.generatedByCronograma && !expectedIds.has(s.id));
            
            if (isDeterministicObsolete || isSpeculativeObsolete) {
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

        // Chaves de revisões planejadas remanescentes que não serão deletadas
        const remainingPlannedKeys = new Set<string>();
        allSchedule.forEach(s => {
            const isReview = s.activityType && (
                s.activityType.toLowerCase().includes('revisão') || 
                s.activityType.toLowerCase().includes('revisao')
            );
            if (isReview && s.status === 'planejado' && !uniqueToDeleteMap.has(s.id)) {
                const key = `${s.subjectId}_${s.topicId || 'geral'}_${s.date}`;
                remainingPlannedKeys.add(key);
            }
        });

        const currentIds = new Set(allSchedule.map(s => s.id));
        
        // Só criamos a revisão esperada se ela ainda não existir no cronograma ativo
        const reviewsToCreate = expectedReviews.filter(r => {
            const expectedKey = `${r.subjectId}_${r.topicId || 'geral'}_${r.date}`;

            return !currentIds.has(r.id) && 
                   !completedReviewIds.has(r.id) &&
                   !completedReviewKeys.has(expectedKey) &&
                   !remainingPlannedKeys.has(expectedKey);
        });

        const currentScheduleMap = new Map(allSchedule.map(s => [s.id, s]));
        const reviewsToUpdate: ScheduledStudy[] = [];
        expectedReviews.forEach(expected => {
            const current = currentScheduleMap.get(expected.id);
            if (current && current.status !== 'realizado') {
                const notesChanged = current.notes !== expected.notes;
                const dateChanged = current.date !== expected.date;
                // Não compara questionsLink para evitar atualizações desnecessárias
                // que causam re-renderização e reordenação das tarefas no planner

                if (notesChanged || dateChanged) {
                    reviewsToUpdate.push({
                        ...current,
                        notes: expected.notes,
                        date: expected.date
                        // Preserva questionsLink, durationInMinutes, questionsDone, questionsCorrect
                        // que possam ter sido preenchidos pelo usuário
                    });
                }
            }
        });

        if (reviewsToDelete.length > 0) {
            try {
                await api.schedule.deleteBatch(reviewsToDelete.map(r => r.id));
            } catch (e) {
                console.error('Error deleting obsolete/duplicate reviews batch:', e);
            }
        }

        if (reviewsToCreate.length > 0) {
            try {
                await api.schedule.createBatch(reviewsToCreate);
            } catch (e) {
                console.error('Error creating missing reviews batch:', e);
            }
        }

        if (reviewsToUpdate.length > 0) {

            for (const r of reviewsToUpdate) {
                try {
                    await api.schedule.update(r.id, { 
                        notes: r.notes, 
                        date: r.date
                        // Não atualiza questionsLink, durationInMinutes, questionsDone, questionsCorrect
                        // para preservar dados preenchidos pelo usuário
                    });
                } catch (e) {
                    console.error('Error updating review notes/date:', r.id, e);
                }
            }
        }

        if (reviewsToDelete.length > 0 || reviewsToCreate.length > 0 || reviewsToUpdate.length > 0) {
            const deleteIds = new Set(reviewsToDelete.map(r => r.id));
            const updateMap = new Map(reviewsToUpdate.map(r => [r.id, r]));
            setScheduledStudies(prev => {
                // 1. Remover apenas as revisões obsoletas/duplicadas marcadas explicitamente
                let filtered = prev.filter(s => !deleteIds.has(s.id));
                
                // 2. Atualizar notas/datas de revisões que mudaram
                filtered = filtered.map(s => {
                    const updatedFromReviews = updateMap.get(s.id);
                    if (updatedFromReviews) {
                        return { 
                            ...s, 
                            notes: updatedFromReviews.notes, 
                            date: updatedFromReviews.date
                        };
                    }
                    return s;
                });
                
                // 3. Adicionar novas revisões criadas
                const existingIds = new Set(filtered.map(s => s.id));
                const newFromReviews = reviewsToCreate.filter(r => !existingIds.has(r.id));
                
                const combined = [...filtered, ...newFromReviews];
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
    const fetchData = useCallback(async (silent: boolean = false) => {
        if (!currentUser) return;
        if (!silent) setIsLoading(true);
        try {
            const [concursosData, sessionsData, simuladosData, scheduleData, goalsData, logsData, studyPlanTasksData] = await Promise.all([
                api.concursos.list(),
                api.sessions.list(),
                api.simulados.list(),
                api.schedule.list(),
                api.dailyGoals.list(),
                api.logs.list(),
                api.studyPlanTasks.list()
            ]);

            if (concursosData) {
                let mergedConcursos = [...concursosData];
                const dbIds = new Set(concursosData.map(c => c.id));
                const savedLocalConcursosRaw = localStorage.getItem('cp_concursos_backup');
                if (savedLocalConcursosRaw) {
                    try {
                        const localConcursos: Concurso[] = JSON.parse(savedLocalConcursosRaw);
                        localConcursos.forEach(lc => {
                            if (!dbIds.has(lc.id)) {
                                mergedConcursos.push(lc);
                                api.concursos.upsert(lc).catch(err => console.error('Error auto-pushing local concurso to cloud:', err));
                            }
                        });
                    } catch (e) {}
                }
                const loadedConcursos = mergedConcursos.map(c => {
                    const localImg = localStorage.getItem(`gp_concurso_img_${c.id}`);
                    return localImg ? { ...c, imageUrl: localImg } : c;
                });
                setConcursos(loadedConcursos);
                localStorage.setItem('cp_concursos_backup', JSON.stringify(loadedConcursos));
            }
            let finalSessions = sessionsData || [];
            let finalScheduleRaw = scheduleData || [];


            if (sessionsData) setSessions(finalSessions);
            if (simuladosData) setSimulados(simuladosData);

            // Handle study plan tasks from Supabase
            if (studyPlanTasksData && studyPlanTasksData.length > 0) {
                setStudyTasks(studyPlanTasksData);
                localStorage.setItem('cp_study_tasks', JSON.stringify(studyPlanTasksData));
            } else {
                // Se a busca no Supabase não trouxe tarefas (ex: migração ainda não rodada ou offline),
                // tenta manter as locais e enviar para o banco se houver
                const savedTasks = localStorage.getItem('cp_study_tasks');
                if (savedTasks) {
                    try {
                        const localTasks = JSON.parse(savedTasks);
                        if (Array.isArray(localTasks) && localTasks.length > 0) {
                            setStudyTasks(localTasks);
                            api.studyPlanTasks.upsertBatch(localTasks).catch(() => {});
                        }
                    } catch (e) {}
                }
            }
            let finalSchedule: ScheduledStudy[] = [];
            if (scheduleData) {
                // Reconstrução de tarefas para sessões de estudo que não possuam ScheduledStudy correspondente
                const scheduledIds = new Set(finalScheduleRaw.map((s: any) => s.id));
                finalSessions.forEach(sess => {
                    if (!scheduledIds.has(sess.id)) {
                        const reconstructed: ScheduledStudy = {
                            id: sess.id,
                            date: getLocalDateString(sess.date),
                            subjectId: sess.subjectId,
                            topicId: sess.topicId,
                            activityType: sess.activityType || 'Leitura, Questões',
                            durationInMinutes: sess.durationInMinutes,
                            questionsDone: sess.questionsDone,
                            questionsCorrect: sess.questionsCorrect,
                            questionsLink: sess.questionsLink,
                            status: 'realizado'
                        };
                        finalScheduleRaw.push(reconstructed);
                        scheduledIds.add(sess.id);
                    }
                });

                const localRaw = localStorage.getItem('cp_scheduled_studies');
                const localStudies: ScheduledStudy[] = localRaw ? JSON.parse(localRaw) : [];
                const localStatusMap = new Map(localStudies.map(s => [s.id, s.status]));
                const sessionIds = new Set(finalSessions.map(s => s.id));

                finalSchedule = finalScheduleRaw.map((s: any) => {
                    let status: 'planejado' | 'realizado' = 'planejado';
                    if (sessionIds.has(s.id)) {
                        status = 'realizado';
                    } else if (localStatusMap.has(s.id)) {
                        // Fallback: usar status salvo no localStorage (pode ter sido marcado offline)
                        status = localStatusMap.get(s.id) as 'planejado' | 'realizado';
                    }
                    return {
                        ...s,
                        status
                    };
                });

                // Filter out uncompleted tasks for any concurso whose schedule is currently disabled, or deleted tasks
                let deletedIdsSet = new Set<string>();
                try {
                    const savedDeleted = localStorage.getItem('cp_deleted_scheduled_ids');
                    if (savedDeleted) deletedIdsSet = new Set(JSON.parse(savedDeleted));
                } catch (e) {}

                const subjectToConcursoMap = new Map<string, string>();
                (concursosData || []).forEach(c => {
                    (c.subjects || []).forEach((sub: any) => subjectToConcursoMap.set(sub.id, c.id));
                });

                // Limpar dos IDs deletados qualquer tarefa realizada
                let deletedModified = false;
                finalSchedule.forEach(s => {
                    if (s.status === 'realizado' && deletedIdsSet.has(s.id)) {
                        deletedIdsSet.delete(s.id);
                        deletedModified = true;
                    }
                });
                if (deletedModified) {
                    localStorage.setItem('cp_deleted_scheduled_ids', JSON.stringify(Array.from(deletedIdsSet)));
                }

                const filteredFinalSchedule = finalSchedule.filter(s => {
                    // Tarefas marcadas como realizadas NUNCA são removidas por filtros de deleção
                    if (s.status === 'realizado') return true;
                    if (deletedIdsSet.has(s.id)) return false;
                    const concId = s.concursoId || (s.subjectId ? subjectToConcursoMap.get(s.subjectId) : undefined);
                    if (concId) {
                        try {
                            const saved = localStorage.getItem(`cp_cronograma_prefs_${concId}`);
                            if (saved) {
                                const parsed = JSON.parse(saved);
                                if (parsed.isCronogramaEnabled === false) return false;
                            }
                        } catch (e) {}
                    }
                    return true;
                });

                setScheduledStudies(filteredFinalSchedule);
                localStorage.setItem('cp_scheduled_studies', JSON.stringify(filteredFinalSchedule));

                if (deletedIdsSet.size > 0) {
                    api.schedule.deleteBatch(Array.from(deletedIdsSet)).catch(() => {});
                }
            }
            if (goalsData) setDailyGoals(goalsData);
            if (logsData) setLogs(logsData);

            // Sync simulated sessions
            await syncSimuladoSessions(simuladosData || [], sessionsData || []);

            // Sync planned reviews
            await syncPlannedReviewsDb(sessionsData || [], finalSchedule, concursosData || []);

            // Sync user preferences from cloud
            try {
                const userSettings = await api.settings.get();
                if (userSettings) {
                    if (userSettings.selectedConcursoId && userSettings.selectedConcursoId !== selectedConcursoId) {
                        setSelectedConcursoIdState(userSettings.selectedConcursoId);
                        localStorage.setItem('cp_selected_concurso_id', userSettings.selectedConcursoId);
                    }
                    // PRIORIDADE: localStorage tem prioridade sobre a nuvem para customReviewDays
                    // Só usamos o valor da nuvem se o localStorage estiver vazio (sem configuração local)
                    const localSavedReviewDays = localStorage.getItem('estudos_custom_review_days');
                    const hasLocalReviewDays = !!localSavedReviewDays && localSavedReviewDays !== '[]';
                    if (!hasLocalReviewDays && userSettings.customReviewDays && Array.isArray(userSettings.customReviewDays) && userSettings.customReviewDays.length > 0) {
                        // Só importa da nuvem se não há nada salvo localmente
                        localStorage.setItem('estudos_custom_review_days', JSON.stringify(userSettings.customReviewDays));
                        window.dispatchEvent(new Event('local-reviews-toggled'));
                    } else if (hasLocalReviewDays) {
                        // Publica o valor local na nuvem para mantê-la sincronizada
                        try {
                            const parsed = JSON.parse(localSavedReviewDays!);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                api.settings.update({ customReviewDays: parsed }).catch(() => {});
                            }
                        } catch (e) {}
                    }
                    if (userSettings.globalDailyGoal) {
                        setGlobalDailyGoalState(userSettings.globalDailyGoal);
                        localStorage.setItem('cp_global_daily_goal', String(userSettings.globalDailyGoal));
                    }
                }
            } catch (e) {}

            setLastSaved(new Date().toLocaleTimeString());
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [currentUser, syncSimuladoSessions, syncPlannedReviewsDb]);

    // Supabase Auth and User Setup
    useEffect(() => {
        let subscription: any = null;

        try {
            const { data } = supabase.auth.onAuthStateChange((_event, session) => {
                if (session?.user) {
                    setCurrentUser(prev => {
                        if (prev?.id === session.user.id) return prev;
                        return {
                            id: session.user.id,
                            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Estudante',
                            password: '',
                            avatar: session.user.user_metadata?.avatar || 'student',
                            email: session.user.email
                        };
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
            setIsLoading(false);
        }

        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
        };
    }, []);

    const fetchDataRef = useRef(fetchData);
    useEffect(() => {
        fetchDataRef.current = fetchData;
    });

    const userId = currentUser?.id;

    // Trigger Fetch on User Change and Window Focus
    useEffect(() => {
        if (!userId) return;
        
        fetchDataRef.current();

        // Throttle: só refaz fetch ao focar a janela se passaram mais de 5 minutos
        // desde o último fetch. Evita centenas de queries desnecessárias por dia.
        let lastFocusFetchAt = Date.now();
        const FOCUS_THROTTLE_MS = 5 * 60 * 1000; // 5 minutos

        const handleFocus = () => {
            const now = Date.now();
            if (now - lastFocusFetchAt < FOCUS_THROTTLE_MS) {
                return;
            }
            lastFocusFetchAt = now;
            fetchDataRef.current(true);
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [userId]);


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

    const [settingsTick, setSettingsTick] = useState(0);
    useEffect(() => {
        const handleSettingsChanged = () => setSettingsTick(t => t + 1);
        window.addEventListener('local-settings-changed', handleSettingsChanged);
        return () => window.removeEventListener('local-settings-changed', handleSettingsChanged);
    }, []);

    const filteredScheduledStudies = useMemo(() => {
        const activeSimDates = new Set((simulados || []).map(sim => sim.date?.split('T')[0]).filter(Boolean));

        // Mapeia disciplinas para o id do concurso correspondente
        const subjectToConcursoMap = new Map<string, string>();
        concursos.forEach(c => {
            (c.subjects || []).forEach(sub => {
                subjectToConcursoMap.set(sub.id, c.id);
            });
        });

        const isCronogramaEnabledForConcurso = (concursoId?: string) => {
            if (!concursoId || concursoId === 'all') return true;
            try {
                const saved = localStorage.getItem(`cp_cronograma_prefs_${concursoId}`);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.isCronogramaEnabled === false) return false;
                }
            } catch (e) {}
            return true;
        };

        const validScheduled = scheduledStudies.filter(s => {
            if (s.activityType === 'Simulado' && s.status === 'realizado') {
                const sDate = s.date?.split('T')[0];
                if (!activeSimDates.has(sDate)) return false;
            }

            // Se for atividade agendada e NÃO realizada, ocultar se o cronograma daquele concurso estiver desativado
            if (s.status !== 'realizado') {
                const concId = s.subjectId 
                    ? (subjectToConcursoMap.get(s.subjectId) || (selectedConcursoId !== 'all' ? selectedConcursoId : undefined)) 
                    : (selectedConcursoId !== 'all' ? selectedConcursoId : undefined);
                if (concId && !isCronogramaEnabledForConcurso(concId)) {
                    return false;
                }
            }

            return true;
        });

        if (selectedConcursoId === 'all') return validScheduled;
        const subIds = new Set((activeConcurso?.subjects || []).map(s => s.id));
        return validScheduled.filter(s => subIds.has(s.subjectId));
    }, [scheduledStudies, simulados, selectedConcursoId, activeConcurso, concursos, settingsTick]);

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

        // Sync planned reviews — usa o estado atualizado via functional updater para evitar stale state
        setScheduledStudies(prevSchedule => {
            const updatedForSync = prevSchedule; // prevSchedule ja tem o newScheduled adicionado
            // Dispara sync de forma assíncrona sem bloquear o render
            syncPlannedReviewsDb([...sessions, session], updatedForSync, concursos)
                .catch(e => console.error('Error syncing reviews after addSession:', e));
            return prevSchedule; // Retorna sem alterar — sync atualiza via seu próprio setScheduledStudies
        });

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
            localStorage.setItem('cp_concursos_backup', JSON.stringify(newConcursos));
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

        // PROTEÇÃO: Nunca apagar tarefas realizadas (status === 'realizado')
        const completedIds = new Set(
            scheduledStudies
                .filter(s => ids.includes(s.id) && s.status === 'realizado')
                .map(s => s.id)
        );
        const safeIdsToDelete = ids.filter(id => !completedIds.has(id));
        if (safeIdsToDelete.length === 0) return;

        // If any of them are reviews, track them as deleted so they are not auto-recreated
        const reviewsToDelete = scheduledStudies.filter(s => safeIdsToDelete.includes(s.id) && s.activityType && (s.activityType.toLowerCase().includes('revisão') || s.activityType.toLowerCase().includes('revisao')));
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

        try {
            const savedDeleted = localStorage.getItem('cp_deleted_scheduled_ids') || '[]';
            const deletedSet = new Set(JSON.parse(savedDeleted));
            safeIdsToDelete.forEach(id => deletedSet.add(id));
            localStorage.setItem('cp_deleted_scheduled_ids', JSON.stringify(Array.from(deletedSet)));
        } catch (e) {}

        const updatedSchedule = scheduledStudies.filter(s => !safeIdsToDelete.includes(s.id));
        const updatedSessions = sessions.filter(s => !safeIdsToDelete.includes(s.id));

        // Cascade: Remove from schedule AND sessions in local state
        setScheduledStudies(updatedSchedule);
        localStorage.setItem('cp_scheduled_studies', JSON.stringify(updatedSchedule));
        setSessions(updatedSessions);
        window.dispatchEvent(new Event('local-settings-changed'));

        try {
            await Promise.all(safeIdsToDelete.map(async id => {
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

        // Persistir primeiro no banco (antes da sincronização de revisões)
        try {
            await api.schedule.update(id, merged);
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error updating scheduled study:', e);
            setSaveError('Erro ao atualizar item na agenda.');
        }

        // Depois de salvo no banco, sincronizar revisões planejadas
        await syncPlannedReviewsDb(updatedSessionsForSync, updatedScheduleForSync, concursos);
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
            questionsLink?: string | null;
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
        const editingGroupId = editingTask && editingTask.notes ? parseNotesGroup(editingTask.notes).groupId : null;

        const isDeterministicReview = editingTask && editingTask.id.startsWith('review-');

        if (editingTask && !isAulao && selectedSubjects.length === 1 && topicIdsToSave.length === 1 && !(editingTask as any).isGroupedVirtual && !editingGroupId && !isDeterministicReview) {
            const subId = selectedSubjects[0];
            const topicId = topicIdsToSave[0];
            
            // Gerar a tag de negócio própria para a atividade de estudo
            let topicTitle: string | undefined;
            if (topicId) {
                const conc = concursos.find(c => (c.subjects || []).some(sub => sub.id === subId));
                const subj = conc?.subjects.find(sub => sub.id === subId);
                const top = subj?.topics.find(t => t.id === topicId);
                topicTitle = top?.title;
            }
            const itemTag = getActivityTag(subId, selectedDayKey, topicTitle);
            const { cleanNotes } = parseNotesGroup(formData.notes);
            const itemNotes = itemTag ? `${itemTag} - ${cleanNotes}` : cleanNotes;

            const updates: Partial<ScheduledStudy> = {
                date: selectedDayKey,
                subjectId: subId,
                topicId: topicId,
                activityType: activityTypesStr,
                notes: itemNotes,
                durationInMinutes: durationVal || undefined,
                questionsDone: questionsDoneVal,
                questionsCorrect: questionsCorrectVal,
                status: formData.status,
                questionsLink: formData.questionsLink || undefined // Salva o link nas edições!
            };
            await updateScheduledStudy(editingTask.id, updates);
            return;
        }

        // 2. Determine which old tasks to delete
        const tasksToDeleteIds: string[] = [];
        if (editingTask) {
            const gId = editingGroupId || (editingTask as any).groupId;
            if (gId) {
                const groupTasks = scheduledStudies.filter(t => t.notes && parseNotesGroup(t.notes).groupId === gId);
                tasksToDeleteIds.push(...groupTasks.map(t => t.id));
            } else {
                tasksToDeleteIds.push(editingTask.id);
            }
        }

        // 3. Build new entries: preserva o groupId original se ele já existir para não perder o vinculo
        const newGroupId = editingGroupId || ((selectedSubjects.length > 1 || topicIdsToSave.length > 1) ? crypto.randomUUID() : null);

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

                // Gerar a tag de negócio própria para cada atividade de estudo individual
                let topicTitle: string | undefined;
                if (topicId) {
                    const conc = concursos.find(c => (c.subjects || []).some(sub => sub.id === subId));
                    const subj = conc?.subjects.find(sub => sub.id === subId);
                    const top = subj?.topics.find(t => t.id === topicId);
                    topicTitle = top?.title;
                }
                const itemTag = getActivityTag(subId, selectedDayKey, topicTitle);
                const { cleanNotes } = parseNotesGroup(formData.notes);
                let itemNotes = itemTag ? `${itemTag} - ${cleanNotes}` : cleanNotes;
                if (newGroupId) {
                    itemNotes = `[groupId:${newGroupId}] ${itemNotes}`;
                }

                if (formData.status === 'realizado') {
                    sessionsList.push({
                        id: crypto.randomUUID(),
                        subjectId: subId,
                        topicId: topicId,
                        durationInMinutes: itemDuration,
                        date: new Date(`${selectedDayKey}T12:00:00`).toISOString(),
                        questionsDone: itemDone,
                        questionsCorrect: itemCorrect,
                        activityType: activityTypesStr,
                        notes: itemNotes,
                        questionsLink: formData.questionsLink
                    } as any);
                } else {
                    newEntries.push({
                        id: crypto.randomUUID(),
                        date: selectedDayKey,
                        subjectId: subId,
                        topicId: topicId,
                        activityType: activityTypesStr,
                        notes: itemNotes,
                        durationInMinutes: itemDuration || undefined,
                        questionsDone: itemDone,
                        questionsCorrect: itemCorrect,
                        status: formData.status,
                        questionsLink: formData.questionsLink || undefined
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
            const updatedSessions = sessions.filter(s => !ids.includes(s.id));
            // Atualiza sessions localmente ANTES de chamar sync para evitar stale state
            setSessions(updatedSessions);
            for (const id of ids) {
                try { await api.sessions.delete(id); } catch(e) {}
            }
            // Sync com o estado já atualizado
            const updatedSchedule = scheduledStudies.map(s => ids.includes(s.id) ? { ...s, status: 'planejado' as const } : s);
            await syncPlannedReviewsDb(updatedSessions, updatedSchedule, concursos);
        } else {
            const newSessions: StudySession[] = [];
            for (const study of studies) {
                const newSession: StudySession = {
                    id: study.id,
                    subjectId: study.subjectId,
                    topicId: study.topicId,
                    durationInMinutes: study.durationInMinutes ?? 0,
                    date: study.date, // Manter data como YYYY-MM-DD — sem conversão UTC que causa fuso horário
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
            }
            const updatedSessions = [...sessions, ...newSessions];
            // Atualiza sessions localmente ANTES de chamar sync para evitar stale state
            setSessions(updatedSessions);

            // Sync com o estado já atualizado
            const updatedSchedule = scheduledStudies.map(s => ids.includes(s.id) ? { ...s, status: 'realizado' as const } : s);
            await syncPlannedReviewsDb(updatedSessions, updatedSchedule, concursos);
        }
    };

    const addScheduledStudiesBatch = useCallback(async (items: (Omit<ScheduledStudy, 'id' | 'status'> & { id?: string })[]) => {
        setIsSaving(true);
        setSaveError(null);
        try {
            const itemsWithTags = items.map(item => {
                let topicTitle: string | undefined;
                if (item.topicId) {
                    const conc = concursos.find(c => (c.subjects || []).some(sub => sub.id === item.subjectId));
                    const subj = conc?.subjects.find(sub => sub.id === item.subjectId);
                    const top = subj?.topics.find(t => t.id === item.topicId);
                    topicTitle = top?.title;
                }
                const itemTag = getActivityTag(item.subjectId, item.date, topicTitle);
                
                // Extrai notas limpas se a tag já existir para não duplicar, senão usa notes original
                const parsed = parseNotesGroup(item.notes || '');
                const cleanNotesText = parsed.cleanNotes || item.notes || '';
                
                // Monta a nota com a tag gerada
                let finalNotes = itemTag ? `${itemTag} - ${cleanNotesText}` : cleanNotesText;
                if (parsed.groupId) {
                    finalNotes = `[groupId:${parsed.groupId}] ${finalNotes}`;
                }
                
                return {
                    ...item,
                    notes: finalNotes
                };
            });

            const savedItems = await api.schedule.createBatch(itemsWithTags);

            // Clear created IDs from cp_deleted_scheduled_ids so future fetches don't filter them
            try {
                const deletedRaw = localStorage.getItem('cp_deleted_scheduled_ids') || '[]';
                const deletedArr: string[] = JSON.parse(deletedRaw);
                const newIds = new Set(savedItems.map(s => s.id));
                const filtered = deletedArr.filter(id => !newIds.has(id));
                localStorage.setItem('cp_deleted_scheduled_ids', JSON.stringify(filtered));
            } catch (e) {}

            setScheduledStudies(prev => {
                const targetConcursoId = items[0]?.concursoId;
                const targetSubjectIds = new Set(items.map(i => i.subjectId));

                const cleanedPrev = prev.filter(s => {
                    if (s.status === 'realizado') return true;
                    if (targetConcursoId && s.concursoId === targetConcursoId) return false;
                    if (s.subjectId && targetSubjectIds.has(s.subjectId) && (s.generatedByCronograma || s.activityType === 'Simulado')) return false;
                    return true;
                });

                const combined = [...cleanedPrev, ...savedItems];
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
    }, [api.schedule, concursos, getActivityTag]);

    const deleteScheduledStudiesBatch = useCallback(async (ids: string[]) => {
        if (ids.length === 0) return;
        setIsSaving(true);
        setSaveError(null);

        // Identificar apenas tarefas NÃO concluídas para apagar
        const completedIds = new Set(
            scheduledStudies
                .filter(s => ids.includes(s.id) && s.status === 'realizado')
                .map(s => s.id)
        );
        
        const uncompletedIdsToDelete = ids.filter(id => !completedIds.has(id));
        if (uncompletedIdsToDelete.length === 0) {
            setIsSaving(false);
            return;
        }

        // Persistir IDs deletados no localStorage para evitar re-hidratação
        try {
            const savedDeleted = localStorage.getItem('cp_deleted_scheduled_ids') || '[]';
            const deletedSet = new Set(JSON.parse(savedDeleted));
            uncompletedIdsToDelete.forEach(id => deletedSet.add(id));
            localStorage.setItem('cp_deleted_scheduled_ids', JSON.stringify(Array.from(deletedSet)));
        } catch (e) {}

        // 1. Atualizar estado local e localStorage de forma GARANTIDA e IMEDIATA
        setScheduledStudies(prev => {
            const filtered = prev.filter(s => !uncompletedIdsToDelete.includes(s.id));
            localStorage.setItem('cp_scheduled_studies', JSON.stringify(filtered));
            return filtered;
        });
        setSessions(prev => prev.filter(s => !uncompletedIdsToDelete.includes(s.id) || completedIds.has(s.id)));
        setLastSaved(new Date().toLocaleTimeString());
        window.dispatchEvent(new Event('local-settings-changed'));

        // 2. Tentar deletar no Supabase DB de forma assíncrona (com tratamento de exceção sem bloquear a UI)
        try {
            await api.schedule.deleteBatch(uncompletedIdsToDelete);
            for (const id of uncompletedIdsToDelete) {
                try { await api.sessions.delete(id); } catch(e) {}
            }
        } catch (e) {
            console.error('Non-fatal error purging scheduled studies from Supabase DB:', e);
        } finally {
            setIsSaving(false);
        }
    }, [api.schedule, scheduledStudies]);

    const resetConcursoSchedule = useCallback(async (concursoId: string) => {
        if (!concursoId || concursoId === 'all') return;
        const concurso = concursos.find(c => c.id === concursoId);
        if (!concurso) return;

        const subjectIds = new Set((concurso.subjects || []).map(s => s.id));
        setIsSaving(true);
        setSaveError(null);

        // 1. Identificar apenas itens vinculados às disciplinas do concurso (ou simulados) que NÃO estejam realizados
        const itemsToDelete = scheduledStudies.filter(s => 
            (subjectIds.has(s.subjectId) || s.activityType === 'Simulado') && 
            s.status !== 'realizado'
        );
        const idsToDelete = itemsToDelete.map(s => s.id);

        setScheduledStudies(prev => {
            const updated = prev.filter(s => !idsToDelete.includes(s.id));
            localStorage.setItem('cp_scheduled_studies', JSON.stringify(updated));
            return updated;
        });

        // 2. Apagar do banco de dados apenas os IDs gerados pelo cronograma não realizados
        try {
            if (idsToDelete.length > 0) {
                await api.schedule.deleteBatch(idsToDelete);
            }

            addLog({
                message: `Tarefas não concluídas geradas pelo cronograma de "${concurso.name}" removidas com sucesso (estudos manuais e tarefas concluídas preservados)`,
                type: 'info'
            });
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Error resetting concurso schedule:', e);
            setSaveError('Erro ao zerar o cronograma no banco de dados.');
        } finally {
            setIsSaving(false);
        }
    }, [concursos, scheduledStudies, addLog, api.schedule]);

    return {
        currentUser, setCurrentUser,
        users, setUsers: updateUser,
        concursos, setConcursos: updateConcursos,
        selectedConcursoId, setSelectedConcursoId,
        sessions: filteredSessions, setSessions: (s: any) => s, // Disabled direct set
        allSessions: sessions,
        simulados: filteredSimulados, setSimulados: (s: any) => s, // Disabled direct set
        scheduledStudies: filteredScheduledStudies, setScheduledStudies: updateScheduledStudies, deleteScheduledStudy, updateScheduledStudy, saveCalendarActivity,
        allScheduledStudies: scheduledStudies,
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
        resetConcursoSchedule,
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
