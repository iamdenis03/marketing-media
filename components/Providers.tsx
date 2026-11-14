'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';
import { UploadProvider } from '@/components/UploadManager';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UploadProvider>{children}</UploadProvider>
    </SessionProvider>
  );
}
