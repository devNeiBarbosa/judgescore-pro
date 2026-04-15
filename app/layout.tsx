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
    icons: {
      icon: [
        { url: '/assets/logo/favicon.ico' },
        { url: '/assets/logo/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/assets/logo/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: [{ url: '/assets/logo/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
      shortcut: '/assets/logo/favicon.ico',
    },
    openGraph: {
      title: 'JUDGESCORE PRO - Gestão de Campeonatos',
      description:
        'Plataforma profissional de gestão de campeonatos de fisiculturismo',
      images: ['/assets/logo/og-image.png'],
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
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className={inter.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}