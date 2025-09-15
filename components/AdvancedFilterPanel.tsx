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
  Tabs,
  Alert,
  Badge,
} from 'antd'
import { FilterOutlined, UpOutlined, DownOutlined } from '@ant-design/icons'
import { Filter, RotateCcw, Settings } from 'lucide-react'
import { QueryBuilder, RuleGroupType, Field, Operator } from 'react-querybuilder'
import { QueryBuilderAntD } from '@react-querybuilder/antd'
import { QueryBuilderDnD } from '@react-querybuilder/dnd'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { tagsApi, type SongsFilters } from '@/lib/api'

const { Title } = Typography
const { Option } = Select

interface AdvancedFilterPanelProps {
  filters: SongsFilters
  onFiltersChange: (filters: SongsFilters) => void
}

export function AdvancedFilterPanel({ filters, onFiltersChange }: AdvancedFilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<SongsFilters>(filters)
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('simple')

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

  const handleRangeChange = (key: string, values: number[] | null) => {
    if (values && values.length === 2) {
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

  // Query Builder Configuration
  const fields: Field[] = [
    {
      name: 'artist',
      label: 'Artist',
      inputType: 'text',
      operators: [
        { name: '=', label: 'equals' },
        { name: 'contains', label: 'contains' },
        { name: 'beginsWith', label: 'begins with' },
        { name: 'endsWith', label: 'ends with' },
      ],
    },
    {
      name: 'album',
      label: 'Album',
      inputType: 'text',
      operators: [
        { name: '=', label: 'equals' },
        { name: 'contains', label: 'contains' },
        { name: 'beginsWith', label: 'begins with' },
        { name: 'endsWith', label: 'ends with' },
      ],
    },
    {
      name: 'genre',
      label: 'Genre',
      inputType: 'text',
      operators: [
        { name: '=', label: 'equals' },
        { name: 'contains', label: 'contains' },
        { name: 'beginsWith', label: 'begins with' },
        { name: 'endsWith', label: 'ends with' },
      ],
    },
    {
      name: 'year',
      label: 'Year',
      inputType: 'number',
      operators: [
        { name: '=', label: 'equals' },
        { name: '>', label: 'greater than' },
        { name: '<', label: 'less than' },
        { name: '>=', label: 'greater than or equal' },
        { name: '<=', label: 'less than or equal' },
        { name: 'between', label: 'between' },
      ],
    },
    {
      name: 'energy',
      label: 'Energy',
      inputType: 'number',
      operators: [
        { name: '>', label: 'greater than' },
        { name: '<', label: 'less than' },
        { name: '>=', label: 'greater than or equal' },
        { name: '<=', label: 'less than or equal' },
        { name: 'between', label: 'between' },
      ],
    },
    {
      name: 'valence',
      label: 'Valence (Mood)',
      inputType: 'number',
      operators: [
        { name: '>', label: 'greater than' },
        { name: '<', label: 'less than' },
        { name: '>=', label: 'greater than or equal' },
        { name: '<=', label: 'less than or equal' },
        { name: 'between', label: 'between' },
      ],
    },
    {
      name: 'danceability',
      label: 'Danceability',
      inputType: 'number',
      operators: [
        { name: '>', label: 'greater than' },
        { name: '<', label: 'less than' },
        { name: '>=', label: 'greater than or equal' },
        { name: '<=', label: 'less than or equal' },
        { name: 'between', label: 'between' },
      ],
    },
    {
      name: 'tempo',
      label: 'Tempo (BPM)',
      inputType: 'number',
      operators: [
        { name: '>', label: 'greater than' },
        { name: '<', label: 'less than' },
        { name: '>=', label: 'greater than or equal' },
        { name: '<=', label: 'less than or equal' },
        { name: 'between', label: 'between' },
      ],
    },
    {
      name: 'tags',
      label: 'Tags',
      inputType: 'select',
      values: allTags.map(tag => ({ name: tag.name, label: tag.name })),
      operators: [
        { name: 'in', label: 'contains any' },
        { name: '=', label: 'equals' },
      ],
    },
  ]

  // Convert React Query Builder query to SongsFilters
  const convertQueryToFilters = (query: RuleGroupType): SongsFilters => {
    const filters: SongsFilters = {}

    const processRuleGroup = (group: RuleGroupType) => {
      group.rules.forEach((rule: any) => {
        if ('rules' in rule) {
          // Handle nested groups
          processRuleGroup(rule)
        } else {
          // Handle individual rules
          const { field, operator, value } = rule

          switch (field) {
            case 'artist':
              if (['=', 'contains', 'beginsWith', 'endsWith'].includes(operator)) {
                filters.artist = value
              }
              break
            case 'album':
              if (['=', 'contains', 'beginsWith', 'endsWith'].includes(operator)) {
                filters.album = value
              }
              break
            case 'genre':
              if (['=', 'contains', 'beginsWith', 'endsWith'].includes(operator)) {
                filters.genre = value
              }
              break
            case 'year':
              if (operator === '=') {
                filters.year = Number(value)
              }
              break
            case 'energy':
              if (operator === 'between' && Array.isArray(value)) {
                filters.energy_min = Number(value[0])
                filters.energy_max = Number(value[1])
              } else if (operator === '>=') {
                filters.energy_min = Number(value)
              } else if (operator === '<=') {
                filters.energy_max = Number(value)
              }
              break
            case 'valence':
              if (operator === 'between' && Array.isArray(value)) {
                filters.valence_min = Number(value[0])
                filters.valence_max = Number(value[1])
              } else if (operator === '>=') {
                filters.valence_min = Number(value)
              } else if (operator === '<=') {
                filters.valence_max = Number(value)
              }
              break
            case 'danceability':
              if (operator === 'between' && Array.isArray(value)) {
                filters.danceability_min = Number(value[0])
                filters.danceability_max = Number(value[1])
              } else if (operator === '>=') {
                filters.danceability_min = Number(value)
              } else if (operator === '<=') {
                filters.danceability_max = Number(value)
              }
              break
            case 'tempo':
              if (operator === 'between' && Array.isArray(value)) {
                filters.tempo_min = Number(value[0])
                filters.tempo_max = Number(value[1])
              } else if (operator === '>=') {
                filters.tempo_min = Number(value)
              } else if (operator === '<=') {
                filters.tempo_max = Number(value)
              }
              break
            case 'tags':
              if (operator === 'in' && Array.isArray(value)) {
                if (value.length > 0) filters.tag1 = value[0]
                if (value.length > 1) filters.tag2 = value[1]
              } else if (operator === '=' && value) {
                filters.tag1 = value
              }
              break
          }
        }
      })
    }

    processRuleGroup(query)
    return filters
  }

  // Convert SongsFilters to React Query Builder query
  const convertFiltersToQuery = (filters: SongsFilters): RuleGroupType => {
    const rules: any[] = []

    if (filters.artist) {
      rules.push({
        id: `artist_${Date.now()}`,
        field: 'artist',
        operator: 'contains',
        value: filters.artist,
      })
    }

    if (filters.album) {
      rules.push({
        id: `album_${Date.now()}`,
        field: 'album',
        operator: 'contains',
        value: filters.album,
      })
    }

    if (filters.genre) {
      rules.push({
        id: `genre_${Date.now()}`,
        field: 'genre',
        operator: 'contains',
        value: filters.genre,
      })
    }

    if (filters.year) {
      rules.push({
        id: `year_${Date.now()}`,
        field: 'year',
        operator: '=',
        value: filters.year,
      })
    }

    if (filters.energy_min !== undefined && filters.energy_max !== undefined) {
      rules.push({
        id: `energy_${Date.now()}`,
        field: 'energy',
        operator: 'between',
        value: [filters.energy_min, filters.energy_max],
      })
    } else if (filters.energy_min !== undefined) {
      rules.push({
        id: `energy_min_${Date.now()}`,
        field: 'energy',
        operator: '>=',
        value: filters.energy_min,
      })
    } else if (filters.energy_max !== undefined) {
      rules.push({
        id: `energy_max_${Date.now()}`,
        field: 'energy',
        operator: '<=',
        value: filters.energy_max,
      })
    }

    if (filters.valence_min !== undefined && filters.valence_max !== undefined) {
      rules.push({
        id: `valence_${Date.now()}`,
        field: 'valence',
        operator: 'between',
        value: [filters.valence_min, filters.valence_max],
      })
    } else if (filters.valence_min !== undefined) {
      rules.push({
        id: `valence_min_${Date.now()}`,
        field: 'valence',
        operator: '>=',
        value: filters.valence_min,
      })
    } else if (filters.valence_max !== undefined) {
      rules.push({
        id: `valence_max_${Date.now()}`,
        field: 'valence',
        operator: '<=',
        value: filters.valence_max,
      })
    }

    if (filters.danceability_min !== undefined && filters.danceability_max !== undefined) {
      rules.push({
        id: `danceability_${Date.now()}`,
        field: 'danceability',
        operator: 'between',
        value: [filters.danceability_min, filters.danceability_max],
      })
    } else if (filters.danceability_min !== undefined) {
      rules.push({
        id: `danceability_min_${Date.now()}`,
        field: 'danceability',
        operator: '>=',
        value: filters.danceability_min,
      })
    } else if (filters.danceability_max !== undefined) {
      rules.push({
        id: `danceability_max_${Date.now()}`,
        field: 'danceability',
        operator: '<=',
        value: filters.danceability_max,
      })
    }

    if (filters.tempo_min !== undefined && filters.tempo_max !== undefined) {
      rules.push({
        id: `tempo_${Date.now()}`,
        field: 'tempo',
        operator: 'between',
        value: [filters.tempo_min, filters.tempo_max],
      })
    } else if (filters.tempo_min !== undefined) {
      rules.push({
        id: `tempo_min_${Date.now()}`,
        field: 'tempo',
        operator: '>=',
        value: filters.tempo_min,
      })
    } else if (filters.tempo_max !== undefined) {
      rules.push({
        id: `tempo_max_${Date.now()}`,
        field: 'tempo',
        operator: '<=',
        value: filters.tempo_max,
      })
    }

    const tagValues = [filters.tag1, filters.tag2, filters.tag].filter(Boolean)
    if (tagValues.length > 0) {
      rules.push({
        id: `tags_${Date.now()}`,
        field: 'tags',
        operator: 'in',
        value: tagValues,
      })
    }

    return {
      id: 'root',
      combinator: 'and',
      rules,
    }
  }

  // State for query builder
  const [query, setQuery] = useState<RuleGroupType>(() => convertFiltersToQuery(localFilters))

  // Update query when filters change
  useEffect(() => {
    setQuery(convertFiltersToQuery(localFilters))
  }, [localFilters])

  // Handle query builder changes
  const handleQueryChange = (newQuery: RuleGroupType) => {
    setQuery(newQuery)
    const newFilters = convertQueryToFilters(newQuery)
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const simpleFilterContent = (
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

  const queryBuilderContent = (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4">
        Build complex queries using multiple conditions and logical operators. Changes are applied automatically.
      </div>
      <DndProvider backend={HTML5Backend}>
        <QueryBuilderDnD>

            <QueryBuilder
              fields={fields}
              query={query}
              onQueryChange={handleQueryChange}
              controlClassnames={{
                queryBuilder: 'queryBuilder-branches',
                ruleGroup: 'ruleGroup',
                header: 'ruleGroup-header',
                body: 'ruleGroup-body',
                combinators: 'ruleGroup-combinators',
                addRule: 'ruleGroup-addRule',
                addGroup: 'ruleGroup-addGroup',
                cloneGroup: 'ruleGroup-cloneGroup',
                removeGroup: 'ruleGroup-remove',
                rule: 'rule',
                fields: 'rule-fields',
                operators: 'rule-operators',
                value: 'rule-value',
                removeRule: 'rule-remove',
              }}
              showCombinatorsBetweenRules
              showNotToggle
              showCloneButtons
              resetOnFieldChange={false}
              resetOnOperatorChange={false}
              enableDragAndDrop
            />

        </QueryBuilderDnD>
      </DndProvider>
    </div>
  )

  // Check if there are any active filters
  const hasActiveFilters = Object.keys(localFilters).length > 0

  // Apply filters function
  const applyFilters = () => {
    onFiltersChange(localFilters)
  }

  // Clear filters function  
  const clearFilters = () => {
    const clearedFilters = {}
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  const tabItems = [
    {
      key: 'simple',
      label: 'Simple Filters',
      children: simpleFilterContent,
    },
    {
      key: 'advanced',
      label: 'Advanced Query',
      children: queryBuilderContent,
    },
  ]

  return (
    <div className="border rounded-lg bg-white">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <FilterOutlined />
          <span className="font-medium">Filter Songs</span>
          {hasActiveFilters && (
            <Badge count="active" style={{ backgroundColor: '#52c41a' }} />
          )}
        </div>
        {isExpanded ? <UpOutlined /> : <DownOutlined />}
      </div>
      
      {isExpanded && (
        <div className="border-t p-4">
          <Tabs
            items={tabItems}
            activeKey={activeTab}
            onChange={setActiveTab}
          />
          
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button type="primary" onClick={applyFilters}>
              Apply Filters
            </Button>
            <Button onClick={clearFilters}>
              Clear All
            </Button>
          </div>
        </div>
      )}
    </div>
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