'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal, Button, Space, Spin, message as antdMessage, Typography, Collapse } from 'antd'
import { Tag as AntTag } from 'antd'
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { tagsApi, songsApi, type Song, type TagGroupWithTags, type TagWithState } from '@/lib/api'

const { Title, Text } = Typography
const { Panel } = Collapse

interface BulkTagModalProps {
  visible: boolean
  onClose: () => void
  selectedSongs: Song[]
  onSuccess: () => void
}

interface TagState {
  coverage: 'none' | 'some' | 'all' // red, orange, green
  modified: boolean // yellow border if true
  pendingAction?: 'add' | 'remove' // what will happen on save
}

interface SortableTagItemProps {
  tag: TagWithState
  tagState: TagState
  onToggle: (tagId: number) => void
}

function SortableTagItem({ tag, tagState, onToggle }: SortableTagItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tag.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Determine background color based on coverage
  let bgColor = '#ff4d4f' // red - none
  if (tagState.coverage === 'some') {
    bgColor = '#faad14' // orange - some
  } else if (tagState.coverage === 'all') {
    bgColor = '#52c41a' // green - all
  }

  // Apply yellow border if modified
  const borderColor = tagState.modified ? '#fadb14' : '#000000'
  const borderWidth = tagState.modified ? '3px' : '2px'

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Button
        onClick={() => onToggle(tag.id)}
        style={{
          backgroundColor: bgColor,
          color: 'white',
          borderColor: borderColor,
          borderWidth: borderWidth,
          margin: '4px',
          cursor: 'grab',
          fontWeight: 500,
        }}
        size="small"
      >
        {tag.name}
      </Button>
    </div>
  )
}

export function BulkTagModal({ visible, onClose, selectedSongs, onSuccess }: BulkTagModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tagGroups, setTagGroups] = useState<TagGroupWithTags[]>([])
  const [tagStates, setTagStates] = useState<Map<number, TagState>>(new Map())
  const [activeGroup, setActiveGroup] = useState<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Calculate initial tag states based on selected songs
  const calculateInitialTagStates = (groups: TagGroupWithTags[]): Map<number, TagState> => {
    const states = new Map<number, TagState>()
    const totalSongs = selectedSongs.length

    groups.forEach((group) => {
      group.tags.forEach((tag) => {
        // Count how many selected songs have this tag
        const songsWithTag = selectedSongs.filter((song) =>
          song.tags.some((t) => t.id === tag.id)
        ).length

        let coverage: 'none' | 'some' | 'all' = 'none'
        if (songsWithTag === totalSongs) {
          coverage = 'all'
        } else if (songsWithTag > 0) {
          coverage = 'some'
        }

        states.set(tag.id, {
          coverage,
          modified: false,
        })
      })
    })

    return states
  }

  useEffect(() => {
    if (visible) {
      loadTagGroups()
    }
  }, [visible])

  const loadTagGroups = async () => {
    setLoading(true)
    try {
      const response = await tagsApi.getTagGroupsWithTags()
      setTagGroups(response.tag_groups)
      const initialStates = calculateInitialTagStates(response.tag_groups)
      setTagStates(initialStates)
    } catch (error) {
      console.error('Failed to load tag groups:', error)
      antdMessage.error('Failed to load tags')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTag = (tagId: number) => {
    setTagStates((prev) => {
      const newStates = new Map(prev)
      const currentState = newStates.get(tagId)
      if (!currentState) return prev

      const newState = { ...currentState }

      // Toggle logic based on current coverage
      if (currentState.coverage === 'none' || currentState.coverage === 'some') {
        // Red or Orange → Green (add to all)
        newState.coverage = 'all'
        newState.pendingAction = 'add'
        newState.modified = true
      } else if (currentState.coverage === 'all') {
        // Green → Red (remove from all)
        newState.coverage = 'none'
        newState.pendingAction = 'remove'
        newState.modified = true
      }

      newStates.set(tagId, newState)
      return newStates
    })
  }

  const handleDragEnd = async (event: DragEndEvent, groupId: number) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const group = tagGroups.find((g) => g.id === groupId)
    if (!group) return

    const oldIndex = group.tags.findIndex((tag) => tag.id === active.id)
    const newIndex = group.tags.findIndex((tag) => tag.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const newTags = [...group.tags]
    const [movedTag] = newTags.splice(oldIndex, 1)
    newTags.splice(newIndex, 0, movedTag)

    setTagGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, tags: newTags } : g))
    )

    try {
      await tagsApi.reorderGroup(
        groupId,
        newTags.map((t) => t.id)
      )
    } catch (error) {
      console.error('Failed to reorder tags:', error)
      antdMessage.error('Failed to reorder tags')
      await loadTagGroups()
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Build add and remove lists from pending changes
      const tagsToAdd: string[] = []
      const tagsToRemove: number[] = []

      // Create a map of tag IDs to tag objects for lookup
      const tagMap = new Map<number, TagWithState>()
      tagGroups.forEach((group) => {
        group.tags.forEach((tag) => {
          tagMap.set(tag.id, tag)
        })
      })

      tagStates.forEach((state, tagId) => {
        if (state.modified && state.pendingAction === 'add') {
          const tag = tagMap.get(tagId)
          if (tag) {
            tagsToAdd.push(tag.name)
          }
        } else if (state.modified && state.pendingAction === 'remove') {
          tagsToRemove.push(tagId)
        }
      })

      if (tagsToAdd.length === 0 && tagsToRemove.length === 0) {
        antdMessage.info('No changes to save')
        onClose()
        return
      }

      // Call bulk update API
      const result = await songsApi.bulkUpdateSongTags(
        selectedSongs.map((s) => s.id),
        tagsToAdd,
        tagsToRemove
      )

      console.log('Bulk tag update result:', result)
      antdMessage.success(
        `Updated ${result.processed_song_ids.length} songs: ${result.additions_applied} additions, ${result.removals_applied} removals`
      )

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to update tags:', error)
      antdMessage.error(error instanceof Error ? error.message : 'Failed to update tags')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    onClose()
  }

  const hasChanges = useMemo(() => {
    return Array.from(tagStates.values()).some((state) => state.modified)
  }, [tagStates])

  return (
    <Modal
      title={`Bulk Edit Tags (${selectedSongs.length} songs selected)`}
      open={visible}
      onCancel={handleCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSave}
          loading={saving}
          disabled={!hasChanges}
        >
          Save
        </Button>,
      ]}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="mb-4">
            <Text type="secondary">
              Click tags to add/remove from all selected songs. Colors indicate current state:
            </Text>
            <div className="flex gap-2 mt-2">
              <AntTag color="red">None have tag</AntTag>
              <AntTag color="orange">Some have tag</AntTag>
              <AntTag color="green">All have tag</AntTag>
              <AntTag style={{ borderColor: '#fadb14', borderWidth: '2px' }}>Modified</AntTag>
            </div>
          </div>

          <Collapse
            accordion
            activeKey={activeGroup?.toString()}
            onChange={(key) => setActiveGroup(key ? Number(key) : null)}
          >
            {tagGroups
              .filter((group) => !group.is_deleted)
              .map((group) => (
                <Panel
                  key={group.id}
                  header={
                    <div className="flex items-center justify-between">
                      <Title level={5} className="!mb-0">
                        {group.name}
                      </Title>
                      <Text type="secondary">{group.tags.length} tags</Text>
                    </div>
                  }
                >
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, group.id)}
                  >
                    <SortableContext
                      items={group.tags.map((t) => t.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="flex flex-wrap gap-1">
                        {group.tags.map((tag) => {
                          const state = tagStates.get(tag.id) || {
                            coverage: 'none',
                            modified: false,
                          }
                          return (
                            <SortableTagItem
                              key={tag.id}
                              tag={tag}
                              tagState={state}
                              onToggle={handleToggleTag}
                            />
                          )
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                </Panel>
              ))}
          </Collapse>
        </div>
      )}
    </Modal>
  )
}
