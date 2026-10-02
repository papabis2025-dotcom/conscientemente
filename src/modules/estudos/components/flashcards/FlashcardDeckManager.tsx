import React, { useState } from 'react';
import { FlashcardDeck } from '../../types/flashcards';
import { Subject } from '../../types';
import {
  Folder,
  FolderPlus,
  Edit2,
  Trash2,
  Play,
  Plus,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  BookOpen
} from 'lucide-react';

interface FlashcardDeckManagerProps {
  decks: FlashcardDeck[];
  subjects: Subject[];
  onCreateDeck: (deckData: Partial<FlashcardDeck>) => Promise<void>;
  onUpdateDeck: (id: string, deckData: Partial<FlashcardDeck>) => Promise<void>;
  onDeleteDeck: (id: string) => Promise<void>;
  onStudyDeck: (deckId: string, deckName: string) => void;
}

export const FlashcardDeckManager: React.FC<FlashcardDeckManagerProps> = ({
  decks,
  subjects,
  onCreateDeck,
  onUpdateDeck,
  onDeleteDeck,
  onStudyDeck
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [color, setColor] = useState('#6366f1');

  const handleOpenCreate = (parentDeckId?: string) => {
    setEditingDeck(null);
    setName('');
    setDescription('');
    setParentId(parentDeckId || '');
    setSubjectId('');
    setColor('#6366f1');
    setShowCreateModal(true);
  };

  const handleOpenEdit = (deck: FlashcardDeck) => {
    setEditingDeck(deck);
    setName(deck.name);
    setDescription(deck.description || '');
    setParentId(deck.parent_id || '');
    setSubjectId(deck.subject_id || '');
    setColor(deck.color || '#6366f1');
    setShowCreateModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingDeck) {
      await onUpdateDeck(editingDeck.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        parent_id: parentId || null,
        subject_id: subjectId || null,
        color
      });
    } else {
      await onCreateDeck({
        name: name.trim(),
        description: description.trim() || undefined,
        parent_id: parentId || null,
        subject_id: subjectId || null,
        color
      });
    }
    setShowCreateModal(false);
  };

  // Separar baralhos raízes e sub-baralhos
  const rootDecks = decks.filter(d => !d.parent_id);
  const subDecksMap = new Map<string, FlashcardDeck[]>();
  decks.forEach(d => {
    if (d.parent_id) {
      const list = subDecksMap.get(d.parent_id) || [];
      list.push(d);
      subDecksMap.set(d.parent_id, list);
    }
  });

  return (
    <div className="space-y-6">
      {/* HEADER DE AÇÕES */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            Meus Baralhos <Layers size={20} className="text-indigo-500" />
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Organize seus cartões por temas, disciplinas ou fases de estudo
          </p>
        </div>

        <button
          onClick={() => handleOpenCreate()}
          className="px-5 py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold uppercase text-xs tracking-wider shadow-lg active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
        >
          <FolderPlus size={16} /> Novo Baralho
        </button>
      </div>

      {/* ÁRVORE DE BARALHOS */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-3">
        {decks.length === 0 ? (
          <div className="p-12 text-center">
            <Folder size={40} className="text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
              Nenhum baralho criado ainda.
            </p>
            <p className="text-xs text-zinc-400 mt-1 mb-4">
              Crie o seu primeiro baralho para começar a adicionar flashcards.
            </p>
            <button
              onClick={() => handleOpenCreate()}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs hover:bg-indigo-500 transition-all cursor-pointer"
            >
              Criar Primeiro Baralho
            </button>
          </div>
        ) : (
          rootDecks.map(rootDeck => {
            const subDecks = subDecksMap.get(rootDeck.id) || [];
            return (
              <div key={rootDeck.id} className="space-y-2">
                {/* BARALHO PRINCIPAL (RAIZ) */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: rootDeck.color || '#6366f1' }}
                    >
                      <Folder size={18} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                          {rootDeck.name}
                        </span>
                        {rootDeck.subject_id && (
                          <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                            {subjects.find(s => s.id === rootDeck.subject_id)?.name || 'Disciplina'}
                          </span>
                        )}
                      </div>
                      {rootDeck.description && (
                        <p className="text-xs text-zinc-400 truncate">{rootDeck.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* CONTADORES (FSRS) */}
                    <div className="flex items-center gap-2 text-xs font-mono font-bold hidden sm:flex">
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" title="Novos">
                        {rootDeck.new_count || 0} novos
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" title="Pendentes para Revisão">
                        {rootDeck.due_count || 0} para revisar
                      </span>
                    </div>

                    {/* BOTÃO ESTUDAR */}
                    <button
                      onClick={() => onStudyDeck(rootDeck.id, rootDeck.name)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                      title="Estudar este baralho"
                    >
                      <Play size={13} fill="currentColor" /> Estudar
                    </button>

                    {/* AÇÕES DE BARALHO */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenCreate(rootDeck.id)}
                        className="p-2 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Criar Sub-baralho"
                      >
                        <Plus size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(rootDeck)}
                        className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Editar Baralho"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => onDeleteDeck(rootDeck.id)}
                        className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Excluir Baralho"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* SUB-BARALHOS */}
                {subDecks.length > 0 && (
                  <div className="pl-6 sm:pl-8 space-y-2 border-l-2 border-dashed border-zinc-200 dark:border-zinc-800 ml-4 my-2">
                    {subDecks.map(sub => (
                      <div
                        key={sub.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-between gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: sub.color || '#6366f1' }}
                          >
                            <Folder size={15} />
                          </div>
                          <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 truncate">
                            {sub.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onStudyDeck(sub.id, sub.name)}
                            className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 rounded-lg text-[11px] font-bold uppercase flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Play size={11} fill="currentColor" /> {sub.due_count || 0}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(sub)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => onDeleteDeck(sub.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DE CRIAÇÃO/EDIÇÃO DE BARALHO */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white mb-4">
              {editingDeck ? 'Editar Baralho' : 'Novo Baralho'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Nome do Baralho *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Direito Constitucional - CF/88"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Foco nos artigos 1º ao 17"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Baralho Pai (Hierarquia)
                </label>
                <select
                  value={parentId}
                  onChange={e => setParentId(e.target.value)}
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-900 dark:text-white outline-none"
                >
                  <option value="">Nenhum (Baralho Principal)</option>
                  {rootDecks
                    .filter(d => !editingDeck || d.id !== editingDeck.id)
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Vincular com Disciplina Existente (Opcional)
                </label>
                <select
                  value={subjectId}
                  onChange={e => setSubjectId(e.target.value)}
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-900 dark:text-white outline-none"
                >
                  <option value="">Nenhuma disciplina</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Cor
                </label>
                <div className="flex items-center gap-2">
                  {['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        color === c ? 'scale-125 ring-2 ring-zinc-900 dark:ring-white' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 font-bold uppercase text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-xs rounded-xl shadow-md cursor-pointer"
                >
                  {editingDeck ? 'Atualizar' : 'Criar Baralho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
