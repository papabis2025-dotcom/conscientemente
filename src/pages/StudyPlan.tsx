
import React, { useEffect, useMemo } from 'react';
import { CheckCircle, Circle, Calendar, Trophy, Lightbulb, Target } from 'lucide-react';
import { Subject, StudySession } from '../types';

interface StudyPlanProps {
    subjects: Subject[];
    sessions: StudySession[];
    studyTasks: { id: string, subjectId: string, subjectName: string, topicId?: string, topicName?: string, done: boolean, date: string }[];
    onUpdateTasks: (tasks: { id: string, subjectId: string, subjectName: string, topicId?: string, topicName?: string, done: boolean, date: string }[]) => void;
}

const StudyPlan: React.FC<StudyPlanProps> = ({ subjects, sessions, studyTasks, onUpdateTasks }) => {

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        // Check if we already have tasks for today
        let tasksForToday = studyTasks.filter(t => t.date === today);

        // FORCE REGENERATION FIX: If tasks exist but have no topic (legacy data from before the fix), clear them to regenerate.
        if (tasksForToday.length > 0 && tasksForToday.some(t => !t.topicId)) {
            console.log("Found legacy tasks without topics. clearing to regenerate...");
            tasksForToday = []; // valid for this scope to trigger generation
            // We also need to remove them from the persistent state so they don't come back
            const otherTasks = studyTasks.filter(t => t.date !== today);
            // We will setStudyTasks later, but for now we proceed as if empty
        }

        if (tasksForToday.length === 0 && subjects.length > 0) {
            console.log("Generating study plan for", today);

            // 1. Check for REVIEW tasks (7 days or 30 days ago)
            const reviewTasks: any[] = [];
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
        const today = new Date().toISOString().split('T')[0];
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

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <header>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-2 flex items-center gap-3">
                    Plano de Estudos <Target className="text-blue-500" size={28} />
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
                    Sua rotina diária otimizada pela IA. Focamos no que você mais precisa evoluir hoje.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Metas de Hoje</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className={`text-3xl font-black ${progress === 100 ? 'text-emerald-500' : 'text-blue-600'}`}>
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
                                            : 'bg-white dark:bg-slate-950/50 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${task.done
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-300 group-hover:text-blue-400'
                                            }`}>
                                            {task.done ? <CheckCircle size={18} fill="currentColor" /> : <Circle size={18} />}
                                        </div>
                                        <div>
                                            <h4 className={`text-lg font-bold transition-colors ${task.done ? 'text-emerald-700 dark:text-emerald-400 line-through' : 'text-slate-800 dark:text-white'
                                                }`}>
                                                {task.subjectName}
                                            </h4>
                                            {task.topicName && (
                                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors">
                                                    Foco: <span className="text-blue-600 dark:text-blue-400">{task.topicName}</span>
                                                </p>
                                            )}
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-1">
                                                {task.done ? 'Concluído' : 'Pendente'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-slate-400 font-medium">Nenhuma tarefa gerada. Adicione disciplinas e estude para receber sugestões!</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                                Progresso do Edital 📊
                            </h3>
                            <div className="space-y-5">
                                {subjects.map(sub => {
                                    // Calculate topic coverage
                                    const totalTopics = sub.topics.length;
                                    let coveredTopics = 0;

                                    if (totalTopics > 0) {
                                        coveredTopics = sub.topics.filter(t => {
                                            // Check if any session exists for this topic
                                            return sessions.some(s => s.subjectId === sub.id && s.topicId === t.id);
                                        }).length;
                                    }

                                    const coverage = totalTopics > 0 ? Math.round((coveredTopics / totalTopics) * 100) : 0;
                                    return { ...sub, coverage, coveredTopics, totalTopics };
                                })
                                    .sort((a, b) => a.coverage - b.coverage)
                                    .map(sub => (
                                        <div key={sub.id} className="relative">
                                            <div className="flex justify-between items-start mb-1.5 gap-2">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-tight" title={sub.name}>
                                                    {sub.name}
                                                </span>
                                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 shrink-0">
                                                    {sub.coverage}%
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-1">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${sub.coverage === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${sub.coverage}%` }}
                                                />
                                            </div>
                                            <p className="text-[9px] text-slate-400 text-right font-medium">
                                                {sub.coveredTopics} de {sub.totalTopics} tópicos estudados
                                            </p>
                                        </div>
                                    ))}
                                {subjects.length === 0 && (
                                    <p className="text-center text-xs text-slate-400 py-4">Nenhuma disciplina cadastrada.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudyPlan;
