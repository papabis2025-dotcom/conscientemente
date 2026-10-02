import React from 'react';

interface ClozeRendererProps {
  text: string;
  isAnswerRevealed: boolean;
  clozeIndex?: number; // c1, c2, etc. (padrão 1)
  className?: string;
}

/**
 * Renderiza textos no formato Cloze Deletion do Anki:
 * Exemplo: "O {{c1::erro de tipo essencial}} exclui o dolo."
 * Exemplo com dica: "O {{c1::erro de tipo::conceito penal}} exclui o dolo."
 */
export const ClozeRenderer: React.FC<ClozeRendererProps> = ({
  text,
  isAnswerRevealed,
  clozeIndex = 1,
  className = ''
}) => {
  if (!text) return null;

  // Regex para encontrar marcadores {{c1::resposta}} ou {{c1::resposta::dica}}
  const regex = /\{\{c(\d+)::([^:]+?)(?:::([^}]+?))?\}\}/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const matchStart = match.index;
    const currentClozeNum = parseInt(match[1], 10);
    const hiddenAnswer = match[2];
    const hint = match[3];

    // Texto antes do marcador
    if (matchStart > lastIndex) {
      parts.push(text.substring(lastIndex, matchStart));
    }

    // Se for o cloze ativo para este cartão
    if (currentClozeNum === clozeIndex) {
      if (isAnswerRevealed) {
        parts.push(
          <span
            key={matchStart}
            className="font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 transition-all inline-block mx-1"
          >
            {hiddenAnswer}
          </span>
        );
      } else {
        parts.push(
          <span
            key={matchStart}
            className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-lg border border-dashed border-amber-300 dark:border-amber-700/60 inline-block mx-1 animate-pulse"
          >
            [{hint ? hint : '...'}]
          </span>
        );
      }
    } else {
      // Outros clozes no mesmo texto aparecem revelados normalmente
      parts.push(
        <span key={matchStart} className="font-semibold text-zinc-700 dark:text-zinc-300">
          {hiddenAnswer}
        </span>
      );
    }

    lastIndex = matchStart + fullMatch.length;
  }

  // Texto restante
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return (
    <span className={`leading-relaxed whitespace-pre-wrap ${className}`}>
      {parts.length > 0 ? parts : text}
    </span>
  );
};
