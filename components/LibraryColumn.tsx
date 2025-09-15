'use client'

import { useState, useEffect } from 'react'
import { Card, Input, Button, Space, Typography, message } from 'antd'
import { Plus } from 'lucide-react'
import { QueryBuilderPanel } from './QueryBuilderPanel'
import { SongTable } from './SongTable'
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

  const saveFilterToPlaylist = () => {
    if (!currentPlaylist) {
      message.error('No playlist selected')
      return
    }

    if (!filterName.trim()) {
      message.error('Please enter a filter name')
      return
    }

    // Check if we have any active filters
    const hasFilters = Object.keys(filters).some(
      key => filters[key as keyof SongsFilters] !== undefined && filters[key as keyof SongsFilters] !== ''
    )

    if (!hasFilters) {
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


  return (
    <div className="h-full">
      <Card className="h-full">
        <Title level={4}>Library</Title>

        <Space direction="vertical" size="large" className="w-full">
          {/* Filter name input when editing/creating filter */}
          <div>
            <Input
              placeholder="Enter filter name..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              disabled={!currentPlaylist}
            />
            <Space className="w-full mt-2">
              <Button
                icon={<Plus size={16} />}
                onClick={handleCreateNewFilter}
                disabled={!currentPlaylist}
                type="dashed"
              >
                Create Filter
              </Button>
              <Button
                icon={<Plus size={16} />}
                onClick={saveFilterToPlaylist}
                disabled={!currentPlaylist || !filterName.trim()}
                type="primary"
              >
                {editingFilter ? 'Update Filter' : 'Save to Playlist'}
              </Button>
            </Space>
          </div>

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