'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Input, Button, Space, List, Typography, Popconfirm, message } from 'antd'
import { Plus, Save, FileText, Edit, Trash2, Music } from 'lucide-react'
import type { Playlist, PlaylistFilter } from '@/lib/playlist-types'
import { getNextPlaylistId } from '@/lib/playlist-types'
import { playlistApi } from '@/lib/api'
import type { Song } from '@/lib/api'

const { Title, Text } = Typography

interface PlaylistColumnProps {
  currentPlaylist: Playlist | null
  onPlaylistChange: (playlist: Playlist | null) => void
  onEditFilter: (filter: PlaylistFilter | null) => void
}

export function PlaylistColumn({
  currentPlaylist,
  onPlaylistChange,
  onEditFilter
}: PlaylistColumnProps) {
  const [playlistName, setPlaylistName] = useState('')
  const [editingPlaylistId, setEditingPlaylistId] = useState<number | null>(null)
  const [editingPlaylistName, setEditingPlaylistName] = useState('')
  const queryClient = useQueryClient()

  // Fetch saved playlists
  const {
    data: savedPlaylists = [],
    refetch: refetchPlaylists
  } = useQuery({
    queryKey: ['playlists'],
    queryFn: playlistApi.getPlaylists,
  })

  // Create playlist mutation
  const createPlaylistMutation = useMutation({
    mutationFn: (name: string) => playlistApi.createPlaylist(name),
    onSuccess: (newPlaylist) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
      onPlaylistChange(newPlaylist)
      setPlaylistName(newPlaylist.name)
      message.success('Playlist created')
    },
    onError: (error: any) => {
      message.error(`Error creating playlist: ${error.message}`)
    }
  })

  // Update playlist mutation
  const updatePlaylistMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      playlistApi.updatePlaylist(id, data),
    onSuccess: (updatedPlaylist) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
      onPlaylistChange(updatedPlaylist)
      message.success('Playlist saved')
    },
    onError: (error: any) => {
      message.error(`Error saving playlist: ${error.message}`)
    }
  })

  // Delete playlist mutation
  const deletePlaylistMutation = useMutation({
    mutationFn: (id: number) => playlistApi.deletePlaylist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
      // If the deleted playlist was currently selected, clear it
      if (currentPlaylist && currentPlaylist.id === editingPlaylistId) {
        onPlaylistChange(null)
        setPlaylistName('')
      }
      message.success('Playlist deleted')
    },
    onError: (error: any) => {
      message.error(`Error deleting playlist: ${error.message}`)
    }
  })

  // Rename playlist mutation
  const renamePlaylistMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      playlistApi.updatePlaylist(id, { name }),
    onSuccess: (updatedPlaylist) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
      // If the renamed playlist was currently selected, update it
      if (currentPlaylist && currentPlaylist.id === updatedPlaylist.id) {
        onPlaylistChange(updatedPlaylist)
        setPlaylistName(updatedPlaylist.name)
      }
      setEditingPlaylistId(null)
      setEditingPlaylistName('')
      message.success('Playlist renamed')
    },
    onError: (error: any) => {
      message.error(`Error renaming playlist: ${error.message}`)
      setEditingPlaylistId(null)
      setEditingPlaylistName('')
    }
  })

  const createNewPlaylist = () => {
    const nextId = getNextPlaylistId(savedPlaylists)
    const name = `Playlist ${nextId}`
    createPlaylistMutation.mutate(name)
  }

  const saveCurrentPlaylist = () => {
    if (!currentPlaylist) return

    const playlistToSave = {
      name: playlistName || currentPlaylist.name,
      filters: currentPlaylist.filters,
      manual_songs: currentPlaylist.manual_songs
    }

    updatePlaylistMutation.mutate({
      id: currentPlaylist.id,
      data: playlistToSave
    })
  }

  const loadPlaylist = (playlist: Playlist) => {
    onPlaylistChange(playlist)
    setPlaylistName(playlist.name)
  }

  const removeFilter = (filterId: string) => {
    if (!currentPlaylist) return

    const updatedPlaylist = {
      ...currentPlaylist,
      filters: currentPlaylist.filters.filter(f => f.id !== filterId)
    }
    onPlaylistChange(updatedPlaylist)
  }

  const removeSong = (songId: number) => {
    if (!currentPlaylist) return

    const updatedPlaylist = {
      ...currentPlaylist,
      manual_songs: currentPlaylist.manual_songs.filter(s => s.id !== songId)
    }
    onPlaylistChange(updatedPlaylist)
  }

  const editFilter = (filter: PlaylistFilter) => {
    onEditFilter(filter)
  }

  const startRenaming = (playlist: any) => {
    setEditingPlaylistId(playlist.id)
    setEditingPlaylistName(playlist.name)
  }

  const cancelRenaming = () => {
    setEditingPlaylistId(null)
    setEditingPlaylistName('')
  }

  const confirmRename = (playlistId: number) => {
    if (editingPlaylistName.trim()) {
      renamePlaylistMutation.mutate({ id: playlistId, name: editingPlaylistName.trim() })
    } else {
      cancelRenaming()
    }
  }

  const handleDeletePlaylist = (playlistId: number) => {
    deletePlaylistMutation.mutate(playlistId)
  }

  return (
    <div className="h-full">
      <div className="p-4 bg-white h-full">
        <Space direction="vertical" size="middle" className="w-full">
          {/* Playlist Controls */}
          <div className="space-y-2">
            <Input
              placeholder="Playlist name..."
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              disabled={!currentPlaylist}
            />
            <Space className="w-full justify-between">
              <Button
                icon={<Plus size={16} />}
                onClick={createNewPlaylist}
                type="dashed"
                size="small"
                loading={createPlaylistMutation.isPending}
              >
                New
              </Button>
              <Button
                icon={<Save size={16} />}
                onClick={saveCurrentPlaylist}
                disabled={!currentPlaylist}
                type="primary"
                size="small"
                loading={updatePlaylistMutation.isPending}
              >
                Save
              </Button>
            </Space>
          </div>

          {currentPlaylist && (
            <>
              {/* Filters Section */}
              <div>
                <Text strong>Filters ({currentPlaylist.filters.length})</Text>
                <div className="max-h-32 overflow-y-auto">
                  <List
                    size="small"
                    dataSource={currentPlaylist.filters}
                    renderItem={(filter) => (
                      <List.Item
                        actions={[
                          <Button
                            key="edit"
                            type="text"
                            icon={<Edit size={14} />}
                            onClick={() => editFilter(filter)}
                            size="small"
                          />,
                          <Popconfirm
                            key="remove"
                            title="Remove this filter?"
                            onConfirm={() => removeFilter(filter.id)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button
                              type="text"
                              icon={<Trash2 size={14} />}
                              danger
                              size="small"
                            />
                          </Popconfirm>
                        ]}
                      >
                        <div className="flex items-center space-x-2">
                          <FileText size={14} className="text-blue-500" />
                          <Text className="text-sm">{filter.name}</Text>
                        </div>
                      </List.Item>
                    )}
                  />
                </div>
              </div>

              {/* Manual Songs Section */}
              <div>
                <Text strong>Manual Songs ({currentPlaylist.manual_songs.length})</Text>
                <div className="max-h-40 overflow-y-auto">
                  <List
                    size="small"
                    dataSource={currentPlaylist.manual_songs}
                    renderItem={(song) => (
                      <List.Item
                        actions={[
                          <Popconfirm
                            key="remove"
                            title="Remove this song?"
                            onConfirm={() => removeSong(song.id)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button
                              type="text"
                              icon={<Trash2 size={14} />}
                              danger
                              size="small"
                            />
                          </Popconfirm>
                        ]}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <Music size={14} className="text-green-500" />
                          <div className="min-w-0">
                            <Text className="text-sm block truncate">{song.display_name}</Text>
                            <Text className="text-xs text-gray-500 block truncate">{song.artist}</Text>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                </div>
              </div>
            </>
          )}

          {/* Saved Playlists */}
          {savedPlaylists.length > 0 && (
            <div>
              <Text strong>Saved Playlists</Text>
              <div className="max-h-48 overflow-y-auto">
                <List
                  size="small"
                  dataSource={savedPlaylists}
                  renderItem={(playlist) => (
                    <List.Item
                      actions={[
                        <Button
                          key="load"
                          type="text"
                          onClick={() => loadPlaylist(playlist)}
                          size="small"
                        >
                          Load
                        </Button>,
                        <Button
                          key="edit"
                          type="text"
                          icon={<Edit size={14} />}
                          onClick={() => startRenaming(playlist)}
                          size="small"
                          disabled={editingPlaylistId === playlist.id}
                        />,
                        <Popconfirm
                          key="delete"
                          title="Delete this playlist?"
                          description="This action cannot be undone."
                          onConfirm={() => handleDeletePlaylist(playlist.id)}
                          okText="Yes"
                          cancelText="No"
                          okType="danger"
                        >
                          <Button
                            type="text"
                            icon={<Trash2 size={14} />}
                            danger
                            size="small"
                            loading={deletePlaylistMutation.isPending}
                          />
                        </Popconfirm>
                      ]}
                    >
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <FileText size={14} className="text-purple-500" />
                        <div className="min-w-0 flex-1">
                          {editingPlaylistId === playlist.id ? (
                            <div className="space-y-1">
                              <Input
                                value={editingPlaylistName}
                                onChange={(e) => setEditingPlaylistName(e.target.value)}
                                onPressEnter={() => confirmRename(playlist.id)}
                                onBlur={() => confirmRename(playlist.id)}
                                size="small"
                                autoFocus
                                className="text-sm"
                              />
                              <div className="flex space-x-1">
                                <Button
                                  size="small"
                                  type="primary"
                                  onClick={() => confirmRename(playlist.id)}
                                  loading={renamePlaylistMutation.isPending}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="small"
                                  onClick={cancelRenaming}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Text className="text-sm block truncate">{playlist.name}</Text>
                              <Text className="text-xs text-gray-500 block">
                                {playlist.filters.length} filters, {playlist.manual_songs.length} songs
                              </Text>
                            </>
                          )}
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            </div>
          )}
        </Space>
      </div>
    </div>
  )
}