'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
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
import * as ReactDnD from 'react-dnd'
import * as ReactDndHtml5Backend from 'react-dnd-html5-backend'
import * as ReactDndTouchBackend from 'react-dnd-touch-backend'
import { QueryBuilder, RuleGroupType, Field } from 'react-querybuilder'


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
  filters: QueryJSON | null
  onFiltersChange: (query: QueryJSON | null) => void
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
        setQuery(convertedQuery)
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
    fieldsCount: fields.length,
    fieldsLoading,
    fieldsError,
    fields: fields.map((f: any) => ({ name: f.name, label: f.label, inputType: f.inputType })),
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
      return initialQuery
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
  const handleQueryChange = (newQuery: RuleGroupType) => {
    console.log('🔍 Query Builder Change Detected:', {
      timestamp: new Date().toISOString(),
      oldQuery: query,
      newQuery: newQuery,
      hasRules: newQuery.rules?.length > 0,
      ruleCount: newQuery.rules?.length || 0,
      combinator: newQuery.combinator,
      not: newQuery.not
    })
    
    // Update query state immediately to preserve query builder's internal state
    console.log('🔍 Setting query state to:', newQuery)
    setQuery(newQuery)
    
    // NOTE: We no longer auto-convert on query change
    // Users must click "Apply Filters" button to update
    // This prevents unnecessary API calls while building complex queries
    
    /*
    // Only convert and update filters if the query has meaningful content
    const hasValidRules = newQuery.rules?.some((rule: any) => {
      if ('rules' in rule) {
        return rule.rules?.length > 0
      } else {
        return rule.field && (rule.value !== undefined && rule.value !== '')
      }
    })
    
    if (hasValidRules) {
      const newFilters = convertQueryToJSON(newQuery)
      console.log('🎯 Converted JSON from query (has valid rules):', newFilters)
      
      // Set flag to prevent useEffect loop when updating from query builder
      isQueryBuilderUpdate.current = true
      
      console.log('🔍 Calling debounced onFiltersChange with converted query:', newFilters)
      debouncedOnFiltersChange(newFilters)
      
      // Reset flag after a short delay to allow for external updates
      setTimeout(() => {
        isQueryBuilderUpdate.current = false
      }, 100)
    }
    */
  }

  const queryBuilderContent = (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4">
        Build complex queries using multiple conditions and logical operators. Changes are applied automatically.
      </div>
      
      {/* Debug Info */}
      <div className="bg-gray-100 p-3 rounded text-xs font-mono">
        <div><strong>Debug Info:</strong></div>
        <div>Query Rules: {query.rules?.length || 0}</div>
        <div>Combinator: {query.combinator}</div>
        <div>Not: {query.not ? 'true' : 'false'}</div>
        <div>Fields Available: {fields.length}</div>
        <div className="mt-2">
          <button 
            onClick={() => {
              console.log('🧪 Test button clicked - DOM interaction working')
              const addRuleBtn = document.querySelector('.ruleGroup-addRule')
              const addGroupBtn = document.querySelector('.ruleGroup-addGroup')
              const notToggle = document.querySelector('[title*="Not"]')
              console.log('🔍 DOM Elements found:', {
                addRuleBtn: !!addRuleBtn,
                addGroupBtn: !!addGroupBtn,
                notToggle: !!notToggle
              })
            }}
            className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
          >
            Test DOM Interaction
          </button>
        </div>
        <details>
          <summary>Full Query Object</summary>
          <pre>{JSON.stringify(query, null, 2)}</pre>
        </details>
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
          <QueryBuilder
            key="stable-query-builder"
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
            {...defaultQueryBuilderConfig}
            debugMode={true}
          />
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
    
    // If we're on the advanced tab, convert the current query to JSON
    if (activeTab === 'advanced') {
      const queryJSON = convertQueryToJSON(query)
      console.log('🔄 Converting query to JSON:', queryJSON)
      
      // Set flag to prevent useEffect from overwriting when parent updates filters prop
      isQueryBuilderUpdate.current = true
      onFiltersChange(queryJSON)
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