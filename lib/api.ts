const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export interface Song {
  id: number
  filename: string
  display_name: string
  file_path: string
  duration: number | null
  file_size: number | null
  tempo: number | null
  key: string | null
  mode: string | null
  energy: number | null
  valence: number | null
  danceability: number | null
  artist: string | null
  album: string | null
  year: number | null
  genre: string | null
  track_number: number | null
  last_played: string | null
  created_at: string | null
  updated_at: string | null
  tags: Tag[]
}

export interface Tag {
  id: number
  name: string
  description: string | null
  group_id: number | null
  group_name: string | null
  created_at: string | null
}

export interface TagGroup {
  id: number
  name: string
  description: string | null
  color: string | null
  created_at: string | null
}

export interface SongsFilters {
  tag?: string
  tag1?: string
  tag2?: string
  artist?: string
  genre?: string
  album?: string
  year?: number
  energy_min?: number
  energy_max?: number
  valence_min?: number
  valence_max?: number
  danceability_min?: number
  danceability_max?: number
  tempo_min?: number
  tempo_max?: number
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new ApiError(response.status, errorData.error || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const songsApi = {
  // Get all songs with optional filters
  getSongs: async (filters?: SongsFilters): Promise<Song[]> => {
    const params = new URLSearchParams()

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString())
        }
      })
    }

    const queryString = params.toString()
    const endpoint = queryString ? `/songs?${queryString}` : '/songs'

    return apiRequest<Song[]>(endpoint)
  },

  // Add tag to song
  addTagToSong: async (songId: number, tagName: string): Promise<{ message: string; tag: Tag }> => {
    return apiRequest<{ message: string; tag: Tag }>(`/songs/${songId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tag_name: tagName }),
    })
  },

  // Remove tag from song
  removeTagFromSong: async (songId: number, tagId: number): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/songs/${songId}/tags/${tagId}`, {
      method: 'DELETE',
    })
  },
}

export const tagsApi = {
  // Get all tags
  getTags: async (): Promise<Tag[]> => {
    return apiRequest<Tag[]>('/tags')
  },

  // Create new tag
  createTag: async (name: string, description?: string, groupId?: number): Promise<Tag> => {
    return apiRequest<Tag>('/tags', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        group_id: groupId,
      }),
    })
  },

  // Get tag groups
  getTagGroups: async (): Promise<TagGroup[]> => {
    return apiRequest<TagGroup[]>('/tag-groups')
  },
}

export const playlistApi = {
  // Get all playlists
  getPlaylists: async (): Promise<any[]> => {
    return apiRequest<any[]>('/playlists')
  },

  // Create new playlist
  createPlaylist: async (name: string, description?: string): Promise<any> => {
    return apiRequest<any>('/playlists', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    })
  },

  // Get specific playlist
  getPlaylist: async (playlistId: number): Promise<any> => {
    return apiRequest<any>(`/playlists/${playlistId}`)
  },

  // Update playlist
  updatePlaylist: async (playlistId: number, data: any): Promise<any> => {
    return apiRequest<any>(`/playlists/${playlistId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Delete playlist
  deletePlaylist: async (playlistId: number): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/playlists/${playlistId}`, {
      method: 'DELETE',
    })
  },

  // Add song to playlist
  addSongToPlaylist: async (playlistId: number, songId: number): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/playlists/${playlistId}/songs`, {
      method: 'POST',
      body: JSON.stringify({ song_id: songId }),
    })
  },

  // Remove song from playlist
  removeSongFromPlaylist: async (playlistId: number, songId: number): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/playlists/${playlistId}/songs/${songId}`, {
      method: 'DELETE',
    })
  },
}

export interface FilterField {
  type: 'string' | 'integer' | 'double'
  label: string
  values?: string[] | { value: string; label: string; group?: string }[]
  min?: number
  max?: number
  step?: number
  multiple?: boolean
  operators: string[]
}

export interface SongFiltersResponse {
  fields: Record<string, FilterField>
  tag_groups: TagGroup[]
}

export const filtersApi = {
  // Get available song filter fields and their options
  getSongFilters: async (): Promise<SongFiltersResponse> => {
    return apiRequest<SongFiltersResponse>('/song-filters')
  },
}

export const healthApi = {
  // Health check
  check: async (): Promise<{ status: string; message: string }> => {
    return apiRequest<{ status: string; message: string }>('/health')
  },
}

export { ApiError }