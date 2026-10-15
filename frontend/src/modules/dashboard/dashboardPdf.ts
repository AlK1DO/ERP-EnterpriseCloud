import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Analysis } from './dashboardAnalytics';

export function analysisPdf(table: Analysis) {
  const doc = new jsPDF();
  doc.setFontSize(15);
  const title = doc.splitTextToSize(table.title, 180);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  const top = 25 + title.length * 6;
  const info = doc.splitTextToSize(`Periodo: ${table.period} | Moneda: ${table.currency}\n${table.notes.join('\n')}`, 180);
  doc.text(info, 14, top);
  autoTable(doc, { startY: top + 5 + info.length * 4, head: [table.headers], body: table.rows.length ? table.rows : [['Sin datos', ...table.headers.slice(1).map(() => '')]], theme: 'grid', headStyles: { fillColor: [37, 99, 235] } });
  return doc;
}
