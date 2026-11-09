import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ÉcoleApp — Gestion scolaire',
  description: 'Plateforme de gestion pour lycées et collèges',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
