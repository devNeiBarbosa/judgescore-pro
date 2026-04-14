import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { CategoryOfficialSnapshot } from '@/lib/category-results';

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(value);
}

function resolveLogoForLightBackground() {
  const preferred = path.join(process.cwd(), 'public/assets/logo/logo-transparent-dark.png');
  const fallback = path.join(process.cwd(), 'public/assets/logo/icon-symbol.png');
  return fs.existsSync(preferred) ? preferred : fallback;
}

function resolveIconFallback() {
  return path.join(process.cwd(), 'public/assets/logo/icon-symbol.png');
}

function drawPdfHeader(doc: PDFKit.PDFDocument, pageWidth: number, startX: number, title: string, subtitle: string) {
  const iconPath = resolveIconFallback();
  const logoPath = resolveLogoForLightBackground();

  let currentY = 36;

  if (fs.existsSync(iconPath)) {
    doc.image(iconPath, startX, currentY, { fit: [30, 30] });
  }

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, startX + 40, currentY - 4, { fit: [260, 70] });
  }

  currentY += 56;

  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor('#111111')
    .text(title, startX, currentY, { width: pageWidth, align: 'center' })
    .moveDown(0.2)
    .fontSize(12)
    .text(subtitle, { width: pageWidth, align: 'center' });
}

export async function generateOfficialCategoryResultPdf(params: {
  championshipName: string;
  categoryName: string;
  generatedAt: Date;
  documentId: string;
  snapshot: CategoryOfficialSnapshot;
}): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      info: {
        Title: `Resultado Oficial - ${params.categoryName}`,
        Author: 'JUDGESCORE PRO',
        Subject: 'Resultado Oficial de Categoria',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const startX = doc.page.margins.left;

    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FFFFFF');

    drawPdfHeader(
      doc,
      pageWidth,
      startX,
      'RESULTADO OFICIAL',
      `${params.championshipName} • Categoria: ${params.categoryName}`,
    );

    doc
      .moveDown(0.2)
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#111111')
      .text(`Data do resultado: ${formatDateTime(params.generatedAt)}`, { width: pageWidth, align: 'center' });

    doc.moveDown(1.2);

    const tableStartY = doc.y;
    const colPos = startX;
    const colNumber = startX + 80;
    const colName = startX + 170;

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#B71C1C')
      .text('TOP 10', startX, tableStartY);

    let y = doc.y + 8;

    doc
      .fillColor('#222222')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('POSIÇÃO', colPos, y)
      .text('NÚMERO', colNumber, y)
      .text('ATLETA', colName, y);

    y += 14;
    doc.moveTo(startX, y).lineTo(startX + pageWidth, y).strokeColor('#333333').lineWidth(0.6).stroke();
    y += 6;

    doc.font('Helvetica').fontSize(10).fillColor('#111111');

    for (const row of params.snapshot.top10) {
      const positionLabel = `${row.finalPosition}º${row.tie ? ' (EMPATE)' : ''}`;
      doc.text(positionLabel, colPos, y, { width: 76 });
      doc.text(row.athleteNumber !== null ? String(row.athleteNumber) : '—', colNumber, y, { width: 80 });
      doc.text(row.athleteName, colName, y, { width: pageWidth - (colName - startX) });
      y += 16;
    }

    if (params.snapshot.top10.length === 0) {
      doc.text('Sem atletas classificados no TOP 10.', startX, y);
      y += 16;
    }

    y += 8;
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#B71C1C')
      .text('DEMAIS ATLETAS', startX, y);

    y = doc.y + 8;

    doc
      .fillColor('#222222')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('NÚMERO', colNumber, y)
      .text('ATLETA', colName, y)
      .text('STATUS', startX + pageWidth - 140, y, { width: 140, align: 'right' });

    y += 14;
    doc.moveTo(startX, y).lineTo(startX + pageWidth, y).strokeColor('#333333').lineWidth(0.6).stroke();
    y += 6;

    doc.font('Helvetica').fontSize(10).fillColor('#111111');

    for (const row of params.snapshot.others) {
      doc.text(row.athleteNumber !== null ? String(row.athleteNumber) : '—', colNumber, y, { width: 80 });
      doc.text(row.athleteName, colName, y, { width: pageWidth - 230 });
      doc.text('SEM CLASSIFICAÇÃO', startX + pageWidth - 140, y, { width: 140, align: 'right' });
      y += 16;

      if (y > doc.page.height - 90) {
        doc.addPage({ margin: 40 });
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FFFFFF');
        y = 50;
      }
    }

    if (params.snapshot.others.length === 0) {
      doc.text('Não há atletas adicionais fora do TOP 10.', startX, y);
    }

    const footerY = doc.page.height - 58;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#444444')
      .text(`Gerado em: ${formatDateTime(new Date())}`, startX, footerY, { width: pageWidth, align: 'left' })
      .text('Sistema: JUDGESCORE PRO', startX, footerY + 10, { width: pageWidth, align: 'left' })
      .text(`Documento oficial: ${params.documentId}`, startX, footerY + 20, { width: pageWidth, align: 'left' });

    doc.end();
  });
}
