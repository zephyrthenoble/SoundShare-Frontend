'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
  type VisibilityState,
} from '@tanstack/react-table'
import { Button, Input, Space, Card, Typography, Spin, Alert, Select, Modal, Checkbox, List, Tooltip } from 'antd'
import { PlayCircle, Music, Clock, Calendar, User, Disc, FolderOpen, ChevronLeft, ChevronRight, Plus, RefreshCw, SlidersHorizontal, ArrowUp, ArrowDown, Gauge, ActivitySquare, Hash } from 'lucide-react'
import { type Song } from '@/lib/api'
import { useSongs, useSongsCacheManager, useOptimisticFiltering, useTagMutations } from '@/lib/hooks/useCachedApi'
import type { QueryJSON } from '@/lib/queryBuilderUtils'
import { EditableTagCell } from './EditableTagCell'
import { useMusicPlayer } from '@/lib/music-context'
import type { Playlist } from '@/lib/playlist-types'
import { message } from 'antd'

const { Title } = Typography
const { Search } = Input

interface SongTableProps {
  query?: QueryJSON | string | null
  currentPlaylist?: Playlist | null
  onSongAddedToPlaylist?: () => void
  isExpanded?: boolean
}


const buildDefaultVisibility = (expanded: boolean): VisibilityState => ({
  display_name: true,
  artist: true,
  album: true,
  genre: true,
  year: true,
  duration: true,
  tags: true,
  tempo: expanded,
  energy: expanded,
  valence: expanded,
  danceability: expanded,
  file_size: expanded,
  last_played: expanded,
  created_at: false,
  track_number: false,
  key: false,
  mode: false,
  actions: true,
})



export function SongTable({ query = null, currentPlaylist, onSongAddedToPlaylist, isExpanded = false }: SongTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  })
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => buildDefaultVisibility(isExpanded))
  const [hasCustomVisibility, setHasCustomVisibility] = useState(false)
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [hasCustomOrdering, setHasCustomOrdering] = useState(false)
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false)
  const { playSong } = useMusicPlayer()

  const addSongToPlaylist = (song: Song) => {
    if (!currentPlaylist) {
      message.error('No playlist selected')
      return
    }

    // Check if song is already in manual songs
    const isAlreadyAdded = currentPlaylist.manual_songs.some(s => s.id === song.id)
    if (isAlreadyAdded) {
      message.info('Song is already in the playlist')
      return
    }

    // Add song to playlist (this will be handled by parent component)
    currentPlaylist.manual_songs.push(song)
    message.success(`Added "${song.display_name}" to playlist`)
    onSongAddedToPlaylist?.()
  }

  // Fetch songs with query
  console.log('🎵 SongTable query:', query)
  
  // Convert query to SQL format if needed
  const getSqlQuery = (): string | undefined => {
    if (typeof query === 'string') {
      return query
    } else if (query === null) {
      return undefined // No filter, get all songs
    } else {
      // QueryJSON format - for now, we'll skip this case since we're moving to SQL
      return undefined
    }
  }

  const sqlQuery = getSqlQuery()
  
  // Use cached songs hook with optimistic filtering
  const cacheManager = useSongsCacheManager()
  const optimisticFiltering = useOptimisticFiltering()
  
  // Try optimistic filtering first for instant results
  let optimisticSongs: Song[] | null = null
  if (sqlQuery) {
    optimisticSongs = optimisticFiltering.filterSongsLocally(sqlQuery)
  }
  
  // Fetch songs with enhanced caching
  const {
    data: songs = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useSongs(sqlQuery)
  
  // Use optimistic results if available and still loading
  const displaySongs = optimisticSongs && isLoading ? optimisticSongs : songs
  
  console.log('📊 Songs fetched:', { 
    count: displaySongs.length, 
    isLoading, 
    isFetching,
    usingOptimistic: !!optimisticSongs && isLoading,
    error 
  })

  useEffect(() => {
    if (!hasCustomVisibility) {
      setColumnVisibility(buildDefaultVisibility(isExpanded))
    }
  }, [isExpanded, hasCustomVisibility])

  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format file size to readable format
  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '--'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatPercentage = (value: number | null): string => {
    if (value === null || value === undefined) return '--'
    return `${Math.round(value * 100)}%`
  }

  const formatDateTime = (value: string | null): string => {
    if (!value) return '--'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '--'
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  // Custom global filter that includes tags
  const globalFilterFn = (row: any, columnId: string, value: string) => {
    const search = value.toLowerCase()
    const song = row.original as Song

    // Search in basic fields
    const primaryFilename = song.file_paths?.find(p => p.is_primary)?.filename || 
                           song.file_paths?.[0]?.filename || ''
    const searchableText = [
      song.display_name,
      primaryFilename,
      song.artist,
      song.album,
      song.genre,
      song.year?.toString(),
      ...song.tags.map(tag => tag.name)
    ].filter(Boolean).join(' ').toLowerCase()

    return searchableText.includes(search)
  }

  const columns: ColumnDef<Song>[] = [
    {
      accessorKey: 'display_name',
      header: 'Song',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Music size={16} className="text-gray-400" />
          <div>
            <div className="font-medium text-sm">{row.original.display_name}</div>
            <div className="text-xs text-gray-500">
              {row.original.file_paths?.find(p => p.is_primary)?.filename || 
               row.original.file_paths?.[0]?.filename || 
               'No file'}
            </div>
          </div>
        </div>
      ),
      minSize: 250,
    },
    {
      accessorKey: 'artist',
      header: 'Artist',
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-2">
          <User size={14} className="text-gray-400" />
          <span className="text-sm">{getValue() as string || 'Unknown'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'album',
      header: 'Album',
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-2">
          <Disc size={14} className="text-gray-400" />
          <span className="text-sm">{getValue() as string || 'Unknown'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'genre',
      header: 'Genre',
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-2">
          <FolderOpen size={14} className="text-gray-400" />
          <span className="text-sm">{getValue() as string || 'Unknown'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'year',
      header: 'Year',
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-2">
          <Calendar size={14} className="text-gray-400" />
          <span className="text-sm">{(getValue() as number) || '--'}</span>
        </div>
      ),
      size: 80,
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-2">
          <Clock size={14} className="text-gray-400" />
          <span className="text-sm font-mono">{formatDuration(getValue() as number)}</span>
        </div>
      ),
      size: 100,
    },
    {
      id: 'tags',
      header: 'Tags',
      cell: ({ row }) => (
        <EditableTagCell
          song={row.original}
          onTagUpdate={() => refetch()}
        />
      ),
      minSize: 200,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Space>
          <Button
            type="text"
            icon={<PlayCircle size={20} />}
            onClick={() => {
              playSong(row.original)
            }}
            className="text-blue-500 hover:text-blue-700"
            title={`Play ${row.original.display_name}`}
          />
          {currentPlaylist && (
            <Button
              type="text"
              icon={<Plus size={16} />}
              onClick={() => addSongToPlaylist(row.original)}
              className="text-green-500 hover:text-green-700"
              title={`Add ${row.original.display_name} to playlist`}
            />
          )}
        </Space>
      ),
      size: currentPlaylist ? 120 : 60,
    },
  ]

  const table = useReactTable({
    data: displaySongs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    globalFilterFn,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
  })

  if (error) {
    return (
      <Card>
        <Alert
          message="Error loading songs"
          description={error instanceof Error ? error.message : 'Unknown error occurred'}
          type="error"
          action={
            <Button onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <div className="w-full space-y-4">
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <Title level={3} className="!mb-0">
              Music Library ({displaySongs.length} songs)
            </Title>
            {isFetching && !isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spin size="small" />
                <span>Refreshing...</span>
              </div>
            )}
            {optimisticSongs && isLoading && (
              <div className="flex items-center gap-2 text-sm text-blue-500">
                <span>⚡ Instant results</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              icon={<RefreshCw size={16} />}
              onClick={() => refetch()}
              loading={isFetching}
              title="Refresh library"
            />
            <Search
              placeholder="Search songs, artists, albums, tags..."
              allowClear
              style={{ width: 350 }}
              onChange={(e) => setGlobalFilter(e.target.value)}
              value={globalFilter}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="min-w-full">
                <div className="bg-white rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50">
                          {headerGroup.headers.map((header) => (
                            <th
                              key={header.id}
                              className="text-left py-3 px-4 font-medium text-gray-900"
                              style={{ width: header.column.columnDef.size }}
                            >
                              {header.isPlaceholder ? null : (
                                <div
                                  className={
                                    header.column.getCanSort()
                                      ? 'cursor-pointer select-none flex items-center space-x-1 hover:text-blue-600'
                                      : 'flex items-center'
                                  }
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                  {header.column.getIsSorted() === 'asc' ? (
                                    <span>↑</span>
                                  ) : header.column.getIsSorted() === 'desc' ? (
                                    <span>↓</span>
                                  ) : null}
                                </div>
                              )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              className="py-3 px-4 text-gray-900"
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                  {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} of{' '}
                  {table.getFilteredRowModel().rows.length} results
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">Show:</span>
                  <Select
                    value={table.getState().pagination.pageSize}
                    onChange={(value) => {
                      table.setPageSize(Number(value))
                    }}
                    style={{ width: 80 }}
                    size="small"
                  >
                    {[10, 25, 50, 100].map(pageSize => (
                      <Select.Option key={pageSize} value={pageSize}>
                        {pageSize}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  size="small"
                  icon={<ChevronLeft size={16} />}
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <span className="text-sm px-2">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </span>
                <Button
                  size="small"
                  icon={<ChevronRight size={16} />}
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}

        {!isLoading && songs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No songs found. Try adjusting your filters.
          </div>
        )}
      </Card>
    </div>
  )
}
