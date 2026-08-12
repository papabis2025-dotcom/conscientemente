import React, { useMemo, useState, useEffect } from 'react';
import { Subject, StudySession, Concurso } from '../types';
import { api } from '../services/api';
import { ChevronDown, ChevronRight, Trophy, PieChart as PieChartIcon, Table, Lock, Unlock, FileSpreadsheet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { exportToXlsx, exportToCsv } from '../utils/exportUtils';

interface StatisticsViewProps {
  subjects: Subject[];
  sessions: StudySession[];
  simulados?: import('../types').Simulado[];
  concursos?: Concurso[];
  selectedConcursoId?: string | 'all';
  onSelectConcursoId?: (id: string | 'all') => void;
}

function getAccuracyBg(accuracy: number, hasData: boolean): string {
  if (!hasData) return '';
  // Brutalista: cores sólidas com opacidade baixa — mais próximo do vermelho = mais urgente
  if (accuracy < 40)  return 'bg-rose-100 dark:bg-rose-900/30';
  if (accuracy < 60)  return 'bg-orange-100 dark:bg-orange-900/20';
  if (accuracy < 75)  return 'bg-amber-50 dark:bg-amber-900/10';
  return 'bg-emerald-50 dark:bg-emerald-900/10';
}

function getAccuracyText(accuracy: number, hasData: boolean): string {
  if (!hasData) return 'text-zinc-300 dark:text-zinc-600';
  if (accuracy < 40)  return 'text-rose-700 dark:text-rose-300 font-black';
  if (accuracy < 60)  return 'text-orange-700 dark:text-orange-300 font-bold';
  if (accuracy < 75)  return 'text-amber-700 dark:text-amber-300 font-bold';
  return 'text-emerald-700 dark:text-emerald-300 font-bold';
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ subjects, sessions, simulados, concursos, selectedConcursoId, onSelectConcursoId }) => {
  const [sortBy, setSortBy] = useState<'name' | 'questions' | 'correct' | 'questionsGoal' | 'time' | 'accuracy' | 'weight' | 'priority'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showTopics, setShowTopics] = useState(false);
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<Set<string>>(new Set());
  const [viewTab, setViewTab] = useState<'table' | 'chart'>('table');

  const toggleSubjectExpanded = (subId: string) => {
    setExpandedSubjectIds(prev => {
      const next = new Set(prev);
      if (next.has(subId)) next.delete(subId);
      else next.add(subId);
      return next;
    });
  };

  const activeCourseKey = (!selectedConcursoId || selectedConcursoId === 'all') ? 'global' : selectedConcursoId;

  // Carrega o mapa de pesos por concurso do localStorage
  const getWeightsMapFromStorage = () => {
    try {
      const saved = localStorage.getItem('estudos_weights_by_course');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const loadCourseWeights = (key: string) => {
    const map = getWeightsMapFromStorage();
    if (map[key]) {
      return map[key];
    }
    // Fallback para as chaves legadas ou padrão se não houver salvo
    const legacyAcc = localStorage.getItem('estudos_weight_acc');
    const legacySubj = localStorage.getItem('estudos_weight_subj');
    const legacyQtd = localStorage.getItem('estudos_weight_qtd');
    const legacyTime = localStorage.getItem('estudos_weight_time');
    return {
      acc: legacyAcc !== null ? parseInt(legacyAcc) : 50,
      subj: legacySubj !== null ? parseInt(legacySubj) : 25,
      qtd: legacyQtd !== null ? parseInt(legacyQtd) : 15,
      time: legacyTime !== null ? parseInt(legacyTime) : 10,
    };
  };

  const initialWeights = loadCourseWeights(activeCourseKey);

  const [weightAcc, setWeightAcc] = useState(initialWeights.acc);
  const [weightSubj, setWeightSubj] = useState(initialWeights.subj);
  const [weightQtd, setWeightQtd] = useState(initialWeights.qtd);
  const [weightTime, setWeightTime] = useState(initialWeights.time);

  const [isWeightsLocked, setIsWeightsLocked] = useState(() => {
    return localStorage.getItem('estudos_weights_locked') === 'true';
  });

  // Atualiza os estados quando o concurso selecionado (activeCourseKey) muda
  useEffect(() => {
    const w = loadCourseWeights(activeCourseKey);
    setWeightAcc(w.acc);
    setWeightSubj(w.subj);
    setWeightQtd(w.qtd);
    setWeightTime(w.time);
  }, [activeCourseKey]);

  const toggleWeightsLock = () => {
    setIsWeightsLocked(prev => {
      const next = !prev;
      localStorage.setItem('estudos_weights_locked', String(next));
      return next;
    });
  };

  // Sincroniza com Supabase ao montar
  useEffect(() => {
    api.settings.get().then(meta => {
      if (meta && meta.estudos_weights_by_course) {
        localStorage.setItem('estudos_weights_by_course', JSON.stringify(meta.estudos_weights_by_course));
        const w = meta.estudos_weights_by_course[activeCourseKey];
        if (w) {
          setWeightAcc(w.acc ?? 50);
          setWeightSubj(w.subj ?? 25);
          setWeightQtd(w.qtd ?? 15);
          setWeightTime(w.time ?? 10);
        }
      } else if (meta && meta.estudos_weights && activeCourseKey === 'global') {
        setWeightAcc(meta.estudos_weights.acc ?? 50);
        setWeightSubj(meta.estudos_weights.subj ?? 25);
        setWeightQtd(meta.estudos_weights.qtd ?? 15);
        setWeightTime(meta.estudos_weights.time ?? 10);
      }
    }).catch(err => console.error('Error loading weights from DB:', err));
  }, []);

  const saveWeightsForCourse = (newWeights: { acc: number; subj: number; qtd: number; time: number }) => {
    const map = getWeightsMapFromStorage();
    map[activeCourseKey] = newWeights;
    localStorage.setItem('estudos_weights_by_course', JSON.stringify(map));

    if (activeCourseKey === 'global') {
      localStorage.setItem('estudos_weight_acc', String(newWeights.acc));
      localStorage.setItem('estudos_weight_subj', String(newWeights.subj));
      localStorage.setItem('estudos_weight_qtd', String(newWeights.qtd));
      localStorage.setItem('estudos_weight_time', String(newWeights.time));
    }

    // Dispara eventos locais para o CronogramaView e outras partes reagirem dinamicamente
    window.dispatchEvent(new CustomEvent('estudos-criteria-updated', {
      detail: { courseKey: activeCourseKey, weights: newWeights }
    }));
    window.dispatchEvent(new Event('local-settings-changed'));

    api.settings.update({
      estudos_weights_by_course: map,
      estudos_weights: newWeights
    }).catch(err => console.error('Error saving weights to DB:', err));
  };

  const handleWeightAccChange = (val: number) => {
    const safeVal = Math.max(0, Math.min(100, val));
    const sumOthers = weightSubj + weightQtd + weightTime;
    const finalVal = safeVal + sumOthers > 100 ? 100 - sumOthers : safeVal;
    setWeightAcc(finalVal);
    saveWeightsForCourse({ acc: finalVal, subj: weightSubj, qtd: weightQtd, time: weightTime });
  };

  const handleWeightSubjChange = (val: number) => {
    const safeVal = Math.max(0, Math.min(100, val));
    const sumOthers = weightAcc + weightQtd + weightTime;
    const finalVal = safeVal + sumOthers > 100 ? 100 - sumOthers : safeVal;
    setWeightSubj(finalVal);
    saveWeightsForCourse({ acc: weightAcc, subj: finalVal, qtd: weightQtd, time: weightTime });
  };

  const handleWeightQtdChange = (val: number) => {
    const safeVal = Math.max(0, Math.min(100, val));
    const sumOthers = weightAcc + weightSubj + weightTime;
    const finalVal = safeVal + sumOthers > 100 ? 100 - sumOthers : safeVal;
    setWeightQtd(finalVal);
    saveWeightsForCourse({ acc: weightAcc, subj: weightSubj, qtd: finalVal, time: weightTime });
  };

  const handleWeightTimeChange = (val: number) => {
    const safeVal = Math.max(0, Math.min(100, val));
    const sumOthers = weightAcc + weightSubj + weightQtd;
    const finalVal = safeVal + sumOthers > 100 ? 100 - sumOthers : safeVal;
    setWeightTime(finalVal);
    saveWeightsForCourse({ acc: weightAcc, subj: weightSubj, qtd: weightQtd, time: finalVal });
  };

  const subjectData = useMemo(() => {
    return subjects.map(sub => {
      const subSessions = sessions.filter(s => s.subjectId === sub.id);
      let questions = subSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
      let correct = subSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
      const minutes = subSessions.reduce((acc, s) => acc + (s.durationInMinutes || 0), 0);

      // Adicionar aproveitamento dos simulados (mas sem computar o tempo, conforme regra)
      if (simulados) {
        simulados.forEach(sim => {
          (sim.results || []).forEach(res => {
            if (res.subjectId === sub.id) {
              questions += (res.done || 0);
              correct += (res.correct || 0);
            }
          });
        });
      }

      let accuracy = 0;
      if (questions > 0) {
        const subTopics = sub.topics || [];
        const hasTopicWeights = subTopics.some(t => t.weight !== undefined && t.weight > 0);

        if (hasTopicWeights) {
          let weightedSum = 0;
          let weightTotal = 0;
          let unweightedQuestions = 0;
          let unweightedCorrect = 0;

          subTopics.forEach(topic => {
            const topicSessions = subSessions.filter(s => s.topicId === topic.id);
            const tDone = topicSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
            const tCorrect = topicSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);

            if (tDone > 0) {
              const tAcc = tCorrect / tDone;
              if (topic.weight !== undefined && topic.weight > 0) {
                weightedSum += tAcc * topic.weight;
                weightTotal += topic.weight;
              } else {
                unweightedQuestions += tDone;
                unweightedCorrect += tCorrect;
              }
            }
          });

          // Questões genéricas ou simulados (não associadas a tópicos específicos)
          const genericDone = questions - subTopics.reduce((acc, topic) => {
            const topicSessions = subSessions.filter(s => s.topicId === topic.id);
            return acc + topicSessions.reduce((sum, s) => sum + (s.questionsDone || 0), 0);
          }, 0);
          const genericCorrect = correct - subTopics.reduce((acc, topic) => {
            const topicSessions = subSessions.filter(s => s.topicId === topic.id);
            return acc + topicSessions.reduce((sum, s) => sum + (s.questionsCorrect || 0), 0);
          }, 0);

          if (genericDone > 0) {
            unweightedQuestions += genericDone;
            unweightedCorrect += genericCorrect;
          }

          if (weightTotal > 0) {
            if (unweightedQuestions > 0) {
              const remainingWeight = Math.max(0, 100 - weightTotal);
              const unweightedAcc = unweightedCorrect / unweightedQuestions;
              weightedSum += unweightedAcc * remainingWeight;
              weightTotal += remainingWeight;
            }
            accuracy = Math.min(100, Math.round((weightedSum / weightTotal) * 100));
          } else {
            accuracy = Math.round((correct / questions) * 100);
          }
        } else {
          accuracy = Math.round((correct / questions) * 100);
        }
      }
      
      const subTopics = sub.topics || [];
      const topicWeightsSum = subTopics.reduce((acc, t) => acc + (t.weight || 0), 0);
      const baseSubjectWeight = sub.weight !== undefined && sub.weight > 0 ? sub.weight : 1;

      // Se a disciplina possui assuntos com pesos configurados, o Peso por Disciplina considera os assuntos
      const weight = topicWeightsSum > 0
        ? parseFloat((baseSubjectWeight * (topicWeightsSum / 100)).toFixed(2))
        : baseSubjectWeight;

      const questionsGoal = sub.questionsGoal || 0;

      return { sub, questions, correct, accuracy, weight, questionsGoal, minutes };
    });
  }, [subjects, sessions, simulados]);


  const maxWeight = useMemo(() => Math.max(1, ...subjectData.map(d => d.weight)), [subjectData]);
  const maxQuestions = useMemo(() => Math.max(1, ...subjectData.map(d => d.questions)), [subjectData]);
  const maxMinutes = useMemo(() => Math.max(1, ...subjectData.map(d => d.minutes)), [subjectData]);

  // Priority uses dynamic weights, where less minutes studies gives higher priority
  const getPriority = (weight: number, accuracy: number, questions: number, minutes: number): number => {
    const wNorm = weight / maxWeight;
    const accPenalty = questions > 0 ? (100 - accuracy) / 100 : 0.5;
    const qPenalty = Math.max(0, 1 - questions / Math.max(1, maxQuestions));
    const tPenalty = Math.max(0, 1 - minutes / Math.max(1, maxMinutes));
    
    const totalW = weightAcc + weightSubj + weightQtd + weightTime;
    if (totalW === 0) return 0;

    return (
      accPenalty * (weightAcc / totalW) + 
      wNorm * (weightSubj / totalW) + 
      qPenalty * (weightQtd / totalW) +
      tPenalty * (weightTime / totalW)
    );
  };

  const sortedData = useMemo(() => {
    return [...subjectData].sort((a, b) => {
      let diff = 0;
      if (sortBy === 'name') diff = a.sub.name.localeCompare(b.sub.name);
      else if (sortBy === 'questions') diff = a.questions - b.questions;
      else if (sortBy === 'correct') diff = a.correct - b.correct;
      else if (sortBy === 'questionsGoal') diff = a.questionsGoal - b.questionsGoal;
      else if (sortBy === 'time') diff = a.minutes - b.minutes;
      else if (sortBy === 'accuracy') diff = a.accuracy - b.accuracy;
      else if (sortBy === 'weight') diff = a.weight - b.weight;
      else diff = getPriority(a.weight, a.accuracy, a.questions, a.minutes) - getPriority(b.weight, b.accuracy, b.questions, b.minutes);
      return sortOrder === 'desc' ? -diff : diff;
    });
  }, [subjectData, sortBy, sortOrder, weightAcc, weightSubj, weightQtd, weightTime, maxWeight, maxQuestions, maxMinutes]);

  const getHeatmapColor = (pct: number) => {
    // Gradiente de calor contínuo HSL: pct de 0 a 100 mapeado para matiz de 135 (verde) a 0 (vermelho)
    const hue = Math.max(0, Math.min(135, Math.round((100 - pct) * 1.35)));
    return `hsl(${hue}, 85%, 45%)`;
  };

  const chartData = useMemo(() => {
    return subjectData.map(d => {
      const priority = getPriority(d.weight, d.accuracy, d.questions, d.minutes);
      const priorityPct = Math.round(priority * 100);
      return {
        name: d.sub.name,
        value: priorityPct,
        color: getHeatmapColor(priorityPct),
        accuracy: d.accuracy,
        minutes: d.minutes,
        questions: d.questions
      };
    }).sort((a, b) => b.value - a.value);
  }, [subjectData, maxWeight, maxQuestions, maxMinutes, weightAcc, weightSubj, weightQtd, weightTime]);

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5 + 65;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        className="text-[10px] md:text-xs font-black uppercase tracking-tight fill-zinc-800 dark:fill-zinc-100 transition-colors"
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
      >
        {`${name} (${value}%)`}
      </text>
    );
  };

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem]">
          <p className="text-sm font-semibold text-zinc-500">Nenhuma disciplina cadastrada para gerar o gráfico.</p>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col items-center justify-center py-4">
          {/* Gráfico */}
          <div className="w-full max-w-[950px] h-[520px] md:h-[580px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 180, left: 180, bottom: 20 }}>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={105}
                  outerRadius={160}
                  paddingAngle={3}
                  dataKey="value"
                  animationDuration={600}
                  label={renderCustomizedLabel}
                  labelLine={{ stroke: '#a1a1aa', strokeWidth: 1 }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-zinc-955 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl space-y-1">
                          <p className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">{data.name}</p>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            Prioridade: <span className="font-extrabold" style={{ color: data.color }}>{data.value}%</span>
                          </p>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            Acertos: <span className="text-zinc-800 dark:text-zinc-200 font-extrabold">{data.accuracy}%</span>
                          </p>
                          <p className="text-[10px] font-bold text-zinc-555 dark:text-zinc-405 uppercase tracking-widest">
                            Tempo: <span className="text-zinc-800 dark:text-zinc-200 font-extrabold">{data.minutes} min</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest leading-none">Mapa de</span>
              <span className="text-lg font-black text-zinc-800 dark:text-white uppercase tracking-tighter mt-1 leading-none">Calor</span>
            </div>
          </div>
        </div>

        {/* Barra Informativa de Calor */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 flex flex-col items-center gap-3 w-full max-w-lg mx-auto">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Escala de Prioridade (Calor)</span>
          <div className="w-full h-3 rounded-full shadow-inner border border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-[#10b981] via-[#84cc16] via-[#eab308] via-[#f97316] to-[#be123c] dark:to-[#9f1239]" />
          <div className="flex justify-between w-full text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1 select-none">
            <span>Baixa (0%)</span>
            <span>Média (50%)</span>
            <span>Crítica (100%)</span>
          </div>
        </div>
      </div>
    );
  };

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('desc'); }
  };

  const th = (col: typeof sortBy, label: string, align = 'text-left') =>
    <th
      className={`px-4 py-2.5 ${align} text-[10px] font-black uppercase tracking-widest cursor-pointer select-none border-b-2 border-zinc-200 dark:border-zinc-700 whitespace-nowrap ${sortBy === col ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
      onClick={() => handleSort(col)}
    >
      {label}{sortBy === col ? (sortOrder === 'desc' ? ' ↓' : ' ↑') : ''}
    </th>;

  const handleExportSpreadsheet = () => {
    const headers = [
      'Tipo',
      'Disciplina / Assunto',
      'Questões Resolvidas',
      'Certas',
      'Meta Prevista',
      'Tempo (min)',
      'Aproveitamento (%)',
      'Peso',
      'Prioridade (%)'
    ];

    const rows: (string | number)[][] = [];

    sortedData.forEach(({ sub, questions, correct, accuracy, weight, questionsGoal, minutes }) => {
      const priority = getPriority(weight, accuracy, questions, minutes);
      const priorityPct = Math.round(priority * 100);

      rows.push([
        'Disciplina',
        sub.name,
        questions,
        correct,
        questionsGoal,
        minutes,
        accuracy,
        weight,
        priorityPct
      ]);

      if (showTopics && sub.topics && sub.topics.length > 0) {
        sub.topics.forEach(topic => {
          const topicSessions = sessions.filter(s => s.subjectId === sub.id && s.topicId === topic.id);
          const tDone = topicSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
          const tCorrect = topicSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
          const tAccuracy = tDone > 0 ? Math.min(100, Math.round((tCorrect / tDone) * 100)) : 0;
          const tMinutes = topicSessions.reduce((acc, s) => acc + (s.durationInMinutes || 0), 0);
          const baseSubjW = sub.weight !== undefined && sub.weight > 0 ? sub.weight : 1;
          const tEffectiveWeight = topic.weight !== undefined && topic.weight > 0
            ? baseSubjW * (topic.weight / 100)
            : baseSubjW / Math.max(1, sub.topics.length);

          const tPriorityPct = Math.round(getPriority(tEffectiveWeight, tAccuracy, tDone, tMinutes) * 100);

          rows.push([
            'Assunto',
            `  └ ${topic.title}`,
            tDone,
            tCorrect,
            '-',
            tMinutes,
            tAccuracy,
            topic.weight !== undefined ? topic.weight : '-',
            tPriorityPct
          ]);
        });
      }
    });

    const concursoName = (concursos || []).find(c => c.id === selectedConcursoId)?.name || 'Visao_Global';
    exportToXlsx(`Analise_Estatistica_${concursoName.replace(/[^a-zA-Z0-9_-]/g, '_')}`, 'Análise Estatística', headers, rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {concursos && onSelectConcursoId && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-sm">
                <Trophy size={14} className="text-amber-500" />
                <select
                  value={selectedConcursoId}
                  onChange={(e) => onSelectConcursoId(e.target.value as string | 'all')}
                  className="bg-white dark:bg-zinc-900 border-none outline-none text-xs font-bold text-zinc-800 dark:text-zinc-100 cursor-pointer w-32 uppercase tracking-wide focus:ring-0"
                >
                  <option value="all" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100">Visão Global</option>
                  {concursos.map(c => (
                    <option key={c.id} value={c.id} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => {
                if (showTopics) {
                  setShowTopics(false);
                  setExpandedSubjectIds(new Set());
                } else {
                  setShowTopics(true);
                  setExpandedSubjectIds(new Set(subjects.map(s => s.id)));
                }
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                showTopics || expandedSubjectIds.size > 0
                  ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-700 dark:border-zinc-700 hover:opacity-90'
                  : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-350 dark:hover:bg-zinc-800/50'
              }`}
            >
              {showTopics || expandedSubjectIds.size > 0 ? 'Ocultar Assuntos' : 'Mostrar Todos Assuntos'}
            </button>

            <button
              type="button"
              onClick={handleExportSpreadsheet}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              title="Exportar Análise Estatística para planilha Excel / Google Planilhas"
            >
              <FileSpreadsheet size={14} />
              Exportar Planilha
            </button>

            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl shadow-inner border border-zinc-200/20 dark:border-zinc-800/50 select-none">
              <button
                type="button"
                onClick={() => setViewTab('table')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  viewTab === 'table'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm font-black'
                    : 'text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Table size={12} /> Tabela
              </button>
              <button
                type="button"
                onClick={() => setViewTab('chart')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  viewTab === 'chart'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm font-black'
                    : 'text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <PieChartIcon size={12} /> Calor (Pizza)
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Prioridade é um cálculo balanceado para focar no que mais precisa de atenção.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={toggleWeightsLock}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
              isWeightsLocked
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            }`}
            title={isWeightsLocked ? "Critérios trancados (Clique para destrancar)" : "Critérios destrancados (Clique para trancar)"}
          >
            {isWeightsLocked ? <Lock size={14} /> : <Unlock size={14} />}
            <span className="text-[10px] font-black uppercase">{isWeightsLocked ? 'Trancado' : 'Destrancado'}</span>
          </button>

          <span className="text-[10px] font-bold uppercase text-zinc-400 px-1">Pesos:</span>
          
          <label className={`flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-zinc-300 ${isWeightsLocked ? 'opacity-50' : ''}`}>
            Aproveitamento
            <input type="number" min="0" max="100" value={weightAcc} disabled={isWeightsLocked} onChange={e => handleWeightAccChange(Number(e.target.value))} className="w-14 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1 text-center font-mono dark:text-white disabled:cursor-not-allowed" />
          </label>
          
          <label className={`flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-zinc-300 ${isWeightsLocked ? 'opacity-50' : ''}`}>
            Peso
            <input type="number" min="0" max="100" value={weightSubj} disabled={isWeightsLocked} onChange={e => handleWeightSubjChange(Number(e.target.value))} className="w-14 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1 text-center font-mono dark:text-white disabled:cursor-not-allowed" />
          </label>

          <label className={`flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-zinc-300 ${isWeightsLocked ? 'opacity-50' : ''}`}>
            Volume Qs
            <input type="number" min="0" max="100" value={weightQtd} disabled={isWeightsLocked} onChange={e => handleWeightQtdChange(Number(e.target.value))} className="w-14 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1 text-center font-mono dark:text-white disabled:cursor-not-allowed" />
          </label>

          <label className={`flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-zinc-300 ${isWeightsLocked ? 'opacity-50' : ''}`}>
            Tempo Dedicado
            <input type="number" min="0" max="100" value={weightTime} disabled={isWeightsLocked} onChange={e => handleWeightTimeChange(Number(e.target.value))} className="w-14 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1 text-center font-mono dark:text-white disabled:cursor-not-allowed" />
          </label>
        </div>
      </header>

      {viewTab === 'table' ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm border-collapse bg-white dark:bg-zinc-900">
            <thead>
              <tr>
                {th('name', 'Disciplina')}
                {th('questions', 'Resolvidas', 'text-right')}
                {th('correct', 'Certas', 'text-right')}
                {th('questionsGoal', 'Previstas', 'text-right')}
                {th('time', 'Tempo', 'text-right')}
                {th('accuracy', 'Aproveitamento', 'text-right')}
                {th('weight', 'Peso', 'text-right')}
                {th('priority', 'Prioridade', 'text-right')}
              </tr>
            </thead>
            <tbody>
              {sortedData.map(({ sub, questions, correct, accuracy, weight, questionsGoal, minutes }) => {
                const priority = getPriority(weight, accuracy, questions, minutes);
                const priorityPct = Math.round(priority * 100);
                const hasData = questions > 0;

                const isSubjectExpanded = showTopics || expandedSubjectIds.has(sub.id);

                return (
                  <React.Fragment key={sub.id}>
                    <tr
                      onClick={() => toggleSubjectExpanded(sub.id)}
                      className="hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 transition-colors border-b border-zinc-100 dark:border-zinc-850 font-medium cursor-pointer group select-none"
                      title="Clique para ver os assuntos desta disciplina"
                    >
                      <td className="px-4 py-3 font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                        {isSubjectExpanded ? (
                          <ChevronDown size={14} className="text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 shrink-0 transition-transform" />
                        ) : (
                          <ChevronRight size={14} className="text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 shrink-0 transition-transform" />
                        )}
                        <span>{sub.name}</span>
                        {sub.topics && sub.topics.length > 0 && (
                          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                            {sub.topics.length} {sub.topics.length === 1 ? 'assunto' : 'assuntos'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400 font-mono">{questions}</td>
                      <td className="px-4 py-3 text-right text-zinc-650 dark:text-zinc-400 font-mono">{correct}</td>
                      <td className="px-4 py-3 text-right text-zinc-650 dark:text-zinc-400 font-mono">{questionsGoal}</td>
                      <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400 font-mono">{minutes}m</td>
                      <td className={`px-4 py-3 text-right font-mono ${getAccuracyText(accuracy, hasData)}`}>
                        <span className={`px-2.5 py-1 rounded-full ${getAccuracyBg(accuracy, hasData)}`}>
                          {hasData ? `${accuracy}%` : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400 font-mono font-bold">{weight}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={`px-2.5 py-1 rounded-full font-black ${
                          priorityPct >= 75 ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                          : priorityPct >= 60 ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400'
                          : priorityPct >= 40 ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                          : 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {priorityPct}%
                        </span>
                      </td>
                    </tr>

                    {isSubjectExpanded && sub.topics && sub.topics.length > 0 && (
                      <>
                        {[...sub.topics]
                          .map(topic => {
                            const topicSessions = sessions.filter(s => s.subjectId === sub.id && s.topicId === topic.id);
                            const tDone = topicSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
                            const tCorrect = topicSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
                            const tAccuracy = tDone > 0 ? Math.min(100, Math.round((tCorrect / tDone) * 100)) : 0;
                            const tMinutes = topicSessions.reduce((acc, s) => acc + (s.durationInMinutes || 0), 0);
                            const tHasData = tDone > 0;

                            const baseSubjW = sub.weight !== undefined && sub.weight > 0 ? sub.weight : 1;
                            const tEffectiveWeight = topic.weight !== undefined && topic.weight > 0
                              ? baseSubjW * (topic.weight / 100)
                              : baseSubjW / Math.max(1, sub.topics.length);

                            const tPriorityPct = Math.round(getPriority(tEffectiveWeight, tAccuracy, tDone, tMinutes) * 100);
                            const tWeight = topic.weight !== undefined ? topic.weight : 0;

                            return { topic, tDone, tCorrect, tAccuracy, tMinutes, tHasData, tEffectiveWeight, tPriorityPct, tWeight };
                          })
                          .sort((a, b) => {
                            let diff = 0;
                            if (sortBy === 'name') diff = a.topic.title.localeCompare(b.topic.title);
                            else if (sortBy === 'questions') diff = a.tDone - b.tDone;
                            else if (sortBy === 'correct') diff = a.tCorrect - b.tCorrect;
                            else if (sortBy === 'questionsGoal') diff = 0;
                            else if (sortBy === 'time') diff = a.tMinutes - b.tMinutes;
                            else if (sortBy === 'accuracy') diff = a.tAccuracy - b.tAccuracy;
                            else if (sortBy === 'weight') diff = a.tWeight - b.tWeight;
                            else diff = a.tPriorityPct - b.tPriorityPct;

                            return sortOrder === 'desc' ? -diff : diff;
                          })
                          .map(({ topic, tDone, tCorrect, tAccuracy, tMinutes, tHasData, tPriorityPct }) => {
                            return (
                              <tr key={topic.id} className="bg-zinc-50/30 dark:bg-zinc-900/10 text-xs border-b border-zinc-100/50 dark:border-zinc-850/50 font-medium">
                                <td className="px-8 py-2.5 text-zinc-500 dark:text-zinc-400 pl-12 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0" />
                                  {topic.title}
                                </td>
                                <td className="px-4 py-2.5 text-right text-zinc-400 dark:text-zinc-500 font-mono">{tDone}</td>
                                <td className="px-4 py-2.5 text-right text-zinc-400 dark:text-zinc-500 font-mono">{tCorrect}</td>
                                <td className="px-4 py-2.5 text-right text-zinc-400 dark:text-zinc-500 font-mono">-</td>
                                <td className="px-4 py-2.5 text-right text-zinc-400 dark:text-zinc-500 font-mono">{tMinutes}m</td>
                                <td className={`px-4 py-2.5 text-right font-mono ${getAccuracyText(tAccuracy, tHasData)}`}>
                                  <span className={`px-2 py-0.5 rounded-md ${getAccuracyBg(tAccuracy, tHasData)}`}>
                                    {tHasData ? `${tAccuracy}%` : '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right text-zinc-400 dark:text-zinc-500 font-mono">
                                  {topic.weight !== undefined ? `${topic.weight.toFixed(2).replace('.', ',')}%` : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span className={`px-2 py-0.5 rounded-md font-black ${
                                      tPriorityPct >= 75 ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                                      : tPriorityPct >= 60 ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400'
                                      : tPriorityPct >= 40 ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                                      : 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                                    }`}>
                                      {tPriorityPct}%
                                    </span>
                                    <span className="text-[10px] text-zinc-400">({topic.priority})</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </>
                    )}
                  </React.Fragment>
                );
              })}

              {subjects.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-zinc-400 text-sm">
                    Nenhuma disciplina encontrada. Adicione disciplinas e registre sessões de estudo para ver a análise.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        renderChart()
      )}
    </div>
  );
};

export default StatisticsView;
