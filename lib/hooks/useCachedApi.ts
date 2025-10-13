'use client'

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { songsApi, tagsApi, type Song, type Tag } from '../api'

// Query keys for consistent caching
export const QUERY_KEYS = {
  songs: {
    all: ['songs'] as const,
    lists: () => [...QUERY_KEYS.songs.all, 'list'] as const,
    list: (filter?: string) => [...QUERY_KEYS.songs.lists(), { filter }] as const,
    details: () => [...QUERY_KEYS.songs.all, 'detail'] as const,
    detail: (id: number) => [...QUERY_KEYS.songs.details(), id] as const,
  },
  tags: {
    all: ['tags'] as const,
    lists: () => [...QUERY_KEYS.tags.all, 'list'] as const,
  },
} as const

// Enhanced songs hook with intelligent caching
export function useSongs(sqlQuery?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.songs.list(sqlQuery),
    queryFn: () => songsApi.getSongs(sqlQuery),
    staleTime: 5 * 60 * 1000, // 5 minutes - songs don't change frequently
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes after last use
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    // Enable background refetching for fresh data
    refetchInterval: 30 * 60 * 1000, // Refresh every 30 minutes in background
  })
}

// Hook specifically for all songs (no filter) with longer cache time
export function useAllSongs() {
  return useQuery({
    queryKey: QUERY_KEYS.songs.list(undefined),
    queryFn: () => songsApi.getSongs(),
    staleTime: 10 * 60 * 1000, // 10 minutes - base library changes less frequently
    gcTime: 30 * 60 * 1000, // Keep full library in cache for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: 60 * 60 * 1000, // Refresh every hour in background
  })
}

// Hook for tags with caching
export function useTags() {
  return useQuery({
    queryKey: QUERY_KEYS.tags.lists(),
    queryFn: () => tagsApi.getTags(),
    staleTime: 15 * 60 * 1000, // 15 minutes - tags change even less frequently
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

// Custom hook for cache management
export function useSongsCacheManager() {
  const queryClient = useQueryClient()

  return {
    // Prefetch all songs for instant loading
    prefetchAllSongs: () => {
      return queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.songs.list(undefined),
        queryFn: () => songsApi.getSongs(),
        staleTime: 10 * 60 * 1000,
      })
    },

    // Prefetch common filters
    prefetchCommonFilters: async (commonQueries: string[]) => {
      const promises = commonQueries.map(query => 
        queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.songs.list(query),
          queryFn: () => songsApi.getSongs(query),
          staleTime: 5 * 60 * 1000,
        })
      )
      return Promise.all(promises)
    },

    // Invalidate songs cache (call after adding/editing songs)
    invalidateSongs: () => {
      return queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.songs.all,
      })
    },

    // Get cached songs without network request
    getCachedSongs: (sqlQuery?: string): Song[] | undefined => {
      return queryClient.getQueryData(QUERY_KEYS.songs.list(sqlQuery))
    },

    // Manually set songs data in cache
    setSongsCache: (sqlQuery: string | undefined, data: Song[]) => {
      queryClient.setQueryData(QUERY_KEYS.songs.list(sqlQuery), data)
    },

    // Remove specific query from cache
    removeSongsQuery: (sqlQuery?: string) => {
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.songs.list(sqlQuery),
      })
    },

    // Get cache statistics for debugging
    getCacheStats: () => {
      const cache = queryClient.getQueryCache()
      const songsQueries = cache.findAll({
        queryKey: QUERY_KEYS.songs.all,
      })
      
      return {
        totalSongsQueries: songsQueries.length,
        queriesData: songsQueries.map(query => ({
          key: query.queryKey,
          dataSize: Array.isArray(query.state.data) ? query.state.data.length : 0,
          lastFetch: query.state.dataUpdatedAt,
          isStale: query.isStale(),
        })),
      }
    },
  }
}

// Enhanced tag management with caching
export function useTagMutations() {
  const queryClient = useQueryClient()

  const addTagToSong = useMutation({
    mutationFn: ({ songId, tagName }: { songId: number; tagName: string }) =>
      songsApi.addTagToSong(songId, tagName),
    onSuccess: (data: { message: string; tag: Tag }, variables) => {
      // Update the song in all relevant caches
      const allSongsQueries = queryClient.getQueriesData({
        queryKey: QUERY_KEYS.songs.lists(),
      })

      allSongsQueries.forEach(([queryKey, songsData]) => {
        if (Array.isArray(songsData)) {
          const updatedSongs = (songsData as Song[]).map(song => 
            song.id === variables.songId 
              ? { ...song, tags: [...song.tags, data.tag] }
              : song
          )
          queryClient.setQueryData(queryKey, updatedSongs)
        }
      })

      // Also invalidate tags cache
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.tags.all,
      })
    },
  })

  const removeTagFromSong = useMutation({
    mutationFn: ({ songId, tagId }: { songId: number; tagId: number }) =>
      songsApi.removeTagFromSong(songId, tagId),
    onSuccess: (data: { message: string }, variables) => {
      // Update the song in all relevant caches
      const allSongsQueries = queryClient.getQueriesData({
        queryKey: QUERY_KEYS.songs.lists(),
      })

      allSongsQueries.forEach(([queryKey, songsData]) => {
        if (Array.isArray(songsData)) {
          const updatedSongs = (songsData as Song[]).map(song => 
            song.id === variables.songId 
              ? { ...song, tags: song.tags.filter((tag: Tag) => tag.id !== variables.tagId) }
              : song
          )
          queryClient.setQueryData(queryKey, updatedSongs)
        }
      })
    },
  })

  return {
    addTagToSong,
    removeTagFromSong,
  }
}

// Hook for optimistic local filtering (instant response)
export function useOptimisticFiltering() {
  const cacheManager = useSongsCacheManager()

  return {
    // Filter cached songs locally for instant results
    filterSongsLocally: (sqlQuery: string): Song[] | null => {
      const allSongs = cacheManager.getCachedSongs(undefined)
      if (!allSongs) return null

      // For simple queries, we can filter locally
      // This is a simplified implementation - you could expand this
      if (sqlQuery.includes('WHERE')) {
        try {
          // Very basic local filtering for common cases
          const lowerQuery = sqlQuery.toLowerCase()
          
          if (lowerQuery.includes('artist like')) {
            const match = lowerQuery.match(/artist like ['"]([^'"]+)['"]/)
            if (match) {
              const artistFilter = match[1].replace(/%/g, '')
              return allSongs.filter(song => 
                song.artist?.toLowerCase().includes(artistFilter.toLowerCase())
              )
            }
          }
          
          if (lowerQuery.includes('genre like')) {
            const match = lowerQuery.match(/genre like ['"]([^'"]+)['"]/)
            if (match) {
              const genreFilter = match[1].replace(/%/g, '')
              return allSongs.filter(song => 
                song.genre?.toLowerCase().includes(genreFilter.toLowerCase())
              )
            }
          }
          
          // Add more local filtering logic as needed
        } catch (e) {
          console.warn('Local filtering failed, will use network request:', e)
        }
      }
      
      return null // Fall back to network request
    },
  }
}