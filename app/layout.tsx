import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '700'],
});

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return {
    title: 'JUDGESCORE PRO - Gestão de Campeonatos',
    description:
      'Plataforma profissional de gestão de campeonatos de fisiculturismo',
    metadataBase: new URL(baseUrl),

    // ✅ FAVICON CORRETO (AGORA PADRONIZADO)
    icons: {
      icon: '/assets/logo/icon-symbol.png',
      shortcut: '/assets/logo/icon-symbol.png',
      apple: '/assets/logo/icon-symbol.png',
    },

    openGraph: {
      title: 'JUDGESCORE PRO - Gestão de Campeonatos',
      description:
        'Plataforma profissional de gestão de campeonatos de fisiculturismo',
      images: ['/og-image.png'],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Script externo (mantido) */}
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>

      <body className={inter.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}