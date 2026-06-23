
import React, { useState } from 'react';
import { AlertTriangle, Target, Edit2, Trash2, BookOpen, Image as ImageIcon, X } from 'lucide-react';
import { Concurso } from '../types';

interface ConcursosViewProps {
  concursos: Concurso[];
  onUpdateConcursos: (concursos: Concurso[]) => void;
  onSelectConcurso: (concurso: Concurso) => void;
  scheduledStudies: any[];
}

const isTopicCompletedHelper = (subjectId: string, topicId: string, isCompletedFlag: boolean, scheduledStudies: any[]) => {
  const reviews = (scheduledStudies || []).filter(sched =>
    sched.subjectId === subjectId &&
    sched.topicId === topicId &&
    sched.activityType === 'Revisão'
  );
  if (reviews.length === 0) {
    return isCompletedFlag;
  }
  return reviews.every(r => r.status === 'realizado');
};

const ConcursosView: React.FC<ConcursosViewProps> = ({ concursos, onUpdateConcursos, onSelectConcurso, scheduledStudies }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newConcName, setNewConcName] = useState('');
  const [banca, setBanca] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  // New Subject State
  const [newSubjects, setNewSubjects] = useState<{ name: string, goal: number, weight: number }[]>([]);
  const [tempSubName, setTempSubName] = useState('');
  const [tempSubGoal, setTempSubGoal] = useState('');
  const [tempSubWeight, setTempSubWeight] = useState('1');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Concurso>>({});

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string | null; name: string }>({
    isOpen: false,
    id: null,
    name: ''
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("A imagem selecionada é muito grande! Por favor, escolha uma imagem de até 1MB.");
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
    setNewSubjects([...newSubjects, { name: tempSubName, goal: parseInt(tempSubGoal) || 0, weight: parseFloat(tempSubWeight) || 1 }]);
    setTempSubName('');
    setTempSubGoal('');
    setTempSubWeight('1');
  };

  const removeTempSubject = (idx: number) => {
    setNewSubjects(newSubjects.filter((_, i) => i !== idx));
  };

  const addConcurso = () => {
    if (!newConcName.trim() || !banca.trim()) {
      alert("Preencha o nome e a banca do concurso.");
      return;
    }

    const subjectsList = newSubjects.map((s, i) => ({
      id: crypto.randomUUID(),
      name: s.name,
      color: ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'][i % 6],
      questionsGoal: s.goal,
      weight: s.weight,
      topics: []
    }));

    const newConc: Concurso = {
      id: crypto.randomUUID(),
      name: newConcName,
      banca: banca,
      startDate: new Date(`${startDate}T12:00:00`).toISOString(),
      subjects: subjectsList,
      targetDate: targetDate ? new Date(`${targetDate}T12:00:00`).toISOString() : undefined,
      imageUrl: newImageUrl.trim() || undefined
    };
    onUpdateConcursos([...concursos, newConc]);
    setNewConcName(''); setBanca(''); setStartDate(new Date().toISOString().split('T')[0]); setTargetDate(''); setIsAdding(false); setNewImageUrl('');
    setNewSubjects([]);
  };

  const startEditing = (conc: Concurso) => {
    setEditingId(conc.id);
    setEditFormData({
      name: conc.name,
      banca: conc.banca,
      startDate: conc.startDate.split('T')[0], // Extract YYYY-MM-DD
      targetDate: conc.targetDate ? conc.targetDate.split('T')[0] : '',
      imageUrl: conc.imageUrl || ''
    });
  };

  const saveEdit = () => {
    if (!editingId) return;

    onUpdateConcursos(concursos.map(c => {
      if (c.id === editingId) {
        return {
          ...c,
          name: editFormData.name || c.name,
          banca: editFormData.banca || c.banca,
          startDate: editFormData.startDate ? new Date(`${editFormData.startDate}T12:00:00`).toISOString() : c.startDate,
          targetDate: editFormData.targetDate ? new Date(`${editFormData.targetDate}T12:00:00`).toISOString() : undefined,
          imageUrl: (editFormData.imageUrl !== undefined ? editFormData.imageUrl : c.imageUrl) || undefined
        };
      }
      return c;
    }));
    setEditingId(null);
    setEditFormData({});
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
          <h2 className="text-2xl font-black text-zinc-800 dark:text-white tracking-tight uppercase">
            Meus Editais
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Gerencie suas metas e prazos estratégicos.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-zinc-900 dark:bg-zinc-700 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 dark:hover:bg-zinc-600 transition-all shadow-lg shadow-zinc-900/10 dark:shadow-zinc-900/50 active:scale-95"
        >
          + Novo Concurso
        </button>
      </header>

      {isAdding && (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border-2 border-zinc-800 dark:border-zinc-600 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-xl font-black text-zinc-800 dark:text-white mb-6 uppercase tracking-tight">Novo Projeto de Aprovação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Nome do Concurso</label>
              <input type="text" placeholder="Ex: Receita Federal" value={newConcName} onChange={(e) => setNewConcName(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Banca Organizadora</label>
              <input type="text" placeholder="Ex: FGV, CESPE..." value={banca} onChange={(e) => setBanca(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Data de Início</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Data da Prova (Alvo)</label>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
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

          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 mb-8">
            <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-4">Disciplinas & Metas</h4>
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <input
                type="text"
                placeholder="Nome da Disciplina (Ex: Direito Constitucional)"
                value={tempSubName}
                onChange={e => setTempSubName(e.target.value)}
                className="flex-1 px-4 py-2 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl"
                onKeyPress={e => e.key === 'Enter' && handleAddTempSubject()}
              />
              <input
                type="number"
                placeholder="Meta de Questões"
                value={tempSubGoal}
                onChange={e => setTempSubGoal(e.target.value)}
                className="w-40 px-4 py-2 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl"
                onKeyPress={e => e.key === 'Enter' && handleAddTempSubject()}
              />
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-zinc-400">Peso</span>
                <input
                  type="number"
                  value={tempSubWeight}
                  onChange={e => setTempSubWeight(e.target.value)}
                  className="w-12 bg-transparent outline-none font-bold text-center text-sm"
                  step="0.5"
                  min="1"
                  onKeyPress={e => e.key === 'Enter' && handleAddTempSubject()}
                />
              </div>
              <button onClick={handleAddTempSubject} className="bg-zinc-800 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-xl font-bold hover:opacity-90">Adicionar</button>
            </div>

            {newSubjects.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newSubjects.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{s.name}</span>
                    {s.goal > 0 && <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-1.5 rounded font-black">{s.goal} Qs</span>}
                    {s.weight > 1 && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 rounded font-black">{s.weight}x</span>}
                    <button onClick={() => removeTempSubject(i)} className="text-zinc-400 hover:text-rose-500 ml-1">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 text-zinc-400 font-black uppercase text-xs tracking-widest hover:text-rose-500 transition-colors">Cancelar</button>
            <button onClick={addConcurso} className="bg-zinc-900 dark:bg-zinc-700 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-600 shadow-lg shadow-zinc-900/10 dark:shadow-zinc-900/50 active:scale-95 transition-all">Criar Edital</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {concursos.map(conc => {
          const completedCount = conc.subjects.reduce((acc, s) => {
            return acc + s.topics.filter(t => isTopicCompletedHelper(s.id, t.id, t.isCompleted, scheduledStudies)).length;
          }, 0);
          const totalCount = conc.subjects.reduce((acc, s) => acc + s.topics.length, 0);
          const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          const daysActive = calculateDaysSince(conc.startDate);

          const isEditing = editingId === conc.id;

          return (
            <div key={conc.id} className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm hover:border-blue-400 dark:hover:border-zinc-700 hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between h-[210px]">
              {isEditing ? (
                <div className="space-y-2 h-full flex flex-col justify-between">
                  <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="w-full px-2 py-1 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 dark:text-white" placeholder="Nome" />
                  <input type="text" value={editFormData.banca} onChange={(e) => setEditFormData({ ...editFormData, banca: e.target.value })} className="w-full px-2 py-1 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 dark:text-white" placeholder="Banca" />
                  <div className="grid grid-cols-2 gap-1">
                    <input type="date" value={editFormData.startDate} onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })} className="w-full p-1 rounded-lg text-[10px] font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 dark:text-white" />
                    <input type="date" value={editFormData.targetDate} onChange={(e) => setEditFormData({ ...editFormData, targetDate: e.target.value })} className="w-full p-1 rounded-lg text-[10px] font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 dark:text-white" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="cursor-pointer bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] text-zinc-650 dark:text-zinc-300 font-bold transition-colors">
                      <ImageIcon size={10} />
                      <span>Upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, true)} />
                    </label>
                    {editFormData.imageUrl && (
                      <img src={editFormData.imageUrl} alt="preview" className="w-6 h-6 rounded-full object-cover border border-zinc-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(null)} className="text-[10px] text-zinc-400 font-bold hover:text-zinc-600">Cancelar</button>
                      <button onClick={saveEdit} className="text-[10px] bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-bold">Salvar</button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditing(conc)}
                      className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors p-1"
                      title="Editar Concurso"
                    ><Edit2 size={12} /></button>
                    <button
                      onClick={() => setDeleteConfirmation({ isOpen: true, id: conc.id, name: conc.name })}
                      className="text-zinc-400 hover:text-rose-500 transition-colors p-1"
                      title="Excluir Concurso"
                    ><Trash2 size={12} /></button>
                  </div>

                  <div className="flex items-start gap-3">
                    {conc.imageUrl ? (
                      <img src={conc.imageUrl} alt="Perfil" className="w-14 h-14 rounded-full object-cover border-2 border-zinc-800 dark:border-zinc-650 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border-2 border-zinc-200 dark:border-zinc-700 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <BookOpen size={22} className="text-zinc-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-1 mb-1">
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-zinc-900 dark:bg-zinc-700 text-white tracking-wider">
                          Banca: {conc.banca}
                        </span>
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 tracking-wider">
                          {daysActive}d
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-zinc-800 dark:text-white leading-tight line-clamp-2" title={conc.name}>{conc.name}</h3>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-black uppercase text-zinc-400 tracking-wider">
                      <span>Progresso do Edital</span>
                      <span className="text-zinc-950 dark:text-zinc-50">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-900 dark:bg-zinc-700 rounded-full transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 dark:text-zinc-450 px-1">
                    <span>{conc.subjects.length} disciplinas</span>
                    <span>Início: {new Date(conc.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                  </div>

                  <button
                    onClick={() => onSelectConcurso(conc)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-950 dark:hover:bg-zinc-100 hover:text-white dark:hover:text-zinc-950 text-zinc-700 dark:text-zinc-350 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-zinc-200 dark:border-zinc-750 active:scale-[0.98] shadow-xs"
                  >
                    Focar neste concurso →
                  </button>
                </>
              )}
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
                  className="flex-1 py-3 rounded-xl font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirmation.id) {
                      onUpdateConcursos(concursos.filter(c => c.id !== deleteConfirmation.id));
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
      )}
    </div>
  );
};

export default ConcursosView;
