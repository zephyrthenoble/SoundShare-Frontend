'use client'

import { useState } from 'react'
import { Button, Card, Col, Layout, Row, Typography, Collapse } from 'antd'
import { ChevronLeft, ChevronRight, Music } from 'lucide-react'
import { PlaylistColumn } from '@/components/PlaylistColumn'
import { LibraryColumn } from '@/components/LibraryColumn'
import { QueueColumn } from '@/components/QueueColumn'
import { DebugPanel } from '@/components/DebugPanel'
import { MusicPlayer } from '@/components/MusicPlayer'
import { useMusicPlayer } from '@/lib/music-context'
import type { SongsFilters } from '@/lib/api'
import type { Playlist, PlaylistFilter } from '@/lib/playlist-types'

const { Header, Content } = Layout
const { Title } = Typography
const { Panel } = Collapse

export default function Home() {
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null)
  const [editingFilter, setEditingFilter] = useState<PlaylistFilter | null>(null)
  const [activePlaylistKeys, setActivePlaylistKeys] = useState<string[]>(['playlist', 'queue'])
  
  // Three states: 'both' | 'playlist-only' | 'library-only'
  const [layoutState, setLayoutState] = useState<'both' | 'playlist-only' | 'library-only'>('both')
  
  const isLibraryExpanded = layoutState === 'library-only'

  const [currentQuery, setCurrentQuery] = useState<any>(null) // Track current filter query for debug panel
  const { currentSong, closePlayer } = useMusicPlayer()

  const handlePlaylistChange = (playlist: Playlist | null) => {
    setCurrentPlaylist(playlist)
    // Queue will be regenerated automatically in QueueColumn when playlist changes
  }

  const handleSongAddedToPlaylist = () => {
    if (currentPlaylist) {
      // Force a re-render to trigger queue regeneration
      setCurrentPlaylist({ ...currentPlaylist })
    }
  }

  const handleFilterSaved = (filter: PlaylistFilter | null) => {
    setEditingFilter(filter)
    if (currentPlaylist && !filter) {
      // Filter was saved, force re-render to trigger queue regeneration
      setCurrentPlaylist({ ...currentPlaylist })
    }
  }

  // Handle toggling playlist visibility
  const handleTogglePlaylist = () => {
    if (layoutState === 'playlist-only') {
      // Playlist maximized, clicking shrink goes to both visible
      setLayoutState('both')
    } else if (layoutState === 'both') {
      // Both visible, clicking hide goes to library only
      setLayoutState('library-only')
    } else {
      // Library only, clicking show goes to both visible
      setLayoutState('both')
    }
  }

  // Handle toggling library visibility
  const handleToggleLibrary = () => {
    if (layoutState === 'library-only') {
      // Library maximized, clicking shrink goes to both visible
      setLayoutState('both')
    } else if (layoutState === 'both') {
      // Both visible, clicking hide goes to playlist only
      setLayoutState('playlist-only')
    } else {
      // Playlist only, clicking show goes to both visible
      setLayoutState('both')
    }
  }

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Header className="!bg-gray-50 border-b border-gray-300 px-6 flex items-center">
        <div className="flex items-center space-x-3">
          <Music size={24} className="text-blue-600" />
          <Title level={2} className="!mb-0 !text-gray-800">
            SoundShare
          </Title>
        </div>
      </Header>

      <Content className="p-6">
        <div className="max-w-full mx-auto space-y-6">
          <MusicPlayer
            currentSong={currentSong}
            onClose={closePlayer}
          />

          <Row gutter={[16, 0]} className="h-full">
            {/* Left side - Playlist or Show Playlist button */}
            {layoutState !== 'library-only' ? (
              <Col span={layoutState === 'playlist-only' ? 23 : 10} className="h-full transition-all duration-200">
                <Card className="h-full">
                  <div className="flex items-center justify-between mb-4">
                    <Title level={4} className="!mb-0">Playlist & Queue</Title>
                    <Button
                      type="text"
                      icon={layoutState === 'playlist-only' ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                      onClick={handleTogglePlaylist}
                      className="text-gray-600"
                    >
                      {layoutState === 'playlist-only' ? 'Shrink' : 'Hide Playlist'}
                    </Button>
                  </div>
                  <Collapse
                    activeKey={activePlaylistKeys}
                    onChange={(keys) => setActivePlaylistKeys(keys as string[])}
                    ghost
                    size="small"
                    className="h-full [&_.ant-collapse-item]:border [&_.ant-collapse-item]:border-gray-200 [&_.ant-collapse-item]:rounded-lg [&_.ant-collapse-item]:mb-4 [&_.ant-collapse-content-box]:p-0"
                    items={[
                      {
                        key: 'playlist',
                        label: (
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">Playlist</span>
                            {currentPlaylist && (
                              <span className="text-xs text-gray-500">
                                {currentPlaylist.filters.length} filters, {currentPlaylist.manual_songs.length} songs
                              </span>
                            )}
                          </div>
                        ),
                        children: (
                          <div className="h-full">
                            <PlaylistColumn
                              currentPlaylist={currentPlaylist}
                              onPlaylistChange={handlePlaylistChange}
                              onEditFilter={setEditingFilter}
                            />
                          </div>
                        ),
                      },
                      {
                        key: 'queue',
                        label: (
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">Queue</span>
                            <span className="text-xs text-gray-500">
                              {currentPlaylist ? `Generated from ${currentPlaylist.name}` : 'No playlist selected'}
                            </span>
                          </div>
                        ),
                        children: (
                          <div className="h-full">
                            <QueueColumn
                              currentPlaylist={currentPlaylist}
                            />
                          </div>
                        ),
                      },
                      {
                        key: 'debug',
                        label: (
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">🔧 Debug Tools</span>
                            <span className="text-xs text-gray-500">
                              Developer & Power User Tools
                            </span>
                          </div>
                        ),
                        children: (
                          <div className="h-full">
                            <DebugPanel currentQuery={currentQuery} />
                          </div>
                        ),
                      },
                    ]}
                  />
                </Card>
              </Col>
            ) : (
              <Col span={1} className="h-full transition-all duration-200">
                <Card 
                  className="h-full flex items-center justify-center cursor-pointer hover:bg-gray-50"
                  onClick={handleTogglePlaylist}
                >
                  <div
                    className="text-gray-600 flex items-center justify-center h-full"
                    style={{ writingMode: 'vertical-rl' }}
                  >
                    <ChevronRight size={16} className="mb-2" />
                    <span>Show Playlist</span>
                  </div>
                </Card>
              </Col>
            )}

            {/* Right side - Library or Show Library button */}
            {layoutState !== 'playlist-only' ? (
              <Col span={layoutState === 'library-only' ? 23 : 14} className="h-full transition-all duration-200">
                <Card className="h-full">
                  <div className="flex items-center justify-between mb-4">
                    <Title level={4} className="!mb-0">Library</Title>
                    <Button
                      type="text"
                      icon={layoutState === 'library-only' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                      onClick={handleToggleLibrary}
                      className="text-gray-600"
                    >
                      {layoutState === 'library-only' ? 'Shrink' : 'Hide Library'}
                    </Button>
                  </div>
                  <LibraryColumn
                    currentPlaylist={currentPlaylist}
                    editingFilter={editingFilter}
                    onFilterSaved={handleFilterSaved}
                    onSongAddedToPlaylist={handleSongAddedToPlaylist}
                    onQueryChange={setCurrentQuery}
                    isExpanded={isLibraryExpanded}
                  />
                </Card>
              </Col>
            ) : (
              <Col span={1} className="h-full transition-all duration-200">
                <Card 
                  className="h-full flex items-center justify-center cursor-pointer hover:bg-gray-50"
                  onClick={handleToggleLibrary}
                >
                  <div
                    className="text-gray-600 flex items-center justify-center h-full"
                    style={{ writingMode: 'vertical-rl' }}
                  >
                    <ChevronLeft size={16} className="mb-2" />
                    <span>Show Library</span>
                  </div>
                </Card>
              </Col>
            )}
          </Row>
        </div>
      </Content>
    </Layout>
  )
}
