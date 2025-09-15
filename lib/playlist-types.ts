import { Song, SongsFilters } from './api'

export interface PlaylistFilter {
  id: string
  name: string
  filters: SongsFilters
  created_at?: string
  updated_at?: string
}

export interface Playlist {
  id: number
  name: string
  filters: PlaylistFilter[]
  manual_songs: Song[]
  created_at?: string
  updated_at?: string
}

export interface QueueItem {
  id: string
  song: Song
  position: number
  is_current: boolean
  added_via: 'filter' | 'manual'
  filter_id?: string
}

export interface PlaylistQueue {
  id: string
  playlist_id: number
  items: QueueItem[]
  current_position: number
  shuffle: boolean
  repeat: 'none' | 'all' | 'one'
  autoplay: boolean
  created_at?: string
  updated_at?: string
}

export interface PlaylistOptions {
  shuffle: boolean
  repeat: 'none' | 'all' | 'one'
  autoplay: boolean
}

export class FilterProcessor {
  static applyFilters(songs: Song[], filters: SongsFilters): Song[] {
    return songs.filter(song => {
      // Text filters
      if (filters.artist && !song.artist?.toLowerCase().includes(filters.artist.toLowerCase())) {
        return false
      }
      if (filters.album && !song.album?.toLowerCase().includes(filters.album.toLowerCase())) {
        return false
      }
      if (filters.genre && !song.genre?.toLowerCase().includes(filters.genre.toLowerCase())) {
        return false
      }
      if (filters.year && song.year !== filters.year) {
        return false
      }

      // Tag filters
      if (filters.tag1 && !song.tags.some(tag => tag.name === filters.tag1)) {
        return false
      }
      if (filters.tag2 && !song.tags.some(tag => tag.name === filters.tag2)) {
        return false
      }
      if (filters.tag && !song.tags.some(tag => tag.name === filters.tag)) {
        return false
      }

      // Audio feature range filters
      if (filters.energy_min !== undefined && (song.energy === null || song.energy < filters.energy_min)) {
        return false
      }
      if (filters.energy_max !== undefined && (song.energy === null || song.energy > filters.energy_max)) {
        return false
      }
      if (filters.valence_min !== undefined && (song.valence === null || song.valence < filters.valence_min)) {
        return false
      }
      if (filters.valence_max !== undefined && (song.valence === null || song.valence > filters.valence_max)) {
        return false
      }
      if (filters.danceability_min !== undefined && (song.danceability === null || song.danceability < filters.danceability_min)) {
        return false
      }
      if (filters.danceability_max !== undefined && (song.danceability === null || song.danceability > filters.danceability_max)) {
        return false
      }
      if (filters.tempo_min !== undefined && (song.tempo === null || song.tempo < filters.tempo_min)) {
        return false
      }
      if (filters.tempo_max !== undefined && (song.tempo === null || song.tempo > filters.tempo_max)) {
        return false
      }

      return true
    })
  }

  static generateQueue(playlist: Playlist, allSongs: Song[]): QueueItem[] {
    const queueItems: QueueItem[] = []
    let position = 0

    // Add songs from filters
    playlist.filters.forEach(filter => {
      const filteredSongs = this.applyFilters(allSongs, filter.filters)
      filteredSongs.forEach(song => {
        // Check if song is already in queue to avoid duplicates
        const existingItem = queueItems.find(item => item.song.id === song.id)
        if (!existingItem) {
          queueItems.push({
            id: `${song.id}-${position}`,
            song,
            position: position++,
            is_current: false,
            added_via: 'filter',
            filter_id: filter.id
          })
        }
      })
    })

    // Add manually added songs
    playlist.manual_songs.forEach(song => {
      // Check if song is already in queue to avoid duplicates
      const existingItem = queueItems.find(item => item.song.id === song.id)
      if (!existingItem) {
        queueItems.push({
          id: `${song.id}-${position}`,
          song,
          position: position++,
          is_current: false,
          added_via: 'manual'
        })
      }
    })

    return queueItems
  }
}

export function generateFilterId(): string {
  return `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function getNextPlaylistId(existingPlaylists: Playlist[]): number {
  if (existingPlaylists.length === 0) return 1
  return Math.max(...existingPlaylists.map(p => p.id)) + 1
}