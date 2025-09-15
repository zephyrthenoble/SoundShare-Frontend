'use client'

import { useState } from 'react'
import { Layout, Typography, Row, Col, Collapse } from 'antd'
import { Music } from 'lucide-react'
import { PlaylistColumn } from '@/components/PlaylistColumn'
import { LibraryColumn } from '@/components/LibraryColumn'
import { QueueColumn } from '@/components/QueueColumn'
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
  const [activeKeys, setActiveKeys] = useState<string[]>(['playlist', 'queue'])
  const { currentSong, isPlayerVisible, closePlayer } = useMusicPlayer()

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
        <div className="max-w-full mx-auto">
          <Row gutter={[16, 0]} className="h-full">
            <Col span={10} className="h-full">
              <div className="h-full">
                <Collapse
                  activeKey={activeKeys}
                  onChange={(keys) => setActiveKeys(keys as string[])}
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
                  ]}
                />
              </div>
            </Col>
            <Col span={14} className="h-full">
              <LibraryColumn
                currentPlaylist={currentPlaylist}
                editingFilter={editingFilter}
                onFilterSaved={handleFilterSaved}
                onSongAddedToPlaylist={handleSongAddedToPlaylist}
              />
            </Col>
          </Row>
        </div>
      </Content>

      {/* Music Player */}
      {isPlayerVisible && currentSong && (
        <MusicPlayer
          currentSong={currentSong}
          onClose={closePlayer}
        />
      )}
    </Layout>
  )
}
