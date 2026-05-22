import type { Metadata } from 'next';
import { DM_Mono, Syne } from 'next/font/google';
import Providers from './providers';
import './globals.css';

const syne = Syne({ subsets: ['latin'], variable: '--font-sans', weight: ['400', '600', '800'] });
const mono = DM_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'KTI Tracker — Kotai em tempo real',
  description: 'Preço ao vivo, conversor BRL e análise IA do token Kotai (KTI)',
  icons: {
    icon: '/kotai-logo.svg',
    shortcut: '/kotai-logo.svg',
    apple: '/kotai-logo.svg',
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${syne.variable} ${mono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
