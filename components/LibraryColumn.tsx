'use client'

import { useState, useEffect } from 'react'
import { Card, Input, Button, Space, Typography, message, Collapse } from 'antd'
import { Plus, Filter, RotateCcw } from 'lucide-react'
import { QueryBuilderPanel } from './QueryBuilderPanel'
import { SongTable } from './SongTable'
import { AdvancedFilterPanel } from './AdvancedFilterPanel'
import type { SongsFilters } from '@/lib/api'
import type { Playlist, PlaylistFilter } from '@/lib/playlist-types'
import { generateFilterId } from '@/lib/playlist-types'

const { Title } = Typography

interface LibraryColumnProps {
  currentPlaylist: Playlist | null
  editingFilter: PlaylistFilter | null
  onFilterSaved: (filter: PlaylistFilter | null) => void
  onSongAddedToPlaylist: () => void
}

export function LibraryColumn({
  currentPlaylist,
  editingFilter,
  onFilterSaved,
  onSongAddedToPlaylist
}: LibraryColumnProps) {
  const [filters, setFilters] = useState<SongsFilters>({})
  const [filterName, setFilterName] = useState('')
  const [showQueryBuilder, setShowQueryBuilder] = useState(false)
  const [activeKeys, setActiveKeys] = useState<string[]>([])

  // Load editing filter when it changes
  useEffect(() => {
    if (editingFilter) {
      setFilters(editingFilter.filters)
      setFilterName(editingFilter.name)
      setShowQueryBuilder(true)
    } else {
      setFilters({})
      setFilterName('')
      setShowQueryBuilder(false)
    }
  }, [editingFilter])

  // Check if we have any active filters
  const hasActiveFilters = Object.keys(filters).some(
    key => filters[key as keyof SongsFilters] !== undefined && filters[key as keyof SongsFilters] !== ''
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

    if (!hasActiveFilters) {
      message.error('Please set at least one filter')
      return
    }

    const newFilter: PlaylistFilter = {
      id: editingFilter?.id || generateFilterId(),
      name: filterName.trim(),
      filters: { ...filters },
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
    setFilters({})
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

  const handleFiltersChange = (newFilters: SongsFilters) => {
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({})
  }


  return (
    <div className="h-full">
      <Card className="h-full">
        <Title level={4}>Library</Title>

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
                        Filters {hasActiveFilters && <span className="text-blue-600">({Object.keys(filters).length} active)</span>}
                      </span>
                    </div>
                    {hasActiveFilters && (
                      <Button
                        type="text"
                        icon={<RotateCcw size={16} />}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleClearFilters()
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
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
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
                    disabled={!filterName.trim() || !hasActiveFilters}
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
              filters={filters}
              currentPlaylist={currentPlaylist}
              onSongAddedToPlaylist={onSongAddedToPlaylist}
            />
          )}
        </Space>
      </Card>
    </div>
  )
}