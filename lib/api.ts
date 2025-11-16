const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export interface SongPath {
  id: number
  song_id: number
  file_path: string
  filename: string
  is_primary: boolean
  file_exists: boolean
  created_at: string | null
  updated_at: string | null
}

export interface Song {
  id: number
  fingerprint: string
  display_name: string
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
  file_paths?: SongPath[]
  file_path?: string
}

export interface UpdateSongResponse {
  song: Song
  updated: string[]
  message?: string
}

export interface Tag {
  id: number
  name: string
  description: string | null
  group_id: number | null
  group_name: string | null
  created_at: string | null
  sort_order: number | null
  is_deleted: boolean
}

export interface TagGroup {
  id: number
  name: string
  description: string | null
  color: string | null
  created_at: string | null
  is_default: boolean
  is_deleted: boolean
}

export interface TagWithState extends Tag {
  assigned?: boolean
}

export interface TagGroupWithTags extends TagGroup {
  tags: TagWithState[]
}

export interface SongMetadataResponse {
  song: Song
  tag_groups: TagGroupWithTags[]
  default_group_id: number
  deleted_group_id: number
}

export interface CreateTagResult {
  tag: Tag
  restored: boolean
  message?: string
}

export interface TagGroupsWithTagsResponse {
  tag_groups: TagGroupWithTags[]
}

export interface DeleteTagGroupResponse {
  message: string
  default_group_id: number
}

export interface QueryBuilderField {
  name: string
  label: string
  inputType: 'text' | 'number' | 'select' | 'checkbox'
  operators: Array<
    | {
        name: string
        label?: string
      }
    | string
  >
  values?: Array<{
    name: string
    label: string
  }>
  min?: number
  max?: number
  step?: number
}

export interface QueryBuilderFieldsResponse {
  fields: QueryBuilderField[]
  metadata: {
    total_fields: number
    total_tags: number
    year_range: {
      min: number | null
      max: number | null
    }
    tempo_range: {
      min: number | null
      max: number | null
    }
    duration_range: {
      min: number | null
      max: number | null
    }
  }
}

export interface SongsFilters {
  tag?: string
  tag1?: string
  tag2?: string
  display_name?: string
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
  // Support for negated filters (NOT conditions)
  not_display_name?: string
  not_artist?: string
  not_genre?: string
  not_album?: string
  not_year?: number
  not_tag?: string
  not_tag1?: string
  not_tag2?: string
  // Support for dynamic numbered parameters for OR groups
  [key: string]: string | number | undefined
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
  // Get all songs with optional SQL query filter
  getSongs: async (sqlQuery?: string): Promise<Song[]> => {
    const response = await fetch(`${API_BASE_URL}/songs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: sqlQuery || '',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  },

  // Update song metadata
  updateSong: async (
    songId: number,
    payload: Partial<Pick<Song, 'display_name'>>,
  ): Promise<UpdateSongResponse> => {
    return apiRequest<UpdateSongResponse>(`/songs/${songId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  // Fetch metadata and tag structure for a song
  getSongMetadata: async (songId: number): Promise<SongMetadataResponse> => {
    return apiRequest<SongMetadataResponse>(`/songs/${songId}/metadata`)
  },

  // Add tag to song
  addTagToSong: async (
    songId: number,
    tagName: string,
    options?: { groupId?: number; description?: string },
  ): Promise<{ message: string; tag: Tag }> => {
    return apiRequest<{ message: string; tag: Tag }>(`/songs/${songId}/tags`, {
      method: 'POST',
      body: JSON.stringify({
        tag_name: tagName,
        group_id: options?.groupId,
        description: options?.description,
      }),
    })
  },

  // Remove tag from song
  removeTagFromSong: async (songId: number, tagId: number): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/songs/${songId}/tags/${tagId}`, {
      method: 'DELETE',
    })
  },

  // Bulk update tags for multiple songs
  bulkUpdateSongTags: async (
    songIds: number[],
    addTags?: Array<string | { name: string; group_id?: number; description?: string }>,
    removeTags?: Array<number | string | { id?: number; name?: string }>,
  ): Promise<{
    processed_song_ids: number[]
    additions_applied: number
    removals_applied: number
    created_tags: Tag[]
    missing_remove_tags?: Array<{ id?: string; name?: string }>
  }> => {
    return apiRequest(`/songs/bulk-tags`, {
      method: 'POST',
      body: JSON.stringify({
        song_ids: songIds,
        add_tags: addTags,
        remove_tags: removeTags,
      }),
    })
  },
}

export const tagsApi = {
  // Get all tags
  getTags: async (): Promise<Tag[]> => {
    return apiRequest<Tag[]>('/tags')
  },

  // Create new tag
  createTag: async (
    name: string,
    description?: string,
    groupId?: number,
  ): Promise<CreateTagResult> => {
    const response = await apiRequest<Tag | { message?: string; tag: Tag }>(
      '/tags',
      {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        group_id: groupId,
      }),
      },
    )

    if ('tag' in response) {
      return { tag: response.tag, restored: true, message: response.message }
    }

    return { tag: response, restored: false }
  },

  // Get tag groups
  getTagGroups: async (): Promise<TagGroup[]> => {
    return apiRequest<TagGroup[]>('/tag-groups')
  },

  // Get tag groups with tags (optionally for a specific song)
  getTagGroupsWithTags: async (songId?: number): Promise<TagGroupsWithTagsResponse> => {
    const query = songId != null ? `?song_id=${songId}` : ''
    return apiRequest<TagGroupsWithTagsResponse>(`/tag-groups/with-tags${query}`)
  },

  // Update a tag's metadata
  updateTag: async (
    tagId: number,
    payload: Partial<{ name: string; description: string | null; group_id: number | null; sort_order: number }>,
  ): Promise<Tag> => {
    return apiRequest<Tag>(`/tags/${tagId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  // Create a new tag group
  createGroup: async (name: string, description?: string, color?: string): Promise<TagGroup> => {
    return apiRequest<TagGroup>('/tag-groups', {
      method: 'POST',
      body: JSON.stringify({ name, description, color }),
    })
  },

  // Update an existing tag group
  updateGroup: async (
    groupId: number,
    payload: Partial<{ name: string; description: string | null; color: string | null }>,
  ): Promise<TagGroup> => {
    return apiRequest<TagGroup>(`/tag-groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  // Delete a tag group (returns default group reassignment info)
  deleteGroup: async (groupId: number): Promise<DeleteTagGroupResponse> => {
    return apiRequest<DeleteTagGroupResponse>(`/tag-groups/${groupId}`, {
      method: 'DELETE',
    })
  },

  // Reorder tags within a group
  reorderGroup: async (groupId: number, tagIds: number[]): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/tag-groups/${groupId}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ tag_ids: tagIds }),
    })
  },
}

export const queryBuilderApi = {
  // Get QueryBuilder field configuration
  getFields: async (): Promise<QueryBuilderFieldsResponse> => {
    return apiRequest<QueryBuilderFieldsResponse>('/querybuilder/fields')
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