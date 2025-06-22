'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import the providers to prevent SSR issues
const DynamicProviders = dynamic(
  () => import('./wagmi-provider').then((mod) => ({ default: mod.Providers })),
  {
    ssr: false, // Disable SSR for this component
    loading: () => (
      <div className="min-h-screen w-full bg-[#0D001D] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Initializing wallet connection...</p>
        </div>
      </div>
    ),
  }
);

export function ClientOnlyProviders({ children }: { children: React.ReactNode }) {
  return <DynamicProviders>{children}</DynamicProviders>;
}
