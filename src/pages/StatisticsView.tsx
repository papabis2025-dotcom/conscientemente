
import React, { useMemo, useState } from 'react';
import { Subject, StudySession } from '../types';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface StatisticsViewProps {
  subjects: Subject[];
  sessions: StudySession[];
}

// Returns a color between red and green based on a 0-100 score, weighted by importance
function getHeatColor(accuracy: number, questions: number, weight: number, importance: number): string {
  // importance = 0..1 (normalized weight * inverse accuracy)
  const r = Math.round(220 - importance * 80 + (1 - importance) * 0);
  const g = Math.round(importance * 30 + (1 - importance) * 200);
  const b = Math.round(50);
  return `rgba(${Math.min(255, Math.max(0, r))}, ${Math.min(255, Math.max(0, g))}, ${b}, 0.18)`;
}

function getAccuracyTextColor(accuracy: number): string {
  if (accuracy === 0) return 'text-zinc-400';
  if (accuracy < 50) return 'text-rose-600 dark:text-rose-400';
  if (accuracy < 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ subjects, sessions }) => {
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'questions' | 'accuracy' | 'weight' | 'importance'>('importance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const toggleExpand = (id: string) => {
    const s = new Set(expandedSubjects);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedSubjects(s);
  };

  const subjectData = useMemo(() => {
    return subjects.map(sub => {
      const subSessions = sessions.filter(s => s.subjectId === sub.id);
      const questions = subSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
      const correct = subSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
      const accuracy = questions > 0 ? Math.round((correct / questions) * 100) : 0;
      const weight = sub.weight || 1;
      const questionsGoal = sub.questionsGoal || 0;

      const topics = sub.topics.map(topic => {
        const tSessions = sessions.filter(s => s.subjectId === sub.id && s.topicId === topic.id);
        const tQuestions = tSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
        const tCorrect = tSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
        const tAccuracy = tQuestions > 0 ? Math.round((tCorrect / tQuestions) * 100) : 0;
        return { id: topic.id, title: topic.title, priority: topic.priority, questions: tQuestions, correct: tCorrect, accuracy: tAccuracy };
      });

      return { sub, questions, correct, accuracy, weight, questionsGoal, topics };
    });
  }, [subjects, sessions]);

  // Compute max weight for normalization
  const maxWeight = useMemo(() => Math.max(1, ...subjectData.map(d => d.weight)), [subjectData]);
  const maxQuestions = useMemo(() => Math.max(1, ...subjectData.map(d => d.questions)), [subjectData]);

  // importance = high weight + low accuracy + low questions → needs most attention
  const getImportance = (weight: number, accuracy: number, questions: number) => {
    const wNorm = weight / maxWeight;
    const accPenalty = (100 - accuracy) / 100;
    const qPenalty = Math.max(0, 1 - questions / Math.max(1, maxQuestions));
    return (wNorm * 0.4 + accPenalty * 0.4 + qPenalty * 0.2);
  };

  const sortedData = useMemo(() => {
    return [...subjectData].sort((a, b) => {
      const impA = getImportance(a.weight, a.accuracy, a.questions);
      const impB = getImportance(b.weight, b.accuracy, b.questions);
      let diff = 0;
      if (sortBy === 'name') diff = a.sub.name.localeCompare(b.sub.name);
      else if (sortBy === 'questions') diff = a.questions - b.questions;
      else if (sortBy === 'accuracy') diff = a.accuracy - b.accuracy;
      else if (sortBy === 'weight') diff = a.weight - b.weight;
      else diff = impA - impB;
      return sortOrder === 'desc' ? -diff : diff;
    });
  }, [subjectData, sortBy, sortOrder]);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('desc'); }
  };

  const sortArrow = (col: typeof sortBy) => sortBy === col ? (sortOrder === 'desc' ? ' ↓' : ' ↑') : '';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-zinc-800 dark:text-white mb-1">Análise Estatística</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Tabela dinâmica de disciplinas e assuntos — quanto mais escuro o fundo, maior a prioridade de atenção (alto peso + baixo aproveitamento).
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-rose-500/20 border border-rose-300/30" />
          Alta prioridade
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-400/20 border border-amber-300/30" />
          Atenção moderada
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-300/30" />
          Bom desempenho
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <th className="px-5 py-4 w-8" />
                <th className="px-5 py-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200" onClick={() => handleSort('name')}>
                  Disciplina / Assunto{sortArrow('name')}
                </th>
                <th className="px-5 py-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200 text-right" onClick={() => handleSort('questions')}>
                  Questões{sortArrow('questions')}
                </th>
                <th className="px-5 py-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200 text-right" onClick={() => handleSort('accuracy')}>
                  Aproveitamento{sortArrow('accuracy')}
                </th>
                <th className="px-5 py-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200 text-right" onClick={() => handleSort('weight')}>
                  Peso{sortArrow('weight')}
                </th>
                <th className="px-5 py-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200 text-right" onClick={() => handleSort('importance')}>
                  Prioridade{sortArrow('importance')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {sortedData.map(({ sub, questions, accuracy, weight, questionsGoal, topics }) => {
                const importance = getImportance(weight, accuracy, questions);
                const bgColor = getHeatColor(accuracy, questions, weight, importance);
                const isExpanded = expandedSubjects.has(sub.id);
                const priorityPct = Math.round(importance * 100);

                return (
                  <React.Fragment key={sub.id}>
                    {/* Subject row */}
                    <tr
                      className="cursor-pointer hover:brightness-95 transition-all group"
                      style={{ backgroundColor: bgColor }}
                      onClick={() => toggleExpand(sub.id)}
                    >
                      <td className="px-5 py-3.5">
                        {isExpanded
                          ? <ChevronDown size={14} className="text-zinc-400" />
                          : <ChevronRight size={14} className="text-zinc-400" />}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{
                            backgroundColor: sub.color.startsWith('#') ? sub.color : undefined,
                            ...(sub.color.startsWith('bg-') ? {} : {})
                          }} />
                          <div>
                            <p className="text-sm font-bold text-zinc-800 dark:text-white">{sub.name}</p>
                            <p className="text-[10px] text-zinc-400">{topics.length} tópicos{questionsGoal ? ` · Prev. ${questionsGoal} Qs` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{questions}</span>
                        {questionsGoal > 0 && (
                          <span className="ml-1 text-[10px] text-zinc-400">/ {questionsGoal}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-14 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${accuracy >= 70 ? 'bg-emerald-500' : accuracy >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`}
                              style={{ width: `${accuracy}%` }}
                            />
                          </div>
                          <span className={`text-sm font-black w-10 text-right ${getAccuracyTextColor(accuracy)}`}>
                            {questions > 0 ? `${accuracy}%` : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{weight}x</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-14 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${priorityPct >= 70 ? 'bg-rose-500' : priorityPct >= 40 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                              style={{ width: `${priorityPct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-black w-8 text-right ${priorityPct >= 70 ? 'text-rose-500' : priorityPct >= 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {priorityPct}%
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Topic rows */}
                    {isExpanded && topics.map(topic => {
                      const topicImportance = getImportance(weight, topic.accuracy, topic.questions);
                      const topicBg = getHeatColor(topic.accuracy, topic.questions, weight, topicImportance);
                      const topicPriorityPct = Math.round(topicImportance * 100);
                      return (
                        <tr key={topic.id} style={{ backgroundColor: topicBg }} className="border-t border-zinc-100/50 dark:border-zinc-800/30">
                          <td className="px-5 py-2.5" />
                          <td className="px-5 py-2.5 pl-14">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                topic.priority === 'Alta' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                                : topic.priority === 'Média' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                              }`}>{topic.priority}</span>
                              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{topic.title}</p>
                            </div>
                          </td>
                          <td className="px-5 py-2.5 text-right">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">{topic.questions}</span>
                          </td>
                          <td className="px-5 py-2.5 text-right">
                            <span className={`text-xs font-bold ${getAccuracyTextColor(topic.accuracy)}`}>
                              {topic.questions > 0 ? `${topic.accuracy}%` : '—'}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-right">
                            <span className="text-xs text-zinc-400">—</span>
                          </td>
                          <td className="px-5 py-2.5 text-right">
                            <span className={`text-xs font-bold ${topicPriorityPct >= 70 ? 'text-rose-500' : topicPriorityPct >= 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {topicPriorityPct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {subjects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-zinc-400 text-sm">
                    Nenhuma disciplina encontrada. Adicione disciplinas e registre sessões de estudo para ver a análise.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StatisticsView;
