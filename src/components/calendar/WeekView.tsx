'use client'

import React, { useMemo } from 'react'
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  isWeekend,
  setHours,
  setMinutes,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useCalendarStore } from '@/store/calendar-store'
import { EventShape } from './EventShape'
import { cn } from '@/lib/utils'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const WEEKDAYS_FULL = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function WeekView() {
  const { currentDate, events, holidays, eventTypes, openEventDialog } = useCalendarStore()

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [currentDate])

  const getHolidayForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return holidays.find((h) => h.date === dateStr)
  }

  const getAllDayEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.filter((e) => {
      if (!e.allDay) return false
      const eStart = e.startDate.slice(0, 10)
      const eEnd = e.endDate ? e.endDate.slice(0, 10) : eStart
      return dateStr >= eStart && dateStr <= eEnd
    })
  }

  const getTimedEventsForDateAndHour = (date: Date, hour: number) => {
    return events.filter((e) => {
      if (e.allDay) return false
      try {
        const eStart = new Date(e.startDate)
        if (!isSameDay(eStart, date)) return false
        return eStart.getHours() === hour
      } catch {
        return false
      }
    })
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
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 bg-background z-10">
        <div className="p-2 text-xs text-muted-foreground text-center border-r">时间</div>
        {weekDays.map((day, i) => {
          const holiday = getHolidayForDate(day)
          const allDayEvts = getAllDayEventsForDate(day)
          return (
            <div
              key={i}
              className={cn(
                'p-1.5 text-center border-r last:border-r-0 cursor-pointer hover:bg-accent/50 transition-colors',
                isToday(day) && 'bg-primary/5'
              )}
              onClick={() => openEventDialog(day)}
            >
              <div className="text-[10px] text-muted-foreground">{WEEKDAYS_FULL[i]}</div>
              <div
                className={cn(
                  'text-lg font-semibold',
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
              {allDayEvts.length > 0 && (
                <div className="mt-0.5 space-y-0.5">
                  {allDayEvts.slice(0, 2).map((event) => {
                    const evtType = getEventType(event.eventTypeId)
                    return (
                      <div
                        key={event.id}
                        className={cn('text-[9px] px-1 rounded truncate', evtType ? '' : 'bg-primary/10')}
                        style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                        onClick={(e) => handleEventClick(e, day, event.id)}
                      >
                        {event.title}
                      </div>
                    )
                  })}
                  {allDayEvts.length > 2 && (
                    <div className="text-[9px] text-muted-foreground">+{allDayEvts.length - 2}</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b min-h-[48px]">
            <div className="p-1 text-[10px] text-muted-foreground text-center border-r flex items-start justify-center pt-1">
              {hour.toString().padStart(2, '0')}:00
            </div>
            {weekDays.map((day, dayIdx) => {
              const hourEvents = getTimedEventsForDateAndHour(day, hour)
              return (
                <div
                  key={dayIdx}
                  className={cn(
                    'border-r last:border-r-0 p-0.5 cursor-pointer hover:bg-accent/30 transition-colors relative',
                    isToday(day) && hour === new Date().getHours() && 'bg-primary/5'
                  )}
                  onClick={() => openEventDialog(setMinutes(setHours(day, hour), 0))}
                >
                  {hourEvents.map((event) => {
                    const evtType = getEventType(event.eventTypeId)
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          'text-[10px] px-1 py-0.5 rounded truncate cursor-pointer',
                          evtType ? '' : 'bg-primary/10'
                        )}
                        style={evtType ? { backgroundColor: evtType.color + '20', color: evtType.color } : {}}
                        onClick={(e) => handleEventClick(e, day, event.id)}
                      >
                        <div className="flex items-center gap-0.5">
                          {evtType && <EventShape shape={evtType.shape} color={evtType.color} size={12} symbol={evtType.symbol} />}
                          <span className="truncate">{event.title}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
