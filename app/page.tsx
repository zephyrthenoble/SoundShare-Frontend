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
  const [isPlaylistCollapsed, setIsPlaylistCollapsed] = useState(false)
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false)
  const isLibraryExpanded = isPlaylistCollapsed && !isLibraryCollapsed

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
            {!isPlaylistCollapsed && (
              <Col span={isLibraryCollapsed ? 24 : 10} className="h-full transition-all duration-200">
                <Card className="h-full">
                  <div className="flex items-center justify-between mb-4">
                    <Title level={4} className="!mb-0">Playlist & Queue</Title>
                    <Button
                      type="text"
                      icon={<ChevronLeft size={16} />}
                      onClick={() => setIsPlaylistCollapsed(true)}
                      className="text-gray-600"
                    >
                      Hide Playlist
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
            )}
            {isPlaylistCollapsed && (
              <Col span={1} className="h-full transition-all duration-200">
                <Button
                  type="text"
                  icon={<ChevronRight size={16} />}
                  onClick={() => setIsPlaylistCollapsed(false)}
                  className="text-gray-600 h-full w-full flex items-start justify-center pt-4"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  Show Playlist
                </Button>
              </Col>
            )}
            {!isLibraryCollapsed && (
              <Col span={isPlaylistCollapsed ? 23 : 14} className="h-full transition-all duration-200">
                <Card className="h-full">
                  <div className="flex items-center justify-between mb-4">
                    <Title level={4} className="!mb-0">Library</Title>
                    <Button
                      type="text"
                      icon={<ChevronRight size={16} />}
                      onClick={() => setIsLibraryCollapsed(true)}
                      className="text-gray-600"
                    >
                      Hide Library
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
            )}
            {isLibraryCollapsed && (
              <Col span={1} className="h-full transition-all duration-200">
                <Button
                  type="text"
                  icon={<ChevronLeft size={16} />}
                  onClick={() => setIsLibraryCollapsed(false)}
                  className="text-gray-600 h-full w-full flex items-start justify-center pt-4"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  Show Library
                </Button>
              </Col>
            )}
          </Row>
        </div>
      </Content>
    </Layout>
  )
}
