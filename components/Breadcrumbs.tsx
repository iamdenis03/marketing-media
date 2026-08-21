'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center space-x-2 text-xs sm:text-sm text-slate-400 py-3 px-1 overflow-x-auto whitespace-nowrap scrollbar-none">
      <Link
        href="/"
        className="flex items-center space-x-1 hover:text-blue-400 text-slate-300 transition"
      >
        <Home className="w-4 h-4" />
        <span>Sezoane</span>
      </Link>

      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-blue-400 text-slate-300 transition truncate max-w-[200px]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-blue-400 truncate max-w-[250px]">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
