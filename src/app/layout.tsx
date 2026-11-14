import type { Metadata, Viewport } from 'next';
// @ts-ignore Next.js processes global CSS imports at build time.
import './globals.css';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'ÉcoleApp — Gestion scolaire',
  description: 'Plateforme de gestion pour lycées et collèges',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e40af',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}