'use client'

import { useEffect } from 'react'
import { useSongsCacheManager, useTags } from '@/lib/hooks/useCachedApi'

export function CachePreloader() {
  const cacheManager = useSongsCacheManager()
  
  // Prefetch tags immediately
  useTags()

  useEffect(() => {
    // Prefetch all songs for instant library loading
    const prefetchData = async () => {
      try {
        console.log('🚀 Prefetching music library data...')
        
        // Prefetch all songs
        await cacheManager.prefetchAllSongs()

        
        console.log('✅ Cache preloading completed')
      } catch (error) {
        console.warn('⚠️ Cache preloading failed:', error)
      }
    }

    prefetchData()
  }, [cacheManager])

  return null // This component doesn't render anything
}

export function CacheDebugger() {
  const cacheManager = useSongsCacheManager()
  
  useEffect(() => {
    // Log cache stats every 10 seconds in development
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        const stats = cacheManager.getCacheStats()
        console.log('📊 Cache Stats:', stats)
      }, 10000)
      
      return () => clearInterval(interval)
    }
  }, [cacheManager])
  
  return null
}