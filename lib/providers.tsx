'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, theme, App } from 'antd'
import { useState } from 'react'
import { MusicProvider } from './music-context'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes after last use
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors, but retry on network errors
          if (error?.status >= 400 && error?.status < 500) {
            return false
          }
          return failureCount < 3
        },
      },
      mutations: {
        retry: 1, // Retry mutations once on failure
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1677ff',
            fontFamily: "var(--font-noto-sans), var(--font-geist-sans), sans-serif",
          },
        }}
      >
        <App>
          <MusicProvider>
            {children}
          </MusicProvider>
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  )
}