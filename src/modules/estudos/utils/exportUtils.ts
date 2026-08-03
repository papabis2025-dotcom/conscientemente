/**
 * Utilitários para exportação de dados em planilhas (Excel / Google Planilhas) e PDF
 */

/**
 * Exporta dados tabulares para um arquivo CSV codificado em UTF-8 com BOM (compatível com Excel PT-BR e Google Planilhas)
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const sanitizeCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    // Se a célula contiver ponto e vírgula, quebras de linha ou aspas, envolver em aspas e duplicar aspas internas
    if (str.includes(';') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(sanitizeCell).join(';');
  const rowLines = rows.map(r => r.map(sanitizeCell).join(';'));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Aciona o diálogo de impressão/salvamento em PDF nativo do navegador
 */
export function exportToPdf(documentTitle?: string) {
  const originalTitle = document.title;
  if (documentTitle) {
    document.title = documentTitle;
  }
  window.print();
  if (documentTitle) {
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }
}
