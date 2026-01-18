
import React, { useState, useMemo } from 'react';
import { Subject, StudySession, DailyGoal } from '../types';

interface QuestionsViewProps {
  subjects: Subject[];
  sessions: StudySession[];
  dailyGoals: DailyGoal[];
  onUpdateDailyGoals: (goals: DailyGoal[]) => void;
  onAddSession: (session: StudySession) => void;
  onDeleteSession: (sessionId: string) => void;
}

const QuestionsView: React.FC<QuestionsViewProps> = ({
  subjects,
  sessions,
  dailyGoals,
  onUpdateDailyGoals,
  onAddSession,
  onDeleteSession
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [done, setDone] = useState('');
  const [correct, setCorrect] = useState('');
  const [duration, setDuration] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const currentGoal = dailyGoals.find(g => g.date === date)?.questionsTarget || 0;

  const handleSetGoal = (target: string) => {
    const targetNum = parseInt(target) || 0;
    const existingIndex = dailyGoals.findIndex(g => g.date === date);
    if (existingIndex > -1) {
      const newGoals = [...dailyGoals];
      newGoals[existingIndex].questionsTarget = targetNum;
      onUpdateDailyGoals(newGoals);
    } else {
      onUpdateDailyGoals([...dailyGoals, { date, questionsTarget: targetNum }]);
    }
  };

  const doneToday = useMemo(() => {
    return sessions
      .filter(s => s.date.startsWith(date) && s.questionsDone !== undefined)
      .reduce((acc, s) => acc + (s.questionsDone || 0), 0);
  }, [sessions, date]);

  const progressPercent = currentGoal > 0 ? Math.min(Math.round((doneToday / currentGoal) * 100), 100) : 0;

  const handleSave = () => {
    if (!selectedSubjectId || !done || !correct) {
      alert("Preencha os campos obrigatórios.");
      return;
    }
    const doneNum = parseInt(done);
    const correctNum = parseInt(correct);
    if (correctNum > doneNum) {
      alert("Acertos não podem superar o total.");
      return;
    }

    const newSession: StudySession = {
      id: crypto.randomUUID(),
      subjectId: selectedSubjectId,
      topicId: selectedTopicId || undefined,
      durationInMinutes: parseInt(duration) || 0,
      date: new Date(`${date}T12:00:00`).toISOString(),
      questionsDone: doneNum,
      questionsCorrect: correctNum
    };

    onAddSession(newSession);
    setDone(''); setCorrect(''); setDuration('');
  };

  // Agrupamento Hierárquico: Disciplina -> Tópico
  const performanceHierarchy = useMemo(() => {
    const subjectMap: Record<string, {
      name: string,
      color: string,
      topics: Record<string, { title: string, done: number, correct: number }>
    }> = {};

    sessions.forEach(s => {
      if (s.questionsDone === undefined) return;

      const subject = subjects.find(sub => sub.id === s.subjectId);
      if (!subject) return;

      if (!subjectMap[subject.id]) {
        subjectMap[subject.id] = { name: subject.name, color: subject.color, topics: {} };
      }

      const topicId = s.topicId || 'geral';
      const topicTitle = subject.topics.find(t => t.id === s.topicId)?.title || 'Geral / Outros';

      if (!subjectMap[subject.id].topics[topicId]) {
        subjectMap[subject.id].topics[topicId] = { title: topicTitle, done: 0, correct: 0 };
      }

      subjectMap[subject.id].topics[topicId].done += s.questionsDone;
      subjectMap[subject.id].topics[topicId].correct += (s.questionsCorrect || 0);
    });

    return Object.entries(subjectMap).map(([id, data]) => ({
      id,
      ...data,
      topics: Object.values(data.topics).map(t => ({
        ...t,
        accuracy: t.done > 0 ? Math.round((t.correct / t.done) * 100) : 0
      })).sort((a, b) => b.accuracy - a.accuracy)
    }));
  }, [sessions, subjects]);

  const recentLogs = useMemo(() => {
    return [...sessions]
      .filter(s => s.questionsDone !== undefined)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [sessions]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Performance em Questões 🎯</h2>
          <p className="text-slate-500 dark:text-slate-400">Analise seu rendimento detalhado por matéria e assunto.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 self-start">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 p-2 rounded-xl">✍️</span>
            <h3 className="font-bold text-slate-800 dark:text-white">Registrar Performance</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Disciplina</label>
              <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm dark:text-white">
                <option value="">Selecione...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Assunto</label>
              <select value={selectedTopicId} disabled={!selectedSubjectId} onChange={(e) => setSelectedTopicId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm dark:text-white disabled:opacity-50">
                <option value="">Geral / Outros</option>
                {selectedSubject?.topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Total</label>
                <input type="number" value={done} onChange={(e) => setDone(e.target.value)} placeholder="0" className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm dark:text-white" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Acertos</label>
                <input type="number" value={correct} onChange={(e) => setCorrect(e.target.value)} placeholder="0" className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm dark:text-white" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Tempo (min)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="0" className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm dark:text-white" />
            </div>
          </div>
          <button onClick={handleSave} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-blue-700 transition-all shadow-lg active:scale-95">Salvar Registro</button>
        </div>

        {/* Data Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">📊 Performance Hierárquica</h3>
            <div className="space-y-8 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
              {performanceHierarchy.length === 0 ? (
                <div className="py-20 text-center opacity-30 uppercase text-xs font-black tracking-widest">Sem dados registrados</div>
              ) : performanceHierarchy.map(subject => (
                <div key={subject.id} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-6 w-1 rounded-full ${subject.color}`} />
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{subject.name}</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-4">
                    {subject.topics.map((topic, i) => (
                      <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight pr-2">{topic.title}</p>
                          <span className={`text-xs font-black shrink-0 ${topic.accuracy >= 75 ? 'text-emerald-500' : topic.accuracy >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>
                            {topic.accuracy}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                          <div className={`h-full transition-all duration-1000 ${topic.accuracy >= 75 ? 'bg-emerald-500' : topic.accuracy >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${topic.accuracy}%` }} />
                        </div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{topic.correct}/{topic.done} Questões</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">🕒 Últimas Sessões</h3>
            <div className="space-y-3">
              {recentLogs.map(log => {
                const sub = subjects.find(s => s.id === log.subjectId);
                const acc = Math.round(((log.questionsCorrect || 0) / (log.questionsDone || 1)) * 100);
                return (
                  <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] text-white ${sub?.color || 'bg-slate-500'}`}>{acc}%</div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-700 dark:text-white truncate max-w-[150px]">{sub?.name}</h5>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{log.questionsDone} Q • {new Date(log.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button onClick={() => onDeleteSession(log.id)} className="p-2 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">🗑️</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionsView;
