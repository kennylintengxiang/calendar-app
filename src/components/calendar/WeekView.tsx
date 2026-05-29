'use client'

import React, { useMemo } from 'react'
import {
  format,
  startOfWeek,
  addDays,
  isToday,
} from 'date-fns'
import { useCalendarStore } from '@/store/calendar-store'
import { EventShape } from './EventShape'
import { cn } from '@/lib/utils'

const WEEKDAYS_FULL = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

/** Build display text for an event header in Week/Day view: show only "备注" if available, otherwise "事件名称" */
function getEventHeaderTitle(event: { title: string; description?: string | null }): string {
  if (event.description && event.description.trim()) {
    return event.description.trim()
  }
  return event.title
}

/** Build full display text for tooltip: "事件名称-备注" */
function getEventDisplayTitle(event: { title: string; description?: string | null }): string {
  if (event.description && event.description.trim()) {
    return `${event.title}-${event.description.trim()}`
  }
  return event.title
}

export function WeekView() {
  const { currentDate, events, holidays, eventTypes, entities, openEventDialog } = useCalendarStore()

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [currentDate])

  const sortedEntities = useMemo(() => {
    return [...entities].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [entities])

  const hasEntities = sortedEntities.length > 0
  const entityCols = sortedEntities

  const getHolidayForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return holidays.find((h) => h.date === dateStr)
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.filter((e) => {
      const eStart = e.startDate.slice(0, 10)
      const eEnd = e.endDate ? e.endDate.slice(0, 10) : eStart
      return dateStr >= eStart && dateStr <= eEnd
    })
  }

  const getEventsForDateEntity = (date: Date, entityId?: string) => {
    const dateEvents = getEventsForDate(date)
    if (entityId) {
      return dateEvents.filter((e) => e.entityIds.includes(entityId))
    }
    return dateEvents.filter((e) => e.entityIds.length === 0)
  }

  const getEventType = (typeId?: string | null) => {
    if (!typeId) return null
    return eventTypes.find((t) => t.id === typeId)
  }

  const handleEventClick = (e: React.MouseEvent, date: Date, eventId: string) => {
    e.stopPropagation()
    const event = events.find((ev) => ev.id === eventId)
    if (event) openEventDialog(date, event)
  }

  // Count max events across all entity+day combos for the event header row
  const maxEventsInAnyColumn = useMemo(() => {
    if (sortedEntities.length === 0) return 0
    let max = 0
    const allEntities = [...sortedEntities, { id: '' }]
    for (const entity of allEntities) {
      for (const day of weekDays) {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayEvents = events.filter((e) => {
          const eStart = e.startDate.slice(0, 10)
          const eEnd = e.endDate ? e.endDate.slice(0, 10) : eStart
          return dateStr >= eStart && dateStr <= eEnd
        })
        const count = entity.id
          ? dayEvents.filter((e) => e.entityIds.includes(entity.id)).length
          : dayEvents.filter((e) => e.entityIds.length === 0).length
        if (count > max) max = count
      }
    }
    return max
  }, [sortedEntities, weekDays, events])

  const headerRowHeight = Math.max(104, maxEventsInAnyColumn * 24 + 8) // auto-extend if >6 events

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto">
      {/* Week header with date numbers */}
      <div className="grid border-b sticky top-0 bg-background z-10"
        style={{ gridTemplateColumns: hasEntities ? `80px repeat(7, 1fr)` : `repeat(7, 1fr)` }}
      >
        {hasEntities && (
          <div className="p-1.5 text-xs text-muted-foreground text-center border-r border-b bg-muted/30">
            主体
          </div>
        )}
        {weekDays.map((day, i) => {
          const holiday = getHolidayForDate(day)
          return (
            <div
              key={i}
              className={cn(
                'border-r last:border-r-0 border-b cursor-pointer hover:bg-accent/50 transition-colors bg-muted/30',
                isToday(day) && 'bg-primary/5'
              )}
              onClick={() => openEventDialog(day)}
            >
              <div className="p-1.5 text-center">
                <div className="text-[10px] text-muted-foreground">{WEEKDAYS_FULL[i]}</div>
                <div
                  className={cn(
                    'text-base font-semibold',
                    isToday(day) && 'text-primary',
                    i >= 5 && !isToday(day) && holiday?.type !== 'workday' && 'text-red-500'
                  )}
                >
                  {format(day, 'd')}
                </div>
                {holiday && (
                  <div className={cn('text-[10px] truncate', holiday.type === 'holiday' ? 'text-green-600' : 'text-orange-600')}>
                    {holiday.name}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {hasEntities ? (
        <div className="flex-1">
          {/* Event header row - shows events across all entities for each day */}
          <div
            className="grid border-b"
            style={{ gridTemplateColumns: `80px repeat(7, 1fr)`, minHeight: `${headerRowHeight}px` }}
          >
            <div className="p-1.5 text-xs font-medium text-muted-foreground text-center border-r flex items-center justify-center bg-muted/20">
              事件
            </div>
            {weekDays.map((day, dayIdx) => {
              const dayEvents = getEventsForDate(day).slice(0, 6)
              const totalEvents = getEventsForDate(day).length
              return (
                <div
                  key={dayIdx}
                  className={cn(
                    'border-r last:border-r-0 p-1 cursor-pointer hover:bg-accent/30 transition-colors',
                    isToday(day) && 'bg-primary/[0.02]'
                  )}
                  onClick={() => openEventDialog(day)}
                >
                  <div className="space-y-0.5">
                    {dayEvents.map((event) => {
                      const evtType = getEventType(event.eventTypeId)
                      const headerTitle = getEventHeaderTitle(event)
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            'flex items-center gap-1 px-1 py-0.5 rounded text-[12px] truncate cursor-pointer transition-opacity hover:opacity-80',
                            evtType ? '' : 'bg-primary/10'
                          )}
                          style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                          onClick={(e) => handleEventClick(e, day, event.id)}
                        >
                          {evtType && <EventShape shape={evtType.shape} color={evtType.color} size={16} symbol={evtType.symbol} />}
                          <span className="truncate">{headerTitle}</span>
                        </div>
                      )
                    })}
                    {totalEvents > 6 && (
                      <div className="text-[10px] text-muted-foreground pl-1">
                        +{totalEvents - 6} 更多
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Entity rows with dot indicators */}
          {entityCols.map((entity) => (
            <div
              key={entity.id}
              className="grid border-b"
              style={{ gridTemplateColumns: `80px repeat(7, 1fr)` }}
            >
              <div className="p-1.5 text-xs font-medium text-muted-foreground text-center border-r flex items-center justify-center bg-muted/20">
                <span className="truncate" title={entity.name}>{entity.name}</span>
              </div>
              {weekDays.map((day, dayIdx) => {
                // Get all events for the day to maintain vertical alignment with header
                const allDayEvents = getEventsForDate(day)
                const entityEventIds = new Set(getEventsForDateEntity(day, entity.id).map(e => e.id))
                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      'border-r last:border-r-0 p-1 min-h-[32px] cursor-pointer hover:bg-accent/30 transition-colors',
                      isToday(day) && 'bg-primary/[0.02]'
                    )}
                    onClick={() => openEventDialog(day)}
                  >
                    <div className="flex flex-col gap-0.5">
                      {allDayEvents.slice(0, 6).map((event) => {
                        const evtType = getEventType(event.eventTypeId)
                        const belongsToEntity = entityEventIds.has(event.id)
                        if (!belongsToEntity) {
                          // Empty placeholder to maintain vertical alignment
                          return <div key={event.id} className="h-[16px]" />
                        }
                        return (
                          <div
                            key={event.id}
                            className="cursor-pointer transition-opacity hover:opacity-80"
                            onClick={(e) => handleEventClick(e, day, event.id)}
                            title={getEventDisplayTitle(event)}
                          >
                            {evtType ? (
                              <EventShape shape={evtType.shape} color={evtType.color} size={16} symbol={evtType.symbol} />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-primary/40" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          {/* 未分类 row */}
          <div className="grid border-b" style={{ gridTemplateColumns: `80px repeat(7, 1fr)` }}>
            <div className="p-1.5 text-xs font-medium text-muted-foreground text-center border-r flex items-center justify-center bg-muted/20">
              <span title="未分类">未分类</span>
            </div>
            {weekDays.map((day, dayIdx) => {
              const allDayEvents = getEventsForDate(day)
              const uncatEventIds = new Set(getEventsForDateEntity(day).map(e => e.id))
              return (
                <div
                  key={dayIdx}
                  className={cn(
                    'border-r last:border-r-0 p-1 min-h-[32px] cursor-pointer hover:bg-accent/30 transition-colors',
                    isToday(day) && 'bg-primary/[0.02]'
                  )}
                  onClick={() => openEventDialog(day)}
                >
                  <div className="flex flex-col gap-0.5">
                    {allDayEvents.slice(0, 6).map((event) => {
                      const evtType = getEventType(event.eventTypeId)
                      const belongsToEntity = uncatEventIds.has(event.id)
                      if (!belongsToEntity) {
                        return <div key={event.id} className="h-[16px]" />
                      }
                      return (
                        <div
                          key={event.id}
                          className="cursor-pointer transition-opacity hover:opacity-80"
                          onClick={(e) => handleEventClick(e, day, event.id)}
                          title={getEventDisplayTitle(event)}
                        >
                          {evtType ? (
                            <EventShape shape={evtType.shape} color={evtType.color} size={16} symbol={evtType.symbol} />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-primary/40" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* No entities — simple layout */
        <div className="flex-1">
          {weekDays.map((day, dayIdx) => {
            const dayEvents = getEventsForDate(day)
            const holiday = getHolidayForDate(day)
            return (
              <div
                key={dayIdx}
                className={cn(
                  'grid border-b',
                  isToday(day) && 'bg-primary/[0.02]'
                )}
                style={{ gridTemplateColumns: `80px 1fr` }}
              >
                <div
                  className={cn(
                    'p-2 text-center border-r cursor-pointer hover:bg-accent/30 transition-colors bg-muted/20',
                    isToday(day) && 'bg-primary/5'
                  )}
                  onClick={() => openEventDialog(day)}
                >
                  <div className="text-[10px] text-muted-foreground">{WEEKDAYS_FULL[dayIdx]}</div>
                  <div className={cn(
                    'text-lg font-semibold',
                    isToday(day) && 'text-primary',
                    dayIdx >= 5 && !isToday(day) && holiday?.type !== 'workday' && 'text-red-500'
                  )}>
                    {format(day, 'd')}
                  </div>
                  {holiday && (
                    <div className={cn('text-[10px] truncate', holiday.type === 'holiday' ? 'text-green-600' : 'text-orange-600')}>
                      {holiday.name}
                    </div>
                  )}
                </div>
                <div
                  className="p-1.5 cursor-pointer hover:bg-accent/20 transition-colors min-h-[60px]"
                  onClick={() => openEventDialog(day)}
                >
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 6).map((event) => {
                      const evtType = getEventType(event.eventTypeId)
                      const headerTitle = getEventHeaderTitle(event)
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            'flex items-center gap-1 px-2 py-0.5 rounded text-[12px] truncate cursor-pointer transition-opacity hover:opacity-80',
                            evtType ? '' : 'bg-primary/10'
                          )}
                          style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                          onClick={(e) => handleEventClick(e, day, event.id)}
                        >
                          {evtType && <EventShape shape={evtType.shape} color={evtType.color} size={16} symbol={evtType.symbol} />}
                          <span className="truncate">{headerTitle}</span>
                        </div>
                      )
                    })}
                    {dayEvents.length > 6 && (
                      <div className="text-[10px] text-muted-foreground pl-1">
                        +{dayEvents.length - 6} 更多
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
