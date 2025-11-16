'use client'

import { useState, useEffect } from 'react'
import { Card, Input, Button, Space, Typography, message, Collapse } from 'antd'
import { Plus, Filter, RotateCcw } from 'lucide-react'
import { QueryBuilderPanel } from './QueryBuilderPanel'
import { SongTable } from './SongTable'
import { AdvancedFilterPanel } from './AdvancedFilterPanel'
import type { QueryJSON } from '@/lib/queryBuilderUtils'
import type { Playlist, PlaylistFilter } from '@/lib/playlist-types'
import { generateFilterId } from '@/lib/playlist-types'

const { Title } = Typography

interface LibraryColumnProps {
  currentPlaylist: Playlist | null
  editingFilter: PlaylistFilter | null
  onFilterSaved: (filter: PlaylistFilter | null) => void
  onSongAddedToPlaylist: () => void
  onQueryChange?: (query: QueryJSON | string | null) => void
  isExpanded?: boolean
}

export function LibraryColumn({
  currentPlaylist,
  editingFilter,
  onFilterSaved,
  onSongAddedToPlaylist,
  onQueryChange,
  isExpanded = false
}: LibraryColumnProps) {
  const [query, setQuery] = useState<QueryJSON | string | null>(null)
  const [filterName, setFilterName] = useState('')
  const [showQueryBuilder, setShowQueryBuilder] = useState(false)
  const [activeKeys, setActiveKeys] = useState<string[]>([])

  // Load editing filter when it changes
  useEffect(() => {
    if (editingFilter) {
      setQuery(editingFilter.filters as any) // TODO: Update PlaylistFilter type
      setFilterName(editingFilter.name)
      setShowQueryBuilder(true)
    } else {
      setQuery(null)
      setFilterName('')
      setShowQueryBuilder(false)
    }
  }, [editingFilter])

  // Notify parent when query changes
  useEffect(() => {
    onQueryChange?.(query)
  }, [query, onQueryChange])

  // Check if we have any active filters
  const hasActiveQuery = query !== null && (
    typeof query === 'string' ? query.trim().length > 0 : 
    (query.rules.length > 0 || query.groups.length > 0)
  )

  const saveFilterToPlaylist = () => {
    if (!currentPlaylist) {
      message.error('No playlist selected')
      return
    }

    if (!filterName.trim()) {
      message.error('Please enter a filter name')
      return
    }

    if (!hasActiveQuery) {
      message.error('Please set at least one filter')
      return
    }

    const newFilter: PlaylistFilter = {
      id: editingFilter?.id || generateFilterId(),
      name: filterName.trim(),
      filters: query as any, // TODO: Update PlaylistFilter type to use QueryJSON
      created_at: editingFilter?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Update or add filter to current playlist
    const updatedPlaylist = { ...currentPlaylist }
    const existingFilterIndex = updatedPlaylist.filters.findIndex(f => f.id === newFilter.id)

    if (existingFilterIndex >= 0) {
      updatedPlaylist.filters[existingFilterIndex] = newFilter
      message.success('Filter updated in playlist')
    } else {
      updatedPlaylist.filters.push(newFilter)
      message.success('Filter added to playlist')
    }

    // Clear the editing state
    setQuery(null)
    setFilterName('')
    onFilterSaved(newFilter)
    setShowQueryBuilder(false)
  }

  const handleQueryBuilderSave = (filter: PlaylistFilter) => {
    onFilterSaved(filter)
    setShowQueryBuilder(false)
  }

  const handleQueryBuilderCancel = () => {
    onFilterSaved(null)
    setShowQueryBuilder(false)
  }

  const handleCreateNewFilter = () => {
    setShowQueryBuilder(true)
  }

  const handleQueryChange = (newQuery: QueryJSON | string | null) => {
    setQuery(newQuery)
  }

  const handleClearQuery = () => {
    setQuery(null)
  }


  return (
    <div className="h-full">
      <Space direction="vertical" size="large" className="w-full">
        {/* Advanced Filters Section - Always Available */}
        <Collapse
            activeKey={activeKeys}
            onChange={(keys) => setActiveKeys(keys as string[])}
            ghost
            size="large"
            items={[
              {
                key: 'filters',
                label: (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Filter size={20} />
                      <span className="font-medium">
                        Filters {hasActiveQuery && <span className="text-blue-600">(active)</span>}
                      </span>
                    </div>
                    {hasActiveQuery && (
                      <Button
                        type="text"
                        icon={<RotateCcw size={16} />}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleClearQuery()
                        }}
                        className="text-gray-500 hover:text-red-500"
                        size="small"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                ),
                children: (
                  <AdvancedFilterPanel
                    filters={query}
                    onFiltersChange={handleQueryChange}
                  />
                ),
              },
            ]}
          />

          {/* Playlist Filter Management - Only shown when a playlist is selected */}
          {currentPlaylist && (
            <Card size="small" className="bg-blue-50 border-blue-200">
              <Space direction="vertical" size="small" className="w-full">
                <div>
                  <Input
                    placeholder="Enter filter name to save to playlist..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                  />
                </div>
                <Space className="w-full justify-between">
                  <Button
                    icon={<Plus size={16} />}
                    onClick={handleCreateNewFilter}
                    type="dashed"
                    size="small"
                  >
                    Advanced Query Builder
                  </Button>
                  <Button
                    icon={<Plus size={16} />}
                    onClick={saveFilterToPlaylist}
                    disabled={!filterName.trim() || !hasActiveQuery}
                    type="primary"
                    size="small"
                  >
                    {editingFilter ? 'Update Filter' : 'Save to Playlist'}
                  </Button>
                </Space>
              </Space>
            </Card>
          )}

          {/* Show QueryBuilder when creating/editing filter, otherwise show SongTable */}
          {showQueryBuilder ? (
            <QueryBuilderPanel
              currentFilter={editingFilter}
              onFilterSave={handleQueryBuilderSave}
              onFilterCancel={handleQueryBuilderCancel}
            />
          ) : (
            <SongTable
              query={query}
              currentPlaylist={currentPlaylist}
              onSongAddedToPlaylist={onSongAddedToPlaylist}
              isExpanded={isExpanded}
            />
          )}
        </Space>
    </div>
  )
}