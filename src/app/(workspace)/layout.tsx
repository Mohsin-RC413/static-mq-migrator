'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import logo from '../../assets/c1e60e7780162b6f7a1ab33de09eea29e15bc73b.png';

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
  const normalizedPath =
    pathname && pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
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
        'loginToast',
      ];
      keysToClear.forEach((key) => localStorage.removeItem(key));
    }
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-['Roboto'] flex flex-col">
      <header className="h-14 bg-[#0b3b5a] text-white flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Image src={logo} alt="Royal Cyber" className="h-8 w-auto" priority />
          <div className="h-6 w-px bg-white/40" />
          <span className="text-xs font-semibold tracking-[0.28em] text-white">
            MIGRATION
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-white/30 px-3 py-1.5 text-xs font-semibold text-white hover:border-white/60 hover:bg-white/10"
        >
          Log out
        </button>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 bg-[#d1d5db] text-gray-800 flex flex-col border-r border-gray-300">
          <nav className="mt-6 flex-1 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive =
                normalizedPath === item.href ||
                (normalizedPath && normalizedPath.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-md'
                      : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-6 py-6 text-xs text-gray-600">
            <p>Royal Cyber</p>
            <p className="text-gray-500">Migration Suite</p>
          </div>
        </aside>

        <main className="flex-1 bg-gray-50 px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
