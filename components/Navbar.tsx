'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { 
  Film, 
  Sun, 
  Moon, 
  LogOut, 
  HardDrive, 
  ShieldCheck, 
  Edit3, 
  Eye 
} from 'lucide-react';

export function Navbar() {
  const { data: session } = useSession();
  const [darkMode, setDarkMode] = useState<boolean>(true);

  useEffect(() => {
    // Default to dark mode for modern high-tech aesthetic
    const isDark = localStorage.getItem('theme') !== 'light';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const role = (session?.user as any)?.role;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-900/80 dark:bg-slate-950/80 border-b border-slate-800 text-slate-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand logo & Title */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-blue-600 shadow-md group-hover:scale-105 transition-transform duration-200">
            <Film className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-wider bg-gradient-to-r from-blue-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
              VVROBOTS 19116
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Media Hub
            </span>
          </div>
        </Link>

        {/* User Info & Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          
          {session?.user && (
            <>
              {/* Role Badge */}
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-800 border-slate-700 text-slate-300">
                {role === 'ADMIN' && (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-400 font-semibold">ADMIN</span>
                  </>
                )}
                {role === 'EDITOR' && (
                  <>
                    <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-blue-400 font-semibold">EDITOR</span>
                  </>
                )}
                {role === 'VIEWER' && (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">VIEWER</span>
                  </>
                )}
              </div>

              {/* Admin Dashboard Link */}
              {role === 'ADMIN' && (
                <Link
                  href="/admin/dashboard"
                  className="flex items-center space-x-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  title="Panou Administrare Spațiu Disc"
                >
                  <HardDrive className="w-4 h-4 text-amber-400" />
                  <span className="hidden md:inline">Server Storage</span>
                </Link>
              )}
            </>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Schimbă tema (Întunecat/Luminos)"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-blue-400" />}
          </button>

          {/* User Profile / Logout */}
          {session?.user ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200">{session.user.name}</span>
                <span className="text-[10px] text-slate-400">{session.user.email}</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                title="Deconectare"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-600 to-amber-600 text-white hover:opacity-95 shadow transition"
            >
              Autentificare
            </Link>
          )}

        </div>

      </div>
    </header>
  );
}
