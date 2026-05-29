'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCalendarStore, CalendarEvent } from '@/store/calendar-store'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'

function serializeEventFromApi(e: Record<string, unknown>): CalendarEvent {
  const eventEntities = (e.eventEntities as Array<Record<string, unknown>>) || []
  const entities: { id: string; name: string; sortOrder: number }[] = eventEntities.map((ee) => {
    const ent = ee.entity as Record<string, unknown>
    return {
      id: (ent?.id || ee.entityId) as string,
      name: (ent?.name || '') as string,
      sortOrder: ((ent?.sortOrder as number) || 0),
    }
  }).filter((ent) => ent.id && ent.name)
  const entityIds = entities.map((ent) => ent.id)

  return {
    id: e.id as string,
    title: e.title as string,
    description: e.description as string | null | undefined,
    startDate: e.startDate instanceof Date ? e.startDate.toISOString() : String(e.startDate),
    endDate: e.endDate instanceof Date ? e.endDate.toISOString() : e.endDate ? String(e.endDate) : null,
    allDay: e.allDay as boolean,
    eventTypeId: (e.eventTypeId as string) || null,
    eventType: e.eventType ? {
      id: (e.eventType as Record<string, unknown>).id as string,
      name: (e.eventType as Record<string, unknown>).name as string,
      shape: (e.eventType as Record<string, unknown>).shape as string,
      color: (e.eventType as Record<string, unknown>).color as string,
      symbol: ((e.eventType as Record<string, unknown>).symbol as string) || '',
      sortOrder: ((e.eventType as Record<string, unknown>).sortOrder as number) || 0,
    } : null,
    entityIds,
    entities,
  }
}

export function EventDialog() {
  const {
    isEventDialogOpen,
    editingEvent,
    selectedDate,
    closeEventDialog,
    eventTypes,
    addEvent,
    updateEvent,
    removeEvent,
    isReadOnly,
    currentUser,
    entities,
  } = useCalendarStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(true)
  const [eventTypeId, setEventTypeId] = useState<string>('')
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Reset form state when dialog opens or editing event changes
  useEffect(() => {
    if (isEventDialogOpen) {
      if (editingEvent) {
        setTitle(editingEvent.title)
        setDescription(editingEvent.description || '')
        const sd = editingEvent.startDate
        setStartDate(sd.slice(0, 10))
        setStartTime(sd.slice(11, 16) || '09:00')
        const ed = editingEvent.endDate
        setEndDate(ed ? ed.slice(0, 10) : sd.slice(0, 10))
        setEndTime(ed ? ed.slice(11, 16) || '10:00' : '10:00')
        setAllDay(editingEvent.allDay)
        setEventTypeId(editingEvent.eventTypeId || 'none')
        setSelectedEntityIds(editingEvent.entityIds || [])
      } else if (selectedDate) {
        setTitle('')
        setDescription('')
        setStartDate(format(selectedDate, 'yyyy-MM-dd'))
        setStartTime('09:00')
        setEndDate(format(selectedDate, 'yyyy-MM-dd'))
        setEndTime('10:00')
        setAllDay(true)
        setEventTypeId('none')
        setSelectedEntityIds([])
      }
    }
  }, [isEventDialogOpen, editingEvent, selectedDate])

  const handleSave = async () => {
    if (!title.trim()) return
    setIsSaving(true)

    try {
      const startDateTime = allDay
        ? `${startDate}T00:00:00.000Z`
        : `${startDate}T${startTime}:00.000Z`
      const endDateTime = allDay
        ? `${endDate || startDate}T23:59:59.000Z`
        : `${endDate || startDate}T${endTime}:00.000Z`

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: startDateTime,
        endDate: endDateTime,
        allDay,
        eventTypeId: eventTypeId === 'none' ? undefined : eventTypeId,
        entityIds: selectedEntityIds.length > 0 ? selectedEntityIds : undefined,
        userId: currentUser?.id,
      }

      if (editingEvent) {
        const res = await fetch(`/api/events/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, userId: currentUser?.id }),
        })
        if (res.ok) {
          const data = await res.json()
          const updated = serializeEventFromApi(data.event || data)
          updateEvent(editingEvent.id, updated)
        }
      } else {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const data = await res.json()
          const created = serializeEventFromApi(data.event || data)
          addEvent(created)
        }
      }
      closeEventDialog()
    } catch (e) {
      console.error('Failed to save event:', e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingEvent) return
    try {
      const res = await fetch(`/api/events/${editingEvent.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?.id }),
      })
      if (res.ok) {
        removeEvent(editingEvent.id)
        closeEventDialog()
      }
    } catch (e) {
      console.error('Failed to delete event:', e)
    }
  }

  return (
    <Dialog open={isEventDialogOpen} onOpenChange={(open) => !open && closeEventDialog()}>
      <DialogContent className="sm:max-w-[480px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{isReadOnly ? '事件详情' : editingEvent ? '编辑事件' : '新建事件'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">标题</Label>
            {isReadOnly ? (
              <p className="text-sm px-3 py-2 rounded-md bg-muted">{title}</p>
            ) : (
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="事件标题"
                autoFocus
              />
            )}
          </div>

          {/* All day toggle */}
          {!isReadOnly && (
            <div className="flex items-center gap-3">
              <Switch
                checked={allDay}
                onCheckedChange={setAllDay}
                id="allDay"
              />
              <Label htmlFor="allDay">全天事件</Label>
            </div>
          )}

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>开始日期</Label>
              {isReadOnly ? (
                <p className="text-sm px-3 py-2 rounded-md bg-muted">{startDate}</p>
              ) : (
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              )}
            </div>
            {!allDay && !isReadOnly && (
              <div className="space-y-2">
                <Label>开始时间</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>结束日期</Label>
              {isReadOnly ? (
                <p className="text-sm px-3 py-2 rounded-md bg-muted">{endDate || startDate}</p>
              ) : (
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              )}
            </div>
            {!allDay && !isReadOnly && (
              <div className="space-y-2">
                <Label>结束时间</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Event type */}
          <div className="space-y-2">
            <Label>事件类型</Label>
            {isReadOnly ? (
              <p className="text-sm px-3 py-2 rounded-md bg-muted">
                {eventTypes.find(t => t.id === eventTypeId)?.name || '无'}
              </p>
            ) : (
              <Select value={eventTypeId} onValueChange={setEventTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择事件类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无</SelectItem>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Entity (主体) selector */}
          {entities.length > 0 && (
            <div className="space-y-2">
              <Label>主体</Label>
              {isReadOnly ? (
                <p className="text-sm px-3 py-2 rounded-md bg-muted">
                  {selectedEntityIds.length > 0
                    ? selectedEntityIds.map(id => entities.find(e => e.id === id)?.name).filter(Boolean).join('、')
                    : '无'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {entities.sort((a, b) => a.sortOrder - b.sortOrder).map((entity) => {
                    const isSelected = selectedEntityIds.includes(entity.id)
                    return (
                      <Button
                        key={entity.id}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedEntityIds(prev =>
                            isSelected
                              ? prev.filter(id => id !== entity.id)
                              : [...prev, entity.id]
                          )
                        }}
                      >
                        {entity.name}
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">备注</Label>
            {isReadOnly ? (
              <p className="text-sm px-3 py-2 rounded-md bg-muted whitespace-pre-wrap">
                {description || '无备注'}
              </p>
            ) : (
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="添加备注..."
                rows={3}
              />
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {editingEvent && !isReadOnly && (
            <Button variant="destructive" size="sm" onClick={handleDelete} className="mr-auto">
              <Trash2 className="h-4 w-4 mr-1" />
              删除
            </Button>
          )}
          {isReadOnly ? (
            <Button variant="outline" onClick={closeEventDialog}>
              关闭
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={closeEventDialog}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={!title.trim() || isSaving}>
                {isSaving ? '保存中...' : '保存'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
