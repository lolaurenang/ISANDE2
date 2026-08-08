/**
 * Builds a proper A4 PDF for a report table: company letterhead, report
 * title, date range, and "Page X of Y" on every page - not a browser
 * print dump.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function downloadReportPdf({ title, rangeLabel, columns, rows, filename }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  function drawHeader() {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("Andoy's Enterprises", margin, 44);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text('Motorbike parts & repair - San Miguel, Jordan, Guimaras', margin, 58);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated ${new Date().toLocaleString('en-PH')}`, pageWidth - margin, 44, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text(title, margin, 84);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(rangeLabel, margin, 98);

    doc.setDrawColor(220, 220, 220);
    doc.line(margin, 106, pageWidth - margin, 106);
  }

  autoTable(doc, {
    startY: 118,
    head: [columns],
    body: rows,
    margin: { top: 118, left: margin, right: margin, bottom: 48 },
    styles: { fontSize: 9, cellPadding: 6, textColor: [40, 40, 40] },
    headStyles: { fillColor: [197, 87, 54], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [250, 247, 244] },
    didDrawPage: drawHeader,
  });

  // Page numbers can only be stamped once the total page count is known,
  // so this runs as a second pass after autoTable finishes paginating.
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
  }

  doc.save(filename);
}
