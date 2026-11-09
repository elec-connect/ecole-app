'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type Item = { href: string; label: string; icon: string };

interface Props {
  items: Item[];
  titre: string;
  logoUrl?: string;
}

export function Sidebar({ items, titre, logoUrl }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-100 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-100 flex flex-col items-center gap-2">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
        ) : (
          <div className="text-3xl">🎓</div>
        )}
        <h2 className="text-lg font-bold text-gray-900 text-center">{titre}</h2>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => {
          const actif = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition',
                actif ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}