'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  backHref?: string;
}

export function Breadcrumbs({ items, backHref }: BreadcrumbsProps) {
  const router = useRouter();

  const getBackDestination = () => {
    if (backHref) return backHref;
    if (items.length > 1 && items[items.length - 2]?.href) {
      return items[items.length - 2].href;
    }
    if (items.length >= 1) {
      return '/';
    }
    return null;
  };

  const targetBack = getBackDestination();

  const handleBack = () => {
    if (targetBack) {
      router.push(targetBack);
    } else {
      router.back();
    }
  };

  return (
    <div className="flex items-center gap-2 py-1 px-0.5">
      {/* Back Arrow Navigation Button */}
      {items.length > 0 && (
        <button
          type="button"
          onClick={handleBack}
          className="p-2 px-2.5 rounded-xl bg-platform-tertiary/90 hover:bg-platform-border text-slate-200 hover:text-platform-green border border-platform-border/80 transition shadow-sm flex items-center space-x-1.5 shrink-0 group active:scale-95 min-h-[36px]"
          title="Înapoi"
          aria-label="Înapoi"
        >
          <ArrowLeft className="w-4 h-4 text-platform-green group-hover:-translate-x-0.5 transition-transform" />
          <span className="font-semibold text-xs text-slate-200 group-hover:text-platform-green hidden sm:inline">Înapoi</span>
        </button>
      )}

      {/* Breadcrumbs Track */}
      <nav className="flex items-center space-x-1.5 text-xs font-mono text-platform-textSecondary overflow-x-auto whitespace-nowrap scrollbar-none py-1 flex-1">
        <Link
          href="/"
          className="flex items-center space-x-1 hover:text-platform-green text-slate-300 transition shrink-0"
        >
          <Home className="w-3.5 h-3.5 text-platform-green" />
          <span>Sezoane</span>
        </Link>

        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3.5 h-3.5 text-platform-textMuted shrink-0" />
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-platform-green text-slate-300 transition truncate max-w-[130px] sm:max-w-[200px]"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-platform-green truncate max-w-[140px] sm:max-w-[240px]">
                {item.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>
    </div>
  );
}
