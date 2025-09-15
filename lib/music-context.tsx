'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { type Song } from './api'

interface MusicContextType {
  currentSong: Song | null
  isPlayerVisible: boolean
  isPlaying: boolean
  playSong: (song: Song) => void
  togglePlayPause: () => void
  closePlayer: () => void
}

const MusicContext = createContext<MusicContextType | undefined>(undefined)

export function MusicProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlayerVisible, setIsPlayerVisible] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const playSong = (song: Song) => {
    setCurrentSong(song)
    setIsPlayerVisible(true)
    setIsPlaying(true)
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const closePlayer = () => {
    setCurrentSong(null)
    setIsPlayerVisible(false)
    setIsPlaying(false)
  }

  return (
    <MusicContext.Provider
      value={{
        currentSong,
        isPlayerVisible,
        isPlaying,
        playSong,
        togglePlayPause,
        closePlayer,
      }}
    >
      {children}
    </MusicContext.Provider>
  )
}

export function useMusicPlayer() {
  const context = useContext(MusicContext)
  if (context === undefined) {
    throw new Error('useMusicPlayer must be used within a MusicProvider')
  }
  return context
}