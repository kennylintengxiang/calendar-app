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

  const getEventsForDate = () => {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    return events.filter((e) => {
      const eStart = e.startDate.slice(0, 10)
      const eEnd = e.endDate ? e.endDate.slice(0, 10) : eStart
      return dateStr >= eStart && dateStr <= eEnd
    })
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

  // Get all events for the day to determine column count
  const allDayEvents = getEventsForDate()
  const eventCount = allDayEvents.length

  // Column template for events: each event gets its own column
  const eventColTemplate = eventCount > 0 ? `repeat(${eventCount}, 1fr)` : '1fr'

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

      {hasEntities ? (
        <div className="flex-1">
          {allDayEvents.length === 0 ? (
            <div
              className="p-8 text-center text-muted-foreground text-sm cursor-pointer hover:bg-accent/20 transition-colors"
              onClick={() => openEventDialog(currentDate)}
            >
              <p>暂无事件</p>
              <p className="text-xs mt-1">点击此处添加事件</p>
            </div>
          ) : (
            <>
              {/* Event header row - each event as a column */}
              <div
                className="grid border-b"
                style={{ gridTemplateColumns: `80px ${eventColTemplate}`, minHeight: '104px' }}
              >
                <div className="p-1.5 text-xs font-medium text-muted-foreground text-center border-r flex items-center justify-center bg-muted/20">
                  事件
                </div>
                {allDayEvents.map((event) => {
                  const evtType = getEventType(event.eventTypeId)
                  const headerTitle = getEventHeaderTitle(event)
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        'border-r last:border-r-0 p-0.5 cursor-pointer transition-opacity hover:opacity-80 min-w-0'
                      )}
                      style={evtType ? { backgroundColor: evtType.color + '10' } : {}}
                      onClick={(e) => handleEventClick(e, event.id)}
                      title={getEventDisplayTitle(event)}
                    >
                      <div className="flex flex-col items-center gap-0.5 py-0.5">
                        {evtType && <EventShape shape={evtType.shape} color={evtType.color} size={16} symbol={evtType.symbol} />}
                        <span className="text-[12px] leading-tight break-all w-full text-center max-w-[4em]" style={evtType ? { color: evtType.color } : {}}>
                          {headerTitle}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Entity rows with dot indicators - each entity gets a row, dots under event columns */}
              {sortedEntities.map((entity) => (
                <div
                  key={entity.id}
                  className="grid border-b"
                  style={{ gridTemplateColumns: `80px ${eventColTemplate}` }}
                >
                  <div className="p-1.5 text-xs font-medium text-muted-foreground text-center border-r flex items-center justify-center bg-muted/20">
                    <span className="truncate" title={entity.name}>{entity.name}</span>
                  </div>
                  {allDayEvents.map((event) => {
                    const evtType = getEventType(event.eventTypeId)
                    const belongsToEntity = event.entityIds.includes(entity.id)
                    return (
                      <div
                        key={event.id}
                        className="border-r last:border-r-0 flex items-center justify-center min-h-[24px]"
                      >
                        {belongsToEntity ? (
                          <div
                            className="cursor-pointer transition-opacity hover:opacity-80"
                            onClick={(e) => handleEventClick(e, event.id)}
                            title={getEventDisplayTitle(event)}
                          >
                            {evtType ? (
                              <EventShape shape={evtType.shape} color={evtType.color} size={16} symbol={evtType.symbol} />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-primary/40" />
                            )}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* 未分类 row */}
              <div
                className="grid border-b"
                style={{ gridTemplateColumns: `80px ${eventColTemplate}` }}
              >
                <div className="p-1.5 text-xs font-medium text-muted-foreground text-center border-r flex items-center justify-center bg-muted/20">
                  <span title="未分类">未分类</span>
                </div>
                {allDayEvents.map((event) => {
                  const evtType = getEventType(event.eventTypeId)
                  const belongsToUncat = event.entityIds.length === 0
                  return (
                    <div
                      key={event.id}
                      className="border-r last:border-r-0 flex items-center justify-center min-h-[24px]"
                    >
                      {belongsToUncat ? (
                        <div
                          className="cursor-pointer transition-opacity hover:opacity-80"
                          onClick={(e) => handleEventClick(e, event.id)}
                          title={getEventDisplayTitle(event)}
                        >
                          {evtType ? (
                            <EventShape shape={evtType.shape} color={evtType.color} size={16} symbol={evtType.symbol} />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-primary/40" />
                          )}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </>
          )}

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
          {allDayEvents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <p>暂无事件</p>
              <p className="text-xs mt-1">点击空白处添加事件</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {allDayEvents.map((event) => {
                const evtType = getEventType(event.eventTypeId)
                const headerTitle = getEventHeaderTitle(event)
                return (
                  <div
                    key={event.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded text-[12px] cursor-pointer transition-opacity hover:opacity-80',
                      evtType ? '' : 'bg-primary/10'
                    )}
                    style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                    onClick={(e) => { e.stopPropagation(); openEventDialog(currentDate, event) }}
                  >
                    {evtType && <EventShape shape={evtType.shape} color={evtType.color} size={16} symbol={evtType.symbol} />}
                    <span className="truncate font-medium">{headerTitle}</span>
                  </div>
                )
              })}
            </div>
          )}
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
