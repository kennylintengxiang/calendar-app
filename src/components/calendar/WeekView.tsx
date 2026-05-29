'use client'

import React, { useMemo } from 'react'
import {
  format,
  startOfWeek,
  addDays,
  isToday,
  isWeekend,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useCalendarStore } from '@/store/calendar-store'
import { EventShape } from './EventShape'
import { cn } from '@/lib/utils'

const WEEKDAYS_FULL = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function WeekView() {
  const { currentDate, events, holidays, eventTypes, entities, openEventDialog } = useCalendarStore()

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [currentDate])

  // Sort entities by sortOrder
  const sortedEntities = useMemo(() => {
    return [...entities].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [entities])

  const hasEntities = sortedEntities.length > 0
  const entityCols = sortedEntities
  const colCount = hasEntities ? entityCols.length + 1 : 1 // +1 for "未分类" if entities exist

  const getHolidayForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return holidays.find((h) => h.date === dateStr)
  }

  // Get all events for a date (all events are full-day by default)
  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.filter((e) => {
      const eStart = e.startDate.slice(0, 10)
      const eEnd = e.endDate ? e.endDate.slice(0, 10) : eStart
      return dateStr >= eStart && dateStr <= eEnd
    })
  }

  // Get events for a specific date and entity
  const getEventsForDateEntity = (date: Date, entityId?: string) => {
    const dateEvents = getEventsForDate(date)
    if (entityId) {
      return dateEvents.filter((e) => e.entityIds.includes(entityId))
    }
    // No entity: events with no entity assignment
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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto">
      {/* Week header */}
      <div className="grid border-b sticky top-0 bg-background z-10"
        style={{ gridTemplateColumns: hasEntities ? `80px repeat(7, 1fr)` : `repeat(7, 1fr)` }}
      >
        {/* Entity name column header */}
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

      {/* Entity rows with event columns */}
      {hasEntities ? (
        <div className="flex-1">
          {entityCols.map((entity, entityIdx) => (
            <div
              key={entity.id}
              className="grid border-b"
              style={{ gridTemplateColumns: `80px repeat(7, 1fr)` }}
            >
              {/* Entity name */}
              <div className="p-1.5 text-xs font-medium text-muted-foreground text-center border-r flex items-center justify-center bg-muted/20">
                <span className="truncate" title={entity.name}>{entity.name}</span>
              </div>
              {/* Events for each day in this entity */}
              {weekDays.map((day, dayIdx) => {
                const dayEvents = getEventsForDateEntity(day, entity.id)
                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      'border-r last:border-r-0 p-1 min-h-[40px] cursor-pointer hover:bg-accent/30 transition-colors',
                      isToday(day) && 'bg-primary/[0.02]'
                    )}
                    onClick={() => openEventDialog(day)}
                  >
                    <div className="space-y-0.5">
                      {dayEvents.map((event) => {
                        const evtType = getEventType(event.eventTypeId)
                        return (
                          <div
                            key={event.id}
                            className={cn(
                              'flex items-center gap-1 px-1 py-0.5 rounded text-[10px] sm:text-xs truncate cursor-pointer transition-opacity hover:opacity-80',
                              evtType ? '' : 'bg-primary/10'
                            )}
                            style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                            onClick={(e) => handleEventClick(e, day, event.id)}
                          >
                            {evtType && <EventShape shape={evtType.shape} color={evtType.color} size={12} symbol={evtType.symbol} />}
                            <span className="truncate">{event.title}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          {/* 未分类 (unclassified) row */}
          <div className="grid border-b" style={{ gridTemplateColumns: `80px repeat(7, 1fr)` }}>
            <div className="p-1.5 text-xs font-medium text-muted-foreground text-center border-r flex items-center justify-center bg-muted/20">
              <span title="未分类">未分类</span>
            </div>
            {weekDays.map((day, dayIdx) => {
              const dayEvents = getEventsForDateEntity(day)
              return (
                <div
                  key={dayIdx}
                  className={cn(
                    'border-r last:border-r-0 p-1 min-h-[40px] cursor-pointer hover:bg-accent/30 transition-colors',
                    isToday(day) && 'bg-primary/[0.02]'
                  )}
                  onClick={() => openEventDialog(day)}
                >
                  <div className="space-y-0.5">
                    {dayEvents.map((event) => {
                      const evtType = getEventType(event.eventTypeId)
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            'flex items-center gap-1 px-1 py-0.5 rounded text-[10px] sm:text-xs truncate cursor-pointer transition-opacity hover:opacity-80',
                            evtType ? '' : 'bg-primary/10'
                          )}
                          style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                          onClick={(e) => handleEventClick(e, day, event.id)}
                        >
                          {evtType && <EventShape shape={evtType.shape} color={evtType.color} size={12} symbol={evtType.symbol} />}
                          <span className="truncate">{event.title}</span>
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
        /* No entities — simple layout without time grid */
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
                  <div className="flex flex-wrap gap-1">
                    {dayEvents.map((event) => {
                      const evtType = getEventType(event.eventTypeId)
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded text-xs truncate cursor-pointer transition-opacity hover:opacity-80',
                            evtType ? '' : 'bg-primary/10'
                          )}
                          style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                          onClick={(e) => handleEventClick(e, day, event.id)}
                        >
                          {evtType && <EventShape shape={evtType.shape} color={evtType.color} size={14} symbol={evtType.symbol} />}
                          <span className="truncate">{event.title}</span>
                        </div>
                      )
                    })}
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
