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
  type Column,
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

const arraysEqual = (a: string[], b: string[]) => (
  a.length === b.length && a.every((value, index) => value === b[index])
)



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

  const extractFilename = (value: string | null | undefined): string | null => {
    if (!value) return null
    const normalized = value.trim()
    if (!normalized) return null
    const parts = normalized.split(/[/\\]/)
    const filename = parts.pop()
    return filename && filename.trim().length > 0 ? filename : normalized
  }

  const getPrimaryPathEntry = (song: Song) => {
    const fromList = song.file_paths?.find((path) => path.is_primary) || song.file_paths?.[0]
    return fromList || null
  }

  const getSongFullPath = (song: Song): string | null => {
    const primaryEntry = getPrimaryPathEntry(song)
    if (primaryEntry?.file_path) return primaryEntry.file_path
    return song.file_path ?? null
  }

  const getSongFilename = (song: Song): string | null => {
    const primaryEntry = getPrimaryPathEntry(song)
    if (primaryEntry?.filename) {
      const trimmed = primaryEntry.filename.trim()
      if (trimmed) return trimmed
    }
    const fromPath = extractFilename(primaryEntry?.file_path || song.file_path)
    return fromPath
  }

  // Custom global filter that includes tags
  const globalFilterFn = (row: any, columnId: string, value: string) => {
    const search = value.toLowerCase()
    const song = row.original as Song

    // Search in basic fields
    const primaryFilename = getSongFilename(song) || ''
    const primaryPath = getSongFullPath(song) || ''
    const searchableText = [
      song.display_name,
      primaryPath,
      primaryFilename,
      song.artist,
      song.album,
      song.genre,
      song.year?.toString(),
      ...song.tags.map(tag => tag.name)
    ].filter(Boolean).join(' ').toLowerCase()

    return searchableText.includes(search)
  }

  const columns = useMemo<ColumnDef<Song>[]>(() => [
    {
      id: 'display_name',
      accessorKey: 'display_name',
      header: 'Song',
      meta: { title: 'Song' },
      enableHiding: false,
      size: 260,
      cell: ({ row }) => {
        const filename = getSongFilename(row.original)
        const filePath = getSongFullPath(row.original)

        return (
          <div className="flex items-center space-x-2">
            <Music size={16} className="text-gray-400" />
            <div>
              <div className="font-medium text-sm">{row.original.display_name}</div>
              <Tooltip title={filePath || undefined}>
                <div className="text-xs text-gray-500 truncate max-w-[240px]">
                  {filename || 'File path unavailable'}
                </div>
              </Tooltip>
            </div>
          </div>
        )
      },
    },
    {
      id: 'artist',
      accessorKey: 'artist',
      header: 'Artist',
      meta: { title: 'Artist' },
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-2">
          <User size={14} className="text-gray-400" />
          <span className="text-sm">{(getValue() as string) || 'Unknown'}</span>
        </div>
      ),
    },
    {
      id: 'album',
      accessorKey: 'album',
      header: 'Album',
      meta: { title: 'Album' },
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-2">
          <Disc size={14} className="text-gray-400" />
          <span className="text-sm">{(getValue() as string) || 'Unknown'}</span>
        </div>
      ),
    },
    {
      id: 'genre',
      accessorKey: 'genre',
      header: 'Genre',
      meta: { title: 'Genre' },
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-2">
          <FolderOpen size={14} className="text-gray-400" />
          <span className="text-sm">{(getValue() as string) || 'Unknown'}</span>
        </div>
      ),
    },
    {
      id: 'year',
      accessorKey: 'year',
      header: 'Year',
      meta: { title: 'Year' },
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-2">
          <Calendar size={14} className="text-gray-400" />
          <span className="text-sm">{(getValue() as number) || '--'}</span>
        </div>
      ),
      size: 80,
    },
    {
      id: 'duration',
      accessorKey: 'duration',
      header: 'Duration',
      meta: { title: 'Duration' },
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
      meta: { title: 'Tags' },
      enableSorting: false,
      size: 220,
      cell: ({ row }) => (
        <EditableTagCell
          song={row.original}
          onTagUpdate={() => refetch()}
        />
      ),
    },
    {
      id: 'tempo',
      accessorKey: 'tempo',
      header: 'Tempo (BPM)',
      meta: { title: 'Tempo (BPM)' },
      cell: ({ getValue }) => {
        const value = getValue<number | null>()
        return (
          <div className="flex items-center space-x-2">
            <Gauge size={14} className="text-gray-400" />
            <span className="text-sm">{value != null ? Math.round(value) : '--'}</span>
          </div>
        )
      },
      size: 110,
    },
    {
      id: 'energy',
      accessorKey: 'energy',
      header: 'Energy',
      meta: { title: 'Energy' },
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-2">
          <ActivitySquare size={14} className="text-gray-400" />
          <span className="text-sm">{formatPercentage(getValue<number | null>())}</span>
        </div>
      ),
      size: 110,
    },
    {
      id: 'valence',
      accessorKey: 'valence',
      header: 'Valence',
      meta: { title: 'Valence' },
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-2">
          <Gauge size={14} className="text-gray-400" />
          <span className="text-sm">{formatPercentage(getValue<number | null>())}</span>
        </div>
      ),
      size: 110,
    },
    {
      id: 'danceability',
      accessorKey: 'danceability',
      header: 'Danceability',
      meta: { title: 'Danceability' },
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-2">
          <ActivitySquare size={14} className="text-gray-400" />
          <span className="text-sm">{formatPercentage(getValue<number | null>())}</span>
        </div>
      ),
      size: 130,
    },
    {
      id: 'file_size',
      accessorKey: 'file_size',
      header: 'File Size',
      meta: { title: 'File Size' },
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-2">
          <FolderOpen size={14} className="text-gray-400" />
          <span className="text-sm">{formatFileSize(getValue<number | null>())}</span>
        </div>
      ),
      size: 130,
    },
    {
      id: 'track_number',
      accessorKey: 'track_number',
      header: 'Track #',
      meta: { title: 'Track #' },
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-2">
          <Hash size={14} className="text-gray-400" />
          <span className="text-sm">{getValue<number | null>() ?? '--'}</span>
        </div>
      ),
      size: 90,
    },
    {
      id: 'key',
      accessorKey: 'key',
      header: 'Key',
      meta: { title: 'Key' },
      cell: ({ getValue }) => (
        <span className="text-sm">{(getValue() as string) || '--'}</span>
      ),
      size: 80,
    },
    {
      id: 'mode',
      accessorKey: 'mode',
      header: 'Mode',
      meta: { title: 'Mode' },
      cell: ({ getValue }) => (
        <span className="text-sm capitalize">{(getValue() as string) || '--'}</span>
      ),
      size: 90,
    },
    {
      id: 'last_played',
      accessorKey: 'last_played',
      header: 'Last Played',
      meta: { title: 'Last Played' },
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-2">
          <Clock size={14} className="text-gray-400" />
          <span className="text-xs text-gray-600">{formatDateTime(getValue() as string | null)}</span>
        </div>
      ),
      size: 180,
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: 'Added',
      meta: { title: 'Added' },
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-2">
          <Calendar size={14} className="text-gray-400" />
          <span className="text-xs text-gray-600">{formatDateTime(getValue() as string | null)}</span>
        </div>
      ),
      size: 180,
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { title: 'Actions' },
      enableSorting: false,
      enableHiding: false,
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
      size: currentPlaylist ? 140 : 80,
    },
  ], [currentPlaylist, playSong, refetch])

  const columnIds = useMemo(() => (
    columns
      .map((column) => {
        if (column.id) return column.id
        if ('accessorKey' in column && column.accessorKey) {
          return column.accessorKey as string
        }
        return ''
      })
      .filter((id): id is string => id.length > 0)
  ), [columns])

  useEffect(() => {
    setColumnOrder((prev) => {
      const baseOrder = hasCustomOrdering
        ? [
            ...prev.filter((id) => columnIds.includes(id)),
            ...columnIds.filter((id) => !prev.includes(id)),
          ]
        : columnIds

      return arraysEqual(prev, baseOrder) ? prev : baseOrder
    })
  }, [columnIds, hasCustomOrdering])

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
      columnVisibility,
      columnOrder,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
  })

  const allLeafColumns = table.getAllLeafColumns() as Column<Song, unknown>[]
  const orderedColumns = columnOrder.length
    ? columnOrder
        .map((id) => allLeafColumns.find((column) => column.id === id))
        .filter((column): column is typeof allLeafColumns[number] => Boolean(column))
    : allLeafColumns
  const unorderedColumns = allLeafColumns.filter((column) => !orderedColumns.includes(column))
  const modalColumns = [...orderedColumns, ...unorderedColumns]

  const getColumnTitle = (column: Column<Song, unknown>) => {
    const metaTitle = (column.columnDef.meta as { title?: string } | undefined)?.title
    if (metaTitle) return metaTitle
    if (typeof column.columnDef.header === 'string') {
      return column.columnDef.header
    }
    return column.id
  }

  const handleColumnVisibilityToggle = (columnId: string, visible: boolean) => {
    setHasCustomVisibility(true)
    setColumnVisibility((prev) => ({
      ...prev,
      [columnId]: visible,
    }))
  }

  const moveColumn = (columnId: string, direction: -1 | 1) => {
    setHasCustomOrdering(true)
    setColumnOrder((prev) => {
      const currentIndex = prev.indexOf(columnId)
      if (currentIndex === -1) {
        return [...prev, columnId]
      }
      const targetIndex = currentIndex + direction
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev
      }
      const next = [...prev]
      ;[next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]]
      return next
    })
  }

  const resetColumns = () => {
    setHasCustomVisibility(false)
    setColumnVisibility(buildDefaultVisibility(isExpanded))
    setHasCustomOrdering(false)
    setColumnOrder(columnIds)
  }

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
            <Tooltip title="Customize columns">
              <Button
                icon={<SlidersHorizontal size={16} />}
                onClick={() => setIsColumnModalOpen(true)}
              />
            </Tooltip>
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
      <Modal
        title="Customize Columns"
        open={isColumnModalOpen}
        onCancel={() => setIsColumnModalOpen(false)}
        footer={[
          <Button key="reset" onClick={resetColumns}>
            Reset to Default
          </Button>,
          <Button key="close" type="primary" onClick={() => setIsColumnModalOpen(false)}>
            Done
          </Button>,
        ]}
      >
        <List
          rowKey={(column) => column.id}
          dataSource={modalColumns}
          renderItem={(column, index) => {
            const title = getColumnTitle(column)
            const canHide = column.getCanHide()
            return (
              <List.Item
                key={column.id}
                actions={[
                  <Button
                    key="up"
                    size="small"
                    icon={<ArrowUp size={14} />}
                    disabled={index === 0}
                    onClick={() => moveColumn(column.id, -1)}
                  />,
                  <Button
                    key="down"
                    size="small"
                    icon={<ArrowDown size={14} />}
                    disabled={index === modalColumns.length - 1}
                    onClick={() => moveColumn(column.id, 1)}
                  />,
                ]}
              >
                <Checkbox
                  checked={column.getIsVisible()}
                  onChange={(event) => handleColumnVisibilityToggle(column.id, event.target.checked)}
                  disabled={!canHide}
                >
                  {title}
                </Checkbox>
              </List.Item>
            )
          }}
        />
      </Modal>
    </div>
  )
}
