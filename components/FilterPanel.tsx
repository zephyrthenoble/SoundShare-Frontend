'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  Input,
  Select,
  Slider,
  Space,
  Button,
  Divider,
  Typography,
  Row,
  Col,
  Tag,
  Collapse,
} from 'antd'
import { Filter, X, RotateCcw, ChevronDown } from 'lucide-react'
import { tagsApi, type SongsFilters } from '@/lib/api'

const { Title } = Typography
const { Option } = Select

interface FilterPanelProps {
  filters: SongsFilters
  onFiltersChange: (filters: SongsFilters) => void
}

export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<SongsFilters>(filters)

  // Get all available tags for filtering
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getTags,
  })

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (key: keyof SongsFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleRangeChange = (key: string, values: [number, number] | null) => {
    if (values) {
      const newFilters = {
        ...localFilters,
        [`${key}_min`]: values[0],
        [`${key}_max`]: values[1],
      }
      setLocalFilters(newFilters)
      onFiltersChange(newFilters)
    } else {
      const newFilters = { ...localFilters }
      delete newFilters[`${key}_min` as keyof SongsFilters]
      delete newFilters[`${key}_max` as keyof SongsFilters]
      setLocalFilters(newFilters)
      onFiltersChange(newFilters)
    }
  }

  const handleClearFilters = () => {
    const clearedFilters = {}
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  const hasActiveFilters = Object.keys(localFilters).some(
    key => localFilters[key as keyof SongsFilters] !== undefined
  )

  const filterContent = (
    <Space direction="vertical" size="large" className="w-full">
        {/* Text Filters */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <div>
              <label className="block text-sm font-medium mb-2">Artist</label>
              <Input
                placeholder="Filter by artist..."
                value={localFilters.artist || ''}
                onChange={(e) => handleFilterChange('artist', e.target.value || undefined)}
                allowClear
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <label className="block text-sm font-medium mb-2">Album</label>
              <Input
                placeholder="Filter by album..."
                value={localFilters.album || ''}
                onChange={(e) => handleFilterChange('album', e.target.value || undefined)}
                allowClear
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <label className="block text-sm font-medium mb-2">Genre</label>
              <Input
                placeholder="Filter by genre..."
                value={localFilters.genre || ''}
                onChange={(e) => handleFilterChange('genre', e.target.value || undefined)}
                allowClear
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <Input
                type="number"
                placeholder="e.g., 2020"
                value={localFilters.year || ''}
                onChange={(e) => handleFilterChange('year', e.target.value ? parseInt(e.target.value) : undefined)}
                allowClear
              />
            </div>
          </Col>
        </Row>

        <Divider />

        {/* Tag Filters */}
        <div>
          <label className="block text-sm font-medium mb-2">Tags</label>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Select
                placeholder="Select first tag..."
                value={localFilters.tag1}
                onChange={(value) => handleFilterChange('tag1', value)}
                allowClear
                showSearch
                className="w-full"
              >
                {allTags.map((tag) => (
                  <Option key={tag.id} value={tag.name}>
                    <Tag color={getTagColor(tag.group_name)} className="mr-1">
                      {tag.name}
                    </Tag>
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12}>
              <Select
                placeholder="Select second tag..."
                value={localFilters.tag2}
                onChange={(value) => handleFilterChange('tag2', value)}
                allowClear
                showSearch
                className="w-full"
              >
                {allTags.map((tag) => (
                  <Option key={tag.id} value={tag.name}>
                    <Tag color={getTagColor(tag.group_name)} className="mr-1">
                      {tag.name}
                    </Tag>
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
        </div>

        <Divider />

        {/* Audio Feature Range Filters */}
        <div>
          <Typography.Title level={5}>Audio Features</Typography.Title>
          <Row gutter={[16, 24]}>
            <Col xs={24} md={12}>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Energy ({localFilters.energy_min ? Math.round(localFilters.energy_min * 100) : 0}% - {localFilters.energy_max ? Math.round(localFilters.energy_max * 100) : 100}%)
                </label>
                <Slider
                  range
                  min={0}
                  max={1}
                  step={0.01}
                  value={[localFilters.energy_min || 0, localFilters.energy_max || 1]}
                  onChange={(values) => handleRangeChange('energy', values)}
                  tooltip={{ formatter: (value) => `${Math.round((value || 0) * 100)}%` }}
                />
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Valence ({localFilters.valence_min ? Math.round(localFilters.valence_min * 100) : 0}% - {localFilters.valence_max ? Math.round(localFilters.valence_max * 100) : 100}%)
                </label>
                <Slider
                  range
                  min={0}
                  max={1}
                  step={0.01}
                  value={[localFilters.valence_min || 0, localFilters.valence_max || 1]}
                  onChange={(values) => handleRangeChange('valence', values)}
                  tooltip={{ formatter: (value) => `${Math.round((value || 0) * 100)}%` }}
                />
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Danceability ({localFilters.danceability_min ? Math.round(localFilters.danceability_min * 100) : 0}% - {localFilters.danceability_max ? Math.round(localFilters.danceability_max * 100) : 100}%)
                </label>
                <Slider
                  range
                  min={0}
                  max={1}
                  step={0.01}
                  value={[localFilters.danceability_min || 0, localFilters.danceability_max || 1]}
                  onChange={(values) => handleRangeChange('danceability', values)}
                  tooltip={{ formatter: (value) => `${Math.round((value || 0) * 100)}%` }}
                />
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tempo ({localFilters.tempo_min || 60} - {localFilters.tempo_max || 200} BPM)
                </label>
                <Slider
                  range
                  min={60}
                  max={200}
                  value={[localFilters.tempo_min || 60, localFilters.tempo_max || 200]}
                  onChange={(values) => handleRangeChange('tempo', values)}
                  tooltip={{ formatter: (value) => `${value} BPM` }}
                />
              </div>
            </Col>
          </Row>
        </div>
    </Space>
  )

  return (
    <Card>
      <Collapse
        size="large"
        ghost
        items={[
          {
            key: '1',
            label: (
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Filter size={20} />
                  <Title level={4} className="!mb-0">
                    Advanced Filters {hasActiveFilters && <span className="text-blue-600">({Object.keys(localFilters).length} active)</span>}
                  </Title>
                </div>
                {hasActiveFilters && (
                  <Button
                    type="text"
                    icon={<RotateCcw size={16} />}
                    onClick={handleClearFilters}
                    className="text-gray-500 hover:text-red-500"
                    size="small"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            ),
            children: filterContent,
          },
        ]}
      />
    </Card>
  )
}

// Helper function to get consistent colors for tag groups
function getTagColor(groupName: string | null): string {
  if (!groupName) return 'default'

  const colorMap: Record<string, string> = {
    'Speed': 'blue',
    'Mood': 'green',
    'Location': 'orange',
    'Genre': 'purple',
    'Energy': 'red',
    'Instrument': 'cyan',
  }

  return colorMap[groupName] || 'default'
}