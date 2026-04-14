import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

export interface InscriptionReceiptData {
  inscriptionId: string;
  athleteName: string;
  athleteCpf: string;
  athleteEmail: string;
  organizationName: string;
  championshipName: string;
  inscriptionDate: Date;
  baseRegistration: boolean;
  extraCategories: number;
  totalCategoriesAllowed: number;
  painting: boolean;
  photos: boolean;
  status: string;
}

export interface InscriptionReceiptEntity {
  id: string;
  baseRegistration: boolean;
  extraCategories: number;
  totalCategoriesAllowed: number;
  painting: boolean;
  photos: boolean;
  status: string;
  createdAt: Date;
  athlete: {
    name: string;
    email: string;
    cpf: string | null;
  };
  championship: {
    name: string;
  };
  organization: {
    name: string;
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

function drawLabelValue(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#111111')
    .text(`${label}: `, { continued: true })
    .font('Helvetica')
    .text(value);
}

function resolveLogoForLightBackground() {
  const preferred = path.join(process.cwd(), 'public/assets/logo/logo-transparent-dark.png');
  const fallback = path.join(process.cwd(), 'public/assets/logo/icon-symbol.png');
  return fs.existsSync(preferred) ? preferred : fallback;
}

function resolveIconFallback() {
  return path.join(process.cwd(), 'public/assets/logo/icon-symbol.png');
}

export function toInscriptionReceiptData(entity: InscriptionReceiptEntity): InscriptionReceiptData {
  return {
    inscriptionId: entity.id,
    athleteName: entity.athlete.name,
    athleteCpf: entity.athlete.cpf ?? 'Não informado',
    athleteEmail: entity.athlete.email,
    organizationName: entity.organization.name,
    championshipName: entity.championship.name,
    inscriptionDate: entity.createdAt,
    baseRegistration: entity.baseRegistration,
    extraCategories: entity.extraCategories,
    totalCategoriesAllowed: entity.totalCategoriesAllowed,
    painting: entity.painting,
    photos: entity.photos,
    status: entity.status,
  };
}

export async function generateInscriptionReceiptPdf(data: InscriptionReceiptData): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Comprovante de Inscrição ${data.inscriptionId}`,
        Author: 'JUDGESCORE PRO',
      },
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const iconPath = resolveIconFallback();
    const logoPath = resolveLogoForLightBackground();

    if (fs.existsSync(iconPath)) {
      doc.image(iconPath, 50, 48, { fit: [30, 30] });
    }

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 88, 40, { fit: [240, 70] });
    }

    doc
      .moveDown(3.2)
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#111111')
      .text('Comprovante de Inscrição', { align: 'center' })
      .moveDown(1.2);

    drawLabelValue(doc, 'Nome do atleta', data.athleteName);
    drawLabelValue(doc, 'CPF', data.athleteCpf);
    drawLabelValue(doc, 'E-mail', data.athleteEmail);
    drawLabelValue(doc, 'Organização', data.organizationName);
    drawLabelValue(doc, 'Campeonato', data.championshipName);
    drawLabelValue(doc, 'Data da inscrição', formatDate(data.inscriptionDate));
    drawLabelValue(doc, 'Inscrição base', data.baseRegistration ? 'Sim' : 'Não');
    drawLabelValue(doc, 'Quantidade de categorias extras', String(data.extraCategories));
    drawLabelValue(doc, 'Total de categorias permitidas', String(data.totalCategoriesAllowed));
    drawLabelValue(doc, 'Serviço de pintura', data.painting ? 'Sim' : 'Não');
    drawLabelValue(doc, 'Serviço de fotos', data.photos ? 'Sim' : 'Não');
    drawLabelValue(doc, 'Status', data.status);
    drawLabelValue(doc, 'ID da inscrição', data.inscriptionId);

    doc
      .moveDown(2)
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#666666')
      .text('Documento gerado automaticamente pelo sistema JUDGESCORE PRO.', { align: 'left' })
      .text('Apresente este comprovante no dia da pesagem.', { align: 'left' });

    doc.end();
  });
}
