import React, { useState, useRef, useEffect } from 'react';

interface RichTextToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (newValue: string) => void;
  showClozeButton?: boolean;
  onInsertCloze?: () => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Amarelo', hex: '#fef08a' },
  { name: 'Verde', hex: '#bbf7d0' },
  { name: 'Azul', hex: '#bfdbfe' },
  { name: 'Rosa', hex: '#fecdd3' },
  { name: 'Laranja', hex: '#fed7aa' },
];

const TEXT_COLORS = [
  { name: 'Vermelho', hex: '#ef4444' },
  { name: 'Azul', hex: '#3b82f6' },
  { name: 'Verde', hex: '#10b981' },
  { name: 'Âmbar', hex: '#f59e0b' },
  { name: 'Roxo', hex: '#8b5cf6' },
  { name: 'Cinza', hex: '#71717a' },
];

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({
  textareaRef,
  value,
  onChange,
  showClozeButton = false,
  onInsertCloze
}) => {
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const highlightMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (highlightMenuRef.current && !highlightMenuRef.current.contains(e.target as Node)) {
        setShowHighlightMenu(false);
      }
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setShowColorMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyWrap = (prefix: string, suffix: string, defaultPlaceholder = 'texto') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || defaultPlaceholder;

    const before = value.substring(0, start);
    const after = value.substring(end);
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newValue = before + replacement + after;
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 20);
  };

  const handleApplyHighlight = (colorHex: string) => {
    applyWrap(
      `<mark style="background-color: ${colorHex}; color: #000; padding: 1px 4px; border-radius: 4px;">`,
      `</mark>`,
      'destaque'
    );
    setShowHighlightMenu(false);
  };

  const handleApplyTextColor = (colorHex: string) => {
    applyWrap(
      `<span style="color: ${colorHex};">`,
      `</span>`,
      'texto colorido'
    );
    setShowColorMenu(false);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap p-1 bg-zinc-100 dark:bg-zinc-800/90 rounded-xl border border-zinc-200/80 dark:border-zinc-700/70 text-xs">
      {/* NEGRITO */}
      <button
        type="button"
        onClick={() => applyWrap('<b>', '</b>', 'negrito')}
        className="w-7 h-7 flex items-center justify-center font-black rounded-lg hover:bg-white dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer shadow-xs border border-transparent hover:border-zinc-200 dark:hover:border-zinc-600"
        title="Negrito (<b>...</b>)"
      >
        B
      </button>

      {/* ITÁLICO */}
      <button
        type="button"
        onClick={() => applyWrap('<i>', '</i>', 'itálico')}
        className="w-7 h-7 flex items-center justify-center italic font-serif font-bold rounded-lg hover:bg-white dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer shadow-xs border border-transparent hover:border-zinc-200 dark:hover:border-zinc-600"
        title="Itálico (<i>...</i>)"
      >
        I
      </button>

      {/* SUBLINHADO */}
      <button
        type="button"
        onClick={() => applyWrap('<u>', '</u>', 'sublinhado')}
        className="w-7 h-7 flex items-center justify-center underline font-bold rounded-lg hover:bg-white dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer shadow-xs border border-transparent hover:border-zinc-200 dark:hover:border-zinc-600"
        title="Sublinhado (<u>...</u>)"
      >
        U
      </button>

      {/* TACHADO */}
      <button
        type="button"
        onClick={() => applyWrap('<s>', '</s>', 'tachado')}
        className="w-7 h-7 flex items-center justify-center line-through font-bold rounded-lg hover:bg-white dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer shadow-xs border border-transparent hover:border-zinc-200 dark:hover:border-zinc-600"
        title="Tachado (<s>...</s>)"
      >
        S
      </button>

      <span className="w-[1px] h-4 bg-zinc-300 dark:bg-zinc-700 mx-0.5" />

      {/* MARCADOR COLORIDO (HIGHLIGHT) */}
      <div className="relative" ref={highlightMenuRef}>
        <button
          type="button"
          onClick={() => {
            setShowHighlightMenu(!showHighlightMenu);
            setShowColorMenu(false);
          }}
          className={`px-2 h-7 flex items-center gap-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
            showHighlightMenu
              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
              : 'hover:bg-white dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border-transparent hover:border-zinc-200'
          }`}
          title="Marcador Colorido (Marca-texto)"
        >
          <span className="px-1 py-0.5 rounded bg-yellow-300 text-black text-[9px] font-black leading-none">
            Marca
          </span>
          <span className="text-[9px]">▼</span>
        </button>

        {showHighlightMenu && (
          <div className="absolute left-0 top-8 z-30 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-2 flex items-center gap-1.5 animate-in zoom-in-95">
            {HIGHLIGHT_COLORS.map(c => (
              <button
                key={c.name}
                type="button"
                onClick={() => handleApplyHighlight(c.hex)}
                className="w-6 h-6 rounded-full border border-black/10 hover:scale-110 transition-transform cursor-pointer shadow-xs"
                style={{ backgroundColor: c.hex }}
                title={`Marcador ${c.name}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* COR DO TEXTO */}
      <div className="relative" ref={colorMenuRef}>
        <button
          type="button"
          onClick={() => {
            setShowColorMenu(!showColorMenu);
            setShowHighlightMenu(false);
          }}
          className={`px-2 h-7 flex items-center gap-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
            showColorMenu
              ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
              : 'hover:bg-white dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border-transparent hover:border-zinc-200'
          }`}
          title="Cor do Texto"
        >
          <span className="font-black text-rose-500 text-xs">A</span>
          <span className="text-[9px]">▼</span>
        </button>

        {showColorMenu && (
          <div className="absolute left-0 top-8 z-30 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-2 flex items-center gap-1.5 animate-in zoom-in-95">
            {TEXT_COLORS.map(c => (
              <button
                key={c.name}
                type="button"
                onClick={() => handleApplyTextColor(c.hex)}
                className="w-6 h-6 rounded-full border border-black/10 hover:scale-110 transition-transform cursor-pointer shadow-xs"
                style={{ backgroundColor: c.hex }}
                title={`Cor ${c.name}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* BOTÃO CLOZE (SE HABILITADO) */}
      {showClozeButton && onInsertCloze && (
        <>
          <span className="w-[1px] h-4 bg-zinc-300 dark:bg-zinc-700 mx-0.5" />
          <button
            type="button"
            onClick={onInsertCloze}
            className="px-2.5 h-7 flex items-center gap-1 rounded-lg text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 transition-all cursor-pointer shadow-xs"
            title="Ocultar palavra selecionada (Ctrl+Shift+C)"
          >
            [ ... ] Ocultar Palavra
          </button>
        </>
      )}
    </div>
  );
};
