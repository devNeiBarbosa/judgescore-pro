import nodemailer from 'nodemailer';

interface SendInscriptionConfirmationEmailParams {
  to: string;
  pdfBuffer: Buffer;
  inscriptionId: string;
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !portRaw || !user || !pass || !from) {
    return null;
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }

  return {
    host,
    port,
    user,
    pass,
    from,
    secure: port === 465,
  };
}

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const config = getSmtpConfig();
  if (!config) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return cachedTransporter;
}

export async function sendInscriptionConfirmationEmail(params: SendInscriptionConfirmationEmailParams) {
  const config = getSmtpConfig();
  const transporter = getTransporter();

  if (!config || !transporter) {
    console.warn('Inscription confirmation email skipped: SMTP is not fully configured.');
    return { sent: false as const, reason: 'smtp_not_configured' as const };
  }

  await transporter.sendMail({
    from: config.from,
    to: params.to,
    subject: 'Confirmação de inscrição',
    text: 'Sua inscrição foi realizada com sucesso.\nApresente este comprovante no dia da pesagem.',
    attachments: [
      {
        filename: `comprovante-inscricao-${params.inscriptionId}.pdf`,
        content: params.pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  return { sent: true as const };
}
