'use client'

import { useState, useEffect, useMemo, useCallback, type CSSProperties } from 'react'
import { Modal, Button, Spin, message as antdMessage, Typography, Input, Space, Tooltip, Popconfirm, App, Collapse } from 'antd'
import { Tag as AntTag } from 'antd'
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, Pencil, Check, X, GripVertical, RotateCcw } from 'lucide-react'
import { tagsApi, songsApi, type Song, type TagGroupWithTags, type TagWithState, type CreateTagResult } from '@/lib/api'
import { getTagColor } from '@/lib/tagColors'
import { useMutation } from '@tanstack/react-query'

const { Title, Text } = Typography
const { Panel } = Collapse

interface TagEditModalProps {
  visible: boolean
  onClose: () => void
  songs: Song[] // Can be single song or multiple songs
  onSuccess: () => void
  mode?: 'single' | 'bulk' // single = normal tag mode, bulk = bulk tag mode
}

interface TagState {
  coverage: 'none' | 'some' | 'all' // none (red), some (orange), all (green)
  modified: boolean // yellow border if true
  pendingAction?: 'add' | 'remove' // what will happen on save
  originalAssigned?: boolean // for single mode, original assignment state
}

interface SortableTagItemProps {
  tag: TagWithState
  tagState: TagState
  groupId: number
  isDeletedGroup: boolean
  onToggle: (tagId: number) => void
  onMoveToDeleted: (tag: TagWithState) => void
  onRestoreFromDeleted: (tag: TagWithState) => void
  mode: 'single' | 'bulk'
  assignmentPending: boolean
}

function sortGroups(
  groups: TagGroupWithTags[],
  defaultGroupId: number,
  deletedGroupId: number,
): TagGroupWithTags[] {
  return [...groups].sort((a, b) => {
    if (a.id === defaultGroupId) return -1
    if (b.id === defaultGroupId) return 1
    if (a.id === deletedGroupId) return 1
    if (b.id === deletedGroupId) return -1
    return a.name.localeCompare(b.name)
  })
}

function DroppableGroup({
  groupId,
  children,
}: {
  groupId: number
  children: React.ReactNode
}) {
  const { setNodeRef } = useDroppable({
    id: `group-${groupId}`,
    data: { groupId },
  })

  return (
    <div ref={setNodeRef} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      {children}
    </div>
  )
}

function SortableTagItem({ 
  tag, 
  tagState, 
  groupId,
  isDeletedGroup,
  onToggle, 
  onMoveToDeleted,
  onRestoreFromDeleted,
  mode,
  assignmentPending 
}: SortableTagItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tag.id,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Determine background color based on mode and state
  let bgColor: string

  if (mode === 'bulk') {
    // Bulk mode: red (none), orange (some), green (all)
    if (tagState.coverage === 'none') {
      bgColor = '#ff4d4f' // red
    } else if (tagState.coverage === 'some') {
      bgColor = '#faad14' // orange
    } else {
      bgColor = '#52c41a' // green
    }
  } else {
    // Single mode: use tag color if assigned, gray if not
    if (tagState.coverage === 'all') {
      bgColor = getTagColor(tag.name)
    } else {
      bgColor = '#d9d9d9' // gray for unassigned
    }
  }

  // Apply yellow border if modified
  const borderColor = tagState.modified ? '#fadb14' : '#000000'
  const borderWidth = tagState.modified ? '3px' : '2px'

  return (
    <div ref={setNodeRef} style={style} className="inline-flex items-center gap-1">
      <Button
        {...attributes}
        {...listeners}
        onClick={() => onToggle(tag.id)}
        style={{
          backgroundColor: bgColor,
          color: mode === 'bulk' || tagState.coverage === 'all' ? 'white' : '#000000',
          borderColor: borderColor,
          borderWidth: borderWidth,
          cursor: 'grab',
          fontWeight: 500,
        }}
        size="small"
      >
        {tag.name}
      </Button>
      {!isDeletedGroup && (
        <Button
          size="small"
          danger
          type="text"
          icon={<span>🗑️</span>}
          onClick={(e) => {
            e.stopPropagation()
            onMoveToDeleted(tag)
          }}
          title="Move to deleted"
        />
      )}
      {isDeletedGroup && (
        <Button
          size="small"
          type="text"
          icon={<span>↩️</span>}
          onClick={(e) => {
            e.stopPropagation()
            onRestoreFromDeleted(tag)
          }}
          title="Restore from deleted"
        />
      )}
    </div>
  )
}

export function TagEditModal({ visible, onClose, songs, onSuccess, mode = 'single' }: TagEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tagGroups, setTagGroups] = useState<TagGroupWithTags[]>([])
  const [tagStates, setTagStates] = useState<Map<number, TagState>>(new Map())
  const [activeGroup, setActiveGroup] = useState<number | null>(null)
  const [newTagInputs, setNewTagInputs] = useState<Map<number, string>>(new Map())
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const [newGroupName, setNewGroupName] = useState('')

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
    const totalSongs = songs.length

    groups.forEach((group) => {
      group.tags.forEach((tag) => {
        // Count how many selected songs have this tag
        const songsWithTag = songs.filter((song) =>
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
          originalAssigned: coverage === 'all',
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

  const handleCreateTag = async (groupId: number) => {
    const tagName = newTagInputs.get(groupId)?.trim()
    if (!tagName) return

    try {
      await tagsApi.createTag(tagName, undefined, groupId)
      antdMessage.success('Tag created')
      setNewTagInputs((prev) => {
        const newMap = new Map(prev)
        newMap.delete(groupId)
        return newMap
      })
      await loadTagGroups()
    } catch (error) {
      console.error('Failed to create tag:', error)
      antdMessage.error('Failed to create tag')
    }
  }

  const handleDeleteTag = async (tagId: number) => {
    try {
      // Move to deleted group instead of permanently deleting
      await tagsApi.updateTag(tagId, { group_id: 0 })
      antdMessage.success('Tag moved to deleted')
      await loadTagGroups()
    } catch (error) {
      console.error('Failed to delete tag:', error)
      antdMessage.error('Failed to delete tag')
    }
  }

  const handleMoveToDeleted = async (tag: TagWithState) => {
    try {
      await tagsApi.updateTag(tag.id, { group_id: 0 })
      antdMessage.success('Tag moved to deleted')
      await loadTagGroups()
    } catch (error) {
      console.error('Failed to move tag:', error)
      antdMessage.error('Failed to move tag')
    }
  }

  const handleRestoreFromDeleted = async (tag: TagWithState) => {
    // Find first non-deleted group to restore to
    const targetGroup = tagGroups.find(g => g.id !== 0 && !g.is_deleted)
    if (!targetGroup) {
      antdMessage.error('No available group to restore to')
      return
    }

    try {
      await tagsApi.updateTag(tag.id, { group_id: targetGroup.id })
      antdMessage.success('Tag restored')
      await loadTagGroups()
    } catch (error) {
      console.error('Failed to restore tag:', error)
      antdMessage.error('Failed to restore tag')
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return

    try {
      await tagsApi.createGroup(newGroupName.trim())
      antdMessage.success('Group created')
      setNewGroupName('')
      await loadTagGroups()
    } catch (error) {
      console.error('Failed to create group:', error)
      antdMessage.error('Failed to create group')
    }
  }

  const handleRenameGroup = async (groupId: number) => {
    if (!editingGroupName.trim()) return

    try {
      await tagsApi.updateGroup(groupId, { name: editingGroupName.trim() })
      antdMessage.success('Group renamed')
      setEditingGroupId(null)
      setEditingGroupName('')
      await loadTagGroups()
    } catch (error) {
      console.error('Failed to rename group:', error)
      antdMessage.error('Failed to rename group')
    }
  }

  const handleDeleteGroup = async (groupId: number) => {
    try {
      await tagsApi.deleteGroup(groupId)
      antdMessage.success('Group deleted')
      await loadTagGroups()
    } catch (error) {
      console.error('Failed to delete group:', error)
      antdMessage.error('Failed to delete group')
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

      if (mode === 'bulk') {
        // Call bulk update API
        const result = await songsApi.bulkUpdateSongTags(
          songs.map((s) => s.id),
          tagsToAdd,
          tagsToRemove
        )

        console.log('Bulk tag update result:', result)
        antdMessage.success(
          `Updated ${result.processed_song_ids.length} songs: ${result.additions_applied} additions, ${result.removals_applied} removals`
        )
      } else {
        // Single song mode - use individual API calls
        const songId = songs[0].id

        // Add tags
        for (const tagName of tagsToAdd) {
          await songsApi.addTagToSong(songId, tagName)
        }

        // Remove tags
        for (const tagId of tagsToRemove) {
          await songsApi.removeTagFromSong(songId, tagId)
        }

        antdMessage.success('Tags updated successfully')
      }

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

  const modalTitle = useMemo(() => {
    if (mode === 'bulk') {
      return `Bulk Tagging ${songs.length} Songs`
    } else {
      return `Tags for ${songs[0]?.display_name || 'Song'}`
    }
  }, [mode, songs])

  return (
    <Modal
      title={modalTitle}
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
              Click tags to {mode === 'bulk' ? 'add/remove from all selected songs' : 'assign/unassign'}. 
              Colors indicate current state:
            </Text>
            {mode === 'bulk' ? (
              <div className="flex gap-2 mt-2">
                <AntTag color="red">None have tag</AntTag>
                <AntTag color="orange">Some have tag</AntTag>
                <AntTag color="green">All have tag</AntTag>
                <AntTag style={{ borderColor: '#fadb14', borderWidth: '2px' }}>Modified</AntTag>
              </div>
            ) : (
              <div className="flex gap-2 mt-2">
                <AntTag style={{ backgroundColor: '#d9d9d9', color: '#000000' }}>Unassigned</AntTag>
                <AntTag color="blue">Assigned (colored)</AntTag>
                <AntTag style={{ borderColor: '#fadb14', borderWidth: '2px' }}>Modified</AntTag>
              </div>
            )}
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
                    <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      {editingGroupId === group.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editingGroupName}
                            onChange={(e) => setEditingGroupName(e.target.value)}
                            onPressEnter={() => handleRenameGroup(group.id)}
                            size="small"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            size="small"
                            type="primary"
                            icon={<Check size={14} />}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRenameGroup(group.id)
                            }}
                          />
                          <Button
                            size="small"
                            icon={<X size={14} />}
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingGroupId(null)
                              setEditingGroupName('')
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Title level={5} className="!mb-0">
                            {group.name}
                          </Title>
                          <Button
                            size="small"
                            type="text"
                            icon={<Pencil size={14} />}
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingGroupId(group.id)
                              setEditingGroupName(group.name)
                            }}
                          />
                          <Popconfirm
                            title="Delete group?"
                            description="All tags will be moved to deleted group"
                            onConfirm={(e) => {
                              e?.stopPropagation()
                              handleDeleteGroup(group.id)
                            }}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button
                              size="small"
                              type="text"
                              danger
                              icon={<Trash2 size={14} />}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Popconfirm>
                        </div>
                      )}
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
                      <div className="flex flex-wrap gap-1 mb-2">
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
                              groupId={group.id}
                              isDeletedGroup={group.id === 0}
                              onToggle={handleToggleTag}
                              onMoveToDeleted={handleMoveToDeleted}
                              onRestoreFromDeleted={handleRestoreFromDeleted}
                              mode={mode}
                              assignmentPending={false}
                            />
                          )
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                  
                  {/* Add new tag input */}
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="New tag name"
                      value={newTagInputs.get(group.id) || ''}
                      onChange={(e) => {
                        setNewTagInputs((prev) => {
                          const newMap = new Map(prev)
                          newMap.set(group.id, e.target.value)
                          return newMap
                        })
                      }}
                      onPressEnter={() => handleCreateTag(group.id)}
                      size="small"
                    />
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleCreateTag(group.id)}
                      disabled={!newTagInputs.get(group.id)?.trim()}
                    >
                      Add Tag
                    </Button>
                  </div>
                </Panel>
              ))}
          </Collapse>
          
          {/* Create new group */}
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Input
              placeholder="New group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onPressEnter={handleCreateGroup}
              size="small"
            />
            <Button
              type="primary"
              size="small"
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim()}
            >
              Create Group
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
