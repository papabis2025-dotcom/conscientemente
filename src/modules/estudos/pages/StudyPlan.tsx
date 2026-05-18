
import React, { useEffect, useMemo } from 'react';
import { CheckCircle, Circle, Lightbulb } from 'lucide-react';
import { Subject, StudySession } from '../types';

import AISuggestions from '../components/dashboard/AISuggestions';

interface StudyPlanProps {
    subjects: Subject[];
    sessions: StudySession[];
    studyTasks: { id: string, subjectId: string, subjectName: string, topicId?: string, topicName?: string, done: boolean, date: string }[];
    onUpdateTasks: (tasks: { id: string, subjectId: string, subjectName: string, topicId?: string, topicName?: string, done: boolean, date: string }[]) => void;
}

const StudyPlan: React.FC<StudyPlanProps> = ({ subjects, sessions, studyTasks, onUpdateTasks }) => {

    useEffect(() => {
        const now = new Date();
        const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        // Check if we already have tasks for today
        let tasksForToday = studyTasks.filter(t => t.date === today);

        if (tasksForToday.length === 0 && subjects.length > 0) {
            console.log("Generating study plan for", today);

            // 1. Check for REVIEW tasks (7 days or 30 days ago)
            const reviewTasks: { id: string, subjectId: string, subjectName: string, topicId: string, topicName: string, done: boolean, date: string, isReview: boolean }[] = [];
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);

            subjects.forEach(sub => {
                sub.topics.forEach(topic => {
                    // Find last session for this topic
                    const topicSessions = sessions.filter(s => s.subjectId === sub.id && s.topicId === topic.id);
                    if (topicSessions.length > 0) {
                        const sortedSessions = [...topicSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        const lastDate = new Date(sortedSessions[0].date);
                        lastDate.setHours(0, 0, 0, 0);

                        // Calculate diff in days
                        const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        // Check for 7 or 30 days (allow margin of error +/- 0.5 to handle timezones perfectly, but exact day match is best)
                        // Actually, let's look for exact 7 or 30 days ago matches roughly
                        if (diffDays === 7 || diffDays === 30) {
                            reviewTasks.push({
                                id: crypto.randomUUID(),
                                subjectId: sub.id,
                                subjectName: `Revisão: ${sub.name}`, // Distinct name
                                topicId: topic.id,
                                topicName: `Revisão de ${diffDays} dias: ${topic.title}`,
                                done: false,
                                date: today,
                                isReview: true // Internal flag
                            });
                        }
                    }
                });
            });

            // Stick to max 1 review task for now to not overwhelm? Or take all? 
            // User asked: "uma tarefa por dia apenas e mais uma revisão, se houver alguma prevista"
            // So: 1 Regular Task + 1 Review Task (if any).

            const selectedReviewTask = reviewTasks.length > 0 ? reviewTasks[0] : null; // Take the first one found


            // 2. Generate ONE regular study task
            // Calculate scores for each subject
            const rankedSubjects = subjects.map(sub => {
                // 1. Weight (Peso) - Default to 1 if not set
                const weight = sub.weight || 1;

                // 2. Performance (Accuracy)
                const subSessions = sessions.filter(s => s.subjectId === sub.id);
                const totalDone = subSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
                const totalCorrect = subSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
                const accuracy = totalDone > 0 ? (totalCorrect / totalDone) * 100 : 0;

                // 3. Hours Studied
                const totalMinutes = subSessions.reduce((acc, s) => acc + s.durationInMinutes, 0);
                const hours = totalMinutes / 60;

                // Scoring Algorithm
                let score = 0;
                score += weight * 30; // Weight impact
                score += (100 - accuracy); // Performance impact (0-100)
                score += Math.max(0, (10 - hours) * 10); // Time impact (up to 10h saturation)
                score += Math.max(0, (500 - totalDone) * 0.2); // Volume impact (up to 500 questions saturation)

                return { sub, score, accuracy, hours, totalDone };
            });

            // Sort by score descending and take top 1
            const topSubject = rankedSubjects.sort((a, b) => b.score - a.score)[0];

            let newRegularTask = null;

            if (topSubject) {
                const subjectTopics = topSubject.sub.topics || [];
                let selectedTopic: { id: string, title: string } | undefined;

                if (subjectTopics.length > 0) {
                    // Get stats per topic
                    const topicStats = subjectTopics.map(topic => {
                        const topicSessions = sessions.filter(s => s.subjectId === topSubject.sub.id && s.topicId === topic.id);
                        const tDone = topicSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
                        const tCorrect = topicSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
                        const tAccuracy = tDone > 0 ? (tCorrect / tDone) * 100 : 0;
                        const tHours = topicSessions.reduce((acc, s) => acc + s.durationInMinutes, 0) / 60;
                        return { topic, tAccuracy, tHours, tDone };
                    });

                    // Sort: 1. Fewest questions done (new topics), 2. Lowest accuracy
                    topicStats.sort((a, b) => {
                        if (a.tDone === 0 && b.tDone > 0) return -1;
                        if (b.tDone === 0 && a.tDone > 0) return 1;
                        return a.tAccuracy - b.tAccuracy;
                    });

                    if (topicStats.length > 0) {
                        selectedTopic = { id: topicStats[0].topic.id, title: topicStats[0].topic.title };
                    }
                }

                newRegularTask = {
                    id: crypto.randomUUID(),
                    subjectId: topSubject.sub.id,
                    subjectName: topSubject.sub.name,
                    topicId: selectedTopic?.id,
                    topicName: selectedTopic?.title,
                    done: false,
                    date: today
                };
            }

            const tasksToadd = [];
            if (newRegularTask) tasksToadd.push(newRegularTask);
            if (selectedReviewTask) tasksToadd.push(selectedReviewTask);

            // Append new tasks to state.
            const otherTasks = studyTasks.filter(t => t.date !== today);
            onUpdateTasks([...otherTasks, ...tasksToadd]);
        }
    }, [subjects, sessions, studyTasks]); // Removed onUpdateTasks from dep array to avoid infinite loop if it changes, though it should be stable.

    const todaysTasks = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        return studyTasks.filter(t => t.date === today);
    }, [studyTasks]);

    const toggleTask = (taskId: string) => {
        const newTasks = studyTasks.map(t => {
            if (t.id === taskId) {
                return { ...t, done: !t.done };
            }
            return t;
        });
        onUpdateTasks(newTasks);
    };

    const progress = useMemo(() => {
        if (todaysTasks.length === 0) return 0;
        const done = todaysTasks.filter(t => t.done).length;
        return Math.round((done / todaysTasks.length) * 100);
    }, [todaysTasks]);

    const generatedSuggestions = useMemo(() => {
        const suggs: { subjectName: string; message: string; type: 'warning' | 'info' | 'success' }[] = [];

        // 1. Check for low performance subjects (< 60%)
        subjects.forEach(sub => {
            const subSessions = sessions.filter(s => s.subjectId === sub.id && (s.activityType === 'Questões' || s.activityType === 'Simulado'));
            const totalDone = subSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
            const totalCorrect = subSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);

            if (totalDone >= 10) {
                const accuracy = (totalCorrect / totalDone) * 100;
                if (accuracy < 60) {
                    suggs.push({
                        subjectName: sub.name,
                        message: `Atenção! Sua taxa de acerto está em ${Math.round(accuracy)}%. Recomendamos revisar a teoria antes de prosseguir com mais questões.`,
                        type: 'warning'
                    });
                } else if (accuracy > 85 && totalDone > 50) {
                    suggs.push({
                        subjectName: sub.name,
                        message: `Excelente domínio! (${Math.round(accuracy)}%). Considere aumentar o nível de dificuldade ou focar em outras matérias.`,
                        type: 'success'
                    });
                }
            } else if (totalDone === 0) {
                suggs.push({
                    subjectName: sub.name,
                    message: "Você ainda não iniciou os estudos práticos desta disciplina. Que tal fazer algumas questões hoje?",
                    type: 'info'
                });
            }
        });

        // 2. Check for syllabus coverage gaps
        const leastCoveredSubject = [...subjects].sort((a, b) => {
            const getCoverage = (sub: Subject) => {
                const covered = sub.topics.filter(t => sessions.some(s => s.subjectId === sub.id && s.topicId === t.id)).length;
                return sub.topics.length > 0 ? covered / sub.topics.length : 0;
            };
            return getCoverage(a) - getCoverage(b);
        })[0];

        if (leastCoveredSubject) {
            suggs.push({
                subjectName: leastCoveredSubject.name,
                message: "Esta é a disciplina com menor cobertura do edital até agora. Priorize novos tópicos dela.",
                type: 'info'
            });
        }

        // Return a mix, prioritize warnings
        return suggs.sort((a, b) => {
            if (a.type === 'warning' && b.type !== 'warning') return -1;
            if (a.type !== 'warning' && b.type === 'warning') return 1;
            return 0;
        }).slice(0, 5);
    }, [subjects, sessions]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
                <div>
                    <h2 className="text-2xl font-black text-zinc-800 dark:text-white tracking-tight uppercase flex items-center gap-2">
                        Plano de Estudos <Lightbulb size={20} className="text-blue-500" />
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Sua rotina diária otimizada pela IA. Focamos no que você mais precisa evoluir hoje.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-zinc-800 dark:text-white uppercase tracking-tight">Metas de Hoje</h3>
                                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">
                                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className={`text-3xl font-black ${progress === 100 ? 'text-emerald-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                    {progress}%
                                </span>
                            </div>
                        </div>

                        {todaysTasks.length > 0 ? (
                            <div className="space-y-4">
                                {todaysTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        onClick={() => toggleTask(task.id)}
                                        className={`group flex items-center gap-5 p-5 rounded-3xl border-2 transition-all cursor-pointer ${task.done
                                            ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500/20 opacity-75'
                                            : 'bg-white dark:bg-zinc-950/50 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:border-zinc-700 dark:hover:border-zinc-800 hover:shadow-md'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${task.done
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-300 group-hover:text-blue-400'
                                            }`}>
                                            {task.done ? <CheckCircle size={18} fill="currentColor" /> : <Circle size={18} />}
                                        </div>
                                        <div>
                                    <h4 className={`text-lg font-bold transition-colors ${task.done ? 'text-emerald-700 dark:text-emerald-400 line-through' : 'text-zinc-800 dark:text-white'
                                                }`}>
                                                {subjects.find(s => s.id === task.subjectId)?.name || task.subjectName || 'Disciplina'}
                                            </h4>
                                            {task.topicName && (
                                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 transition-colors">
                                                    Foco: <span className="text-zinc-900 dark:text-zinc-100">{task.topicName}</span>
                                                </p>
                                            )}
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mt-1">
                                                {task.done ? 'Concluído' : 'Pendente'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-zinc-400 font-medium">Nenhuma tarefa gerada. Adicione disciplinas e estude para receber sugestões!</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-lg font-black text-zinc-800 dark:text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                                Sugestões da IA 🤖
                            </h3>
                            <AISuggestions suggestions={generatedSuggestions} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudyPlan;
