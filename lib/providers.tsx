'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, theme, App } from 'antd'
import { useState } from 'react'
import { MusicProvider } from './music-context'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
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