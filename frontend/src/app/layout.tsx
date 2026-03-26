import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ClubMy Ofertas',
  description: 'Plataforma para comparar promoções de supermercados por região.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
