'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tag, Input, Button, Space, AutoComplete, App } from 'antd'
import { Plus, X } from 'lucide-react'
import { songsApi, tagsApi, type Song, type Tag as TagType } from '@/lib/api'

interface EditableTagCellProps {
  song: Song
  onTagUpdate: () => void
}

export function EditableTagCell({ song, onTagUpdate }: EditableTagCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  // Get all available tags for autocomplete
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getTags,
  })

  // Add tag mutation
  const addTagMutation = useMutation({
    mutationFn: (tagName: string) => songsApi.addTagToSong(song.id, tagName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      onTagUpdate()
      message.success('Tag added successfully')
      setInputValue('')
      setIsEditing(false)
    },
    onError: (error) => {
      console.error('Failed to add tag:', error)
      message.error('Failed to add tag')
    },
  })

  // Remove tag mutation
  const removeTagMutation = useMutation({
    mutationFn: (tagId: number) => songsApi.removeTagFromSong(song.id, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
      onTagUpdate()
      message.success('Tag removed successfully')
    },
    onError: (error) => {
      console.error('Failed to remove tag:', error)
      message.error('Failed to remove tag')
    },
  })

  const handleAddTag = () => {
    if (inputValue.trim()) {
      addTagMutation.mutate(inputValue.trim())
    }
  }

  const handleRemoveTag = (tagId: number) => {
    removeTagMutation.mutate(tagId)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag()
    } else if (e.key === 'Escape') {
      setInputValue('')
      setIsEditing(false)
    }
  }

  // Get tag suggestions (exclude already assigned tags)
  const existingTagNames = song.tags.map(tag => tag.name.toLowerCase())
  const tagSuggestions = allTags
    .filter(tag => !existingTagNames.includes(tag.name.toLowerCase()))
    .map(tag => ({
      value: tag.name,
      label: tag.name,
    }))

  return (
    <div className="flex flex-wrap items-center gap-1 min-h-[32px]">
      {song.tags.map((tag) => (
        <Tag
          key={tag.id}
          closable
          onClose={() => handleRemoveTag(tag.id)}
          className="flex items-center"
          color={getTagColor(tag.group_name)}
        >
          {tag.name}
        </Tag>
      ))}

      {isEditing ? (
        <div className="flex items-center space-x-1">
          <AutoComplete
            size="small"
            style={{ width: 120 }}
            value={inputValue}
            onChange={setInputValue}
            onKeyDown={handleKeyPress}
            placeholder="Add tag..."
            options={tagSuggestions}
            filterOption={(inputValue, option) =>
              option?.label?.toLowerCase().includes(inputValue.toLowerCase()) ?? false
            }
            autoFocus
          />
          <Button
            type="primary"
            size="small"
            icon={<Plus size={12} />}
            onClick={handleAddTag}
            loading={addTagMutation.isPending}
            disabled={!inputValue.trim()}
          />
          <Button
            size="small"
            icon={<X size={12} />}
            onClick={() => {
              setInputValue('')
              setIsEditing(false)
            }}
          />
        </div>
      ) : (
        <Button
          type="dashed"
          size="small"
          icon={<Plus size={12} />}
          onClick={() => setIsEditing(true)}
          className="text-xs"
        >
          Add
        </Button>
      )}
    </div>
  )
}

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