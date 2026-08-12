import * as XLSX from 'xlsx';

/**
 * Utilitários para exportação de dados em planilhas (Excel / Google Planilhas) e PDF
 */

/**
 * Exporta dados tabulares para um arquivo nativo do Excel (.xlsx) 100% compatível com o Google Planilhas
 */
export function exportToXlsx(filename: string, sheetName: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const data = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Ajusta a largura das colunas dinamicamente com base no maior conteúdo
  const colWidths = headers.map((h, colIdx) => {
    let maxLen = String(h || '').length;
    rows.forEach(r => {
      const cellVal = String(r[colIdx] ?? '');
      if (cellVal.length > maxLen) maxLen = cellVal.length;
    });
    return { wch: Math.min(60, Math.max(12, maxLen + 3)) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, finalFilename);
}

/**
 * Exporta dados tabulares para um arquivo CSV codificado em UTF-8 com BOM
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const sanitizeCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
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
 * Aciona o diálogo de impressão/salvamento em PDF nativo do navegador desbloqueando o conteúdo completo da página
 */
export function exportToPdf(documentTitle?: string) {
  const originalTitle = document.title;
  if (documentTitle) {
    document.title = documentTitle;
  }

  // Adiciona temporariamente a classe is-printing ao body para liberar rolagens internas
  document.body.classList.add('is-printing');

  window.print();

  setTimeout(() => {
    document.body.classList.remove('is-printing');
    if (documentTitle) {
      document.title = originalTitle;
    }
  }, 1000);
}

