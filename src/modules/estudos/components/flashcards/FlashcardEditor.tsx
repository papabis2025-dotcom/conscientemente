import React, { useState, useRef, useEffect } from 'react';
import { FlashcardDeck, FlashcardType, Flashcard, CardWithState } from '../../types/flashcards';
import { Subject, Topic } from '../../types';
import { RichTextToolbar } from './RichTextToolbar';
import { getColorHex } from '../../utils/colors';
import { sanitizeHtml } from '../../../../utils/sanitizeHtml';

interface FlashcardEditorProps {
  decks: FlashcardDeck[];
  subjects: Subject[];
  initialDeckId?: string;
  initialSubjectId?: string;
  initialTopicId?: string;
  editingCard?: CardWithState | Flashcard | null;
  onSave: (cardData: {
    id?: string;
    deck_id: string;
    deck_ids?: string[];
    card_type: FlashcardType;
    front: string;
    back: string;
    cloze_text?: string;
    tags: string[];
    subject_id?: string;
    subject_ids?: string[];
    topic_id?: string;
    topic_ids?: string[];
  }, createAnother: boolean) => Promise<void>;
  onClose: () => void;
}

export const FlashcardEditor: React.FC<FlashcardEditorProps> = ({
  decks,
  subjects,
  initialDeckId,
  initialSubjectId,
  initialTopicId,
  editingCard,
  onSave,
  onClose,
}) => {
  const targetCard: Flashcard | null = editingCard
    ? ('card' in editingCard ? (editingCard as CardWithState).card : (editingCard as Flashcard))
    : null;

  // Baralhos selecionados (permite múltiplos baralhos tanto na criação quanto na edição)
  const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>(() => {
    if (targetCard?.deck_ids && targetCard.deck_ids.length > 0) return targetCard.deck_ids;
    if (targetCard?.deck_id) return [targetCard.deck_id];
    if (initialDeckId) return [initialDeckId];
    if (decks.length > 0) return [decks[0].id];
    return [];
  });

  // Disciplinas selecionadas (permite múltiplas disciplinas tanto na criação quanto na edição)
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(() => {
    if (targetCard?.subject_ids && targetCard.subject_ids.length > 0) return targetCard.subject_ids;
    if (targetCard?.subject_id) return [targetCard.subject_id];
    if (initialSubjectId) return [initialSubjectId];
    return [];
  });

  const [topicId, setTopicId] = useState(targetCard?.topic_id || initialTopicId || '');
  const [cardType, setCardType] = useState<FlashcardType>(targetCard?.card_type || 'basic');
  const [front, setFront] = useState(targetCard?.front || '');
  const [back, setBack] = useState(targetCard?.back || '');
  const [clozeText, setClozeText] = useState(targetCard?.cloze_text || targetCard?.front || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(targetCard?.tags || []);
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isEditMode = !!targetCard;

  const clozeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const frontTextareaRef = useRef<HTMLTextAreaElement>(null);
  const backTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Sincronizar estados locais caso targetCard mude
  useEffect(() => {
    if (targetCard) {
      const dIds = targetCard.deck_ids && targetCard.deck_ids.length > 0
        ? targetCard.deck_ids
        : (targetCard.deck_id ? [targetCard.deck_id] : (decks.length > 0 ? [decks[0].id] : []));
      const sIds = targetCard.subject_ids && targetCard.subject_ids.length > 0
        ? targetCard.subject_ids
        : (targetCard.subject_id ? [targetCard.subject_id] : []);

      setSelectedDeckIds(dIds);
      setSelectedSubjectIds(sIds);
      setTopicId(targetCard.topic_id || '');
      setCardType(targetCard.card_type || 'basic');
      setFront(targetCard.front || '');
      setBack(targetCard.back || '');
      setClozeText(targetCard.cloze_text || targetCard.front || '');
      setTags(targetCard.tags || []);
      setSaveError(null);
    }
  }, [targetCard?.id]);

  // Selecionar o primeiro deck disponível caso a lista inicial esteja vazia
  useEffect(() => {
    if (selectedDeckIds.length === 0 && decks.length > 0) {
      setSelectedDeckIds([decks[0].id]);
    }
  }, [decks, selectedDeckIds]);

  // Se o primeiro baralho selecionado tiver subject_id vinculado e nenhuma disciplina foi escolhida ainda
  useEffect(() => {
    if (selectedDeckIds.length > 0 && selectedSubjectIds.length === 0 && !targetCard) {
      const primaryDeck = decks.find(d => d.id === selectedDeckIds[0]);
      if (primaryDeck?.subject_id) {
        setSelectedSubjectIds([primaryDeck.subject_id]);
        if (primaryDeck.topic_id && !topicId) {
          setTopicId(primaryDeck.topic_id);
        }
      }
    }
  }, [selectedDeckIds, decks, selectedSubjectIds.length, targetCard, topicId]);

  // Tópicos disponíveis a partir das disciplinas selecionadas
  const availableTopics: Topic[] = subjects
    .filter(s => selectedSubjectIds.includes(s.id))
    .flatMap(s => s.topics || []);

  // Inserir lacuna (Cloze): insere marcador {{c1::palavra}}
  const handleInsertCloze = () => {
    const textarea = clozeTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = clozeText.substring(start, end) || 'palavra';

    // Determinar o índice do cloze (usa c1 como padrão para todos serem ocultados no mesmo cartão)
    const before = clozeText.substring(0, start);
    const after = clozeText.substring(end);
    const replacement = `{{c1::${selectedText}}}`;

    setClozeText(before + replacement + after);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 6, start + 6 + selectedText.length);
    }, 40);
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
  }, [front, back, clozeText, cardType, selectedDeckIds, selectedSubjectIds, tags, topicId]);

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

  const handleToggleDeck = (id: string) => {
    if (selectedDeckIds.includes(id)) {
      if (selectedDeckIds.length > 1) {
        setSelectedDeckIds(selectedDeckIds.filter(dId => dId !== id));
      }
    } else {
      setSelectedDeckIds([...selectedDeckIds, id]);
    }
  };

  const handleToggleSubject = (id: string) => {
    if (selectedSubjectIds.includes(id)) {
      setSelectedSubjectIds(selectedSubjectIds.filter(sId => sId !== id));
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, id]);
    }
  };

  const handleSubmit = async (createAnother: boolean) => {
    if (selectedDeckIds.length === 0) return;

    const sanitizedFront = sanitizeHtml(front).trim();
    const sanitizedBack = sanitizeHtml(back).trim();
    const sanitizedClozeText = sanitizeHtml(clozeText).trim();

    if (cardType === 'cloze') {
      if (!sanitizedClozeText) return;
    } else {
      if (!sanitizedFront || !sanitizedBack) return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave({
        id: targetCard?.id,
        deck_id: selectedDeckIds[0],
        deck_ids: selectedDeckIds,
        card_type: cardType,
        front: cardType === 'cloze' ? sanitizedClozeText : sanitizedFront,
        back: cardType === 'cloze' ? 'Cloze revelado' : sanitizedBack,
        cloze_text: cardType === 'cloze' ? sanitizedClozeText : undefined,
        tags,
        subject_id: selectedSubjectIds[0] || undefined,
        subject_ids: selectedSubjectIds,
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
    } catch (e: any) {
      console.error('Erro ao salvar cartão:', e);
      setSaveError(e?.message || 'Não foi possível salvar o cartão. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
        {/* HEADER DO EDITOR */}
        <div className="p-6 sm:p-7 pb-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white">
              {isEditMode ? 'Editar Flashcard' : 'Novo Flashcard'}
            </h3>
            <p className="text-xs text-zinc-400">Atalho: Ctrl+Enter para salvar rapidamente</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {saveError && (
          <div className="p-3 mx-6 sm:mx-8 mt-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-600 dark:text-rose-300 font-medium">
            ⚠️ {saveError}
          </div>
        )}

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
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold uppercase transition-all border cursor-pointer ${
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
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold uppercase transition-all border cursor-pointer ${
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
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold uppercase transition-all border cursor-pointer ${
                  cardType === 'cloze'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                Cloze (Lacuna)
              </button>
            </div>
          </div>

          {/* VINCULAÇÃO A MÚLTIPLOS BARALHOS */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                Baralhos Vinculados * ({selectedDeckIds.length} selecionado{selectedDeckIds.length === 1 ? '' : 's'})
              </label>
              <span className="text-[10px] text-zinc-400">Você pode vincular a mais de um baralho</span>
            </div>

            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl custom-scrollbar">
              {decks.length === 0 ? (
                <span className="text-xs text-zinc-400">Nenhum baralho disponível.</span>
              ) : (
                decks.map(d => {
                  const isSelected = selectedDeckIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleToggleDeck(d.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-white dark:bg-zinc-900 border-indigo-500 text-zinc-900 dark:text-white shadow-xs ring-1 ring-indigo-500/30 font-bold'
                          : 'bg-zinc-100/70 dark:bg-zinc-800/80 border-zinc-200/80 dark:border-zinc-700/60 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: d.color || '#3b82f6' }}
                      />
                      <span className="truncate max-w-[190px]">{d.name}</span>
                      {isSelected && (
                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-black ml-0.5">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* VINCULAÇÃO A MÚLTIPLAS DISCIPLINAS */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                Disciplinas Vinculadas (Opcional - {selectedSubjectIds.length} selecionada{selectedSubjectIds.length === 1 ? '' : 's'})
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400">Você pode vincular a mais de uma disciplina</span>
                {selectedSubjectIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubjectIds([]);
                      setTopicId('');
                    }}
                    className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl custom-scrollbar">
              {subjects.length === 0 ? (
                <span className="text-xs text-zinc-400">Nenhuma disciplina cadastrada.</span>
              ) : (
                subjects.map(s => {
                  const isSelected = selectedSubjectIds.includes(s.id);
                  const subColor = s.color ? getColorHex(s.color) : '#6366f1';
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleToggleSubject(s.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-white dark:bg-zinc-900 border-indigo-500 text-zinc-900 dark:text-white shadow-xs ring-1 ring-indigo-500/30 font-bold'
                          : 'bg-zinc-100/70 dark:bg-zinc-800/80 border-zinc-200/80 dark:border-zinc-700/60 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: subColor }}
                      />
                      <span className="truncate max-w-[190px]">{s.name}</span>
                      {isSelected && (
                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-black ml-0.5">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ASSUNTO ESPECÍFICO (OPCIONAL) */}
          {availableTopics.length > 0 && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 block">
                Assunto Específico (Opcional)
              </label>
              <select
                value={topicId}
                onChange={e => setTopicId(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Geral da(s) disciplina(s)</option>
                {availableTopics.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* CAMPOS DE CONTEÚDO COM EDITOR RICO */}
          {cardType === 'cloze' ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                Texto com Lacuna (Cloze)
              </label>

              {/* TOOLBAR RICA PARA CLOZE */}
              <RichTextToolbar
                textareaRef={clozeTextareaRef}
                value={clozeText}
                onChange={setClozeText}
                showClozeButton={true}
                onInsertCloze={handleInsertCloze}
              />

              <textarea
                ref={clozeTextareaRef}
                rows={5}
                placeholder="Exemplo: O {{c1::erro de tipo essencial}} exclui o {{c1::dolo}}."
                value={clozeText}
                onChange={e => setClozeText(e.target.value)}
                className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
              />
              <p className="text-[11px] text-zinc-400">
                Selecione as palavras que deseja ocultar e use o botão <strong>"[ ... ] Ocultar Palavra"</strong> ou o atalho <kbd className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono">Ctrl+Shift+C</kbd>. Todas as palavras ocultadas serão mascaradas na revisão.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* FRENTE COM TOOLBAR */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                  Frente (Pergunta ou Conceito)
                </label>
                <RichTextToolbar
                  textareaRef={frontTextareaRef}
                  value={front}
                  onChange={setFront}
                />
                <textarea
                  ref={frontTextareaRef}
                  rows={3}
                  placeholder="Ex: Qual é o prazo prescricional da ação de cobrança de dívidas líquidas?"
                  value={front}
                  onChange={e => setFront(e.target.value)}
                  className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              {/* VERSO COM TOOLBAR */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                  Verso (Resposta)
                </label>
                <RichTextToolbar
                  textareaRef={backTextareaRef}
                  value={back}
                  onChange={setBack}
                />
                <textarea
                  ref={backTextareaRef}
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
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
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
                      className="hover:text-rose-500 ml-0.5 cursor-pointer"
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
        <div className="p-6 sm:p-7 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            {successToast && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                Cartão salvo com sucesso!
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isEditMode && (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isSaving}
                className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold uppercase text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Salvar e Criar Outro
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSaving}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold uppercase text-xs rounded-xl shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isEditMode ? 'Atualizar Cartão' : 'Salvar Cartão'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
