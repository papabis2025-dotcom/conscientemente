import React, { useState, useRef, useEffect } from 'react';
import { FlashcardDeck, FlashcardType } from '../../types/flashcards';
import { Subject, Topic } from '../../types';
import {
  X,
  Save,
  Plus,
  Tag as TagIcon,
  Layers,
  Sparkles,
  HelpCircle,
  Scissors,
  Check
} from 'lucide-react';

interface FlashcardEditorProps {
  decks: FlashcardDeck[];
  subjects: Subject[];
  initialDeckId?: string;
  initialSubjectId?: string;
  initialTopicId?: string;
  onSave: (cardData: {
    deck_id: string;
    card_type: FlashcardType;
    front: string;
    back: string;
    cloze_text?: string;
    tags: string[];
    subject_id?: string;
    topic_id?: string;
  }, createAnother: boolean) => Promise<void>;
  onClose: () => void;
}

export const FlashcardEditor: React.FC<FlashcardEditorProps> = ({
  decks,
  subjects,
  initialDeckId,
  initialSubjectId,
  initialTopicId,
  onSave,
  onClose,
}) => {
  const [deckId, setDeckId] = useState(initialDeckId || decks[0]?.id || '');
  const [subjectId, setSubjectId] = useState(initialSubjectId || '');
  const [topicId, setTopicId] = useState(initialTopicId || '');
  const [cardType, setCardType] = useState<FlashcardType>('basic');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [clozeText, setClozeText] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  const clozeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const frontTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Selecionar o primeiro deck disponível caso não haja
  useEffect(() => {
    if (!deckId && decks.length > 0) {
      setDeckId(decks[0].id);
    }
  }, [decks, deckId]);

  // Se o baralho selecionado tiver subject_id vinculado, autocompletar
  useEffect(() => {
    const selDeck = decks.find(d => d.id === deckId);
    if (selDeck?.subject_id && !subjectId) {
      setSubjectId(selDeck.subject_id);
      if (selDeck.topic_id && !topicId) {
        setTopicId(selDeck.topic_id);
      }
    }
  }, [deckId, decks, subjectId, topicId]);

  const selectedSubject = subjects.find(s => s.id === subjectId);
  const availableTopics: Topic[] = selectedSubject?.topics || [];

  // Atalho para Cloze: Ctrl + Shift + C
  const handleInsertCloze = () => {
    const textarea = clozeTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = clozeText.substring(start, end) || 'palavra';

    // Determinar próximo índice de cloze (c1, c2, etc.)
    const existingMatches = clozeText.match(/\{\{c(\d+)::/g) || [];
    const nextIndex = existingMatches.length + 1;

    const before = clozeText.substring(0, start);
    const after = clozeText.substring(end);
    const replacement = `{{c${nextIndex}::${selectedText}}}`;

    setClozeText(before + replacement + after);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 6, start + 6 + selectedText.length);
    }, 50);
  };

  // Atalhos de teclado no formulário (Ctrl+Enter para salvar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(false);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        if (cardType === 'cloze') {
          e.preventDefault();
          handleInsertCloze();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [front, back, clozeText, cardType, deckId, tags, subjectId, topicId]);

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (createAnother: boolean) => {
    if (!deckId) return;

    if (cardType === 'cloze') {
      if (!clozeText.trim()) return;
    } else {
      if (!front.trim() || !back.trim()) return;
    }

    setIsSaving(true);
    try {
      await onSave({
        deck_id: deckId,
        card_type: cardType,
        front: cardType === 'cloze' ? clozeText : front,
        back: cardType === 'cloze' ? 'Cloze revelado' : back,
        cloze_text: cardType === 'cloze' ? clozeText : undefined,
        tags,
        subject_id: subjectId || undefined,
        topic_id: topicId || undefined,
      }, createAnother);

      if (createAnother) {
        setFront('');
        setBack('');
        setClozeText('');
        setSuccessToast(true);
        setTimeout(() => setSuccessToast(false), 2000);
        if (cardType === 'cloze') {
          clozeTextareaRef.current?.focus();
        } else {
          frontTextareaRef.current?.focus();
        }
      } else {
        onClose();
      }
    } catch (e) {
      console.error('Erro ao salvar cartão:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
        {/* HEADER DO EDITOR */}
        <div className="p-6 sm:p-8 pb-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                Novo Flashcard
              </h3>
              <p className="text-xs text-zinc-400">Atalho: Ctrl+Enter para salvar rapidamente</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* CORPO DO FORMULÁRIO */}
        <div className="p-6 sm:p-8 space-y-5 max-h-[72vh] overflow-y-auto custom-scrollbar">
          {/* SELEÇÃO DE TIPO DE CARTÃO */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2 block">
              Tipo de Cartão
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCardType('basic')}
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold uppercase transition-all border ${
                  cardType === 'basic'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                Básico
              </button>

              <button
                type="button"
                onClick={() => setCardType('reversed')}
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold uppercase transition-all border ${
                  cardType === 'reversed'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                Invertido (A ⇄ B)
              </button>

              <button
                type="button"
                onClick={() => setCardType('cloze')}
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold uppercase transition-all border ${
                  cardType === 'cloze'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                Cloze (Lacuna)
              </button>
            </div>
          </div>

          {/* BARALHO E MATÉRIA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 block">
                Baralho *
              </label>
              <select
                value={deckId}
                onChange={e => setDeckId(e.target.value)}
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {decks.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 block">
                Disciplina Vinculada (Opcional)
              </label>
              <select
                value={subjectId}
                onChange={e => {
                  setSubjectId(e.target.value);
                  setTopicId('');
                }}
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Nenhuma disciplina</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ASSUNTO / TÓPICO SE HOUVER DISCIPLINA */}
          {subjectId && availableTopics.length > 0 && (
            <div className="animate-in fade-in">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 block">
                Assunto Específico (Opcional)
              </label>
              <select
                value={topicId}
                onChange={e => setTopicId(e.target.value)}
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Geral da disciplina</option>
                {availableTopics.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* CAMPOS DE CONTEÚDO */}
          {cardType === 'cloze' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                  Texto com Lacuna (Cloze)
                </label>
                <button
                  type="button"
                  onClick={handleInsertCloze}
                  className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                  title="Selecione o texto e clique para criar lacuna (Ctrl+Shift+C)"
                >
                  <Scissors size={12} /> Inserir Lacuna [Ctrl+Shift+C]
                </button>
              </div>

              <textarea
                ref={clozeTextareaRef}
                rows={5}
                placeholder="Exemplo: O {{c1::erro de tipo essencial}} exclui o dolo."
                value={clozeText}
                onChange={e => setClozeText(e.target.value)}
                className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
              />
              <p className="text-[11px] text-zinc-400">
                Dica: selecione uma palavra no texto acima e aperte <kbd className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono">Ctrl+Shift+C</kbd> para ocultá-la durante a revisão.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Frente (Pergunta ou Conceito)
                </label>
                <textarea
                  ref={frontTextareaRef}
                  rows={3}
                  placeholder="Ex: Qual é o prazo prescricional da ação de cobrança de dívidas líquidas?"
                  value={front}
                  onChange={e => setFront(e.target.value)}
                  className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Verso (Resposta)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: 5 anos (art. 206, § 5º, I do Código Civil)."
                  value={back}
                  onChange={e => setBack(e.target.value)}
                  className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAGS */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Tags (Opcional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Ex: fgv, pegadinha, jurisprudencia..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold uppercase transition-all"
              >
                Adicionar
              </button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-500 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER COM BOTÕES DE SALVAMENTO */}
        <div className="p-6 sm:p-8 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            {successToast && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                <Check size={14} /> Cartão salvo com sucesso!
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isSaving}
              className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold uppercase text-xs rounded-2xl transition-all cursor-pointer disabled:opacity-50"
            >
              Salvar e Criar Outro
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSaving}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-xs rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={16} /> Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
