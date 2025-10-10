'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, List, Typography, Switch, Select, Button, Space, Spin } from 'antd'
import { Shuffle, Repeat, Play, Pause, SkipForward, SkipBack, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { songsApi } from '@/lib/api'
import { useMusicPlayer } from '@/lib/music-context'
import type { Playlist, QueueItem, PlaylistOptions } from '@/lib/playlist-types'
import { FilterProcessor } from '@/lib/playlist-types'

const { Title, Text } = Typography
const { Option } = Select

interface QueueColumnProps {
  currentPlaylist: Playlist | null
}

interface SortableItemProps {
  queueItem: QueueItem
  isCurrentSong: boolean
  onPlay: (item: QueueItem) => void
}

function SortableItem({ queueItem, isCurrentSong, onPlay }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: queueItem.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-2 border rounded mb-1 cursor-pointer hover:bg-gray-50 ${isCurrentSong ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
        }`}
      onClick={() => onPlay(queueItem)}
    >
      <div className="flex items-center space-x-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <Text className={`text-sm block truncate ${isCurrentSong ? 'font-bold text-blue-600' : ''}`}>
            {queueItem.song.display_name}
          </Text>
          <Text className="text-xs text-gray-500 block truncate">
            {queueItem.song.artist} • {queueItem.added_via === 'manual' ? 'Manual' : 'Filter'}
          </Text>
        </div>
        {isCurrentSong && (
          <Play size={16} className="text-blue-500" />
        )}
      </div>
    </div>
  )
}

export function QueueColumn({ currentPlaylist }: QueueColumnProps) {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [currentPosition, setCurrentPosition] = useState(0)
  const [playlistOptions, setPlaylistOptions] = useState<PlaylistOptions>({
    shuffle: false,
    repeat: 'none',
    autoplay: true
  })

  const { currentSong, isPlaying, playSong, togglePlayPause } = useMusicPlayer()

  // Fetch all songs for queue generation
  const {
    data: allSongs = [],
    isLoading: songsLoading,
    isSuccess: songsLoaded
  } = useQuery({
    queryKey: ['songs'],
    queryFn: () => songsApi.getSongs(),
  })

  // Generate queue when playlist changes or when songs are successfully loaded
  useEffect(() => {
    if (currentPlaylist && songsLoaded && allSongs.length > 0) {
      const generatedQueue = FilterProcessor.generateQueue(currentPlaylist, allSongs)
      setQueueItems(generatedQueue)
      setCurrentPosition(0)
    } else if (!currentPlaylist) {
      setQueueItems([])
      setCurrentPosition(0)
    }
  }, [currentPlaylist?.id, currentPlaylist?.filters, songsLoaded])

  // Mark current song in queue
  useEffect(() => {
    if (currentSong && queueItems.length > 0) {
      setQueueItems(prevItems =>
        prevItems.map((item, index) => ({
          ...item,
          is_current: item.song.id === currentSong.id,
          position: index
        }))
      )

      const currentIndex = queueItems.findIndex(item => item.song.id === currentSong.id)
      if (currentIndex >= 0) {
        setCurrentPosition(currentIndex)
      }
    }
  }, [currentSong, queueItems.length])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setQueueItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)

        const newItems = arrayMove(items, oldIndex, newIndex)
        return newItems.map((item, index) => ({ ...item, position: index }))
      })
    }
  }

  const playQueueItem = (item: QueueItem) => {
    playSong(item.song)
    const index = queueItems.findIndex(qi => qi.id === item.id)
    if (index >= 0) {
      setCurrentPosition(index)
    }
  }

  const playNext = () => {
    if (queueItems.length === 0) return

    let nextIndex = currentPosition + 1

    if (playlistOptions.repeat === 'one') {
      nextIndex = currentPosition
    } else if (nextIndex >= queueItems.length) {
      if (playlistOptions.repeat === 'all') {
        nextIndex = 0
      } else {
        return // End of queue
      }
    }

    if (playlistOptions.shuffle && playlistOptions.repeat !== 'one') {
      nextIndex = Math.floor(Math.random() * queueItems.length)
    }

    const nextItem = queueItems[nextIndex]
    if (nextItem) {
      playQueueItem(nextItem)
    }
  }

  const playPrevious = () => {
    if (queueItems.length === 0) return

    let prevIndex = currentPosition - 1

    if (prevIndex < 0) {
      if (playlistOptions.repeat === 'all') {
        prevIndex = queueItems.length - 1
      } else {
        prevIndex = 0
      }
    }

    const prevItem = queueItems[prevIndex]
    if (prevItem) {
      playQueueItem(prevItem)
    }
  }

  const updatePlaylistOption = <K extends keyof PlaylistOptions>(
    key: K,
    value: PlaylistOptions[K]
  ) => {
    setPlaylistOptions(prev => ({ ...prev, [key]: value }))
  }

  if (!currentPlaylist) {
    return (
      <div className="h-full">
        <Card className="h-full">
          <Title level={4}>Queue</Title>
          <div className="text-center text-gray-500 mt-8">
            Select a playlist to view the queue
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="p-4 bg-white h-full">
        <Space direction="vertical" size="middle" className="w-full">
          {/* Playlist Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Text>Shuffle</Text>
              <Switch
                checked={playlistOptions.shuffle}
                onChange={(checked) => updatePlaylistOption('shuffle', checked)}
                checkedChildren={<Shuffle size={12} />}
              />
            </div>

            <div className="flex items-center justify-between">
              <Text>Repeat</Text>
              <Select
                value={playlistOptions.repeat}
                onChange={(value) => updatePlaylistOption('repeat', value)}
                size="small"
                style={{ width: 80 }}
              >
                <Option value="none">None</Option>
                <Option value="all">All</Option>
                <Option value="one">One</Option>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Text>Autoplay</Text>
              <Switch
                checked={playlistOptions.autoplay}
                onChange={(checked) => updatePlaylistOption('autoplay', checked)}
              />
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex justify-center space-x-2">
            <Button
              icon={<SkipBack size={16} />}
              onClick={playPrevious}
              disabled={queueItems.length === 0}
              size="small"
            />
            <Button
              icon={isPlaying ? <Pause size={16} /> : <Play size={16} />}
              onClick={togglePlayPause}
              disabled={queueItems.length === 0 || !currentSong}
              type="primary"
              size="small"
            />
            <Button
              icon={<SkipForward size={16} />}
              onClick={playNext}
              disabled={queueItems.length === 0}
              size="small"
            />
          </div>

          {/* Queue Items */}
          {songsLoading ? (
            <div className="flex justify-center py-4">
              <Spin />
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={queueItems.map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {queueItems.map((item) => (
                    <SortableItem
                      key={item.id}
                      queueItem={item}
                      isCurrentSong={item.is_current}
                      onPlay={playQueueItem}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {queueItems.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No songs in queue. Add filters or songs to the playlist.
                </div>
              )}
            </div>
          )}
        </Space>
      </div>
    </div>
  )
}