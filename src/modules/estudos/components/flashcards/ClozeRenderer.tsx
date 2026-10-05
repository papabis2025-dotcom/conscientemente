import React from 'react';
import { sanitizeHtml } from '../../../../utils/sanitizeHtml';

interface ClozeRendererProps {
  text: string;
  isAnswerRevealed: boolean;
  clozeIndex?: number; // Se informado, oculta apenas o índice especificado; se omitido, oculta todos os clozes presentes
  className?: string;
}

/**
 * Renderiza textos no formato Cloze Deletion do Anki:
 * Exemplo: "O {{c1::erro de tipo essencial}} exclui o {{c2::dolo}}."
 * Exemplo com dica: "O {{c1::erro de tipo::conceito penal}} exclui o dolo."
 * Suporta múltiplos clozes ocultados na mesma revisão e formatações ricas em HTML.
 */
export const ClozeRenderer: React.FC<ClozeRendererProps> = ({
  text,
  isAnswerRevealed,
  clozeIndex,
  className = ''
}) => {
  if (!text) return null;

  // Regex robusta para capturar {{c1::resposta}} ou {{c1::resposta::dica}} mesmo com múltiplos clozes
  const regex = /\{\{c(\d+)::(.*?)(?:::([^}]+))?\}\}/gs;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const matchStart = match.index;
    const currentClozeNum = parseInt(match[1], 10);
    const hiddenAnswer = match[2];
    const hint = match[3];

    // Texto antes do marcador cloze
    if (matchStart > lastIndex) {
      const plainText = text.substring(lastIndex, matchStart);
      parts.push(
        <span
          key={`plain-${lastIndex}`}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(plainText) }}
        />
      );
    }

    // Se clozeIndex não for fornecido, oculta todos os clozes do cartão.
    // Caso seja fornecido (ex: 1), oculta somente o índice especificado.
    const shouldHide = clozeIndex === undefined || clozeIndex === 0 || currentClozeNum === clozeIndex;

    if (shouldHide) {
      if (isAnswerRevealed) {
        parts.push(
          <span
            key={`cloze-revealed-${matchStart}`}
            className="font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 transition-all inline-block mx-1 shadow-xs"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(hiddenAnswer) }}
          />
        );
      } else {
        parts.push(
          <span
            key={`cloze-hidden-${matchStart}`}
            className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-lg border border-dashed border-amber-300 dark:border-amber-700/60 inline-block mx-1 animate-pulse"
          >
            [{hint ? hint : '...'}]
          </span>
        );
      }
    } else {
      // Cloze secundário revelado se clozeIndex específico estiver ativo
      parts.push(
        <span
          key={`cloze-other-${matchStart}`}
          className="font-semibold text-zinc-700 dark:text-zinc-300"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(hiddenAnswer) }}
        />
      );
    }

    lastIndex = matchStart + fullMatch.length;
  }

  // Texto restante após o último marcador
  if (lastIndex < text.length) {
    const trailingText = text.substring(lastIndex);
    parts.push(
      <span
        key={`trailing-${lastIndex}`}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(trailingText) }}
      />
    );
  }

  return (
    <div className={`leading-relaxed whitespace-pre-wrap select-text ${className}`}>
      {parts.length > 0 ? parts : <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />}
    </div>
  );
};
