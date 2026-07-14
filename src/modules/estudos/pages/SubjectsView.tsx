import React, { useState, useRef, useEffect } from 'react';
import { Subject, Topic, StudySession, Concurso } from '../types';
import { playSound } from '../../../utils/audio';

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
  Bot,
  GripVertical
} from 'lucide-react';

interface SubjectsViewProps {
  subjects: Subject[];
  sessions: StudySession[];
  onUpdateSubjects: (subjects: Subject[]) => void;
  selectedConcursoId?: string | 'all';
  onSelectConcursoId?: (id: string | 'all') => void;
  scheduledStudies: any[];
  concursos?: Concurso[];
  onToggleScheduledStudyStatus?: (idOrIds: string | string[]) => void;
}

const isTopicCompletedHelper = (subjectId: string, topicId: string, isCompletedFlag: boolean, scheduledStudies: any[], sessions: StudySession[]) => {
  const hasBeenStudied = (sessions || []).some(s => s.subjectId === subjectId && s.topicId === topicId);
  if (hasBeenStudied) {
    return true;
  }
  const reviews = (scheduledStudies || []).filter(sched =>
    sched.subjectId === subjectId &&
    sched.topicId === topicId &&
    sched.activityType && (
      sched.activityType.toLowerCase().includes('revisão') || 
      sched.activityType.toLowerCase().includes('revisao')
    )
  );
  if (reviews.length === 0) {
    return isCompletedFlag;
  }
  return reviews.every(r => r.status === 'realizado');
};

const SubjectsView: React.FC<SubjectsViewProps> = ({ subjects, sessions, onUpdateSubjects, selectedConcursoId, onSelectConcursoId, concursos, scheduledStudies, onToggleScheduledStudyStatus }) => {
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





  const [topicSortBy, setTopicSortBy] = useState<'default' | 'priority' | 'time' | 'questions' | 'name' | 'firstStudy' | 'lastStudy' | 'review1' | 'review2' | 'review3' | 'review4' | 'review5'>('default');
  const [topicSortOrder, setTopicSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [customReviewDays, setCustomReviewDays] = useState<number[]>(() => {
    const saved = localStorage.getItem('estudos_custom_review_days');
    return saved ? JSON.parse(saved) : [7, 30, 90, 15, 45];
  });

  const sortedReviewIndices = React.useMemo(() => {
    return customReviewDays
      .map((val, idx) => ({ val, idx }))
      .sort((a, b) => a.val - b.val)
      .map(x => x.idx);
  }, [customReviewDays]);

  const [reviewsDisabled, setReviewsDisabled] = useState(() => {
    if (selectedConcursoId && selectedConcursoId !== 'all') {
      return localStorage.getItem('estudos_disabled_reviews_' + selectedConcursoId) === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (selectedConcursoId && selectedConcursoId !== 'all') {
      setReviewsDisabled(localStorage.getItem('estudos_disabled_reviews_' + selectedConcursoId) === 'true');
    } else {
      setReviewsDisabled(false);
    }
  }, [selectedConcursoId]);

  // Topic editing state
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTopicTitle, setEditTopicTitle] = useState('');
  const [editingTopicOrderId, setEditingTopicOrderId] = useState<string | null>(null);
  const [editTopicOrder, setEditTopicOrder] = useState<number>(1);

  // Drag & Drop state for subject reordering
  const [draggedSubjectId, setDraggedSubjectId] = useState<string | null>(null);
  const [dragOverSubjectId, setDragOverSubjectId] = useState<string | null>(null);

  // Drag & Drop state for topic reordering
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [dragOverTopicId, setDragOverTopicId] = useState<string | null>(null);

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

  const isAllExpanded = subjects.length > 0 && expandedSubjects.size === subjects.length;
  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedSubjects(new Set());
    } else {
      setExpandedSubjects(new Set(subjects.map(s => s.id)));
    }
  };

  const getSubjectStats = (subjectId: string) => {
    const simuladoSessions = scheduledStudies.filter(s => s.activityType === 'Simulado');
    const isSimuladoSession = (session: any) => {
      if (session.isSimulado || session.activityType === 'Simulado') return true;
      return simuladoSessions.some(st => 
        st.id === session.id || 
        (st.subjectId === session.subjectId && st.date === session.date?.split('T')[0] && st.durationInMinutes === session.durationInMinutes)
      );
    };

    const subSessions = sessions.filter(s => s.subjectId === subjectId && !isSimuladoSession(s));
    const totalMinutes = subSessions.reduce((acc, s) => acc + s.durationInMinutes, 0);
    const totalQuestions = subSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
    const totalCorrect = subSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
    const accuracy = totalQuestions > 0 ? Math.min(100, Math.round((totalCorrect / totalQuestions) * 100)) : 0;

    return {
      hours: parseFloat((totalMinutes / 60).toFixed(1)),
      questions: totalQuestions,
      accuracy
    };
  };

  const getTopicStats = (subjectId: string, topicId: string | null) => {
    const isRevisaoSession = (s: any) => {
      const isRevType = s.activityType && (
        s.activityType.toLowerCase().includes('revisão') || 
        s.activityType.toLowerCase().includes('revisao')
      );
      const isRevNotes = s.notes && (
        s.notes.toLowerCase().includes('revisão') || 
        s.notes.toLowerCase().includes('revisao')
      );
      const matchingSched = (scheduledStudies || []).find(sched => sched.id === s.id);
      const isRevId = matchingSched && matchingSched.activityType && (
        matchingSched.activityType.toLowerCase().includes('revisão') || 
        matchingSched.activityType.toLowerCase().includes('revisao')
      );
      const isDeterministic = s.id && s.id.toLowerCase().split('-')[3]?.startsWith('400');
      return !!(isRevType || isRevNotes || isRevId || isDeterministic);
    };

    const topicSessions = sessions.filter(s => 
      (topicId ? s.topicId === topicId : !s.topicId) && 
      s.subjectId === subjectId && 
      s.activityType !== 'Simulado' && 
      !s.isSimulado &&
      !isRevisaoSession(s)
    );
    const tMinutes = topicSessions.reduce((acc, s) => acc + s.durationInMinutes, 0);
    const tDone = topicSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
    const tCorrect = topicSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
    const tAcc = tDone > 0 ? Math.min(100, Math.round((tCorrect / tDone) * 100)) : 0;
    const tHours = (tMinutes / 60).toFixed(1);

    // Calculate first and last study dates
    let lastStudyDate = '';
    let firstStudyDate = '';
    let review7dDate = '';
    let review30dDate = '';
    let review90dDate = '';
    const customReviewDates: { dateStr: string; status: 'planejado' | 'realizado' | 'none' }[] = [
      { dateStr: '', status: 'none' },
      { dateStr: '', status: 'none' },
      { dateStr: '', status: 'none' },
      { dateStr: '', status: 'none' },
      { dateStr: '', status: 'none' }
    ];

    if (reviewsDisabled) {
      for (let i = 0; i < 5; i++) {
        customReviewDates[i] = { dateStr: 'N/A', status: 'none' };
      }
      if (topicSessions.length > 0) {
        const sortedSessions = [...topicSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastDate = new Date(sortedSessions[0].date);
        const firstDate = new Date(sortedSessions[sortedSessions.length - 1].date);
        const formatDate = (date: Date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        lastStudyDate = formatDate(lastDate);
        firstStudyDate = formatDate(firstDate);
      }
    } else if (topicSessions.length > 0) {
      const sortedSessions = [...topicSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastDate = new Date(sortedSessions[0].date);
      const firstDate = new Date(sortedSessions[sortedSessions.length - 1].date);

      const formatDate = (date: Date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

      lastStudyDate = formatDate(lastDate);
      firstStudyDate = formatDate(firstDate);

      const d7 = new Date(lastDate);
      d7.setDate(d7.getDate() + 7);
      review7dDate = formatDate(d7);

      const d30 = new Date(lastDate);
      d30.setDate(d30.getDate() + 30);
      review30dDate = formatDate(d30);

      const d90 = new Date(lastDate);
      d90.setDate(d90.getDate() + 90);
      review90dDate = formatDate(d90);
      // Find targetDate of the active concurso (cap reviews at exam date)
      let examDateStr: string | null = null;
      if (concursos && selectedConcursoId && selectedConcursoId !== 'all') {
        const activeConcurso = concursos.find(c => c.id === selectedConcursoId);
        if (activeConcurso?.targetDate) {
          examDateStr = activeConcurso.targetDate.split('T')[0];
        }
      }

      for (let i = 0; i < 5; i++) {
        const dCustom = new Date(lastDate);
        dCustom.setDate(dCustom.getDate() + customReviewDays[i]);
        
        const uncappedDateStr = dCustom.toISOString().split('T')[0];
        const isPastExam = examDateStr && uncappedDateStr > examDateStr;

        if (isPastExam) {
          customReviewDates[i] = {
            dateStr: '—',
            status: 'none'
          };
          continue;
        }

        // Look up status in scheduledStudies
        const review = (scheduledStudies || []).find(s => 
          s.subjectId === subjectId &&
          s.topicId === (topicId === null ? undefined : topicId) &&
          s.activityType && (
            s.activityType.toLowerCase().includes('revisão') || 
            s.activityType.toLowerCase().includes('revisao')
          ) &&
          s.id && s.id.toLowerCase().split('-')[3] === `400${i}`
        );

        customReviewDates[i] = {
          dateStr: formatDate(dCustom),
          status: review ? review.status : 'none'
        };
      }
    }

    return { minutes: tMinutes, done: tDone, correct: tCorrect, acc: tAcc, hours: tHours, firstStudyDate, lastStudyDate, review7dDate, review30dDate, review90dDate, customReviewDates };
  };

  const sortedSubjects = [...subjects].sort((a, b) => {
    if (sortBy === 'default') {
      const orderA = a.order ?? 9999;
      const orderB = b.order ?? 9999;
      return orderA - orderB;
    }
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
    const maxOrder = subjects.reduce((max, s) => Math.max(max, s.order ?? 0), 0);
    const newSub: Subject = {
      id: crypto.randomUUID(),
      name: newSubjectName,
      color: selectedColor,
      order: maxOrder + 1,
      topics: []
    };
    onUpdateSubjects([...subjects, newSub]);
    setNewSubjectName('');
    const currentIndex = COLORS.indexOf(selectedColor);
    setSelectedColor(COLORS[(currentIndex + 1) % COLORS.length]);
  };

  // DnD handlers for subject row reordering
  const handleSubjectDragStart = (e: React.DragEvent, id: string) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.drag-handle')) {
      e.preventDefault();
      return;
    }
    setDraggedSubjectId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('subject-id', id);
  };

  const handleSubjectDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggedSubjectId) setDragOverSubjectId(id);
  };

  const handleSubjectDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('subject-id') || draggedSubjectId;
    if (!sourceId || sourceId === targetId) {
      setDraggedSubjectId(null);
      setDragOverSubjectId(null);
      return;
    }
    // Re-order: insert source before target in the sorted array
    const sorted = [...subjects].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    const sourceIdx = sorted.findIndex(s => s.id === sourceId);
    const targetIdx = sorted.findIndex(s => s.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    const updated = subjects.map(s => {
      const newIdx = reordered.findIndex(r => r.id === s.id);
      return { ...s, order: newIdx + 1 };
    });
    onUpdateSubjects(updated);
    setDraggedSubjectId(null);
    setDragOverSubjectId(null);
  };

  const handleSubjectDragEnd = () => {
    setDraggedSubjectId(null);
    setDragOverSubjectId(null);
  };

  // DnD handlers for topic row reordering
  const handleTopicDragStart = (e: React.DragEvent, topicId: string) => {
    e.stopPropagation();
    setDraggedTopicId(topicId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('topic-id', topicId);
  };

  const handleTopicDragOver = (e: React.DragEvent, topicId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (topicId !== draggedTopicId) setDragOverTopicId(topicId);
  };

  const handleTopicDrop = (e: React.DragEvent, subjectId: string, targetTopicId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceTopicId = e.dataTransfer.getData('topic-id') || draggedTopicId;
    if (!sourceTopicId || sourceTopicId === targetTopicId) {
      setDraggedTopicId(null);
      setDragOverTopicId(null);
      return;
    }

    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const sortedTopics = [...(subject.topics || [])].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    const sourceIdx = sortedTopics.findIndex(t => t.id === sourceTopicId);
    const targetIdx = sortedTopics.findIndex(t => t.id === targetTopicId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const reordered = [...sortedTopics];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    const updatedTopics = reordered.map((t, idx) => ({ ...t, order: idx + 1 }));

    onUpdateSubjects(subjects.map(s => s.id === subjectId ? { ...s, topics: updatedTopics } : s));
    setDraggedTopicId(null);
    setDragOverTopicId(null);
  };

  const handleTopicDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedTopicId(null);
    setDragOverTopicId(null);
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
    const subject = subjects.find(s => s.id === subjectId);
    const existingOrders = (subject?.topics || []).map(t => t.order ?? 0);
    const nextOrder = existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 1;
    const newTopic: Topic = {
      id: crypto.randomUUID(),
      title: newTopicTitle,
      isCompleted: false,
      priority: newTopicPriority,
      order: nextOrder
    };
    onUpdateSubjects(subjects.map(s => s.id === subjectId ? { ...s, topics: [...(s.topics || []), newTopic] } : s));
    setNewTopicTitle('');
  };

  const updateTopicOrder = (subjectId: string, topicId: string, newOrder: number) => {
    onUpdateSubjects(subjects.map(s => s.id === subjectId ? {
      ...s,
      topics: (s.topics || []).map(t => t.id === topicId ? { ...t, order: newOrder } : t)
    } : s));
    setEditingTopicOrderId(null);
  };

  const toggleTopic = (subjectId: string, topicId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    const topic = subject?.topics.find(t => t.id === topicId);
    if (!topic) return;

    const isCompleted = isTopicCompletedHelper(subjectId, topicId, topic.isCompleted, scheduledStudies, sessions);
    const nextVal = !isCompleted;
    if (nextVal) {
      playSound.success();
    }

    onUpdateSubjects(subjects.map(s => s.id === subjectId ? {
      ...s,
      topics: (s.topics || []).map(t => t.id === topicId ? { ...t, isCompleted: nextVal } : t)
    } : s));

    const topicReviews = (scheduledStudies || []).filter(sched =>
      sched.subjectId === subjectId &&
      sched.topicId === topicId &&
      sched.activityType && (
        sched.activityType.toLowerCase().includes('revisão') || 
        sched.activityType.toLowerCase().includes('revisao')
      )
    );

    if (topicReviews.length > 0 && onToggleScheduledStudyStatus) {
      const targetReviews = nextVal
        ? topicReviews.filter(r => r.status === 'planejado').map(r => r.id)
        : topicReviews.filter(r => r.status === 'realizado').map(r => r.id);

      if (targetReviews.length > 0) {
        onToggleScheduledStudyStatus(targetReviews);
      }
    }
  };

  const deleteTopic = (subjectId: string, topicId: string) => {
    onUpdateSubjects(subjects.map(s => s.id === subjectId ? {
      ...s,
      topics: (s.topics || []).filter(t => t.id !== topicId)
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
      topics: (s.topics || []).map(t => t.id === topicId ? { ...t, title: editTopicTitle } : t)
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


      {/* Menu Superior de Revisões Personalizadas */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-zinc-500 dark:text-zinc-400" />
          <div>
            <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Revisões Personalizadas (Dias)</h3>
            <p className="text-[10px] text-zinc-400">Defina o intervalo de dias para as revisões de todos os assuntos.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          {selectedConcursoId && selectedConcursoId !== 'all' && (
            <label className="flex items-center gap-2 cursor-pointer py-1.5 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors select-none">
              <input
                type="checkbox"
                checked={reviewsDisabled}
                onChange={(e) => {
                  const newVal = e.target.checked;
                  setReviewsDisabled(newVal);
                  if (newVal) {
                    localStorage.setItem('estudos_disabled_reviews_' + selectedConcursoId, 'true');
                  } else {
                    localStorage.removeItem('estudos_disabled_reviews_' + selectedConcursoId);
                  }
                  window.dispatchEvent(new Event('local-reviews-toggled'));
                  window.dispatchEvent(new Event('local-settings-changed'));
                }}
                className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Não aplicar revisões (N/A)</span>
            </label>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            {customReviewDays.map((days, idx) => (
              <label key={idx} className={`flex items-center gap-1.5 text-xs font-bold text-zinc-500 ${reviewsDisabled ? 'opacity-40' : ''}`}>
                Rev. {idx + 1}
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={days}
                  disabled={reviewsDisabled}
                  onChange={(e) => {
                    const newVal = Math.max(1, parseInt(e.target.value) || 1);
                    const updated = [...customReviewDays];
                    updated[idx] = newVal;
                    setCustomReviewDays(updated);
                  }}
                  className={`w-14 px-1.5 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-center text-xs font-mono font-bold text-zinc-800 dark:text-white outline-none focus:ring-1 focus:ring-zinc-400 ${
                    reviewsDisabled ? 'cursor-not-allowed opacity-60' : ''
                  }`}
                />
              </label>
            ))}

            <button
              onClick={() => {
                localStorage.setItem('estudos_custom_review_days', JSON.stringify(customReviewDays));
                window.dispatchEvent(new Event('local-reviews-toggled'));
                window.dispatchEvent(new Event('local-settings-changed'));
                alert('Intervalos de revisão salvos com sucesso!');
              }}
              disabled={reviewsDisabled}
              className="px-4 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-3 w-full">
        <div className="flex flex-wrap gap-3 items-center">
          {selectedConcursoId === 'all' ? (
             <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={16} /> Selecione um edital para adicionar disciplinas
             </div>
          ) : (
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
          )}
        </div>

        {subjects.length > 0 && (
          <button
            onClick={toggleExpandAll}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center gap-1.5 text-xs font-bold shadow-sm transition-all"
          >
            {isAllExpanded ? 'Recolher Todos' : 'Expandir Todos'}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                <th className="w-8 px-2 py-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                  {sortBy === 'default' && <GripVertical size={13} className="text-zinc-300 mx-auto" />}
                </th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider cursor-pointer hover:text-zinc-900 dark:text-zinc-300" onClick={() => { setSortBy('name'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
                  Disciplina {sortBy === 'name' && (sortOrder === 'asc' ? '↓' : '↑')}
                </th>
                <th className="w-32 px-4 py-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sortedSubjects.map(subject => {
                const stats = getSubjectStats(subject.id);
                const isExpanded = expandedSubjects.has(subject.id);

                return (
                  <React.Fragment key={subject.id}>
                    <tr
                      className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group ${
                        isExpanded ? 'bg-zinc-50 dark:bg-zinc-800/30' : ''
                      } ${
                        dragOverSubjectId === subject.id && sortBy === 'default' ? 'border-t-2 border-blue-400' : ''
                      } ${
                        draggedSubjectId === subject.id ? 'opacity-40' : ''
                      }`}
                      onClick={() => toggleExpand(subject.id)}
                      draggable={sortBy === 'default' && editingSubjectId !== subject.id}
                      onDragStart={sortBy === 'default' ? (e) => handleSubjectDragStart(e, subject.id) : undefined}
                      onDragOver={sortBy === 'default' ? (e) => handleSubjectDragOver(e, subject.id) : undefined}
                      onDrop={sortBy === 'default' ? (e) => handleSubjectDrop(e, subject.id) : undefined}
                      onDragEnd={sortBy === 'default' ? handleSubjectDragEnd : undefined}
                    >
                      <td className="px-2 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                        {sortBy === 'default' ? (
                          <div className="flex items-center gap-1 drag-handle">
                            <GripVertical
                              size={14}
                              className="text-zinc-300 dark:text-zinc-600 cursor-grab active:cursor-grabbing shrink-0"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center cursor-pointer" onClick={() => toggleExpand(subject.id)}>
                            {isExpanded ? <ChevronDown size={15} className="text-zinc-400" /> : <ChevronRight size={15} className="text-zinc-400" />}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getBadgeStyle(subject.color).className}`} style={getBadgeStyle(subject.color).style} />
                          {editingSubjectId === subject.id ? (
                            <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <input
                                  className="px-2 py-1 bg-white dark:bg-zinc-900 border rounded text-sm text-zinc-800 dark:text-white"
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
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={3} className="px-0 py-0 bg-zinc-50/30 dark:bg-zinc-800/10 border-b border-zinc-100 dark:border-zinc-800">
                          <div className="pl-10 pr-4 py-2">

                            <table className="w-full text-left text-sm">
                              <thead>
                                <tr className="text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                                  <th className="w-16 py-1.5 pl-3 pr-1 text-[10px] uppercase font-bold text-zinc-400 text-center">#</th>
                                  <th className="py-1.5 pl-2 text-[10px] uppercase font-bold cursor-pointer hover:text-zinc-900 dark:text-zinc-300 flex items-center gap-3" onClick={() => { setTopicSortBy('name'); setTopicSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
                                    <span>Assunto {topicSortBy === 'name' && (topicSortOrder === 'asc' ? '↑' : '↓')}</span>
                                    <span className="flex-1" />
                                    {addingTopicToId === subject.id ? (
                                      <div className="flex items-center gap-2 animate-in fade-in" onClick={e => e.stopPropagation()}>
                                        <input
                                          className="text-xs px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none font-normal normal-case tracking-normal text-zinc-800 dark:text-zinc-100"
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
                                  <th className="py-1.5 text-[10px] uppercase font-bold cursor-pointer text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 rounded-t-xl" onClick={() => { setTopicSortBy('firstStudy'); setTopicSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                                    Primeira {topicSortBy === 'firstStudy' && (topicSortOrder === 'desc' ? '↓' : '↑')}
                                  </th>
                                  {sortedReviewIndices.map((origIdx, displayIdx) => {
                                    const days = customReviewDays[origIdx];
                                    return (
                                      <th
                                        key={origIdx}
                                        className={`py-1.5 text-[10px] uppercase font-bold cursor-pointer hover:text-zinc-900 dark:text-zinc-300 whitespace-nowrap ${topicSortBy === `review${origIdx + 1}` ? 'text-zinc-900 dark:text-zinc-100 font-black' : 'text-zinc-400'}`}
                                        onClick={() => {
                                          setTopicSortBy(`review${origIdx + 1}` as any);
                                          setTopicSortOrder(o => o === 'desc' ? 'asc' : 'desc');
                                        }}
                                      >
                                        Rev.{displayIdx + 1} ({days}d) {topicSortBy === `review${origIdx + 1}` && (topicSortOrder === 'desc' ? '↓' : '↑')}
                                      </th>
                                    );
                                  })}
                                  <th className="py-1.5 text-[10px] uppercase font-bold cursor-pointer text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/20 px-2.5 rounded-t-xl" onClick={() => { setTopicSortBy('lastStudy'); setTopicSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}>
                                    Último {topicSortBy === 'lastStudy' && (topicSortOrder === 'desc' ? '↓' : '↑')}
                                  </th>

                                  <th className="py-1.5 text-[10px] uppercase font-bold text-right w-16"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const stats = getTopicStats(subject.id, null);
                                  return (
                                    <tr className="border-b border-zinc-50 dark:border-zinc-800/30">
                                      <td className="py-1.5 pl-3 pr-1" />
                                      <td className="py-1.5 font-semibold pl-2 text-xs" style={{ color: getColorHex(subject.color) }}>
                                        Geral / Outros <span className="text-[10px] font-normal opacity-60 ml-1 text-zinc-500">revisão geral</span>
                                      </td>
                                      <td className="py-1.5 text-emerald-700/80 dark:text-emerald-300/80 text-xs bg-emerald-50/30 dark:bg-emerald-950/10 px-2.5 font-medium">{stats.firstStudyDate || '—'}</td>
                                      {sortedReviewIndices.map((origIdx) => {
                                        const item = stats.customReviewDates[origIdx];
                                        const dateVal = typeof item === 'string' ? item : item.dateStr;
                                        const statusVal = typeof item === 'string' ? 'none' : item.status;
                                        let className = "py-1.5 text-xs font-medium ";
                                        if (statusVal === 'realizado') {
                                          className += "text-blue-500 dark:text-blue-400";
                                        } else if (statusVal === 'planejado') {
                                          className += "text-rose-650 dark:text-rose-450 font-bold";
                                        } else {
                                          className += "text-zinc-400";
                                        }
                                        return (
                                          <td key={origIdx} className={className}>
                                            {dateVal || '—'}
                                          </td>
                                        );
                                      })}
                                      <td className="py-1.5 text-red-700/80 dark:text-red-300/80 text-xs bg-red-50/30 dark:bg-red-950/10 px-2.5 font-medium">{stats.lastStudyDate || '—'}</td>

                                      <td className="py-1.5" />
                                    </tr>
                                  );
                                })()}

                                {[...(subject.topics || [])].map(topic => ({ topic, stats: getTopicStats(subject.id, topic.id) }))
                                  .sort((a, b) => {
                                    if (topicSortBy === 'default') {
                                      // Default: by order number (asc), then completion, then title
                                      const orderA = a.topic.order ?? 999;
                                      const orderB = b.topic.order ?? 999;
                                      if (orderA !== orderB) return orderA - orderB;
                                      const isCompA = isTopicCompletedHelper(subject.id, a.topic.id, a.topic.isCompleted, scheduledStudies, sessions);
                                      const isCompB = isTopicCompletedHelper(subject.id, b.topic.id, b.topic.isCompleted, scheduledStudies, sessions);
                                      if (isCompA === isCompB) return a.topic.title.localeCompare(b.topic.title, undefined, { numeric: true });
                                      return isCompA ? 1 : -1;
                                    }

                                    const multiplier = topicSortOrder === 'asc' ? 1 : -1;

                                    if (topicSortBy === 'firstStudy') {
                                      const parseDate = (dStr: string) => {
                                        if (!dStr) return 0;
                                        const [d, m, y] = dStr.split('/').map(Number);
                                        return new Date(2000 + y, m - 1, d).getTime();
                                      };
                                      const aDate = parseDate(a.stats.firstStudyDate);
                                      const bDate = parseDate(b.stats.firstStudyDate);
                                      return (aDate - bDate) * multiplier;
                                    }
                                    if (topicSortBy === 'lastStudy') {
                                      const parseDate = (dStr: string) => {
                                        if (!dStr) return 0;
                                        const [d, m, y] = dStr.split('/').map(Number);
                                        return new Date(2000 + y, m - 1, d).getTime();
                                      };
                                      const aDate = parseDate(a.stats.lastStudyDate);
                                      const bDate = parseDate(b.stats.lastStudyDate);
                                      return (aDate - bDate) * multiplier;
                                    }
                                    if (topicSortBy.startsWith('review')) {
                                      const idx = parseInt(topicSortBy.replace('review', '')) - 1;
                                      const parseDate = (item: any) => {
                                        const dStr = typeof item === 'string' ? item : item?.dateStr;
                                        if (!dStr) return 0;
                                        const cleanStr = dStr.replace(/[^\d/]/g, '');
                                        const [d, m, y] = cleanStr.split('/').map(Number);
                                        return new Date(2000 + y, m - 1, d).getTime();
                                      };
                                      const aDate = parseDate(a.stats.customReviewDates[idx]);
                                      const bDate = parseDate(b.stats.customReviewDates[idx]);
                                      return (aDate - bDate) * multiplier;
                                    }
                                    if (topicSortBy === 'time') return (a.stats.minutes - b.stats.minutes) * multiplier;
                                    if (topicSortBy === 'questions') return (a.stats.done - b.stats.done) * multiplier;

                                    return 0;
                                  })
                                  .map(({ topic, stats: tStats }, topicRenderIndex) => {
                                    const topicOrder = topic.order ?? (topicRenderIndex + 1);
                                    const isCompleted = isTopicCompletedHelper(subject.id, topic.id, topic.isCompleted, scheduledStudies, sessions);
                                    return (
                                      <tr
                                        key={topic.id}
                                        className={`group/row hover:bg-zinc-100/80 dark:hover:bg-zinc-700/40 transition-colors border-b border-zinc-50 dark:border-zinc-800/20 last:border-0 ${dragOverTopicId === topic.id && topicSortBy === 'default' ? 'border-t-2 border-blue-400' : ''} ${draggedTopicId === topic.id ? 'opacity-40' : ''}`}
                                        onDragOver={topicSortBy === 'default' ? (e) => handleTopicDragOver(e, topic.id) : undefined}
                                        onDrop={topicSortBy === 'default' ? (e) => handleTopicDrop(e, subject.id, topic.id) : undefined}
                                      >
                                        {/* Order number cell — editable inline */}
                                        <td className="py-1.5 pl-3 pr-1 text-center flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                                          {topicSortBy === 'default' && editingTopicId !== topic.id && (
                                            <div
                                              draggable
                                              onDragStart={(e) => handleTopicDragStart(e, topic.id)}
                                              onDragEnd={handleTopicDragEnd}
                                              className="cursor-grab active:cursor-grabbing shrink-0 flex items-center"
                                              title="Arraste para reordenar"
                                            >
                                              <GripVertical
                                                size={13}
                                                className="text-zinc-300 dark:text-zinc-600 pointer-events-none"
                                              />
                                            </div>
                                          )}
                                          {editingTopicOrderId === topic.id ? (
                                            <input
                                              type="number"
                                              min="1"
                                              value={editTopicOrder}
                                              onChange={e => setEditTopicOrder(parseInt(e.target.value) || 1)}
                                              onBlur={() => updateTopicOrder(subject.id, topic.id, editTopicOrder)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') updateTopicOrder(subject.id, topic.id, editTopicOrder);
                                                if (e.key === 'Escape') setEditingTopicOrderId(null);
                                              }}
                                              className="w-10 text-center px-1 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded text-xs font-bold text-zinc-700 dark:text-zinc-200 outline-none focus:ring-1 focus:ring-zinc-400"
                                              autoFocus
                                            />
                                          ) : (
                                            <span
                                              title="Clique para alterar o número"
                                              onClick={() => { setEditingTopicOrderId(topic.id); setEditTopicOrder(topicOrder); }}
                                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-500 dark:text-zinc-400 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors select-none shrink-0"
                                            >
                                              {topicOrder}
                                            </span>
                                          )}
                                        </td>
                                        <td className={`py-1.5 pl-2 text-xs font-semibold ${isCompleted ? 'text-zinc-300 dark:text-zinc-650 line-through' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                          {editingTopicId === topic.id ? (
                                            <div className="flex items-center gap-2">
                                              <input
                                                className="px-2 py-1 bg-white dark:bg-zinc-900 border rounded text-xs w-full outline-none focus:ring-1 focus:ring-zinc-500 text-zinc-800 dark:text-zinc-100"
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
                                              title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluído'}
                                            >
                                              {topic.title}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-1.5 text-emerald-700/80 dark:text-emerald-350/80 text-xs bg-emerald-50/30 dark:bg-emerald-950/10 px-2.5 font-medium">
                                          {tStats.firstStudyDate || '-'}
                                        </td>
                                        {sortedReviewIndices.map((origIdx) => {
                                          const item = tStats.customReviewDates[origIdx];
                                          const dateVal = typeof item === 'string' ? item : item.dateStr;
                                          const statusVal = typeof item === 'string' ? 'none' : item.status;
                                          let className = "py-1.5 text-xs font-medium ";
                                          if (statusVal === 'realizado') {
                                            className += "text-blue-500 dark:text-blue-400";
                                          } else if (statusVal === 'planejado') {
                                            className += "text-rose-655 dark:text-rose-455 font-bold";
                                          } else {
                                            className += "text-zinc-400";
                                          }
                                          return (
                                            <td key={origIdx} className={className}>
                                              {dateVal || '—'}
                                            </td>
                                          );
                                        })}
                                        <td className="py-1.5 text-red-650/80 dark:text-red-455/80 text-xs bg-red-50/30 dark:bg-red-950/10 px-2.5 font-medium">
                                          {tStats.lastStudyDate || '-'}
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
                                    <td colSpan={8} className="py-4 text-center text-xs text-zinc-400 italic">
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
                  <td colSpan={6} className="py-12 text-center">
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
