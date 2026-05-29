'use client'

import React, { useMemo } from 'react'
import {
  format,
  isToday,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useCalendarStore } from '@/store/calendar-store'
import { EventShape } from './EventShape'
import { cn } from '@/lib/utils'

export function DayView() {
  const { currentDate, events, holidays, eventTypes, entities, openEventDialog } = useCalendarStore()

  const sortedEntities = useMemo(() => {
    return [...entities].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [entities])

  const hasEntities = sortedEntities.length > 0
  const entityCols = sortedEntities
  const colCount = hasEntities ? entityCols.length + 1 : 1 // +1 for "未分类" if entities exist

  const getHolidayForDate = () => {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    return holidays.find((h) => h.date === dateStr)
  }

  // Get all events for current date
  const getEventsForDate = () => {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    return events.filter((e) => {
      const eStart = e.startDate.slice(0, 10)
      const eEnd = e.endDate ? e.endDate.slice(0, 10) : eStart
      return dateStr >= eStart && dateStr <= eEnd
    })
  }

  // Get events for a specific entity
  const getEventsForEntity = (entityId?: string) => {
    const dateEvents = getEventsForDate()
    if (entityId) {
      return dateEvents.filter((e) => e.entityIds.includes(entityId))
    }
    return dateEvents.filter((e) => e.entityIds.length === 0)
  }

  const getEventType = (typeId?: string | null) => {
    if (!typeId) return null
    return eventTypes.find((t) => t.id === typeId)
  }

  const holiday = getHolidayForDate()
  const dayOfWeek = format(currentDate, 'EEEE', { locale: zhCN })

  const handleEventClick = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation()
    const event = events.find((ev) => ev.id === eventId)
    if (event) openEventDialog(currentDate, event)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto">
      {/* Day header */}
      <div className="border-b bg-muted/30 p-4">
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
      </div>

      {/* Entity-based column layout */}
      {hasEntities ? (
        <div className="flex-1">
          {/* Entity column headers */}
          <div
            className="grid border-b"
            style={{ gridTemplateColumns: `120px repeat(${colCount}, 1fr)` }}
          >
            <div className="p-2 text-xs text-muted-foreground text-center border-r bg-muted/20">
              事件
            </div>
            {entityCols.map((entity) => (
              <div key={entity.id} className="p-2 text-xs text-center border-r last:border-r-0 font-medium text-muted-foreground bg-muted/20 truncate" title={entity.name}>
                {entity.name}
              </div>
            ))}
            <div className="p-2 text-xs text-center text-muted-foreground bg-muted/20 truncate" title="未分类">
              未分类
            </div>
          </div>

          {/* Events grouped by entity as rows */}
          {/* We show events as dots in entity columns - each event gets a row */}
          {(() => {
            const allDayEvents = getEventsForDate()
            if (allDayEvents.length === 0) {
              return (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <p>暂无事件</p>
                  <p className="text-xs mt-1">点击空白处添加事件</p>
                </div>
              )
            }
            // Group events by their position across entity columns
            // Each "row" represents one event slot per entity
            const maxRows = Math.max(
              ...entityCols.map((e) => getEventsForEntity(e.id).length),
              getEventsForEntity().length,
              1
            )
            return Array.from({ length: maxRows }, (_, rowIdx) => (
              <div
                key={rowIdx}
                className="grid border-b hover:bg-accent/20 transition-colors"
                style={{ gridTemplateColumns: `120px repeat(${colCount}, 1fr)` }}
              >
                <div className="p-1.5 text-[10px] text-muted-foreground text-center border-r flex items-center justify-center">
                  {rowIdx + 1}
                </div>
                {entityCols.map((entity) => {
                  const entityEvents = getEventsForEntity(entity.id)
                  const event = entityEvents[rowIdx]
                  return (
                    <div key={entity.id} className="border-r last:border-r-0 p-1.5">
                      {event && (() => {
                        const evtType = getEventType(event.eventTypeId)
                        return (
                          <div
                            className={cn(
                              'flex items-center gap-1.5 px-2 py-1 rounded text-sm cursor-pointer transition-opacity hover:opacity-80',
                              evtType ? '' : 'bg-primary/10'
                            )}
                            style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                            onClick={(e) => handleEventClick(e, event.id)}
                          >
                            {evtType && <EventShape shape={evtType.shape} color={evtType.color} size={16} symbol={evtType.symbol} />}
                            <span className="truncate font-medium">{event.title}</span>
                            {event.description && (
                              <span className="text-xs opacity-60 truncate">- {event.description}</span>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
                {/* 未分类 column */}
                <div className="p-1.5">
                  {(() => {
                    const unclassifiedEvents = getEventsForEntity()
                    const event = unclassifiedEvents[rowIdx]
                    if (!event) return null
                    const evtType = getEventType(event.eventTypeId)
                    return (
                      <div
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1 rounded text-sm cursor-pointer transition-opacity hover:opacity-80',
                          evtType ? '' : 'bg-primary/10'
                        )}
                        style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                        onClick={(e) => handleEventClick(e, event.id)}
                      >
                        {evtType && <EventShape shape={evtType.shape} color={evtType.color} size={16} symbol={evtType.symbol} />}
                        <span className="truncate font-medium">{event.title}</span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            ))
          })()}

          {/* Click to add event area */}
          <div
            className="p-4 text-center cursor-pointer hover:bg-accent/20 transition-colors min-h-[80px] flex items-center justify-center"
            onClick={() => openEventDialog(currentDate)}
          >
            <span className="text-xs text-muted-foreground">+ 添加事件</span>
          </div>
        </div>
      ) : (
        /* No entities — simple list layout */
        <div className="flex-1 overflow-y-auto">
          {(() => {
            const dayEvents = getEventsForDate()
            if (dayEvents.length === 0) {
              return (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <p>暂无事件</p>
                  <p className="text-xs mt-1">点击空白处添加事件</p>
                </div>
              )
            }
            return (
              <div className="space-y-1 p-2">
                {dayEvents.map((event) => {
                  const evtType = getEventType(event.eventTypeId)
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer transition-opacity hover:opacity-80',
                        evtType ? '' : 'bg-primary/10'
                      )}
                      style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                      onClick={(e) => { e.stopPropagation(); openEventDialog(currentDate, event) }}
                    >
                      {evtType && <EventShape shape={evtType.shape} color={evtType.color} size={18} symbol={evtType.symbol} />}
                      <span className="font-medium">{event.title}</span>
                      {event.description && (
                        <span className="text-xs opacity-60 truncate">- {event.description}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
          <div
            className="p-4 text-center cursor-pointer hover:bg-accent/20 transition-colors min-h-[80px] flex items-center justify-center"
            onClick={() => openEventDialog(currentDate)}
          >
            <span className="text-xs text-muted-foreground">+ 添加事件</span>
          </div>
        </div>
      )}
    </div>
  )
}
