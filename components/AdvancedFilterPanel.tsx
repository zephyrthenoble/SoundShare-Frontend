'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
} from 'antd'
import { Filter, RotateCcw, Settings } from 'lucide-react'

import { tagsApi, type SongsFilters } from '@/lib/api'
import { fetchQueryBuilderFields, defaultQueryBuilderConfig } from '@/lib/queryBuilderConfig'
import { convertQueryToJSON, QueryJSON, generateRuleId } from '@/lib/queryBuilderUtils'

import { QueryBuilderDnD } from '@react-querybuilder/dnd'
import { QueryBuilderAntD, antdControlElements } from '@react-querybuilder/antd'
import * as ReactDnD from 'react-dnd'
import * as ReactDndHtml5Backend from 'react-dnd-html5-backend'
import * as ReactDndTouchBackend from 'react-dnd-touch-backend'
import { QueryBuilder, RuleGroupType, Field, formatQuery, type ValueEditorProps, type RuleType } from 'react-querybuilder'


const { Title } = Typography
const { Option } = Select

// Helper to convert QueryJSON groups to RuleGroupType (defined outside component)
const convertQueryJSONToRuleGroup = (queryJSON: QueryJSON): RuleGroupType => {
  return {
    id: generateRuleId(),
    combinator: queryJSON.combinator,
    not: queryJSON.negated,
    rules: [
      ...queryJSON.rules.map(rule => ({
        id: generateRuleId(),
        field: rule.field,
        operator: rule.operator,
        value: rule.value,
        not: rule.not
      })),
      ...queryJSON.groups.map(group => convertQueryJSONToRuleGroup(group))
    ]
  }
}

interface AdvancedFilterPanelProps {
  filters: QueryJSON | string | null
  onFiltersChange: (query: QueryJSON | string | null) => void
}

export const AdvancedFilterPanel = React.memo(function AdvancedFilterPanel({ filters, onFiltersChange }: AdvancedFilterPanelProps) {
  const [activeTab, setActiveTab] = useState('advanced') // Default to advanced tab since that's what works
  
  // Track whether changes are coming from query builder to prevent loops
  const isQueryBuilderUpdate = useRef(false)
  
  // Simple debounce function
  const debounce = <T extends (...args: any[]) => void>(func: T, delay: number) => {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    return useCallback((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => func(...args), delay)
    }, [func, delay])
  }

  // Get all available tags for filtering
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getTags,
  })

  // Get dynamic QueryBuilder fields from backend
  const { data: fields = [], isLoading: fieldsLoading, error: fieldsError } = useQuery({
    queryKey: ['querybuilder-fields'],
    queryFn: fetchQueryBuilderFields,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  })

  const tagSelectOptions = useMemo(
    () => allTags.map((tag) => ({ label: tag.name, value: tag.name })),
    [allTags],
  )

  const tagFieldValues = useMemo(
    () => tagSelectOptions.map((option) => ({ name: option.value, label: option.label })),
    [tagSelectOptions],
  )

  const enhancedFields = useMemo(() => {
    const transformed = fields.map((field) => {
      if (field.name !== 'tags') {
        return field
      }
      return {
        ...field,
        operators: [
          { name: 'in', label: 'contains' },
          { name: 'notIn', label: 'does not contain' },
        ],
        values: tagFieldValues,
      }
    })

    transformed.sort((a, b) => {
      if (a.name === 'tags') return -1
      if (b.name === 'tags') return 1
      return 0
    })

    return transformed
  }, [fields, tagFieldValues])

  const tagControlElements = useMemo(() => {
    const defaultValueEditor = antdControlElements.valueEditor

    const TagValueEditor: React.FC<ValueEditorProps> = (props) => {
      if (props.field === 'tags') {
        const selectedValues = Array.isArray(props.value)
          ? props.value
          : props.value
            ? [props.value]
            : []

        return (
          <Select
            mode="multiple"
            showSearch
            allowClear
            placeholder="Select tags"
            options={tagSelectOptions}
            optionFilterProp="label"
            value={selectedValues}
            disabled={props.disabled}
            onChange={(next) => props.handleOnChange(next)}
            style={{ minWidth: 200 }}
          />
        )
      }

      if (defaultValueEditor) {
        const DefaultValueEditor = defaultValueEditor
        return <DefaultValueEditor {...props} />
      }

      return (
        <Input
          disabled={props.disabled}
          value={(props.value ?? '') as string}
          onChange={(event) => props.handleOnChange(event.target.value)}
        />
      )
    }

    return {
      ...antdControlElements,
      valueEditor: TagValueEditor,
    }
  }, [tagSelectOptions])

  function normalizeTagsRuleGroup(group: RuleGroupType): RuleGroupType {
    return {
      ...group,
      rules: group.rules.map((item) => {
        if ('rules' in item) {
          return normalizeTagsRuleGroup(item as RuleGroupType)
        }

        const rule = { ...(item as RuleType) }

        if (!rule.field) {
          rule.field = 'tags'
        }

        if (rule.field === 'tags') {
          if (!rule.operator || (rule.operator !== 'in' && rule.operator !== 'notIn')) {
            rule.operator = 'in'
          }

          if (!Array.isArray(rule.value)) {
            rule.value = rule.value ? [rule.value] : []
          }
        }

        return rule
      }),
    }
  }

  useEffect(() => {
    console.log('🔄 useEffect triggered - filters prop changed:', { 
      filters,
      isQueryBuilderUpdate: isQueryBuilderUpdate.current
    })
    
    // Only update if this change didn't originate from the query builder
    if (!isQueryBuilderUpdate.current) {
      console.log('🔄 Updating query from external filters change')
      if (filters && typeof filters === 'object' && 'combinator' in filters) {
        // Convert QueryJSON back to RuleGroupType
        const convertedQuery: RuleGroupType = {
          combinator: filters.combinator,
          not: filters.negated,
          rules: [
            ...filters.rules.map(rule => ({
              id: generateRuleId(),
              field: rule.field,
              operator: rule.operator,
              value: rule.value,
              not: rule.not
            })),
            ...filters.groups.map(group => convertQueryJSONToRuleGroup(group))
          ]
        }
        console.log('🔄 Converted QueryJSON to RuleGroupType:', convertedQuery)
        setQuery(normalizeTagsRuleGroup(convertedQuery))
      } else if (typeof filters === 'string') {
        // SQL query - for now, we can't convert back to QueryBuilder format
        // so we'll start with empty query (user will need to rebuild)
        console.log('🔄 Received SQL query, starting with empty QueryBuilder')
        setQuery({
          combinator: 'and',
          rules: []
        } as RuleGroupType)
      } else {
        // No filters, use empty query
        setQuery({
          combinator: 'and',
          rules: []
        } as RuleGroupType)
      }
    } else {
      console.log('🔄 Skipping update - originated from query builder')
      // Reset the flag after using it
      isQueryBuilderUpdate.current = false
    }
  }, [filters])

  // Query Builder Configuration
  // Debug fields configuration
  console.log('🔧 Query Builder Fields Configuration:', {
    fieldsCount: enhancedFields.length,
    fieldsLoading,
    fieldsError,
    fields: enhancedFields.map((f: any) => ({ name: f.name, label: f.label, inputType: f.inputType })),
    tagsCount: allTags.length,
    allTags: allTags.map(t => t.name)
  })

  // Convert React Query Builder query to SongsFilters
  // State for query builder
  const [query, setQuery] = useState<RuleGroupType>(() => {
    // Initialize from filters prop if it exists and is a valid QueryJSON
    if (filters && typeof filters === 'object' && 'combinator' in filters) {
      const initialQuery: RuleGroupType = {
        combinator: filters.combinator,
        not: filters.negated,
        rules: [
          ...filters.rules.map(rule => ({
            id: generateRuleId(),
            field: rule.field,
            operator: rule.operator,
            value: rule.value,
            not: rule.not
          })),
          ...filters.groups.map(group => convertQueryJSONToRuleGroup(group))
        ]
      }
      console.log('🚀 Initial Query Builder State from filters:', initialQuery)
      return normalizeTagsRuleGroup(initialQuery)
    }
    
    // Otherwise use default
    const defaultQuery: RuleGroupType = {
      combinator: 'and',
      rules: []
    }
    console.log('🚀 Initial Query Builder State (default):', defaultQuery)
    return defaultQuery
  })

  // Handle query builder changes
  const handleQueryChange = (incomingQuery: RuleGroupType) => {
    console.log('🔍 Query Builder Change Detected:', {
      timestamp: new Date().toISOString(),
      oldQuery: query,
      newQuery: incomingQuery,
      hasRules: incomingQuery.rules?.length > 0,
      ruleCount: incomingQuery.rules?.length || 0,
      combinator: incomingQuery.combinator,
      not: incomingQuery.not
    })
    
    const normalizedQuery = normalizeTagsRuleGroup(incomingQuery)

    // Update query state immediately to preserve query builder's internal state
    console.log('🔍 Setting query state to:', normalizedQuery)
    setQuery(normalizedQuery)
    
  }

  const queryBuilderContent = (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4">
        Build complex queries using multiple conditions and logical operators. Changes are applied automatically.
      </div>
      
      {fieldsLoading ? (
        <div className="flex justify-center items-center p-8">
          <div className="text-gray-500">Loading query builder fields...</div>
        </div>
      ) : fieldsError ? (
        <div className="text-red-500 p-4 border border-red-200 rounded">
          Error loading fields: {fieldsError.message}
        </div>
      ) : (
        <QueryBuilderDnD dnd={{ ...ReactDnD, ...ReactDndHtml5Backend, ...ReactDndTouchBackend }}>
          <QueryBuilderAntD controlElements={tagControlElements}>
            <QueryBuilder
              key="stable-query-builder"
              fields={enhancedFields}
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
              controlElements={tagControlElements}
              {...defaultQueryBuilderConfig}
              debugMode={true}
            />
          </QueryBuilderAntD>
        </QueryBuilderDnD>
      )}
    </div>
  )

  // Apply filters function
  const applyFilters = () => {
    console.log('🎯 Apply Filters clicked:', {
      query,
      activeTab
    })
    
    // If we're on the advanced tab, convert the current query to SQL
    if (activeTab === 'advanced') {
      // Check if the query has any meaningful rules
      const hasValidRules = query.rules?.some((rule: any) => {
        if ('rules' in rule) {
          // It's a nested group, check if it has rules
          return rule.rules?.length > 0
        } else {
          // It's a rule, check if it has meaningful content
          return rule.field && (rule.value !== undefined && rule.value !== '' && rule.value !== null)
        }
      })

      if (!hasValidRules) {
        console.log('🔄 No valid rules found, sending null (will return all songs)')
        // Set flag to prevent useEffect from overwriting when parent updates filters prop
        isQueryBuilderUpdate.current = true
        onFiltersChange(null)
      } else {
        // Generate SQL condition using react-querybuilder
        const sqlCondition = formatQuery(query, 'sql')
        console.log('🔄 Generated SQL condition:', sqlCondition)

        
        // Set flag to prevent useEffect from overwriting when parent updates filters prop
        isQueryBuilderUpdate.current = true
        onFiltersChange(sqlCondition)
      }
    } else {
      // Simple filters - for now just send null (user needs to use advanced tab)
      onFiltersChange(null)
    }
  }

  // Clear filters function  
  const clearFilters = () => {
    onFiltersChange(null)
  }

  const tabItems = [
    {
      key: 'advanced',
      label: 'Query Builder',
      children: queryBuilderContent,
    },
  ]

  return (
    <div className="space-y-4">
      {queryBuilderContent}
      
      <div className="flex gap-2 pt-4 border-t">
        <Button type="primary" onClick={applyFilters}>
          Apply Filters
        </Button>
        <Button onClick={clearFilters}>
          Clear All
        </Button>
      </div>
    </div>
  )
})

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

export default AdvancedFilterPanel