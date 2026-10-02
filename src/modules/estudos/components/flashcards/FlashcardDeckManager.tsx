import React, { useState } from 'react';
import { FlashcardDeck } from '../../types/flashcards';
import { Subject } from '../../types';
import { ColorPickerPalette } from '../ColorPickerPalette';
import { getColorHex } from '../../utils/colors';

interface FlashcardDeckManagerProps {
  decks: FlashcardDeck[];
  subjects: Subject[];
  reviewedToday?: number;
  studyTimeSecondsToday?: number;
  onCreateDeck: (deckData: Partial<FlashcardDeck>) => Promise<void>;
  onUpdateDeck: (id: string, deckData: Partial<FlashcardDeck>) => Promise<void>;
  onDeleteDeck: (id: string) => Promise<void>;
  onStudyDeck: (deckId: string, deckName: string) => void;
  onOpenSettings?: () => void;
  onStartGeneralReview?: () => void;
  totalDueCount?: number;
}

export const FlashcardDeckManager: React.FC<FlashcardDeckManagerProps> = ({
  decks,
  subjects,
  reviewedToday = 0,
  studyTimeSecondsToday = 0,
  onCreateDeck,
  onUpdateDeck,
  onDeleteDeck,
  onStudyDeck,
  onOpenSettings,
  onStartGeneralReview,
  totalDueCount = 0
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [color, setColor] = useState('#3b82f6');
  const [activeMenuDeckId, setActiveMenuDeckId] = useState<string | null>(null);

  const handleOpenCreate = (parentDeckId?: string) => {
    setEditingDeck(null);
    setName('');
    setDescription('');
    setParentId(parentDeckId || '');
    setSubjectId('');
    setColor('#3b82f6');
    setActiveMenuDeckId(null);
    setShowModal(true);
  };

  const handleOpenEdit = (deck: FlashcardDeck) => {
    setEditingDeck(deck);
    setName(deck.name);
    setDescription(deck.description || '');
    setParentId(deck.parent_id || '');
    setSubjectId(deck.subject_id || '');
    setColor(deck.color || '#3b82f6');
    setActiveMenuDeckId(null);
    setShowModal(true);
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
    setShowModal(false);
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

  // Estatística no formato Anki: "Estudado(s) X cartão em Y segundo(s) hoje (Zs/card)"
  const sPerCard = reviewedToday > 0 ? (studyTimeSecondsToday / reviewedToday).toFixed(1) : '0';
  const timeUnit = studyTimeSecondsToday === 1 ? 'segundo' : 'segundos';
  const cardUnit = reviewedToday === 1 ? 'cartão' : 'cartões';
  const ankiSummaryText = `Estudado(s) ${reviewedToday} ${cardUnit} em ${studyTimeSecondsToday} ${timeUnit} hoje (${sPerCard}s/card)`;

  const renderDeckRow = (deck: FlashcardDeck, level: number = 0) => {
    const subDecks = subDecksMap.get(deck.id) || [];
    const newCount = deck.new_count ?? 0;
    const learningCount = deck.learning_count ?? 0;
    const reviewCount = deck.due_count ?? 0;

    // Cor definida pelo usuário (com fallback para a disciplina)
    const linkedSubject = subjects.find(s => s.id === deck.subject_id);
    const deckColor = deck.color || (linkedSubject?.color ? getColorHex(linkedSubject.color) : '#3b82f6');

    return (
      <React.Fragment key={deck.id}>
        <div
          onClick={() => onStudyDeck(deck.id, deck.name)}
          className="group relative flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
        >
          {/* NOME DO BARALHO E COR */}
          <div
            className="flex items-center gap-2.5 min-w-0 flex-1 pr-4"
            style={{ paddingLeft: `${level * 20}px` }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: deckColor }}
              title={`Cor: ${deckColor}`}
            />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {deck.name}
            </span>
          </div>

          {/* COLUNAS ANKI: NOVO, APRENDER, REVISAR */}
          <div className="flex items-center gap-6 sm:gap-10 shrink-0 font-semibold text-xs font-mono">
            {/* NOVO (AZUL) */}
            <span
              className={`w-8 text-right ${
                newCount > 0
                  ? 'text-blue-500 dark:text-blue-400 font-bold'
                  : 'text-zinc-400 dark:text-zinc-600'
              }`}
            >
              {newCount}
            </span>

            {/* APRENDER (VERMELHO / LARANJA) */}
            <span
              className={`w-8 text-right ${
                learningCount > 0
                  ? 'text-rose-500 dark:text-rose-400 font-bold'
                  : 'text-zinc-400 dark:text-zinc-600'
              }`}
            >
              {learningCount}
            </span>

            {/* REVISAR (VERDE) */}
            <span
              className={`w-8 text-right ${
                reviewCount > 0
                  ? 'text-emerald-500 dark:text-emerald-400 font-bold'
                  : 'text-zinc-400 dark:text-zinc-600'
              }`}
            >
              {reviewCount}
            </span>

            {/* BOTÃO OPÇÕES (ENGRENAGEM ANKI) */}
            <div className="w-6 flex items-center justify-center relative" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setActiveMenuDeckId(activeMenuDeckId === deck.id ? null : deck.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition-opacity text-sm cursor-pointer"
                title="Opções do Baralho"
              >
                ⚙
              </button>

              {activeMenuDeckId === deck.id && (
                <div className="absolute right-0 top-8 z-30 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 text-xs font-medium animate-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(deck)}
                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  >
                    Renomear / Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenCreate(deck.id)}
                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  >
                    Criar Sub-baralho
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Excluir o baralho "${deck.name}" e seus cartões?`)) {
                        onDeleteDeck(deck.id);
                        setActiveMenuDeckId(null);
                      }
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                  >
                    Excluir Baralho
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SUB-BARALHOS */}
        {subDecks.map(sub => renderDeckRow(sub, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 pt-2 pb-8">
      {/* TABELA PRINCIPAL ESTILO ANKI */}
      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-sm p-4 sm:p-6 space-y-1">
        {/* CABEÇALHO DA TABELA */}
        <div className="flex items-center justify-between pb-3 mb-1 border-b border-zinc-200/80 dark:border-zinc-800/80 px-3 text-xs font-bold text-zinc-800 dark:text-zinc-200">
          <span className="flex-1">Baralho</span>
          <div className="flex items-center gap-6 sm:gap-10 shrink-0 pr-8">
            <span className="w-8 text-right text-blue-500 dark:text-blue-400">Novo</span>
            <span className="w-8 text-right text-rose-500 dark:text-rose-400">Aprender</span>
            <span className="w-8 text-right text-emerald-500 dark:text-emerald-400">Revisar</span>
          </div>
        </div>

        {/* LINHAS DE BARALHO */}
        {decks.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 text-xs">
            Nenhum baralho criado ainda. Clique em "Criar Baralho" abaixo para começar.
          </div>
        ) : (
          <div className="space-y-0.5">
            {rootDecks.map(d => renderDeckRow(d, 0))}
          </div>
        )}
      </div>

      {/* RESUMO DE HOJE (ANKI STATS TEXT) */}
      <div className="text-center text-xs text-zinc-500 dark:text-zinc-400 font-medium">
        {ankiSummaryText}
      </div>

      {/* BOTÕES DE AÇÃO INFERIORES ESTILO ANKI PILLS */}
      <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
        <button
          type="button"
          onClick={() => handleOpenCreate()}
          className="px-5 py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all shadow-xs cursor-pointer border border-zinc-200/60 dark:border-zinc-700/60"
        >
          Criar Baralho
        </button>

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-5 py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all shadow-xs cursor-pointer border border-zinc-200/60 dark:border-zinc-700/60"
          >
            Opções FSRS
          </button>
        )}

        {totalDueCount > 0 && onStartGeneralReview && (
          <button
            type="button"
            onClick={onStartGeneralReview}
            className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Revisar Todos ({totalDueCount})
          </button>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE BARALHO COM CORES DE DISCIPLINAS */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-4">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                  {editingDeck ? 'Editar Baralho' : 'Novo Baralho'}
                </h3>
                <p className="text-xs text-zinc-400">Defina o nome, hierarquia e a cor personalizada</p>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1 block">
                  Nome do Baralho *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Direito Penal, Informática, Legislação Especial"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              {/* VINCULAÇÃO COM DISCIPLINA */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1 block">
                  Disciplina Vinculada (Opcional)
                </label>
                <select
                  value={subjectId}
                  onChange={e => {
                    const selId = e.target.value;
                    setSubjectId(selId);
                    const sub = subjects.find(s => s.id === selId);
                    if (sub?.color) {
                      setColor(getColorHex(sub.color));
                    }
                  }}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none"
                >
                  <option value="">Nenhuma disciplina vinculada</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* SUB-BARALHO / HIERARQUIA */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1 block">
                  Baralho Pai (Para criar sub-baralho)
                </label>
                <select
                  value={parentId}
                  onChange={e => setParentId(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none"
                >
                  <option value="">Nenhum (Baralho Principal)</option>
                  {decks
                    .filter(d => !editingDeck || d.id !== editingDeck.id)
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* SELETOR DE COR IDÊNTICO AO DE DISCIPLINAS */}
              <div className="pt-1">
                <ColorPickerPalette
                  selectedColor={color}
                  onSelectColor={hex => setColor(hex)}
                  title="Cor do Baralho (Mesmas Opções de Disciplinas)"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-zinc-600 dark:text-zinc-400 font-bold uppercase text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold uppercase text-xs rounded-xl shadow-md cursor-pointer"
                >
                  {editingDeck ? 'Salvar Baralho' : 'Criar Baralho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
