
import React, { useState, useRef } from 'react';
import { Subject, Topic } from '../types';
import { geminiService } from '../services/geminiService';
import { COLORS } from '../constants';

interface SubjectsViewProps {
  subjects: Subject[];
  onUpdateSubjects: (subjects: Subject[]) => void;
}

const SubjectsView: React.FC<SubjectsViewProps> = ({ subjects, onUpdateSubjects }) => {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  
  // State for manual topic addition
  const [addingTopicToId, setAddingTopicToId] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicPriority, setNewTopicPriority] = useState<'Baixa' | 'Média' | 'Alta'>('Média');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addSubject = () => {
    if (!newSubjectName.trim()) return;
    const newSub: Subject = {
      id: Date.now().toString(),
      name: newSubjectName,
      color: selectedColor,
      topics: []
    };
    onUpdateSubjects([...subjects, newSub]);
    setNewSubjectName('');
    const currentIndex = COLORS.indexOf(selectedColor);
    setSelectedColor(COLORS[(currentIndex + 1) % COLORS.length]);
  };

  const deleteSubject = (id: string) => {
    if (confirm('Deseja excluir esta disciplina e todos os seus tópicos?')) {
      onUpdateSubjects(subjects.filter(s => s.id !== id));
    }
  };

  const startEditing = (subject: Subject) => {
    setEditingSubjectId(subject.id);
    setEditName(subject.name);
    setEditColor(subject.color);
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    onUpdateSubjects(subjects.map(s => s.id === editingSubjectId ? { ...s, name: editName, color: editColor } : s));
    setEditingSubjectId(null);
  };

  const handleAddTopic = (subjectId: string) => {
    if (!newTopicTitle.trim()) return;
    
    const newTopic: Topic = {
      id: `topic-${Date.now()}`,
      title: newTopicTitle,
      isCompleted: false,
      priority: newTopicPriority
    };

    onUpdateSubjects(subjects.map(s => s.id === subjectId ? {
      ...s,
      topics: [...s.topics, newTopic]
    } : s));

    setNewTopicTitle('');
    // Keep addingTopicToId set to continue adding if needed, or clear it if desired
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
        alert('Não foi possível extrair dados do edital. Tente um arquivo mais claro.');
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
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Disciplinas & Edital</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie seu conteúdo programático e cores.</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf"
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isProcessing ? '⌛ Processando...' : '📄 Importar Edital (PDF)'}
          </button>
          
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nova disciplina..."
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white min-w-[200px]"
              />
              <button onClick={addSubject} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700">Add</button>
            </div>
            <div className="flex gap-1.5 px-1">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-5 h-5 rounded-full ${color} transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 scale-110' : 'opacity-60 hover:opacity-100'}`}
                  title="Selecionar cor"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {isProcessing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-8 rounded-3xl text-center animate-pulse">
          <div className="text-3xl mb-3">🤖</div>
          <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300">A Inteligência Artificial está lendo seu edital...</h3>
          <p className="text-sm text-blue-600 dark:text-blue-400">Isso pode levar alguns segundos dependendo do tamanho do arquivo.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subjects.map(subject => (
          <div key={subject.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm group">
            <div className={`h-2 ${subject.color}`} />
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 mr-2">
                  {editingSubjectId === subject.id ? (
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-blue-400 rounded-lg text-sm font-bold dark:text-white focus:outline-none"
                        autoFocus
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setEditColor(color)}
                            className={`w-4 h-4 rounded-full ${color} transition-all ${editColor === color ? 'ring-2 ring-slate-400 scale-110' : 'opacity-60 hover:opacity-100'}`}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="text-xs font-bold text-emerald-500">Salvar</button>
                        <button onClick={() => setEditingSubjectId(null)} className="text-xs font-bold text-slate-400">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{subject.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => startEditing(subject)} className="text-[10px] font-bold text-slate-400 hover:text-blue-500 uppercase">Editar Cor/Nome</button>
                        <button onClick={() => deleteSubject(subject.id)} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase">Excluir</button>
                      </div>
                    </>
                  )}
                </div>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider shrink-0">{subject.topics.length} tópicos</span>
              </div>
              
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {subject.topics.map(topic => (
                  <div key={topic.id} className="flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group/topic">
                    <input 
                      type="checkbox" 
                      checked={topic.isCompleted} 
                      onChange={() => toggleTopic(subject.id, topic.id)} 
                      className="mt-0.5 w-5 h-5 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 text-blue-600 cursor-pointer transition-all" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${topic.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                        {topic.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${topic.priority === 'Alta' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500' : topic.priority === 'Média' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                        {topic.priority[0]}
                      </span>
                      <button 
                        onClick={() => deleteTopic(subject.id, topic.id)}
                        className="opacity-0 group-hover/topic:opacity-100 text-[10px] text-slate-300 hover:text-rose-500 transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                {subject.topics.length === 0 && (
                  <p className="text-xs text-slate-400 italic py-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    Nenhum tópico cadastrado.
                  </p>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                {addingTopicToId === subject.id ? (
                  <div className="space-y-3 animate-in slide-in-from-top-1">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Nome do assunto..."
                        value={newTopicTitle}
                        onChange={(e) => setNewTopicTitle(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTopic(subject.id)}
                        className="flex-1 text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        autoFocus
                      />
                      <select 
                        value={newTopicPriority}
                        onChange={(e) => setNewTopicPriority(e.target.value as any)}
                        className="text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none px-1 dark:text-white"
                      >
                        <option value="Alta">Alta</option>
                        <option value="Média">Média</option>
                        <option value="Baixa">Baixa</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAddTopic(subject.id)}
                        className="flex-1 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Adicionar
                      </button>
                      <button 
                        onClick={() => setAddingTopicToId(null)}
                        className="px-3 py-1.5 text-slate-400 text-[10px] font-bold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setAddingTopicToId(subject.id)}
                    className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-blue-500 hover:border-blue-500 dark:hover:border-blue-400 text-xs font-bold rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                  >
                    + Adicionar Tópico Manualmente
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {subjects.length === 0 && !isProcessing && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Sua lista de disciplinas está vazia.</p>
            <p className="text-xs text-slate-400">Faça upload de um PDF ou adicione manualmente no topo.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectsView;
