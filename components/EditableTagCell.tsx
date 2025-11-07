'use client'

import { useState, type KeyboardEvent } from 'react'
import { Tag, Input, Button, Space, AutoComplete, App } from 'antd'
import { Plus, X } from 'lucide-react'
import { type Song, type Tag as TagType } from '@/lib/api'
import { useTags, useTagMutations } from '@/lib/hooks/useCachedApi'
import { getTagColor } from '@/lib/tagColors'

interface EditableTagCellProps {
  song: Song
  onTagUpdate: () => void
}

export function EditableTagCell({ song, onTagUpdate }: EditableTagCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const { message } = App.useApp()

  // Get all available tags for autocomplete with caching
  const { data: allTags = [] } = useTags()

  // Use cached tag mutations
  const { addTagToSong, removeTagFromSong } = useTagMutations()

  const handleAddTag = () => {
    if (inputValue.trim()) {
      addTagToSong.mutate(
        { songId: song.id, tagName: inputValue.trim() },
        {
          onSuccess: () => {
            onTagUpdate()
            message.success('Tag added successfully')
            setInputValue('')
            setIsEditing(false)
          },
          onError: (error: unknown) => {
            console.error('Failed to add tag:', error)
            message.error(error instanceof Error ? error.message : 'Failed to add tag')
          },
        }
      )
    }
  }

  const handleRemoveTag = (tagId: number) => {
    removeTagFromSong.mutate(
      { songId: song.id, tagId },
      {
        onSuccess: () => {
          onTagUpdate()
          message.success('Tag removed successfully')
        },
        onError: (error: unknown) => {
          console.error('Failed to remove tag:', error)
          message.error(error instanceof Error ? error.message : 'Failed to remove tag')
        },
      }
    )
  }

  const handleKeyPress = (e: KeyboardEvent) => {
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
    <div
      className="flex flex-wrap items-center gap-1 min-h-[32px]"
      onClick={(event) => event.stopPropagation()}
    >
      {song.tags
        .filter(tag => !tag.is_deleted)
        .map((tag) => (
        <Tag
          key={tag.id}
          closable
          onClose={() => handleRemoveTag(tag.id)}
          className="flex items-center"
            color={getTagColor(tag.name)}
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
            loading={addTagToSong.isPending}
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

