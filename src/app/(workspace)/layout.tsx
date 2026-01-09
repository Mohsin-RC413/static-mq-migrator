'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Source', href: '/source' },
  { label: 'Destination', href: '/destination' },
  { label: 'Summary', href: '/summary' },
  { label: 'Settings', href: '/settings' },
];

export default function WorkspaceLayout({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      const keysToClear = [
        'accessToken',
        'backupDone',
        'testDone',
        'migrationDone',
        'sourceConnected',
        'selectedQueues',
        'sourceForm',
        'sourceSftp',
        'sourceScp',
        'destinationForm',
        'destinationDropdowns',
        'destinationSelectedQueues',
        'destinationTestDone',
        'destinationMigrationDone',
        'destinationConnected',
        'kubeconfigPath',
      ];
      keysToClear.forEach((key) => localStorage.removeItem(key));
    }
    router.push('/');
  };

  return (
    <div className="min-h-screen flex bg-gray-50 font-['Montserrat']">
      <aside className="w-64 bg-gradient-to-b from-black via-neutral-950 to-neutral-900 text-gray-100 flex flex-col border-r border-neutral-800">
        <div className="px-6 py-8">
          <Link
            href="/source"
            className="text-[11px] tracking-[0.3em] uppercase text-gray-300 hover:text-white transition-colors"
          >
            Migration
          </Link>
        </div>

        <nav className="mt-4 flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-300 text-black shadow-sm'
                    : 'text-gray-200 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-6 text-xs text-gray-500">
          <p>Royal Cyber</p>
          <p className="text-gray-600">Migration Suite</p>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 px-8 py-10">
        <div className="flex justify-end mb-6">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Log out
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
