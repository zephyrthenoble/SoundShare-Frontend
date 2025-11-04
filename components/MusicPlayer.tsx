'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, Button, Slider, Typography, App } from 'antd'
import { Play, Pause, Volume2, X, Music, AlertCircle } from 'lucide-react'
import { type Song } from '@/lib/api'
import { useMusicPlayer } from '@/lib/music-context'

const { Text } = Typography

interface MusicPlayerProps {
  currentSong: Song | null
  onClose: () => void
}

export function MusicPlayer({ currentSong, onClose }: MusicPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [hasError, setHasError] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const { message } = App.useApp()
  const { isPlaying, togglePlayPause } = useMusicPlayer()
  const hasActiveSong = Boolean(currentSong)

  // Format time to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Update current time and handle audio events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentSong) {
      return
    }

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => {
      // Use context's togglePlayPause to set playing to false
      if (isPlaying) {
        togglePlayPause()
      }
    }
    const handleError = () => {
      console.error('Audio error:', audio.error)
      console.error('Audio src:', audio.src)
      setHasError(true)
      if (isPlaying) {
        togglePlayPause()
      }
      message.error('Audio file not found or cannot be played')
    }
    const handleCanPlay = () => setHasError(false)

    // Reset error state when song changes
    setHasError(false)
    setCurrentTime(0)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [currentSong, message, isPlaying, togglePlayPause])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!currentSong) {
      audio.pause()
      audio.currentTime = 0
      setCurrentTime(0)
      setDuration(0)
      setHasError(false)
      return
    }

    audio.load()
  }, [currentSong])

  // Sync audio element with context playing state
  useEffect(() => {
    const audio = audioRef.current
  if (!audio || hasError || !currentSong) return

    if (isPlaying && audio.paused) {
      audio.play().catch(error => {
        console.error('Error playing audio:', error)
        setHasError(true)
        message.error('Could not play audio. File may be missing or corrupted.')
      })
    } else if (!isPlaying && !audio.paused) {
      audio.pause()
    }
  }, [isPlaying, hasError, message])

  // Handle volume change
  const handleVolumeChange = (value: number) => {
    setVolume(value)
    if (audioRef.current) {
      audioRef.current.volume = value
    }
  }

  // Handle seek
  const handleSeek = (value: number) => {
    const audio = audioRef.current
    if (!audio || !currentSong) return

    audio.currentTime = value
    setCurrentTime(value)
  }

  return (
    <Card className="w-full border border-gray-200 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        {/* Song Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <Music size={24} className="text-gray-500" />
          </div>
          <div className="min-w-0 flex-1">
            {hasActiveSong ? (
              <>
                <div className="font-medium text-sm truncate">
                  {currentSong?.display_name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {currentSong?.artist || 'Unknown Artist'}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">Select a song to start playing</div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 flex-1 justify-center">
          {hasError ? (
            <Button
              type="text"
              size="large"
              icon={<AlertCircle size={24} />}
              disabled
              className="!w-12 !h-12 rounded-full bg-red-500 text-white"
              title="Audio file not found"
            />
          ) : (
            <Button
              type="text"
              size="large"
              icon={isPlaying ? <Pause size={24} /> : <Play size={24} />}
              onClick={() => {
                if (!hasActiveSong) return
                togglePlayPause()
              }}
              disabled={!hasActiveSong}
              className="!w-12 !h-12 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-500"
            />
          )}
        </div>

        {/* Progress & Volume */}
        <div className="flex items-center gap-4 flex-1 justify-end">
          <div className="hidden sm:flex items-center gap-2">
            <Text className="text-xs tabular-nums">
              {formatTime(currentTime)}
            </Text>
            <Slider
              min={0}
              max={duration || 0}
              step={1}
              value={currentTime}
              onChange={handleSeek}
              disabled={!hasActiveSong || duration === 0}
              className="w-32"
              tooltip={{ formatter: (value) => formatTime(value || 0) }}
            />
            <Text className="text-xs tabular-nums">
              {formatTime(duration)}
            </Text>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Volume2 size={16} className="text-gray-500" />
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolumeChange}
              disabled={!hasActiveSong}
              className="w-20"
              tooltip={{ formatter: (value) => `${Math.round((value || 0) * 100)}%` }}
            />
          </div>

          <Button
            type="text"
            icon={<X size={16} />}
            onClick={onClose}
            disabled={!hasActiveSong && !hasError}
            className="text-gray-500 hover:text-gray-700 disabled:text-gray-300"
          />
        </div>
      </div>

      {/* Mobile Progress Bar */}
      <div className="sm:hidden mt-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <Slider
          min={0}
          max={duration || 0}
          step={1}
          value={currentTime}
          onChange={handleSeek}
          disabled={!hasActiveSong || duration === 0}
          tooltip={{ formatter: (value) => formatTime(value || 0) }}
        />
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={currentSong ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/audio/${currentSong.id}` : undefined}
        preload="metadata"
      />
    </Card>
  )
}