'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useState, useEffect } from 'react';
import NetworkStatusProvider from '@/components/providers/NetworkStatusProvider';
import ZoneProvider from '@/components/providers/ZoneProvider';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import AuthProvider from '@/components/providers/AuthProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes stale
        gcTime: 1000 * 60 * 60 * 24, // 24 hours cache garbage collection
        retry: 1,
      },
    },
  }));

  const [persister, setPersister] = useState<any>(null);

  useEffect(() => {
    // Ensure we are on client side
    if (typeof window !== 'undefined') {
      const localStoragePersister = createSyncStoragePersister({
        storage: window.localStorage,
        key: 'DISASTER_PULSE_CACHE',
      });
      setPersister(localStoragePersister);
    }
  }, []);

  if (!persister) {
    return (
      <NetworkStatusProvider>
        <LanguageProvider>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <ZoneProvider>
                {children}
              </ZoneProvider>
            </QueryClientProvider>
          </AuthProvider>
        </LanguageProvider>
      </NetworkStatusProvider>
    );
  }

  return (
    <NetworkStatusProvider>
      <LanguageProvider>
        <AuthProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister }}
          >
            <ZoneProvider>
              {children}
            </ZoneProvider>
          </PersistQueryClientProvider>
        </AuthProvider>
      </LanguageProvider>
    </NetworkStatusProvider>
  );
}
