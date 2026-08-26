'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

export interface CardActionItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary';
  href?: string;
  download?: boolean;
}

interface CardActionMenuProps {
  actions: CardActionItem[];
  title?: string;
}

export function CardActionMenu({ actions, title }: CardActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-xl bg-platform-tertiary/80 hover:bg-platform-border text-slate-300 hover:text-white border border-platform-border/80 transition-all min-h-[38px] min-w-[38px] flex items-center justify-center shadow-sm active:scale-95"
        title={title || 'Opțiuni'}
        aria-label="Opțiuni card"
      >
        <MoreVertical className="w-4 h-4 text-platform-textSecondary" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-52 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-platform-border shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action, idx) => {
            const isDanger = action.variant === 'danger';
            const isPrimary = action.variant === 'primary';

            if (action.href) {
              return (
                <a
                  key={idx}
                  href={action.href}
                  download={action.download}
                  onClick={() => {
                    setIsOpen(false);
                    action.onClick();
                  }}
                  className="flex items-center space-x-2.5 px-3.5 py-2.5 text-xs font-mono text-slate-200 hover:bg-platform-tertiary transition cursor-pointer"
                >
                  <span className="w-4 h-4 shrink-0 text-platform-green flex items-center justify-center">{action.icon}</span>
                  <span className="truncate">{action.label}</span>
                </a>
              );
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(false);
                  action.onClick();
                }}
                className={`w-full flex items-center space-x-2.5 px-3.5 py-2.5 text-xs font-mono text-left transition cursor-pointer ${
                  isDanger
                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                    : isPrimary
                    ? 'text-platform-green hover:bg-platform-green/10 font-semibold'
                    : 'text-slate-200 hover:bg-platform-tertiary'
                }`}
              >
                <span className="w-4 h-4 shrink-0 flex items-center justify-center">{action.icon}</span>
                <span className="truncate">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
