/**
 * Utilitários de data e fuso horário para garantir precisão no horário de Brasília (UTC-3).
 * Evita o bug comum de avanço de data ao usar toISOString() após as 21h no Brasil.
 */

/**
 * Retorna a data no formato YYYY-MM-DD compensando o fuso horário local.
 * Garante que 21:30 de terça continue sendo terça-feira (e não quarta-feira em UTC).
 */
export function getLocalDateString(dateInput?: Date | string | number): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formata uma data no padrão brasileiro DD/MM/YYYY.
 */
export function formatDateBR(dateInput?: Date | string | number): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' && dateInput.includes('-')
    ? parseLocalDate(dateInput)
    : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString('pt-BR');
}

/**
 * Converte uma string YYYY-MM-DD em um objeto Date seguro sem deslocamento de UTC.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
}

/**
 * Retorna o início do dia local (00:00:00.000).
 */
export function getStartOfDay(dateInput?: Date | string | number): Date {
  const d = dateInput ? new Date(dateInput) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Retorna o fim do dia local (23:59:59.999).
 */
export function getEndOfDay(dateInput?: Date | string | number): Date {
  const d = dateInput ? new Date(dateInput) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
