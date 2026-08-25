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

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    if (typeof window !== 'undefined') {
      window.location.href = `${window.location.origin}/login`;
    }
  };

  const role = (session?.user as any)?.role;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-platform-card/90 border-b border-platform-border text-slate-100 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand logo & Title */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="p-2 rounded-xl bg-platform-tertiary border border-platform-border shadow-md group-hover:border-platform-green transition-colors">
            <Film className="w-5 h-5 text-platform-green" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-display text-lg font-bold tracking-tight text-slate-100 group-hover:text-platform-green transition-colors">
              VVROBOTS 19116
            </span>
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-platform-green/10 text-platform-green border border-platform-green/20">
              <span className="led-indicator" />
              <span>MEDIA HUB</span>
            </span>
          </div>
        </Link>

        {/* User Info & Actions */}
        <div className="flex items-center space-x-3">
          
          {session?.user && (
            <>
              {/* Role Badge */}
              <div className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-mono font-semibold border bg-platform-tertiary border-platform-border text-slate-200">
                {role === 'ADMIN' && (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-platform-green" />
                    <span className="text-platform-green">ADMIN</span>
                  </>
                )}
                {role === 'EDITOR' && (
                  <>
                    <Edit3 className="w-3.5 h-3.5 text-platform-blue" />
                    <span className="text-platform-blue">EDITOR</span>
                  </>
                )}
                {role === 'VIEWER' && (
                  <>
                    <Eye className="w-3.5 h-3.5 text-platform-green" />
                    <span className="text-platform-green">VIEWER</span>
                  </>
                )}
              </div>

              {/* Admin Dashboard Link */}
              {role === 'ADMIN' && (
                <Link
                  href="/admin/dashboard"
                  className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-platform-tertiary hover:bg-platform-border text-slate-200 border border-platform-border transition"
                  title="Panou Administrare Spațiu Disc"
                >
                  <HardDrive className="w-4 h-4 text-platform-green" />
                  <span className="hidden md:inline">Storage Server</span>
                </Link>
              )}
            </>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-platform-tertiary hover:bg-platform-border text-slate-300 transition border border-platform-border"
            title="Schimbă tema"
          >
            {darkMode ? <Sun className="w-4 h-4 text-platform-green" /> : <Moon className="w-4 h-4 text-platform-blue" />}
          </button>

          {/* User Profile / Logout */}
          {session?.user ? (
            <div className="flex items-center space-x-3 pl-2 border-l border-platform-border">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200">{session.user.name}</span>
                <span className="text-[10px] font-mono text-platform-textMuted">{session.user.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
                title="Deconectare"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="btn-platform-primary px-4 py-1.5 text-xs shadow"
            >
              Autentificare
            </Link>
          )}

        </div>

      </div>
    </header>
  );
}
