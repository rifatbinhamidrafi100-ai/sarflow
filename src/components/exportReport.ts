import type { EvidencePackage } from '../../shared/evidence-package';
import { reportSections } from '../../shared/evidence-report';
import { rasterURL } from './Raster';

export function downloadText(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Client-only PDF generation. Load the PDF library only after an explicit export. */
export async function exportEvidencePDF(p: EvidencePackage) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: 'SARFlow Evidence Report',
    subject: p.disclaimer,
    creator: 'SARFlow',
  });
  let y = 18;
  // Standard PDF fonts do not shape Bangla. Original strings remain in JSON and the Unicode HTML brief.
  const latin = (text: string) =>
    text
      .replace(/[–—−]/g, '-')
      .replace(/→/g, ' to ')
      .replace(/Δ/g, 'delta')
      .replace(/×/g, 'x')
      .replace(/≥/g, '>=')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[^\x20-\x7e\xa0-\xff]/g, '[Unicode: see HTML/JSON]');
  function line(text: string, heading = false) {
    doc.setFont('helvetica', heading ? 'bold' : 'normal');
    doc.setFontSize(heading ? 13 : 9);
    const lines = doc.splitTextToSize(latin(text), 176) as string[];
    for (const part of lines) {
      if (y > 274) {
        doc.addPage();
        y = 18;
      }
      doc.text(part, 17, y);
      y += heading ? 6 : 4.5;
    }
    y += 2;
  }
  line('SARFlow / Evidence Report', true);
  line(p.disclaimer);
  if (p.result) {
    const scale = 42 / Math.max(p.dataset.width, p.dataset.height);
    const width = p.dataset.width * scale,
      height = p.dataset.height * scale;
    doc.addImage(
      rasterURL(
        p.result.delta,
        p.dataset.width,
        p.dataset.height,
        'detected',
        p.parameters.threshold,
      ),
      'PNG',
      17,
      y,
      width,
      height,
    );
    y += height + 6;
    line(
      'Native-grid mask: blue decrease, amber increase, gray unselected, light gray excluded. Not a geographic hazard map.',
    );
  }
  for (const section of reportSections(p)) {
    if (y > 258) {
      doc.addPage();
      y = 18;
    }
    line(section.title, true);
    section.lines.forEach((text) => line(text));
  }
  line(
    'PDF uses Latin-character text. Use the offline HTML brief or evidence JSON for original Unicode names.',
  );
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`SARFlow | ${i} / ${pages} | independent research output`, 17, 288);
  }
  doc.save(`sarflow-${p.dataset.id}-report.pdf`);
}
