'use client'

import React, { useMemo } from 'react'
import {
  format,
  isToday,
  setHours,
  setMinutes,
  isSameDay,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useCalendarStore } from '@/store/calendar-store'
import { EventShape } from './EventShape'
import { cn } from '@/lib/utils'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function DayView() {
  const { currentDate, events, holidays, eventTypes, entities, openEventDialog } = useCalendarStore()

  const sortedEntities = useMemo(() => {
    return [...entities].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [entities])

  const hasEntities = sortedEntities.length > 0

  const getHolidayForDate = () => {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    return holidays.find((h) => h.date === dateStr)
  }

  const getAllDayEvents = () => {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    return events.filter((e) => {
      if (!e.allDay) return false
      const eStart = e.startDate.slice(0, 10)
      const eEnd = e.endDate ? e.endDate.slice(0, 10) : eStart
      return dateStr >= eStart && dateStr <= eEnd
    })
  }

  const getTimedEventsForHour = (hour: number) => {
    return events.filter((e) => {
      if (e.allDay) return false
      try {
        const eStart = new Date(e.startDate)
        if (!isSameDay(eStart, currentDate)) return false
        return eStart.getHours() === hour
      } catch {
        return false
      }
    })
  }

  const getEventsForHourEntity = (hour: number, entityId?: string) => {
    return events.filter((e) => {
      if (e.allDay) return false
      try {
        const eStart = new Date(e.startDate)
        if (!isSameDay(eStart, currentDate)) return false
        if (eStart.getHours() !== hour) return false
        if (entityId) {
          return e.entityIds.includes(entityId)
        }
        return e.entityIds.length === 0
      } catch {
        return false
      }
    })
  }

  const getEventType = (typeId?: string | null) => {
    if (!typeId) return null
    return eventTypes.find((t) => t.id === typeId)
  }

  const holiday = getHolidayForDate()
  const allDayEvents = getAllDayEvents()
  const dayOfWeek = format(currentDate, 'EEEE', { locale: zhCN })
  const currentHour = new Date().getHours()

  // No entities — simple layout
  if (!hasEntities) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        {/* Day header */}
        <div className="border-b p-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'text-4xl font-bold',
                isToday(currentDate) && 'text-primary'
              )}
            >
              {format(currentDate, 'd')}
            </div>
            <div>
              <div className="text-lg font-medium">
                {format(currentDate, 'yyyy年M月', { locale: zhCN })}
              </div>
              <div className="text-sm text-muted-foreground">{dayOfWeek}</div>
              {holiday && (
                <div className={cn('text-sm font-medium', holiday.type === 'holiday' ? 'text-green-600' : 'text-orange-600')}>
                  {holiday.name}
                </div>
              )}
            </div>
          </div>

          {/* All-day events */}
          {allDayEvents.length > 0 && (
            <div className="mt-3 space-y-1">
              {allDayEvents.map((event) => {
                const evtType = getEventType(event.eventTypeId)
                return (
                  <div
                    key={event.id}
                    className={cn(
                      'px-3 py-1.5 rounded text-sm cursor-pointer',
                      evtType ? '' : 'bg-primary/10'
                    )}
                    style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                    onClick={(e) => {
                      e.stopPropagation()
                      openEventDialog(currentDate, event)
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {evtType && <EventShape shape={evtType.shape} color={evtType.color} size={16} symbol={evtType.symbol} />}
                      <span>{event.title}</span>
                      {event.description && (
                        <span className="text-xs opacity-70 truncate">- {event.description}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Time grid */}
        <div className="flex-1 overflow-y-auto">
          {HOURS.map((hour) => {
            const hourEvents = getTimedEventsForHour(hour)
            return (
              <div
                key={hour}
                className={cn(
                  'grid grid-cols-[80px_1fr] border-b min-h-[56px] cursor-pointer hover:bg-accent/20 transition-colors',
                  isToday(currentDate) && hour === currentHour && 'bg-primary/5'
                )}
                onClick={() => openEventDialog(setMinutes(setHours(currentDate, hour), 0))}
              >
                <div className="p-2 text-sm text-muted-foreground text-center border-r flex items-start justify-center pt-2">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="p-1 space-y-1">
                  {hourEvents.map((event) => {
                    const evtType = getEventType(event.eventTypeId)
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          'px-3 py-1.5 rounded text-sm cursor-pointer',
                          evtType ? '' : 'bg-primary/10'
                        )}
                        style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                        onClick={(e) => {
                          e.stopPropagation()
                          openEventDialog(currentDate, event)
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {evtType && <EventShape shape={evtType.shape} color={evtType.color} size={16} symbol={evtType.symbol} />}
                          <span className="font-medium">{event.title}</span>
                          <span className="text-xs opacity-70">
                            {(() => {
                              try {
                                return format(new Date(event.startDate), 'HH:mm')
                              } catch {
                                return ''
                              }
                            })()}
                          </span>
                          {event.description && (
                            <span className="text-xs opacity-60 truncate">- {event.description}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // With entities — column-based layout
  const entityCols = sortedEntities
  const colCount = entityCols.length + 1 // +1 for "未分类"

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto">
      {/* Day header */}
      <div className="border-b bg-muted/30">
        <div className="p-4 flex items-center gap-3">
          <div
            className={cn(
              'text-4xl font-bold',
              isToday(currentDate) && 'text-primary'
            )}
          >
            {format(currentDate, 'd')}
          </div>
          <div>
            <div className="text-lg font-medium">
              {format(currentDate, 'yyyy年M月', { locale: zhCN })}
            </div>
            <div className="text-sm text-muted-foreground">{dayOfWeek}</div>
            {holiday && (
              <div className={cn('text-sm font-medium', holiday.type === 'holiday' ? 'text-green-600' : 'text-orange-600')}>
                {holiday.name}
              </div>
            )}
          </div>
        </div>

        {/* Entity column headers */}
        <div className="grid border-t" style={{ gridTemplateColumns: `80px repeat(${colCount}, 1fr)` }}>
          <div className="p-1 text-xs text-muted-foreground text-center border-r">时间</div>
          {entityCols.map((entity) => (
            <div key={entity.id} className="p-1 text-xs text-center border-r last:border-r-0 font-medium text-muted-foreground truncate" title={entity.name}>
              {entity.name}
            </div>
          ))}
          <div className="p-1 text-xs text-center text-muted-foreground truncate" title="未分类">
            未分类
          </div>
        </div>

        {/* All-day events by entity */}
        {allDayEvents.length > 0 && (
          <div className="grid border-t" style={{ gridTemplateColumns: `80px repeat(${colCount}, 1fr)` }}>
            <div className="p-1 text-[10px] text-muted-foreground text-center border-r">全天</div>
            {entityCols.map((entity) => {
              const entityAllDay = allDayEvents.filter((e) => e.entityIds.includes(entity.id))
              return (
                <div key={entity.id} className="border-r last:border-r-0 p-1 space-y-0.5">
                  {entityAllDay.map((event) => {
                    const evtType = getEventType(event.eventTypeId)
                    return (
                      <div
                        key={event.id}
                        className={cn('text-xs px-2 py-1 rounded cursor-pointer truncate', evtType ? '' : 'bg-primary/10')}
                        style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                        onClick={(e) => { e.stopPropagation(); openEventDialog(currentDate, event) }}
                      >
                        {event.title}
                      </div>
                    )
                  })}
                </div>
              )
            })}
            <div className="p-1 space-y-0.5">
              {allDayEvents.filter((e) => e.entityIds.length === 0).map((event) => {
                const evtType = getEventType(event.eventTypeId)
                return (
                  <div
                    key={event.id}
                    className={cn('text-xs px-2 py-1 rounded cursor-pointer truncate', evtType ? '' : 'bg-primary/10')}
                    style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                    onClick={(e) => { e.stopPropagation(); openEventDialog(currentDate, event) }}
                  >
                    {event.title}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Time grid with entity columns */}
      <div className="flex-1 overflow-y-auto">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className={cn(
              'grid border-b min-h-[56px] cursor-pointer',
              isToday(currentDate) && hour === currentHour && 'bg-primary/5'
            )}
            style={{ gridTemplateColumns: `80px repeat(${colCount}, 1fr)` }}
            onClick={() => openEventDialog(setMinutes(setHours(currentDate, hour), 0))}
          >
            <div className="p-2 text-sm text-muted-foreground text-center border-r flex items-start justify-center pt-2">
              {hour.toString().padStart(2, '0')}:00
            </div>
            {entityCols.map((entity) => {
              const entityEvents = getEventsForHourEntity(hour, entity.id)
              return (
                <div
                  key={entity.id}
                  className="border-r last:border-r-0 p-1 space-y-1 hover:bg-accent/20 transition-colors"
                  onClick={(e) => { e.stopPropagation(); openEventDialog(setMinutes(setHours(currentDate, hour), 0)) }}
                >
                  {entityEvents.map((event) => {
                    const evtType = getEventType(event.eventTypeId)
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          'px-2 py-1 rounded text-sm cursor-pointer',
                          evtType ? '' : 'bg-primary/10'
                        )}
                        style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                        onClick={(e) => { e.stopPropagation(); openEventDialog(currentDate, event) }}
                      >
                        <div className="flex items-center gap-1">
                          {evtType && <EventShape shape={evtType.shape} color={evtType.color} size={14} symbol={evtType.symbol} />}
                          <span className="font-medium truncate">{event.title}</span>
                          <span className="text-[10px] opacity-70 shrink-0">
                            {(() => {
                              try {
                                return format(new Date(event.startDate), 'HH:mm')
                              } catch {
                                return ''
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {/* No-entity column */}
            <div
              className="p-1 space-y-1 hover:bg-accent/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); openEventDialog(setMinutes(setHours(currentDate, hour), 0)) }}
            >
              {getEventsForHourEntity(hour).map((event) => {
                const evtType = getEventType(event.eventTypeId)
                return (
                  <div
                    key={event.id}
                    className={cn(
                      'px-2 py-1 rounded text-sm cursor-pointer',
                      evtType ? '' : 'bg-primary/10'
                    )}
                    style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                    onClick={(e) => { e.stopPropagation(); openEventDialog(currentDate, event) }}
                  >
                    <div className="flex items-center gap-1">
                      {evtType && <EventShape shape={evtType.shape} color={evtType.color} size={14} symbol={evtType.symbol} />}
                      <span className="font-medium truncate">{event.title}</span>
                      <span className="text-[10px] opacity-70 shrink-0">
                        {(() => {
                          try {
                            return format(new Date(event.startDate), 'HH:mm')
                          } catch {
                            return ''
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
