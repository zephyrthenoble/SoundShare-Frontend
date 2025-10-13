'use client'

import { useState } from 'react'
import { Card, Button, Typography } from 'antd'
import { Settings } from 'lucide-react'
import { formatQuery } from 'react-querybuilder'
import { useSongsCacheManager } from '@/lib/hooks/useCachedApi'
import { useQuery } from '@tanstack/react-query'
import { fetchQueryBuilderFields } from '@/lib/queryBuilderConfig'

const { Title } = Typography

interface DebugPanelProps {
  currentQuery?: any // The current query from the filter panel
}

export function DebugPanel({ currentQuery }: DebugPanelProps) {
  const [debugMode, setDebugMode] = useState(false)
  const cacheManager = useSongsCacheManager()

  // Get fields for debugging
  const { data: fields = [], isLoading: fieldsLoading, error: fieldsError } = useQuery({
    queryKey: ['querybuilder-fields'],
    queryFn: fetchQueryBuilderFields,
    staleTime: 5 * 60 * 1000,
  })

  if (!debugMode) {
    return (
      <Card className="h-full">
        <div className="flex items-center justify-between">
          <Title level={4} className="!mb-0">
            🔧 Debug Tools
          </Title>
          <Button
            type="primary"
            icon={<Settings size={16} />}
            onClick={() => setDebugMode(true)}
            size="small"
          >
            Enable Debug Mode
          </Button>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Click "Enable Debug Mode" to access developer tools, cache management, and query debugging.
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Title level={4} className="!mb-0">
            🔧 Debug Tools
          </Title>
          <Button
            size="small"
            onClick={() => setDebugMode(false)}
            className="text-orange-600 hover:text-orange-800"
          >
            Disable Debug
          </Button>
        </div>

        {/* Debug Info Panel */}
        <div className="bg-gray-100 p-3 rounded text-xs font-mono border border-gray-300">
          <div className="flex justify-between items-center mb-2">
            <strong className="text-blue-600">🔧 Debug Information</strong>
            <span className="text-gray-500">Development Mode Active</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <div className="text-blue-700 font-semibold mb-1">Query Builder</div>
              <div><span className="text-gray-600">Rules:</span> <span className="font-semibold">{currentQuery?.rules?.length || 0}</span></div>
              <div><span className="text-gray-600">Combinator:</span> <span className="font-semibold">{currentQuery?.combinator || 'N/A'}</span></div>
              <div><span className="text-gray-600">Negated:</span> <span className="font-semibold">{currentQuery?.not ? 'true' : 'false'}</span></div>
            </div>
            <div>
              <div className="text-green-700 font-semibold mb-1">Fields & API</div>
              <div><span className="text-gray-600">Fields Available:</span> <span className="font-semibold">{fields.length}</span></div>
              <div><span className="text-gray-600">Fields Loading:</span> <span className="font-semibold">{fieldsLoading ? 'true' : 'false'}</span></div>
              <div><span className="text-gray-600">Has Errors:</span> <span className="font-semibold">{fieldsError ? 'true' : 'false'}</span></div>
            </div>
            <div>
              <div className="text-purple-700 font-semibold mb-1">Cache Status</div>
              {(() => {
                try {
                  const cacheStats = cacheManager.getCacheStats()
                  return (
                    <>
                      <div><span className="text-gray-600">Cached Queries:</span> <span className="font-semibold">{cacheStats.totalSongsQueries}</span></div>
                      <div><span className="text-gray-600">Cache Hits:</span> <span className="font-semibold text-green-600">Active</span></div>
                      <div><span className="text-gray-600">Last Update:</span> <span className="font-semibold">{cacheStats.queriesData?.[0]?.lastFetch ? new Date(cacheStats.queriesData[0].lastFetch).toLocaleTimeString() : 'None'}</span></div>
                    </>
                  )
                } catch (error) {
                  return <div className="text-red-500">Cache unavailable</div>
                }
              })()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button 
              onClick={() => {
                console.log('🧪 DOM Test clicked - checking QueryBuilder elements')
                const addRuleBtn = document.querySelector('.ruleGroup-addRule')
                const addGroupBtn = document.querySelector('.ruleGroup-addGroup')
                const notToggle = document.querySelector('[title*="Not"]')
                console.log('🔍 DOM Elements found:', {
                  addRuleBtn: !!addRuleBtn,
                  addGroupBtn: !!addGroupBtn,
                  notToggle: !!notToggle
                })
              }}
              className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
            >
              Test DOM
            </button>
            <button 
              onClick={() => {
                console.log('🔄 Current Query State:', currentQuery)
                console.log('🔄 Current Fields:', fields)
              }}
              className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
            >
              Log State
            </button>
            <button 
              onClick={() => {
                if (currentQuery) {
                  const sqlOutput = formatQuery(currentQuery, 'sql')
                  console.log('🎯 Generated SQL:', sqlOutput)
                } else {
                  console.log('🎯 No query available')
                }
              }}
              className="bg-purple-500 text-white px-2 py-1 rounded text-xs hover:bg-purple-600"
            >
              Test SQL
            </button>
            <button 
              onClick={() => {
                const cacheStats = cacheManager.getCacheStats()
                console.log('📊 Cache Statistics:', cacheStats)
              }}
              className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600"
            >
              Cache Stats
            </button>
            <button 
              onClick={() => {
                cacheManager.invalidateSongs()
                console.log('🗑️ Cache invalidated')
              }}
              className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
            >
              Clear Cache
            </button>
            <button 
              onClick={async () => {
                console.log('🚀 Prefetching all songs...')
                await cacheManager.prefetchAllSongs()
                console.log('✅ Prefetch completed')
              }}
              className="bg-indigo-500 text-white px-2 py-1 rounded text-xs hover:bg-indigo-600"
            >
              Prefetch Songs
            </button>
          </div>

          {/* Expandable Details */}
          <details className="mt-2">
            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
              📋 Full Query Object (click to expand)
            </summary>
            <pre className="mt-2 p-2 bg-white rounded border text-xs overflow-auto max-h-40">
              {JSON.stringify(currentQuery, null, 2)}
            </pre>
          </details>
          
          {fields.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                🏗️ Available Fields (click to expand)
              </summary>
              <pre className="mt-2 p-2 bg-white rounded border text-xs overflow-auto max-h-40">
                {JSON.stringify(fields.map(f => ({ name: f.name, label: f.label, inputType: f.inputType })), null, 2)}
              </pre>
            </details>
          )}
          
          <details className="mt-2">
            <summary className="cursor-pointer text-purple-600 hover:text-purple-800">
              🗄️ Cache Details (click to expand)
            </summary>
            <div className="mt-2 p-2 bg-white rounded border text-xs">
              {(() => {
                try {
                  const cacheStats = cacheManager.getCacheStats()
                  return (
                    <div>
                      <div className="mb-2">
                        <strong>Total Queries Cached:</strong> {cacheStats.totalSongsQueries}
                      </div>
                      {cacheStats.queriesData.length > 0 && (
                        <div>
                          <strong>Cache Entries:</strong>
                          <div className="mt-1 space-y-1">
                            {cacheStats.queriesData.slice(0, 5).map((entry, index) => (
                              <div key={index} className="bg-gray-50 p-1 rounded">
                                <div><strong>Query {index + 1}:</strong> {entry.dataSize} songs</div>
                                <div><strong>Last Fetch:</strong> {new Date(entry.lastFetch).toLocaleString()}</div>
                                <div><strong>Status:</strong> <span className={entry.isStale ? 'text-orange-600' : 'text-green-600'}>{entry.isStale ? 'Stale' : 'Fresh'}</span></div>
                              </div>
                            ))}
                            {cacheStats.queriesData.length > 5 && (
                              <div className="text-gray-500">... and {cacheStats.queriesData.length - 5} more</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                } catch (error) {
                  return <div className="text-red-500">Cache statistics unavailable: {String(error)}</div>
                }
              })()}
            </div>
          </details>
        </div>
      </div>
    </Card>
  )
}