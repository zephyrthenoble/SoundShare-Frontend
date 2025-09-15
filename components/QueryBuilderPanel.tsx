'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Button, Space, Typography } from 'antd'
import { Filter, RotateCcw, Save } from 'lucide-react'
import { filtersApi, type SongsFilters, type FilterField } from '@/lib/api'
import type { PlaylistFilter } from '@/lib/playlist-types'

const { Title } = Typography

interface QueryBuilderPanelProps {
    currentFilter?: PlaylistFilter | null
    onFilterSave: (filter: PlaylistFilter) => void
    onFilterCancel: () => void
}

// Define the rules/fields for QueryBuilder based on backend data
const getQueryBuilderRules = (filterFields: Record<string, FilterField> = {}) => {
    return Object.entries(filterFields).map(([fieldId, field]) => {
        const rule: any = {
            id: fieldId,
            label: field.label,
            type: field.type,
            operators: field.operators
        }

        // Add input type and values for select fields
        if (field.values && field.values.length > 0) {
            rule.input = 'select'
            rule.multiple = field.multiple || false

            // Handle both simple string arrays and complex value objects
            if (typeof field.values[0] === 'string') {
                rule.values = (field.values as string[]).map(value => ({
                    value: value,
                    label: value
                }))
            } else {
                rule.values = field.values
            }
        }

        // Add validation for numeric fields
        if (field.type === 'integer' || field.type === 'double') {
            rule.validation = {}
            if (field.min !== undefined) rule.validation.min = field.min
            if (field.max !== undefined) rule.validation.max = field.max
            if (field.step !== undefined) rule.validation.step = field.step
        }

        return rule
    })
}// Convert QueryBuilder result to SongsFilters
const convertQueryToFilters = (rules: any): SongsFilters => {
    const filters: SongsFilters = {}

    if (!rules || !rules.rules) return filters

    const processRule = (rule: any) => {
        if (rule.rules) {
            // Handle groups - for now we'll process all rules (AND logic)
            rule.rules.forEach(processRule)
        } else {
            // Handle individual rules
            const { field, operator, value } = rule

            switch (field) {
                case 'artist':
                    if (['contains', 'equal', 'begins_with'].includes(operator)) {
                        filters.artist = value
                    }
                    break
                case 'album':
                    if (['contains', 'equal', 'begins_with'].includes(operator)) {
                        filters.album = value
                    }
                    break
                case 'genre':
                    if (['contains', 'equal', 'begins_with'].includes(operator)) {
                        filters.genre = value
                    }
                    break
                case 'year':
                    if (operator === 'equal') {
                        filters.year = value
                    }
                    break
                case 'energy':
                    if (operator === 'between' && Array.isArray(value)) {
                        filters.energy_min = value[0]
                        filters.energy_max = value[1]
                    } else if (operator === 'greater_or_equal') {
                        filters.energy_min = value
                    } else if (operator === 'less_or_equal') {
                        filters.energy_max = value
                    }
                    break
                case 'valence':
                    if (operator === 'between' && Array.isArray(value)) {
                        filters.valence_min = value[0]
                        filters.valence_max = value[1]
                    } else if (operator === 'greater_or_equal') {
                        filters.valence_min = value
                    } else if (operator === 'less_or_equal') {
                        filters.valence_max = value
                    }
                    break
                case 'danceability':
                    if (operator === 'between' && Array.isArray(value)) {
                        filters.danceability_min = value[0]
                        filters.danceability_max = value[1]
                    } else if (operator === 'greater_or_equal') {
                        filters.danceability_min = value
                    } else if (operator === 'less_or_equal') {
                        filters.danceability_max = value
                    }
                    break
                case 'tempo':
                    if (operator === 'between' && Array.isArray(value)) {
                        filters.tempo_min = value[0]
                        filters.tempo_max = value[1]
                    } else if (operator === 'greater_or_equal') {
                        filters.tempo_min = value
                    } else if (operator === 'less_or_equal') {
                        filters.tempo_max = value
                    }
                    break
                case 'tags':
                    if (operator === 'in' && Array.isArray(value)) {
                        if (value.length > 0) filters.tag = value[0] // Simplified for now
                    } else if (operator === 'contains') {
                        filters.tag = value
                    }
                    break
            }
        }
    }

    processRule(rules)
    return filters
}

// Convert SongsFilters back to QueryBuilder format
const convertFiltersToQuery = (filters: SongsFilters): any => {
    const rules: any[] = []

    if (filters.artist) {
        rules.push({
            id: 'artist',
            field: 'artist',
            type: 'string',
            operator: 'contains',
            value: filters.artist
        })
    }

    if (filters.album) {
        rules.push({
            id: 'album',
            field: 'album',
            type: 'string',
            operator: 'contains',
            value: filters.album
        })
    }

    if (filters.genre) {
        rules.push({
            id: 'genre',
            field: 'genre',
            type: 'string',
            operator: 'contains',
            value: filters.genre
        })
    }

    if (filters.year) {
        rules.push({
            id: 'year',
            field: 'year',
            type: 'integer',
            operator: 'equal',
            value: filters.year
        })
    }

    if (filters.energy_min !== undefined && filters.energy_max !== undefined) {
        rules.push({
            id: 'energy',
            field: 'energy',
            type: 'double',
            operator: 'between',
            value: [filters.energy_min, filters.energy_max]
        })
    } else if (filters.energy_min !== undefined) {
        rules.push({
            id: 'energy',
            field: 'energy',
            type: 'double',
            operator: 'greater_or_equal',
            value: filters.energy_min
        })
    } else if (filters.energy_max !== undefined) {
        rules.push({
            id: 'energy',
            field: 'energy',
            type: 'double',
            operator: 'less_or_equal',
            value: filters.energy_max
        })
    }

    if (filters.valence_min !== undefined && filters.valence_max !== undefined) {
        rules.push({
            id: 'valence',
            field: 'valence',
            type: 'double',
            operator: 'between',
            value: [filters.valence_min, filters.valence_max]
        })
    } else if (filters.valence_min !== undefined) {
        rules.push({
            id: 'valence',
            field: 'valence',
            type: 'double',
            operator: 'greater_or_equal',
            value: filters.valence_min
        })
    } else if (filters.valence_max !== undefined) {
        rules.push({
            id: 'valence',
            field: 'valence',
            type: 'double',
            operator: 'less_or_equal',
            value: filters.valence_max
        })
    }

    if (filters.danceability_min !== undefined && filters.danceability_max !== undefined) {
        rules.push({
            id: 'danceability',
            field: 'danceability',
            type: 'double',
            operator: 'between',
            value: [filters.danceability_min, filters.danceability_max]
        })
    } else if (filters.danceability_min !== undefined) {
        rules.push({
            id: 'danceability',
            field: 'danceability',
            type: 'double',
            operator: 'greater_or_equal',
            value: filters.danceability_min
        })
    } else if (filters.danceability_max !== undefined) {
        rules.push({
            id: 'danceability',
            field: 'danceability',
            type: 'double',
            operator: 'less_or_equal',
            value: filters.danceability_max
        })
    }

    if (filters.tempo_min !== undefined && filters.tempo_max !== undefined) {
        rules.push({
            id: 'tempo',
            field: 'tempo',
            type: 'integer',
            operator: 'between',
            value: [filters.tempo_min, filters.tempo_max]
        })
    } else if (filters.tempo_min !== undefined) {
        rules.push({
            id: 'tempo',
            field: 'tempo',
            type: 'integer',
            operator: 'greater_or_equal',
            value: filters.tempo_min
        })
    } else if (filters.tempo_max !== undefined) {
        rules.push({
            id: 'tempo',
            field: 'tempo',
            type: 'integer',
            operator: 'less_or_equal',
            value: filters.tempo_max
        })
    }

    if (filters.tag) {
        rules.push({
            id: 'tags',
            field: 'tags',
            type: 'string',
            operator: 'in',
            value: [filters.tag]
        })
    }

    return {
        condition: 'AND',
        rules: rules
    }
}

export function QueryBuilderPanel({ currentFilter, onFilterSave, onFilterCancel }: QueryBuilderPanelProps) {
    const [filterName, setFilterName] = useState('')
    const queryBuilderRef = useRef<HTMLDivElement>(null)
    const queryBuilderInstance = useRef<any>(null)

    // Get all available filter fields from backend
    const { data: filterData } = useQuery({
        queryKey: ['song-filters'],
        queryFn: filtersApi.getSongFilters,
    })

    useEffect(() => {
        if (currentFilter) {
            setFilterName(currentFilter.name)
        } else {
            setFilterName('')
        }
    }, [currentFilter])

    useEffect(() => {
        const initQueryBuilder = () => {
            if (typeof window !== 'undefined' && queryBuilderRef.current && filterData?.fields) {
                try {
                    // Use require to load jQuery and QueryBuilder
                    const $ = require('jquery')
                    require('jQuery-QueryBuilder')

                    // Initialize QueryBuilder
                    const $element = $(queryBuilderRef.current)

                    queryBuilderInstance.current = $element.queryBuilder({
                        plugins: {
                            'bt-tooltip-errors': { delay: 100 }
                        },
                        rules: getQueryBuilderRules(filterData.fields),
                        operators: [
                            { type: 'equal', nb_inputs: 1, multiple: false, apply_to: ['string', 'number', 'datetime', 'boolean'] },
                            { type: 'not_equal', nb_inputs: 1, multiple: false, apply_to: ['string', 'number', 'datetime', 'boolean'] },
                            { type: 'contains', nb_inputs: 1, multiple: false, apply_to: ['string'] },
                            { type: 'not_contains', nb_inputs: 1, multiple: false, apply_to: ['string'] },
                            { type: 'begins_with', nb_inputs: 1, multiple: false, apply_to: ['string'] },
                            { type: 'ends_with', nb_inputs: 1, multiple: false, apply_to: ['string'] },
                            { type: 'greater', nb_inputs: 1, multiple: false, apply_to: ['number', 'datetime'] },
                            { type: 'greater_or_equal', nb_inputs: 1, multiple: false, apply_to: ['number', 'datetime'] },
                            { type: 'less', nb_inputs: 1, multiple: false, apply_to: ['number', 'datetime'] },
                            { type: 'less_or_equal', nb_inputs: 1, multiple: false, apply_to: ['number', 'datetime'] },
                            { type: 'between', nb_inputs: 2, multiple: false, apply_to: ['number', 'datetime'] },
                            { type: 'not_between', nb_inputs: 2, multiple: false, apply_to: ['number', 'datetime'] },
                            { type: 'in', nb_inputs: 1, multiple: true, apply_to: ['string', 'number'] },
                            { type: 'not_in', nb_inputs: 1, multiple: true, apply_to: ['string', 'number'] }
                        ]
                    })

                    // Load existing filter if provided
                    if (currentFilter) {
                        const queryRules = convertFiltersToQuery(currentFilter.filters)
                        $element.queryBuilder('setRules', queryRules)
                    }
                } catch (error) {
                    console.error('Error initializing QueryBuilder:', error)
                }
            }
        }

        initQueryBuilder()

        return () => {
            // Cleanup
            if (queryBuilderInstance.current && typeof window !== 'undefined') {
                try {
                    const $ = require('jquery')
                    $(queryBuilderRef.current).queryBuilder('destroy')
                } catch (error) {
                    console.error('Error destroying QueryBuilder:', error)
                }
            }
        }
    }, [filterData, currentFilter])

    const handleSave = () => {
        if (!queryBuilderInstance.current || !filterName.trim()) return

        try {
            const $ = require('jquery')
            const rules = $(queryBuilderRef.current).queryBuilder('getRules')

            if (rules) {
                const filters = convertQueryToFilters(rules)
                const filter: PlaylistFilter = {
                    id: currentFilter?.id || `filter_${Date.now()}`,
                    name: filterName.trim(),
                    filters,
                    created_at: currentFilter?.created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }

                onFilterSave(filter)
            }
        } catch (error) {
            console.error('Error saving filter:', error)
        }
    }

    const handleReset = () => {
        if (queryBuilderInstance.current && typeof window !== 'undefined') {
            try {
                const $ = require('jquery')
                $(queryBuilderRef.current).queryBuilder('reset')
            } catch (error) {
                console.error('Error resetting QueryBuilder:', error)
            }
        }
    }

    return (
        <Card className="h-full">
            <Title level={4}>
                <Filter size={20} className="inline mr-2" />
                {currentFilter ? 'Edit Filter' : 'Create Filter'}
            </Title>

            <Space direction="vertical" size="large" className="w-full">
                <div>
                    <label className="block text-sm font-medium mb-2">Filter Name</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter filter name..."
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Query Builder</label>
                    <div
                        ref={queryBuilderRef}
                        className="query-builder-container"
                        style={{ minHeight: '200px' }}
                    />
                </div>

                <div className="flex justify-between">
                    <Space>
                        <Button
                            icon={<RotateCcw size={16} />}
                            onClick={handleReset}
                        >
                            Reset
                        </Button>
                    </Space>

                    <Space>
                        <Button onClick={onFilterCancel}>
                            Cancel
                        </Button>
                        <Button
                            type="primary"
                            icon={<Save size={16} />}
                            onClick={handleSave}
                            disabled={!filterName.trim()}
                        >
                            Save Filter
                        </Button>
                    </Space>
                </div>
            </Space>
        </Card>
    )
}
