import React, { useState, useRef } from 'react';
import { Subject, Topic, StudySession } from '../types';
import { geminiService } from '../services/geminiService';
import { COLORS } from '../constants';
import { getColorHex, getBadgeStyle } from '../utils/colors';
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Edit2,
  Plus,
  FileText,
  Bot,
  Clock,
  Target,
  TrendingUp,
  CheckCircle,
  Circle,
  AlertTriangle
} from 'lucide-react';

interface SubjectsViewProps {
  subjects: Subject[];
  sessions: StudySession[];
  onUpdateSubjects: (subjects: Subject[]) => void;
}

const SubjectsView: React.FC<SubjectsViewProps> = ({ subjects, sessions, onUpdateSubjects }) => {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editQuestionsGoal, setEditQuestionsGoal] = useState<number | ''>('');

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

  const [sortBy, setSortBy] = useState<'default' | 'time' | 'questions' | 'name' | 'meta'>('default');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [topicSortBy, setTopicSortBy] = useState<'default' | 'priority' | 'time' | 'questions' | 'name'>('default');
  const [topicSortOrder, setTopicSortOrder] = useState<'asc' | 'desc'>('desc');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Topic editing state
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTopicTitle, setEditTopicTitle] = useState('');

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedSubjects);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedSubjects(newSet);
  };

  const getSubjectStats = (subjectId: string) => {
    const subSessions = sessions.filter(s => s.subjectId === subjectId);
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

  const getTopicStats = (subjectId: string, topicId: string) => {
    const topicSessions = sessions.filter(s => s.topicId === topicId && s.subjectId === subjectId);
    const tMinutes = topicSessions.reduce((acc, s) => acc + s.durationInMinutes, 0);
    const tDone = topicSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
    const tCorrect = topicSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
    const tAcc = tDone > 0 ? Math.round((tCorrect / tDone) * 100) : 0;
    const tHours = (tMinutes / 60).toFixed(1);

    // Calculate last study date
    let lastStudyDate = '';
    if (topicSessions.length > 0) {
      const sortedSessions = [...topicSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastDate = new Date(sortedSessions[0].date);
      lastStudyDate = lastDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    return { minutes: tMinutes, done: tDone, correct: tCorrect, acc: tAcc, hours: tHours, lastStudyDate };
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
    const statsA = getSubjectStats(a.id);
    const statsB = getSubjectStats(b.id);
    if (sortBy === 'time') return sortOrder === 'desc' ? statsB.hours - statsA.hours : statsA.hours - statsB.hours;
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
  };

  const saveEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!editName.trim()) return;
    onUpdateSubjects(subjects.map(s => s.id === editingSubjectId ? {
      ...s,
      name: editName,
      color: editColor,
      questionsGoal: editQuestionsGoal === '' ? undefined : Number(editQuestionsGoal)
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Por favor, selecione um arquivo PDF válido.');
      return;
    }
    setIsProcessing(true);
    try {
      const base64 = await fileToBase64(file);
      const extractedData = await geminiService.parseEditalPdf(base64);
      if (extractedData && extractedData.length > 0) {
        const newSubjects: Subject[] = extractedData.map((item: any, idx: number) => ({
          id: `extracted-${Date.now()}-${idx}`,
          name: item.subjectName,
          color: COLORS[idx % COLORS.length],
          topics: item.topics.map((t: string, tIdx: number) => ({
            id: `extracted-t-${Date.now()}-${idx}-${tIdx}`,
            title: t,
            isCompleted: false,
            priority: 'Média'
          }))
        }));
        onUpdateSubjects([...subjects, ...newSubjects]);
        alert(`${newSubjects.length} matérias importadas com sucesso!`);
      } else {
        alert('Não foi possível extrair dados do edital.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao processar o arquivo.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Disciplinas & Edital</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerenciamento detalhado do conteúdo programático.</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-sm shadow-emerald-500/20 disabled:opacity-50 text-xs uppercase tracking-wide"
          >
            {isProcessing ? '⌛ Processando...' : <><FileText size={16} /> Importar PDF</>}
          </button>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block" />

          <div className="flex gap-2 flex-1 md:flex-none">
            <input
              type="text"
              placeholder="Nova disciplina..."
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white text-sm min-w-[200px]"
            />
            <button onClick={addSubject} className="bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700 flex items-center justify-center"><Plus size={20} /></button>
          </div>
          <div className="flex gap-1.5 px-1 items-center">
            {COLORS.slice(0, 5).map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-5 h-5 rounded-full transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 scale-110' : 'opacity-60 hover:opacity-100'} ${getBadgeStyle(color).className}`}
                style={getBadgeStyle(color).style}
              />
            ))}
            <div className="relative flex items-center justify-center w-6 h-6 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-blue-500 transition-all ml-1 cursor-pointer">
              <input
                type="color"
                value={getColorHex(selectedColor)}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                title="Cor personalizada"
              />
              <span className="pointer-events-none text-[8px] font-bold text-slate-500">+</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider"></th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider cursor-pointer hover:text-blue-500" onClick={() => { setSortBy('name'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
                  Disciplina {sortBy === 'name' && (sortOrder === 'asc' ? '↓' : '↑')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider cursor-pointer hover:text-blue-500" onClick={() => { setSortBy('time'); setSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                  Tempo {sortBy === 'time' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider cursor-pointer hover:text-blue-500" onClick={() => { setSortBy('questions'); setSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                  Questões {sortBy === 'questions' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Aproveitamento</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider cursor-pointer hover:text-blue-500" onClick={() => { setSortBy('meta'); setSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                  Edital {sortBy === 'meta' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Peso</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedSubjects.map(subject => {
                const stats = getSubjectStats(subject.id);
                const isExpanded = expandedSubjects.has(subject.id);

                return (
                  <React.Fragment key={subject.id}>
                    <tr
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/30' : ''}`}
                      onClick={() => toggleExpand(subject.id)}
                    >
                      <td className="px-6 py-4 w-10">
                        {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getBadgeStyle(subject.color).className}`} style={getBadgeStyle(subject.color).style} />
                          {editingSubjectId === subject.id ? (
                            <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <input
                                  className="px-2 py-1 bg-white dark:bg-slate-900 border rounded text-sm"
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
                                    className={`w-3 h-3 rounded-full transition-all ${editColor === color ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : 'opacity-40 hover:opacity-100'} ${getBadgeStyle(color).className}`}
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
                              <p className="text-sm font-bold text-slate-800 dark:text-white">{subject.name}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-medium mt-0.5">{subject.topics.length} tópicos</p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                          <Clock size={14} className="text-slate-400" /> {stats.hours}h
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                          <Target size={14} className="text-slate-400" /> {stats.questions}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full ${stats.accuracy >= 80 ? 'bg-emerald-500' : stats.accuracy < 50 ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${stats.accuracy}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{stats.accuracy}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300" onClick={e => editingSubjectId === subject.id && e.stopPropagation()}>
                          {editingSubjectId === subject.id ? (
                            <input
                              type="number"
                              placeholder="Qtd"
                              className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border rounded text-sm"
                              value={editQuestionsGoal}
                              onChange={e => setEditQuestionsGoal(e.target.value === '' ? '' : Number(e.target.value))}
                            />
                          ) : (
                            subject.questionsGoal ? <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-bold">{subject.questionsGoal} Qs</span> : '-'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                          {subject.weight ? <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded text-xs font-bold">{subject.weight}x</span> : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => startEditing(subject, e)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-500 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={(e) => deleteSubject(subject.id, e)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="px-0 py-0 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                          <div className="p-6 pl-16 grid gap-4">
                            <div className="flex items-center gap-4 mb-2">
                              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wide">Tópicos do Edital</h4>
                              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                              {addingTopicToId === subject.id ? (
                                <div className="flex items-center gap-2 animate-in fade-in">
                                  <input
                                    className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                                    placeholder="Nome do tópico..."
                                    value={newTopicTitle}
                                    onChange={e => setNewTopicTitle(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && handleAddTopic(subject.id)}
                                    autoFocus
                                  />
                                  <select
                                    value={newTopicPriority} onChange={e => setNewTopicPriority(e.target.value as any)}
                                    className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                                  >
                                    <option value="Baixa">Baixa</option>
                                    <option value="Média">Média</option>
                                    <option value="Alta">Alta</option>
                                  </select>
                                  <button onClick={() => handleAddTopic(subject.id)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg">Add</button>
                                  <button onClick={() => setAddingTopicToId(null)} className="text-xs text-slate-400 px-2">X</button>
                                </div>
                              ) : (
                                <button onClick={() => setAddingTopicToId(subject.id)} className="text-[10px] font-bold text-blue-600 uppercase hover:underline">+ Adicionar Tópico</button>
                              )}
                            </div>

                            <table className="w-full text-left text-sm">
                              <thead>
                                <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                  <th className="py-2 text-[10px] uppercase font-bold w-8"></th>
                                  <th className="py-2 text-[10px] uppercase font-bold cursor-pointer hover:text-blue-500" onClick={() => { setTopicSortBy('name'); setTopicSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
                                    Assunto {topicSortBy === 'name' && (topicSortOrder === 'asc' ? '↑' : '↓')}
                                  </th>
                                  <th className="py-2 text-[10px] uppercase font-bold cursor-pointer hover:text-blue-500" onClick={() => { setTopicSortBy('lastStudy'); setTopicSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                                    Último Estudo {topicSortBy === 'lastStudy' && (topicSortOrder === 'desc' ? '↓' : '↑')}
                                  </th>
                                  <th className="py-2 text-[10px] uppercase font-bold cursor-pointer hover:text-blue-500" onClick={() => { setTopicSortBy('time'); setTopicSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                                    Tempo {topicSortBy === 'time' && (topicSortOrder === 'desc' ? '↓' : '↑')}
                                  </th>
                                  <th className="py-2 text-[10px] uppercase font-bold cursor-pointer hover:text-blue-500" onClick={() => { setTopicSortBy('questions'); setTopicSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                                    Questões {topicSortBy === 'questions' && (topicSortOrder === 'desc' ? '↓' : '↑')}
                                  </th>
                                  <th className="py-2 text-[10px] uppercase font-bold text-right">Ação</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...subject.topics].map(topic => ({ topic, stats: getTopicStats(subject.id, topic.id) }))
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
                                    if (topicSortBy === 'time') return (a.stats.minutes - b.stats.minutes) * multiplier;
                                    if (topicSortBy === 'questions') return (a.stats.done - b.stats.done) * multiplier;

                                    return 0;
                                  })
                                  .map(({ topic, stats: tStats }) => {
                                    return (
                                      <tr key={topic.id} className="group/row hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="py-2">
                                          <button onClick={() => toggleTopic(subject.id, topic.id)} className={`${topic.isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}`}>
                                            {topic.isCompleted ? <CheckCircle size={14} /> : <Circle size={14} />}
                                          </button>
                                        </td>
                                        <td className={`py-2 font-medium ${topic.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                                          {editingTopicId === topic.id ? (
                                            <div className="flex items-center gap-2">
                                              <input
                                                className="px-2 py-1 bg-white dark:bg-slate-900 border rounded text-xs w-full outline-none focus:ring-1 focus:ring-blue-500"
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
                                                <CheckCircle size={14} />
                                              </button>
                                            </div>
                                          ) : (
                                            topic.title
                                          )}
                                        </td>
                                        <td className="py-2 text-slate-500 text-xs">
                                          {tStats.lastStudyDate || '-'}
                                        </td>
                                        <td className="py-2 text-slate-500 text-xs">
                                          {tStats.minutes > 0 ? `${tStats.hours}h` : '-'}
                                        </td>
                                        <td className="py-2 text-slate-500 text-xs">
                                          {tStats.done > 0 ? `${tStats.correct}/${tStats.done} (${tStats.acc}%)` : '-'}
                                        </td>
                                        <td className="py-2 text-right">
                                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                            <button onClick={() => startEditingTopic(topic)} className="text-slate-300 hover:text-blue-500">
                                              <Edit2 size={12} />
                                            </button>
                                            <button onClick={() => deleteTopic(subject.id, topic.id)} className="text-slate-300 hover:text-rose-500">
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                {subject.topics.length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="py-4 text-center text-xs text-slate-400 italic">
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

              {subjects.length === 0 && !isProcessing && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center opacity-50">
                      <Bot size={40} className="mb-2 text-slate-400" />
                      <p className="font-bold text-slate-500">Nenhuma disciplina encontrada</p>
                      <p className="text-sm text-slate-400">Adicione manualmente ou importe um edital.</p>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 p-6 border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Excluir Disciplina?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Tem certeza que deseja excluir <strong>{deleteConfirmation.name}</strong>?<br />
                  Todos os tópicos e histórico associado serão removidos.
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                    className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs uppercase"
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
