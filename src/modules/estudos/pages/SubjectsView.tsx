import React, { useState, useRef, useEffect } from 'react';
import { Subject, Topic, StudySession, Concurso } from '../types';

import { COLORS } from '../constants';
import { getColorHex, getBadgeStyle } from '../utils/colors';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit2,
  Plus,
  Clock,
  Target,
  CheckCircle,
  AlertTriangle,
  Trophy,
  Bot
} from 'lucide-react';

interface SubjectsViewProps {
  subjects: Subject[];
  sessions: StudySession[];
  onUpdateSubjects: (subjects: Subject[]) => void;
  selectedConcursoId?: string | 'all';
  onSelectConcursoId?: (id: string | 'all') => void;
  scheduledStudies: any[];
  concursos?: Concurso[];
}

const SubjectsView: React.FC<SubjectsViewProps> = ({ subjects, sessions, onUpdateSubjects, selectedConcursoId, onSelectConcursoId, concursos, scheduledStudies }) => {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editQuestionsGoal, setEditQuestionsGoal] = useState<number | ''>('');
  const [editWeight, setEditWeight] = useState<number | ''>('');

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string | null; name: string }>({
    isOpen: false,
    id: null,
    name: ''
  });

  // Expanded rows state
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  // Topic addition state
  const [addingTopicToId, setAddingTopicToId] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicPriority, setNewTopicPriority] = useState<'Baixa' | 'Média' | 'Alta'>('Média');

  const [sortBy, setSortBy] = useState<'default' | 'time' | 'questions' | 'name' | 'meta' | 'accuracy' | 'questionsGoal' | 'weight'>('default');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');





  const [topicSortBy, setTopicSortBy] = useState<'default' | 'priority' | 'time' | 'questions' | 'name' | 'lastStudy' | 'review7d' | 'review30d' | 'review90d'>('default');
  const [topicSortOrder, setTopicSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Topic editing state
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTopicTitle, setEditTopicTitle] = useState('');

  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showColorPicker) return;
    const handler = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColorPicker]);

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedSubjects);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedSubjects(newSet);
  };

  const getSubjectStats = (subjectId: string) => {
    const simuladoSessionIds = new Set(
      scheduledStudies.filter(s => s.activityType === 'Simulado').map(s => s.id)
    );
    const subSessions = sessions.filter(s => s.subjectId === subjectId && !s.isSimulado && s.activityType !== 'Simulado' && !simuladoSessionIds.has(s.id));
    const totalMinutes = subSessions.reduce((acc, s) => acc + s.durationInMinutes, 0);
    const totalQuestions = subSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
    const totalCorrect = subSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    return {
      hours: parseFloat((totalMinutes / 60).toFixed(1)),
      questions: totalQuestions,
      accuracy
    };
  };

  const getTopicStats = (subjectId: string, topicId: string | null) => {
    const topicSessions = sessions.filter(s => (topicId ? s.topicId === topicId : !s.topicId) && s.subjectId === subjectId && s.activityType !== 'Simulado' && !s.isSimulado);
    const tMinutes = topicSessions.reduce((acc, s) => acc + s.durationInMinutes, 0);
    const tDone = topicSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
    const tCorrect = topicSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
    const tAcc = tDone > 0 ? Math.round((tCorrect / tDone) * 100) : 0;
    const tHours = (tMinutes / 60).toFixed(1);

    // Calculate last study date
    let lastStudyDate = '';
    let review7dDate = '';
    let review30dDate = '';
    let review90dDate = '';

    if (topicSessions.length > 0) {
      const sortedSessions = [...topicSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastDate = new Date(sortedSessions[0].date);

      const formatDate = (date: Date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

      lastStudyDate = formatDate(lastDate);

      const d7 = new Date(lastDate);
      d7.setDate(d7.getDate() + 7);
      review7dDate = formatDate(d7);

      const d30 = new Date(lastDate);
      d30.setDate(d30.getDate() + 30);
      review30dDate = formatDate(d30);

      const d90 = new Date(lastDate);
      d90.setDate(d90.getDate() + 90);
      review90dDate = formatDate(d90);
    }

    return { minutes: tMinutes, done: tDone, correct: tCorrect, acc: tAcc, hours: tHours, lastStudyDate, review7dDate, review30dDate, review90dDate };
  };

  const sortedSubjects = [...subjects].sort((a, b) => {
    if (sortBy === 'default') return 0;
    if (sortBy === 'name') {
      const compare = a.name.localeCompare(b.name, undefined, { numeric: true });
      return sortOrder === 'asc' ? compare : -compare;
    }
    if (sortBy === 'meta') {
      const metaA = a.questionsGoal || 0;
      const metaB = b.questionsGoal || 0;
      return sortOrder === 'desc' ? metaB - metaA : metaA - metaB;
    }
    if (sortBy === 'questionsGoal') {
      const goalA = a.questionsGoal || 0;
      const goalB = b.questionsGoal || 0;
      return sortOrder === 'desc' ? goalB - goalA : goalA - goalB;
    }
    if (sortBy === 'weight') {
      const wA = a.weight || 0;
      const wB = b.weight || 0;
      return sortOrder === 'desc' ? wB - wA : wA - wB;
    }
    const statsA = getSubjectStats(a.id);
    const statsB = getSubjectStats(b.id);
    if (sortBy === 'time') return sortOrder === 'desc' ? statsB.hours - statsA.hours : statsA.hours - statsB.hours;
    if (sortBy === 'accuracy') return sortOrder === 'desc' ? statsB.accuracy - statsA.accuracy : statsA.accuracy - statsB.accuracy;
    return sortOrder === 'desc' ? statsB.questions - statsA.questions : statsA.questions - statsB.questions;
  });

  const addSubject = () => {
    if (!newSubjectName.trim()) return;
    const newSub: Subject = {
      id: crypto.randomUUID(),
      name: newSubjectName,
      color: selectedColor,
      topics: []
    };
    onUpdateSubjects([...subjects, newSub]);
    setNewSubjectName('');
    const currentIndex = COLORS.indexOf(selectedColor);
    setSelectedColor(COLORS[(currentIndex + 1) % COLORS.length]);
  };

  const deleteSubject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Replaced with custom modal
    setDeleteConfirmation({ isOpen: true, id, name: subjects.find(s => s.id === id)?.name || '' });
    // if (confirm('Deseja excluir esta disciplina e todos os seus tópicos?')) {
    //   onUpdateSubjects(subjects.filter(s => s.id !== id));
    // }
  };

  const startEditing = (subject: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubjectId(subject.id);
    setEditName(subject.name);
    setEditColor(subject.color);
    setEditQuestionsGoal(subject.questionsGoal || '');
    setEditWeight(subject.weight || '');
  };

  const saveEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!editName.trim()) return;
    onUpdateSubjects(subjects.map(s => s.id === editingSubjectId ? {
      ...s,
      name: editName,
      color: editColor,
      questionsGoal: editQuestionsGoal === '' ? undefined : Number(editQuestionsGoal),
      weight: editWeight === '' ? undefined : Number(editWeight)
    } : s));
    setEditingSubjectId(null);
  };

  const handleAddTopic = (subjectId: string) => {
    if (!newTopicTitle.trim()) return;
    const newTopic: Topic = {
      id: crypto.randomUUID(),
      title: newTopicTitle,
      isCompleted: false,
      priority: newTopicPriority
    };
    onUpdateSubjects(subjects.map(s => s.id === subjectId ? { ...s, topics: [...s.topics, newTopic] } : s));
    setNewTopicTitle('');
  };

  const toggleTopic = (subjectId: string, topicId: string) => {
    onUpdateSubjects(subjects.map(s => s.id === subjectId ? {
      ...s,
      topics: s.topics.map(t => t.id === topicId ? { ...t, isCompleted: !t.isCompleted } : t)
    } : s));
  };

  const deleteTopic = (subjectId: string, topicId: string) => {
    onUpdateSubjects(subjects.map(s => s.id === subjectId ? {
      ...s,
      topics: s.topics.filter(t => t.id !== topicId)
    } : s));
  };

  const startEditingTopic = (topic: Topic) => {
    setEditingTopicId(topic.id);
    setEditTopicTitle(topic.title);
  };

  const saveTopicEdit = (subjectId: string, topicId: string) => {
    if (!editTopicTitle.trim()) return;
    onUpdateSubjects(subjects.map(s => s.id === subjectId ? {
      ...s,
      topics: s.topics.map(t => t.id === topicId ? { ...t, title: editTopicTitle } : t)
    } : s));
    setEditingTopicId(null);
    setEditTopicTitle('');
  };

  const cancelTopicEdit = () => {
    setEditingTopicId(null);
    setEditTopicTitle('');
  };



  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black text-zinc-800 dark:text-white tracking-tight uppercase">Disciplinas</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Gerenciamento detalhado do conteúdo programático.</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {concursos && onSelectConcursoId && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-sm">
               <Trophy size={16} className="text-amber-500" />
               <select
                  value={selectedConcursoId}
                  onChange={(e) => onSelectConcursoId(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-black text-zinc-800 dark:text-white cursor-pointer w-32 uppercase tracking-wide"
               >
                  <option value="all">Visão Global</option>
                  {concursos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">

        {selectedConcursoId === 'all' ? (
           <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={16} /> Selecione um edital para adicionar disciplinas
           </div>
        ) : (
          <>
            <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Nova disciplina..."
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubject()}
                  className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-500 outline-none text-zinc-800 dark:text-white text-sm min-w-[200px]"
                />

                {/* Color picker — compact button that expands to honeycomb */}
                <div className="relative" ref={colorPickerRef}>
                  <button
                    onClick={() => setShowColorPicker(p => !p)}
                    title="Escolher cor"
                    className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-700 shadow-md hover:scale-110 active:scale-95 transition-transform ring-2 ring-zinc-300 dark:ring-zinc-600"
                    style={{ backgroundColor: getColorHex(selectedColor) }}
                  />
                  {showColorPicker && (
                    <div
                      className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150"
                      style={{ minWidth: 160 }}
                    >
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {COLORS.map((color, idx) => (
                          <button
                            key={color}
                            onClick={() => { setSelectedColor(color); setShowColorPicker(false); }}
                            className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${idx % 2 === 1 ? 'mt-2' : ''} ${
                              selectedColor === color
                                ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-zinc-900 scale-110'
                                : 'opacity-80 hover:opacity-100'
                            } ${getBadgeStyle(color).className}`}
                            style={getBadgeStyle(color).style}
                            title={color}
                          />
                        ))}
                        <div className="relative flex items-center justify-center w-6 h-6 rounded-full overflow-hidden border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:ring-2 hover:ring-zinc-400 cursor-pointer mt-2">
                          <input
                            type="color"
                            value={getColorHex(selectedColor)}
                            onChange={(e) => { setSelectedColor(e.target.value); setShowColorPicker(false); }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer opacity-0"
                            title="Cor personalizada"
                          />
                          <span className="pointer-events-none text-[10px] font-bold text-zinc-400">+</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={addSubject} className="bg-zinc-900 dark:bg-zinc-700 text-white px-3 py-2 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-600 flex items-center justify-center gap-1.5 text-xs font-bold">
                  <Plus size={16} /> Adicionar
                </button>
              </div>
          </>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                <th className="w-8 px-4 py-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider"></th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider cursor-pointer hover:text-zinc-900 dark:text-zinc-300" onClick={() => { setSortBy('name'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
                  Disciplina {sortBy === 'name' && (sortOrder === 'asc' ? '↓' : '↑')}
                </th>
                <th className="w-32 px-4 py-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider cursor-pointer hover:text-zinc-900 dark:text-zinc-300" onClick={() => { setSortBy('time'); setSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                  Tempo {sortBy === 'time' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="w-32 px-4 py-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider cursor-pointer hover:text-zinc-900 dark:text-zinc-300" onClick={() => { setSortBy('questions'); setSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                  Questões {sortBy === 'questions' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="w-40 px-4 py-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider cursor-pointer hover:text-zinc-900 dark:text-zinc-300" onClick={() => { setSortBy('accuracy'); setSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                  Aproveitamento {sortBy === 'accuracy' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="w-32 px-4 py-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider text-right">Ações</th>
                <th className="w-36 px-4 py-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider cursor-pointer hover:text-zinc-900 dark:text-zinc-300" onClick={() => { setSortBy('questionsGoal'); setSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                  Prev. no Edital {sortBy === 'questionsGoal' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="w-32 px-4 py-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider cursor-pointer hover:text-zinc-900 dark:text-zinc-300" onClick={() => { setSortBy('weight'); setSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                  Peso Total {sortBy === 'weight' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sortedSubjects.map(subject => {
                const stats = getSubjectStats(subject.id);
                const isExpanded = expandedSubjects.has(subject.id);

                return (
                  <React.Fragment key={subject.id}>
                    <tr
                      className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group ${isExpanded ? 'bg-zinc-50 dark:bg-zinc-800/30' : ''}`}
                      onClick={() => toggleExpand(subject.id)}
                    >
                      <td className="px-4 py-3 w-10">
                        {isExpanded ? <ChevronDown size={15} className="text-zinc-400" /> : <ChevronRight size={15} className="text-zinc-400" />}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getBadgeStyle(subject.color).className}`} style={getBadgeStyle(subject.color).style} />
                          {editingSubjectId === subject.id ? (
                            <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <input
                                  className="px-2 py-1 bg-white dark:bg-zinc-900 border rounded text-sm"
                                  value={editName}
                                  onChange={e => setEditName(e.target.value)}
                                  autoFocus
                                />
                                <button onClick={(e) => saveEdit(e)} className="text-emerald-500"><CheckCircle size={16} /></button>
                              </div>
                              <div className="flex gap-1 items-center">
                                {COLORS.slice(0, 5).map(color => (
                                  <button
                                    key={color}
                                    onClick={() => setEditColor(color)}
                                    className={`w-3 h-3 rounded-full transition-all ${editColor === color ? 'ring-2 ring-offset-1 ring-zinc-400 scale-110' : 'opacity-40 hover:opacity-100'} ${getBadgeStyle(color).className}`}
                                    style={getBadgeStyle(color).style}
                                  />
                                ))}
                                <input
                                  type="color"
                                  value={getColorHex(editColor)}
                                  onChange={(e) => setEditColor(e.target.value)}
                                  className="w-4 h-4 p-0 border-0 rounded-full overflow-hidden cursor-pointer ml-1"
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm font-bold text-zinc-800 dark:text-white">{subject.name}</p>
                              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{(subject.topics || []).length} tópico{(subject.topics || []).length !== 1 ? 's' : ''}</p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                          <Clock size={13} className="text-zinc-400" /> {stats.hours}h
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                          <Target size={13} className="text-zinc-400" /> {stats.questions}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div className={`h-full ${stats.accuracy >= 80 ? 'bg-emerald-500' : stats.accuracy < 50 ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${stats.accuracy}%` }} />
                          </div>
                          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{stats.accuracy}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => startEditing(subject, e)} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-900 dark:text-zinc-300 transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={(e) => deleteSubject(subject.id, e)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                      {/* Previsto no Edital */}
                      <td className="px-4 py-3" onClick={e => editingSubjectId === subject.id && e.stopPropagation()}>
                        {editingSubjectId === subject.id ? (
                          <input
                            type="number"
                            placeholder="Qtd"
                            className="w-20 px-2 py-1 bg-white dark:bg-zinc-900 border rounded text-sm"
                            value={editQuestionsGoal}
                            onChange={e => setEditQuestionsGoal(e.target.value === '' ? '' : Number(e.target.value))}
                          />
                        ) : (
                          subject.questionsGoal
                            ? <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 px-2 py-0.5 rounded text-xs font-bold">{subject.questionsGoal} Qs</span>
                            : <span className="text-zinc-300 dark:text-zinc-600 text-xs">—</span>
                        )}
                      </td>
                      {/* Peso Total */}
                      <td className="px-4 py-3" onClick={e => editingSubjectId === subject.id && e.stopPropagation()}>
                        {editingSubjectId === subject.id ? (
                          <input
                            type="number"
                            placeholder="Peso"
                            className="w-16 px-2 py-1 bg-white dark:bg-zinc-900 border rounded text-sm"
                            value={editWeight}
                            onChange={e => setEditWeight(e.target.value === '' ? '' : Number(e.target.value))}
                            step="0.1"
                          />
                        ) : (
                          subject.weight
                            ? <span className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded text-xs font-bold">{subject.weight}x</span>
                            : <span className="text-zinc-300 dark:text-zinc-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="px-0 py-0 bg-zinc-50/30 dark:bg-zinc-800/10 border-b border-zinc-100 dark:border-zinc-800">
                          <div className="pl-10 pr-4 py-2">

                            <table className="w-full text-left text-sm">
                              <thead>
                                <tr className="text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                                  <th className="py-1.5 pl-3 text-[10px] uppercase font-bold cursor-pointer hover:text-zinc-900 dark:text-zinc-300 flex items-center gap-3" onClick={() => { setTopicSortBy('name'); setTopicSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
                                    <span>Assunto {topicSortBy === 'name' && (topicSortOrder === 'asc' ? '↑' : '↓')}</span>
                                    <span className="flex-1" />
                                    {addingTopicToId === subject.id ? (
                                      <div className="flex items-center gap-2 animate-in fade-in" onClick={e => e.stopPropagation()}>
                                        <input
                                          className="text-xs px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none font-normal normal-case tracking-normal"
                                          placeholder="Nome do tópico..."
                                          value={newTopicTitle}
                                          onChange={e => setNewTopicTitle(e.target.value)}
                                          onKeyPress={e => e.key === 'Enter' && handleAddTopic(subject.id)}
                                          autoFocus
                                        />
                                        <button onClick={() => handleAddTopic(subject.id)} className="text-xs bg-zinc-900 dark:bg-zinc-700 text-white px-2.5 py-1 rounded-lg font-normal normal-case tracking-normal">Salvar</button>
                                        <button onClick={() => setAddingTopicToId(null)} className="text-xs text-zinc-400 px-1 font-normal normal-case tracking-normal">✕</button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={e => { e.stopPropagation(); setAddingTopicToId(subject.id); }}
                                        className="text-[10px] font-black text-zinc-500 hover:text-zinc-900 dark:hover:text-white uppercase tracking-widest normal-case flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                      >
                                        <Plus size={11} /> Tópico
                                      </button>
                                    )}
                                  </th>
                                  <th className="py-1.5 text-[10px] uppercase font-bold cursor-pointer hover:text-zinc-900 dark:text-zinc-300" onClick={() => { setTopicSortBy('lastStudy'); setTopicSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                                    Último {topicSortBy === 'lastStudy' && (topicSortOrder === 'desc' ? '↓' : '↑')}
                                  </th>
                                  <th className="py-1.5 text-[10px] uppercase font-bold cursor-pointer hover:text-zinc-900 dark:text-zinc-300" onClick={() => { setTopicSortBy('review7d'); setTopicSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                                    Rev.7d {topicSortBy === 'review7d' && (topicSortOrder === 'desc' ? '↓' : '↑')}
                                  </th>
                                  <th className="py-1.5 text-[10px] uppercase font-bold cursor-pointer hover:text-zinc-900 dark:text-zinc-300" onClick={() => { setTopicSortBy('review30d'); setTopicSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                                    Rev.30d {topicSortBy === 'review30d' && (topicSortOrder === 'desc' ? '↓' : '↑')}
                                  </th>
                                  <th className="py-1.5 text-[10px] uppercase font-bold cursor-pointer hover:text-zinc-900 dark:text-zinc-300" onClick={() => { setTopicSortBy('review90d'); setTopicSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                                    Rev.90d {topicSortBy === 'review90d' && (topicSortOrder === 'desc' ? '↓' : '↑')}
                                  </th>
                                  <th className="py-1.5 text-[10px] uppercase font-bold cursor-pointer hover:text-zinc-900 dark:text-zinc-300" onClick={() => { setTopicSortBy('time'); setTopicSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                                    Tempo {topicSortBy === 'time' && (topicSortOrder === 'desc' ? '↓' : '↑')}
                                  </th>
                                  <th className="py-1.5 text-[10px] uppercase font-bold cursor-pointer hover:text-zinc-900 dark:text-zinc-300" onClick={() => { setTopicSortBy('questions'); setTopicSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                                    Questões {topicSortBy === 'questions' && (topicSortOrder === 'desc' ? '↓' : '↑')}
                                  </th>
                                  <th className="py-1.5 text-[10px] uppercase font-bold text-right w-16"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {/* Tópico Geral / Fixo */}
                                {(() => {
                                  const stats = getTopicStats(subject.id, null);
                                  return (
                                    <tr className="border-b border-zinc-50 dark:border-zinc-800/30">
                                      <td className="py-1.5 font-semibold pl-3 text-xs" style={{ color: getColorHex(subject.color) }}>
                                        Geral / Outros <span className="text-[10px] font-normal opacity-60 ml-1 text-zinc-500">revisão geral</span>
                                      </td>
                                      <td className="py-1.5 text-zinc-400 text-xs">{stats.lastStudyDate || '—'}</td>
                                      <td className="py-1.5 text-xs text-zinc-400">{stats.review7dDate || '—'}</td>
                                      <td className="py-1.5 text-xs text-zinc-400">{stats.review30dDate || '—'}</td>
                                      <td className="py-1.5 text-xs text-zinc-400">{stats.review90dDate || '—'}</td>
                                      <td className="py-1.5 text-zinc-400 text-xs">{stats.minutes > 0 ? `${stats.hours}h` : '—'}</td>
                                      <td className="py-1.5 text-zinc-400 text-xs">{stats.done > 0 ? `${stats.correct}/${stats.done} (${stats.acc}%)` : '—'}</td>
                                      <td className="py-1.5" />
                                    </tr>
                                  );
                                })()}

                                {[...(subject.topics || [])].map(topic => ({ topic, stats: getTopicStats(subject.id, topic.id) }))
                                  .sort((a, b) => {
                                    if (topicSortBy === 'default') {
                                      // Default: completion then title
                                      if (a.topic.isCompleted === b.topic.isCompleted) return a.topic.title.localeCompare(b.topic.title, undefined, { numeric: true });
                                      return a.topic.isCompleted ? 1 : -1;
                                    }

                                    const multiplier = topicSortOrder === 'asc' ? 1 : -1;

                                    if (topicSortBy === 'name') return a.topic.title.localeCompare(b.topic.title, undefined, { numeric: true }) * multiplier;
                                    if (topicSortBy === 'lastStudy') {
                                      const aDate = a.stats.lastStudyDate ? new Date(a.stats.lastStudyDate).getTime() : 0;
                                      const bDate = b.stats.lastStudyDate ? new Date(b.stats.lastStudyDate).getTime() : 0;
                                      return (aDate - bDate) * multiplier;
                                    }
                                    if (topicSortBy === 'review7d') {
                                      const aDate = a.stats.review7dDate ? new Date(a.stats.review7dDate).getTime() : 0;
                                      const bDate = b.stats.review7dDate ? new Date(b.stats.review7dDate).getTime() : 0;
                                      return (aDate - bDate) * multiplier;
                                    }
                                    if (topicSortBy === 'review30d') {
                                      const aDate = a.stats.review30dDate ? new Date(a.stats.review30dDate).getTime() : 0;
                                      const bDate = b.stats.review30dDate ? new Date(b.stats.review30dDate).getTime() : 0;
                                      return (aDate - bDate) * multiplier;
                                    }
                                    if (topicSortBy === 'review90d') {
                                      const aDate = a.stats.review90dDate ? new Date(a.stats.review90dDate).getTime() : 0;
                                      const bDate = b.stats.review90dDate ? new Date(b.stats.review90dDate).getTime() : 0;
                                      return (aDate - bDate) * multiplier;
                                    }
                                    if (topicSortBy === 'time') return (a.stats.minutes - b.stats.minutes) * multiplier;
                                    if (topicSortBy === 'questions') return (a.stats.done - b.stats.done) * multiplier;

                                    return 0;
                                  })
                                  .map(({ topic, stats: tStats }) => {
                                    return (
                                      <tr key={topic.id} className="group/row hover:bg-zinc-100/80 dark:hover:bg-zinc-700/40 transition-colors border-b border-zinc-50 dark:border-zinc-800/20 last:border-0">
                                        <td className={`py-1.5 pl-3 text-xs font-semibold ${topic.isCompleted ? 'text-zinc-300 dark:text-zinc-600 line-through' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                          {editingTopicId === topic.id ? (
                                            <div className="flex items-center gap-2">
                                              <input
                                                className="px-2 py-1 bg-white dark:bg-zinc-900 border rounded text-xs w-full outline-none focus:ring-1 focus:ring-zinc-500"
                                                value={editTopicTitle}
                                                onChange={e => setEditTopicTitle(e.target.value)}
                                                autoFocus
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') saveTopicEdit(subject.id, topic.id);
                                                  if (e.key === 'Escape') cancelTopicEdit();
                                                }}
                                                onClick={e => e.stopPropagation()}
                                              />
                                              <button onClick={() => saveTopicEdit(subject.id, topic.id)} className="text-emerald-500 hover:text-emerald-600">
                                                <CheckCircle size={13} />
                                              </button>
                                            </div>
                                          ) : (
                                            <span
                                              className="cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors select-none"
                                              onClick={() => toggleTopic(subject.id, topic.id)}
                                              title={topic.isCompleted ? 'Marcar como pendente' : 'Marcar como concluído'}
                                            >
                                              {topic.title}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-1.5 text-zinc-400 text-xs">
                                          {tStats.lastStudyDate || '-'}
                                        </td>
                                        <td className="py-1.5 text-xs font-medium text-zinc-400">
                                          {tStats.review7dDate || '-'}
                                        </td>
                                        <td className="py-1.5 text-xs font-medium text-zinc-400">
                                          {tStats.review30dDate || '-'}
                                        </td>
                                        <td className="py-1.5 text-xs font-medium text-zinc-400">
                                          {tStats.review90dDate || '-'}
                                        </td>
                                        <td className="py-1.5 text-zinc-400 text-xs">
                                          {tStats.minutes > 0 ? `${tStats.hours}h` : '-'}
                                        </td>
                                        <td className="py-1.5 text-zinc-400 text-xs">
                                          {tStats.done > 0 ? `${tStats.correct}/${tStats.done} (${tStats.acc}%)` : '-'}
                                        </td>
                                        <td className="py-1.5 text-right">
                                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                            <button onClick={() => startEditingTopic(topic)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                              <Edit2 size={11} />
                                            </button>
                                            <button onClick={() => deleteTopic(subject.id, topic.id)} className="text-zinc-400 hover:text-rose-500 transition-colors">
                                              <Trash2 size={11} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                {(subject.topics || []).length === 0 && (
                                  <tr>
                                    <td colSpan={7} className="py-4 text-center text-xs text-zinc-400 italic">
                                      Nenhum tópico cadastrado para esta disciplina.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {subjects.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center opacity-50">
                      <Bot size={40} className="mb-2 text-zinc-400" />
                      <p className="font-bold text-zinc-500">{selectedConcursoId === 'all' ? 'Selecione um edital acima para ver e adicionar disciplinas.' : 'Nenhuma disciplina encontrada neste edital.'}</p>
                      {selectedConcursoId !== 'all' && <p className="text-sm text-zinc-400">Adicione manualmente usando o botão acima.</p>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {
        deleteConfirmation.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 p-6 border border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-bold text-zinc-800 dark:text-white mb-2">Excluir Disciplina?</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                  Tem certeza que deseja excluir <strong>{deleteConfirmation.name}</strong>?<br />
                  Todos os tópicos e histórico associado serão removidos.
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                    className="flex-1 py-3 rounded-xl font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-xs uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (deleteConfirmation.id) {
                        onUpdateSubjects(subjects.filter(s => s.id !== deleteConfirmation.id));
                        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
                      }
                    }}
                    className="flex-1 py-3 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white transition-all text-xs uppercase shadow-lg shadow-rose-500/20"
                  >
                    Sim, Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default SubjectsView;
