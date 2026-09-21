import React, { useState } from 'react';
import { AlertTriangle, Target, Edit2, Trash2, BookOpen, Image as ImageIcon, X, Plus, GraduationCap, Palette } from 'lucide-react';
import { Concurso, Subject, StudySession } from '../types';
import ColorPickerPalette from '../components/ColorPickerPalette';
import { getColorHex } from '../utils/colors';

interface ConcursosViewProps {
  concursos: Concurso[];
  onUpdateConcursos: (concursos: Concurso[]) => Promise<void> | void;
  onSelectConcurso: (concurso: Concurso) => void;
  scheduledStudies: any[];
  sessions: StudySession[];
}

const EDUCATION_LEVEL_OPTIONS = [
  'Ensino Fundamental',
  'Ensino Médio',
  'Ensino Técnico',
  'Ensino Superior',
  'Pós-Graduação',
  'Mestrado / Doutorado'
];

const isTopicCompletedHelper = (subjectId: string, topicId: string, isCompletedFlag: boolean, scheduledStudies: any[], sessions: StudySession[]) => {
  if (isCompletedFlag) {
    return true;
  }
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

const ConcursosView: React.FC<ConcursosViewProps> = ({ concursos, onUpdateConcursos, onSelectConcurso, scheduledStudies, sessions }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newConcName, setNewConcName] = useState('');
  const [banca, setBanca] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  // New Subject State in creation mode
  const [newSubjects, setNewSubjects] = useState<{ name: string; goal: number; weight: number; color?: string }[]>([]);
  const [tempSubName, setTempSubName] = useState('');
  const [tempSubGoal, setTempSubGoal] = useState('');
  const [tempSubWeight, setTempSubWeight] = useState('1');
  const [tempSubColor, setTempSubColor] = useState('#3b82f6');
  const [showTempColorPicker, setShowTempColorPicker] = useState(false);

  // Edit Modal State
  const [editingConcurso, setEditingConcurso] = useState<Concurso | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Concurso>>({});
  const [editSubjects, setEditSubjects] = useState<Subject[]>([]);
  const [editingSubjectIndexForColor, setEditingSubjectIndexForColor] = useState<number | null>(null);
  
  // New subject added while in edit modal
  const [modalNewSubName, setModalNewSubName] = useState('');
  const [modalNewSubGoal, setModalNewSubGoal] = useState('');
  const [modalNewSubWeight, setModalNewSubWeight] = useState('1');
  const [modalNewSubColor, setModalNewSubColor] = useState('#6366f1');
  const [showModalNewColorPicker, setShowModalNewColorPicker] = useState(false);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string | null; name: string }>({
    isOpen: false,
    id: null,
    name: ''
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert('A imagem selecionada é muito grande! Por favor, escolha uma imagem de até 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (isEdit) {
        setEditFormData(prev => ({ ...prev, imageUrl: base64String }));
      } else {
        setNewImageUrl(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddTempSubject = () => {
    if (!tempSubName.trim()) return;
    setNewSubjects([
      ...newSubjects,
      {
        name: tempSubName.trim(),
        goal: parseInt(tempSubGoal) || 0,
        weight: parseFloat(tempSubWeight) || 1,
        color: tempSubColor
      }
    ]);
    setTempSubName('');
    setTempSubGoal('');
    setTempSubWeight('1');
    setShowTempColorPicker(false);
  };

  const removeTempSubject = (idx: number) => {
    setNewSubjects(newSubjects.filter((_, i) => i !== idx));
  };

  const addConcurso = async () => {
    if (!newConcName.trim() || !banca.trim()) {
      alert('Preencha o nome e a banca do concurso.');
      return;
    }
    if (isSaving) return;

    setIsSaving(true);
    try {
      const defaultColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4'];

      const subjectsList: Subject[] = newSubjects.map((s, i) => ({
        id: crypto.randomUUID(),
        name: s.name,
        color: s.color || defaultColors[i % defaultColors.length],
        questionsGoal: s.goal > 0 ? s.goal : undefined,
        weight: s.weight || 1,
        topics: []
      }));

      const newConc: Concurso = {
        id: crypto.randomUUID(),
        name: newConcName.trim(),
        banca: banca.trim(),
        educationLevel: educationLevel.trim() || undefined,
        startDate: new Date(`${startDate}T12:00:00`).toISOString(),
        subjects: subjectsList,
        targetDate: targetDate ? new Date(`${targetDate}T12:00:00`).toISOString() : undefined,
        imageUrl: newImageUrl.trim() || undefined
      };

      await onUpdateConcursos([...concursos, newConc]);
      setNewConcName('');
      setBanca('');
      setEducationLevel('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setTargetDate('');
      setIsAdding(false);
      setNewImageUrl('');
      setNewSubjects([]);
    } catch (err) {
      console.error('Erro ao adicionar concurso:', err);
      alert('Ocorreu um erro ao salvar o novo concurso na nuvem. Verifique sua conexão.');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (conc: Concurso) => {
    setEditingConcurso(conc);
    setEditFormData({
      name: conc.name,
      banca: conc.banca,
      educationLevel: conc.educationLevel || '',
      startDate: conc.startDate.split('T')[0],
      targetDate: conc.targetDate ? conc.targetDate.split('T')[0] : '',
      imageUrl: conc.imageUrl || ''
    });
    setEditSubjects(JSON.parse(JSON.stringify(conc.subjects || [])));
    setModalNewSubName('');
    setModalNewSubGoal('');
    setModalNewSubWeight('1');
    setModalNewSubColor('#6366f1');
    setEditingSubjectIndexForColor(null);
  };

  const closeEditModal = () => {
    setEditingConcurso(null);
    setEditFormData({});
    setEditSubjects([]);
    setEditingSubjectIndexForColor(null);
  };

  const handleUpdateEditSubject = (index: number, field: keyof Subject, value: any) => {
    setEditSubjects(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const handleRemoveEditSubject = (index: number) => {
    const subToRemove = editSubjects[index];
    const hasTopics = (subToRemove.topics || []).length > 0;
    if (hasTopics) {
      if (!confirm(`A disciplina "${subToRemove.name}" possui tópicos cadastrados. Tem certeza que deseja removê-la?`)) {
        return;
      }
    }
    setEditSubjects(prev => prev.filter((_, i) => i !== index));
    if (editingSubjectIndexForColor === index) {
      setEditingSubjectIndexForColor(null);
    }
  };

  const handleAddModalSubject = () => {
    if (!modalNewSubName.trim()) return;
    const newSub: Subject = {
      id: crypto.randomUUID(),
      name: modalNewSubName.trim(),
      color: modalNewSubColor || '#6366f1',
      questionsGoal: parseInt(modalNewSubGoal) > 0 ? parseInt(modalNewSubGoal) : undefined,
      weight: parseFloat(modalNewSubWeight) || 1,
      topics: []
    };
    setEditSubjects(prev => [...prev, newSub]);
    setModalNewSubName('');
    setModalNewSubGoal('');
    setModalNewSubWeight('1');
    setShowModalNewColorPicker(false);
  };

  const saveEditConcurso = async () => {
    if (!editingConcurso || isSaving) return;
    if (!editFormData.name?.trim() || !editFormData.banca?.trim()) {
      alert('O nome e a banca do concurso são obrigatórios.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedConcursos = concursos.map(c => {
        if (c.id === editingConcurso.id) {
          return {
            ...c,
            name: editFormData.name!.trim(),
            banca: editFormData.banca!.trim(),
            educationLevel: editFormData.educationLevel?.trim() || undefined,
            startDate: editFormData.startDate ? new Date(`${editFormData.startDate}T12:00:00`).toISOString() : c.startDate,
            targetDate: editFormData.targetDate ? new Date(`${editFormData.targetDate}T12:00:00`).toISOString() : undefined,
            imageUrl: editFormData.imageUrl !== undefined ? editFormData.imageUrl : c.imageUrl,
            subjects: editSubjects
          };
        }
        return c;
      });

      await onUpdateConcursos(updatedConcursos);
      closeEditModal();
    } catch (err) {
      console.error('Erro ao salvar edições do concurso:', err);
      alert('Ocorreu um erro ao salvar as alterações na nuvem. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateDaysSince = (dateStr: string) => {
    const start = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black text-zinc-800 dark:text-white uppercase tracking-tight">Meus Cursos e Editais</h2>
          <p className="text-xs text-zinc-400 font-bold mt-0.5">Gerencie editais, escolaridade exigida, disciplinas, metas de questões e pesos.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-zinc-900 dark:bg-zinc-700 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 dark:hover:bg-zinc-600 transition-all shadow-lg shadow-zinc-900/10 dark:shadow-zinc-900/50 active:scale-95"
        >
          + Novo Concurso
        </button>
      </header>

      {/* MODAL / FORMULÁRIO DE NOVO CONCURSO */}
      {isAdding && (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border-2 border-zinc-800 dark:border-zinc-600 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-xl font-black text-zinc-800 dark:text-white mb-6 uppercase tracking-tight">Novo Projeto de Aprovação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="lg:col-span-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Nome do Concurso</label>
              <input type="text" placeholder="Ex: Polícia Federal - Agente" value={newConcName} onChange={(e) => setNewConcName(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Banca Organizadora</label>
              <input type="text" placeholder="Ex: CEBRASPE, FGV..." value={banca} onChange={(e) => setBanca(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1">
                <GraduationCap size={12} /> Escolaridade Exigida
              </label>
              <input
                list="education-levels-list"
                type="text"
                placeholder="Ex: Ensino Superior"
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white text-xs font-bold"
              />
              <datalist id="education-levels-list">
                {EDUCATION_LEVEL_OPTIONS.map(opt => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Data Início</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-2 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Data Prova</label>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full px-2 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white text-xs" />
              </div>
            </div>

            <div className="lg:col-span-5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5"><ImageIcon size={12} /> Imagem de Perfil do Concurso (Upload local)</label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-2 border-dashed border-zinc-200 dark:border-zinc-700 px-5 py-3 rounded-2xl flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 font-bold transition-all hover:border-zinc-400">
                  <ImageIcon size={16} />
                  <span>Escolher Imagem (Máx 1MB)</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, false)} />
                </label>
                {newImageUrl && (
                  <div className="relative">
                    <img src={newImageUrl} alt="preview" className="w-12 h-12 rounded-full object-cover border-2 border-zinc-800 dark:border-zinc-600" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    <button
                      type="button"
                      onClick={() => setNewImageUrl('')}
                      className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 hover:bg-rose-600 shadow transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Adição inicial de disciplinas */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 mb-8">
            <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-4">Disciplinas & Metas Iniciais</h4>
            <div className="flex flex-col md:flex-row gap-3 mb-4 items-center">
              <input
                type="text"
                placeholder="Nome da Disciplina (Ex: Direito Constitucional)"
                value={tempSubName}
                onChange={e => setTempSubName(e.target.value)}
                className="flex-1 w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-800 dark:text-white"
                onKeyPress={e => e.key === 'Enter' && handleAddTempSubject()}
              />
              <input
                type="number"
                placeholder="Meta de Questões"
                value={tempSubGoal}
                onChange={e => setTempSubGoal(e.target.value)}
                className="w-full md:w-36 px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-800 dark:text-white"
                onKeyPress={e => e.key === 'Enter' && handleAddTempSubject()}
              />
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-zinc-400">Peso</span>
                <input
                  type="number"
                  value={tempSubWeight}
                  onChange={e => setTempSubWeight(e.target.value)}
                  className="w-12 bg-transparent outline-none font-bold text-center text-sm text-zinc-800 dark:text-white"
                  step="0.5"
                  min="0.1"
                  onKeyPress={e => e.key === 'Enter' && handleAddTempSubject()}
                />
              </div>

              {/* Seletor rápido de cor */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTempColorPicker(!showTempColorPicker)}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold"
                  title="Escolher cor"
                >
                  <div className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: getColorHex(tempSubColor) }} />
                  <Palette size={14} className="text-zinc-500" />
                </button>
                {showTempColorPicker && (
                  <div className="absolute right-0 top-12 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-4 w-72 animate-in zoom-in-95">
                    <ColorPickerPalette
                      selectedColor={tempSubColor}
                      onSelectColor={(hex) => {
                        setTempSubColor(hex);
                        setShowTempColorPicker(false);
                      }}
                      title="Cor da Disciplina"
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleAddTempSubject}
                className="bg-zinc-800 dark:bg-white text-white dark:text-zinc-900 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-90 transition-all"
              >
                + Incluir
              </button>
            </div>

            {newSubjects.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newSubjects.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getColorHex(s.color || '#3b82f6') }} />
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{s.name}</span>
                    {s.goal > 0 && <span className="text-[10px] bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-1.5 py-0.5 rounded font-black">{s.goal} Qs</span>}
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-black">{s.weight}x</span>
                    <button type="button" onClick={() => removeTempSubject(i)} className="text-zinc-400 hover:text-rose-500 font-bold ml-1 text-sm">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setIsAdding(false)} disabled={isSaving} className="px-6 py-3 text-zinc-400 font-black uppercase text-xs tracking-widest hover:text-rose-500 transition-colors disabled:opacity-50">Cancelar</button>
            <button onClick={addConcurso} disabled={isSaving} className="bg-zinc-900 dark:bg-zinc-700 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-600 shadow-lg shadow-zinc-900/10 dark:shadow-zinc-900/50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">{isSaving ? 'Salvando na Nuvem...' : 'Criar Edital'}</button>
          </div>
        </div>
      )}

      {/* GRID DE CONCURSOS CADASTRADOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {concursos.map(conc => {
          const completedCount = conc.subjects.reduce((acc, s) => {
            return acc + s.topics.filter(t => isTopicCompletedHelper(s.id, t.id, t.isCompleted, scheduledStudies, sessions)).length;
          }, 0);
          const totalCount = conc.subjects.reduce((acc, s) => acc + s.topics.length, 0);
          const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          const daysActive = calculateDaysSince(conc.startDate);

          return (
            <div key={conc.id} className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm hover:border-blue-400 dark:hover:border-zinc-700 hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between h-[230px]">
              <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => openEditModal(conc)}
                  className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors p-1.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  title="Editar Concurso e Disciplinas (Peso e Metas)"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => setDeleteConfirmation({ isOpen: true, id: conc.id, name: conc.name })}
                  className="text-zinc-400 hover:text-rose-500 transition-colors p-1.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Excluir Concurso"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="flex items-start gap-3">
                {conc.imageUrl ? (
                  <img src={conc.imageUrl} alt="Perfil" className="w-14 h-14 rounded-full object-cover border-2 border-zinc-800 dark:border-zinc-650 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300" onError={(e) => (e.currentTarget.style.display = 'none')} />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border-2 border-zinc-200 dark:border-zinc-700 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <BookOpen size={22} className="text-zinc-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1 pr-14">
                  <div className="flex flex-wrap gap-1 mb-1">
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-zinc-900 dark:bg-zinc-700 text-white tracking-wider">
                      {conc.banca}
                    </span>
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 tracking-wider">
                      {daysActive}d
                    </span>
                    {conc.educationLevel && (
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 flex items-center gap-0.5 tracking-wider" title={`Escolaridade: ${conc.educationLevel}`}>
                        <GraduationCap size={9} /> {conc.educationLevel}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-zinc-800 dark:text-white leading-tight line-clamp-2" title={conc.name}>{conc.name}</h3>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                  <span>Progresso do Edital</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-bold">{progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden shadow-inner border border-zinc-200/20 dark:border-zinc-800/50">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 dark:from-violet-400 dark:to-indigo-400 rounded-full transition-all duration-1000 shadow-sm"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 dark:text-zinc-400 px-1">
                <span>{conc.subjects.length} disciplinas</span>
                <span>Início: {new Date(conc.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
              </div>

              <button
                onClick={() => onSelectConcurso(conc)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-950 dark:hover:bg-zinc-100 hover:text-white dark:hover:text-zinc-950 text-zinc-700 dark:text-zinc-300 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-zinc-200 dark:border-zinc-700 active:scale-[0.98] shadow-xs"
              >
                Focar neste concurso →
              </button>
            </div>
          );
        })}

        {concursos.length === 0 && !isAdding && (
          <div className="col-span-full py-32 text-center bg-white dark:bg-zinc-900 rounded-[3rem] border border-dashed border-zinc-200 dark:border-zinc-800">
            <BookOpen size={48} className="text-zinc-400 mx-auto mb-6 block" />
            <h3 className="text-xl font-black text-zinc-400 uppercase tracking-tighter">Nenhum edital cadastrado</h3>
            <p className="text-zinc-400 text-sm mt-2 mb-8">Comece adicionando o edital que você está estudando.</p>
            <button
              onClick={() => setIsAdding(true)}
              className="bg-zinc-900 dark:bg-zinc-700 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 dark:hover:bg-zinc-600"
            >
              + Adicionar Meu Primeiro Edital
            </button>
          </div>
        )}
      </div>

      {/* MODAL COMPLETO DE EDIÇÃO DO CURSO E DISCIPLINAS (PESO, META, CORES) */}
      {editingConcurso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden my-6 animate-in zoom-in-95">
            <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-zinc-800 dark:text-white uppercase tracking-tight">Editar Concurso & Disciplinas</h3>
                <p className="text-xs text-zinc-400 font-bold mt-1">Ajuste as informações do curso e edite peso, meta de questões e cores das disciplinas.</p>
              </div>
              <button
                onClick={closeEditModal}
                className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Informações Gerais do Concurso */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">Nome do Concurso</label>
                  <input
                    type="text"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">Banca</label>
                  <input
                    type="text"
                    value={editFormData.banca || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, banca: e.target.value })}
                    className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 block flex items-center gap-1">
                    <GraduationCap size={11} /> Escolaridade
                  </label>
                  <input
                    list="edit-education-levels-list"
                    type="text"
                    value={editFormData.educationLevel || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, educationLevel: e.target.value })}
                    className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-zinc-400"
                    placeholder="Ex: Ensino Superior"
                  />
                  <datalist id="edit-education-levels-list">
                    {EDUCATION_LEVEL_OPTIONS.map(opt => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">Data de Início</label>
                  <input
                    type="date"
                    value={editFormData.startDate || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">Data da Prova</label>
                  <input
                    type="date"
                    value={editFormData.targetDate || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, targetDate: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-3 pt-4">
                  <label className="cursor-pointer bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-200 font-bold transition-all">
                    <ImageIcon size={14} />
                    <span>Alterar Imagem</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, true)} />
                  </label>
                  {editFormData.imageUrl && (
                    <div className="relative">
                      <img src={editFormData.imageUrl} alt="preview" className="w-9 h-9 rounded-full object-cover border-2 border-zinc-400 dark:border-zinc-600" onError={(e) => (e.currentTarget.style.display = 'none')} />
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, imageUrl: '' })}
                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 hover:bg-rose-600 transition-colors"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção Exclusiva: Gerenciamento de Disciplinas, Pesos e Quantidade de Questões */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                      Disciplinas do Curso ({editSubjects.length})
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-bold mt-0.5">Altere o nome, cor padronizada, peso e meta de questões diretamente na tabela abaixo.</p>
                  </div>
                </div>

                {/* Lista de Disciplinas Existentes */}
                <div className="space-y-2 mb-4">
                  {editSubjects.map((sub, idx) => (
                    <div key={sub.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 flex flex-col md:flex-row items-start md:items-center gap-3">
                      {/* Cor da Disciplina */}
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingSubjectIndexForColor(editingSubjectIndexForColor === idx ? null : idx)}
                          className="w-7 h-7 rounded-xl border-2 border-white dark:border-zinc-700 shadow-xs flex items-center justify-center transition-transform hover:scale-110"
                          style={{ backgroundColor: getColorHex(sub.color) }}
                          title="Alterar cor da disciplina"
                        >
                          <Palette size={11} className="text-white drop-shadow-sm opacity-80" />
                        </button>
                        {editingSubjectIndexForColor === idx && (
                          <div className="absolute left-0 top-9 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-4 w-72 animate-in zoom-in-95">
                            <ColorPickerPalette
                              selectedColor={sub.color}
                              onSelectColor={(newColor) => {
                                handleUpdateEditSubject(idx, 'color', newColor);
                                setEditingSubjectIndexForColor(null);
                              }}
                              title={`Cor: ${sub.name}`}
                            />
                          </div>
                        )}
                      </div>

                      {/* Nome da Disciplina */}
                      <div className="flex-1 min-w-[140px] w-full">
                        <input
                          type="text"
                          value={sub.name}
                          onChange={(e) => handleUpdateEditSubject(idx, 'name', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-zinc-400"
                          placeholder="Nome da disciplina"
                        />
                      </div>

                      {/* Quantidade / Meta de Questões */}
                      <div className="flex items-center gap-1.5 w-full md:w-auto">
                        <span className="text-[9px] font-black uppercase text-zinc-400 shrink-0">Questões:</span>
                        <input
                          type="number"
                          value={sub.questionsGoal !== undefined ? sub.questionsGoal : ''}
                          onChange={(e) => handleUpdateEditSubject(idx, 'questionsGoal', e.target.value ? parseInt(e.target.value) : undefined)}
                          className="w-20 px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-white text-center outline-none focus:ring-2 focus:ring-zinc-400"
                          placeholder="Ex: 100"
                          min="0"
                        />
                      </div>

                      {/* Peso da Disciplina */}
                      <div className="flex items-center gap-1.5 w-full md:w-auto">
                        <span className="text-[9px] font-black uppercase text-zinc-400 shrink-0">Peso:</span>
                        <input
                          type="number"
                          value={sub.weight !== undefined ? sub.weight : 1}
                          onChange={(e) => handleUpdateEditSubject(idx, 'weight', e.target.value ? parseFloat(e.target.value) : 1)}
                          className="w-16 px-2 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-white text-center outline-none focus:ring-2 focus:ring-zinc-400"
                          step="0.5"
                          min="0.1"
                        />
                      </div>

                      {/* Botão de Exclusão da Disciplina */}
                      <button
                        type="button"
                        onClick={() => handleRemoveEditSubject(idx)}
                        className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors shrink-0"
                        title="Remover disciplina do concurso"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {editSubjects.length === 0 && (
                    <div className="p-6 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-400 font-bold">
                      Nenhuma disciplina cadastrada para este concurso. Adicione uma abaixo!
                    </div>
                  )}
                </div>

                {/* Adicionar Nova Disciplina no Modal */}
                <div className="p-4 bg-zinc-100/60 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60">
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block mb-2">+ Adicionar Nova Disciplina ao Curso</span>
                  <div className="flex flex-col md:flex-row gap-2.5 items-center">
                    <input
                      type="text"
                      placeholder="Nome da disciplina (Ex: Raciocínio Lógico)"
                      value={modalNewSubName}
                      onChange={(e) => setModalNewSubName(e.target.value)}
                      className="flex-1 w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-white outline-none"
                      onKeyPress={e => e.key === 'Enter' && handleAddModalSubject()}
                    />
                    <input
                      type="number"
                      placeholder="Meta Questões"
                      value={modalNewSubGoal}
                      onChange={(e) => setModalNewSubGoal(e.target.value)}
                      className="w-full md:w-32 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-white outline-none"
                      onKeyPress={e => e.key === 'Enter' && handleAddModalSubject()}
                    />
                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-xl">
                      <span className="text-[9px] font-black uppercase text-zinc-400">Peso</span>
                      <input
                        type="number"
                        value={modalNewSubWeight}
                        onChange={(e) => setModalNewSubWeight(e.target.value)}
                        className="w-12 bg-transparent text-center font-bold text-xs text-zinc-800 dark:text-white outline-none"
                        step="0.5"
                        min="0.1"
                        onKeyPress={e => e.key === 'Enter' && handleAddModalSubject()}
                      />
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowModalNewColorPicker(!showModalNewColorPicker)}
                        className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center gap-1.5 text-xs font-bold"
                        title="Cor da nova disciplina"
                      >
                        <div className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: getColorHex(modalNewSubColor) }} />
                        <Palette size={13} className="text-zinc-400" />
                      </button>
                      {showModalNewColorPicker && (
                        <div className="absolute right-0 bottom-12 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-4 w-72 animate-in zoom-in-95">
                          <ColorPickerPalette
                            selectedColor={modalNewSubColor}
                            onSelectColor={(hex) => {
                              setModalNewSubColor(hex);
                              setShowModalNewColorPicker(false);
                            }}
                            title="Cor da Disciplina"
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddModalSubject}
                      className="w-full md:w-auto px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all"
                    >
                      Inserir
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-800/20">
              <button
                onClick={closeEditModal}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-white font-black uppercase text-xs tracking-wider transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveEditConcurso}
                disabled={isSaving}
                className="px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs tracking-wider transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? 'Salvando na Nuvem...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 p-6 border border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-zinc-800 dark:text-white mb-2">Excluir Edital?</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Tem certeza que deseja excluir <strong>{deleteConfirmation.name}</strong>? <br />
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-xs uppercase disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (deleteConfirmation.id && !isSaving) {
                      setIsSaving(true);
                      try {
                        await onUpdateConcursos(concursos.filter(c => c.id !== deleteConfirmation.id));
                        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
                      } catch (err) {
                        console.error('Erro ao excluir concurso:', err);
                        alert('Ocorreu um erro ao excluir o concurso na nuvem.');
                      } finally {
                        setIsSaving(false);
                      }
                    }
                  }}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white transition-all text-xs uppercase shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConcursosView;
