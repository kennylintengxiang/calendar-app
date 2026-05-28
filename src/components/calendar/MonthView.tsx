'use client'

import React, { useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isWeekend,
  isToday,
  parseISO,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useCalendarStore } from '@/store/calendar-store'
import { EventShape } from './EventShape'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

export function MonthView() {
  const {
    currentDate,
    events,
    holidays,
    colorSettings,
    eventTypes,
    openEventDialog,
  } = useCalendarStore()

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days: Date[] = []
    let day = calStart
    while (day <= calEnd) {
      days.push(day)
      day = addDays(day, 1)
    }

    const result: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7))
    }
    return result
  }, [currentDate])

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

  const getDayStyle = (date: Date, isCurrentMonth: boolean): React.CSSProperties => {
    if (!isCurrentMonth) return {}

    const holiday = getHolidayForDate(date)
    const hasEvents = getEventsForDate(date).length > 0

    if (isToday(date)) {
      const todaySetting = colorSettings.find((s) => s.dayType === 'today')
      if (todaySetting) return { backgroundColor: todaySetting.color }
      return { backgroundColor: '#fef2f2' }
    }

    if (holiday?.type === 'workday') {
      const workdaySetting = colorSettings.find((s) => s.dayType === 'workday')
      if (workdaySetting) return { backgroundColor: workdaySetting.color }
      return { backgroundColor: '#fff7ed' }
    }

    if (holiday?.type === 'holiday') {
      const holidaySetting = colorSettings.find((s) => s.dayType === 'holiday')
      if (holidaySetting) return { backgroundColor: holidaySetting.color }
      return { backgroundColor: '#dcfce7' }
    }

    if (hasEvents) {
      const scheduledSetting = colorSettings.find((s) => s.dayType === 'scheduled')
      if (scheduledSetting) return { backgroundColor: scheduledSetting.color }
      return { backgroundColor: '#fef9c3' }
    }

    if (isWeekend(date)) {
      const weekendSetting = colorSettings.find((s) => s.dayType === 'weekend')
      if (weekendSetting) return { backgroundColor: weekendSetting.color }
      return { backgroundColor: '#f0fdf4' }
    }

    return {}
  }

  const handleDayClick = (date: Date) => {
    openEventDialog(date)
  }

  const handleEventClick = (e: React.MouseEvent, date: Date, eventId: string) => {
    e.stopPropagation()
    const event = events.find((ev) => ev.id === eventId)
    if (event) {
      openEventDialog(date, event)
    }
  }

  const getEventType = (typeId?: string | null) => {
    if (!typeId) return null
    return eventTypes.find((t) => t.id === typeId)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={cn(
              'py-2 text-center text-xs font-medium',
              i >= 5 ? 'text-red-500' : 'text-muted-foreground'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid auto-rows-fr">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map((day, dayIdx) => {
              const isCurrentMonth = isSameMonth(day, currentDate)
              const holiday = getHolidayForDate(day)
              const dayEvents = getEventsForDate(day)
              const dayStyle = getDayStyle(day, isCurrentMonth)

              return (
                <div
                  key={dayIdx}
                  className={cn(
                    'group relative border-r last:border-r-0 p-1 cursor-pointer transition-colors hover:brightness-95 min-h-[80px] sm:min-h-[100px]',
                    !isCurrentMonth && 'opacity-40'
                  )}
                  style={dayStyle}
                  onClick={() => handleDayClick(day)}
                >
                  {/* Day number */}
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        'text-xs sm:text-sm font-medium inline-flex items-center justify-center min-w-[20px] h-[20px] rounded-full',
                        isToday(day) && 'bg-primary text-primary-foreground',
                        dayIdx >= 5 && !isToday(day) && holiday?.type !== 'workday' && 'text-red-500',
                        holiday?.type === 'workday' && !isToday(day) && 'text-orange-600'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {holiday && isCurrentMonth && (
                      <span
                        className={cn(
                          'text-[10px] leading-tight max-w-[60px] truncate',
                          holiday.type === 'holiday'
                            ? 'text-green-700 font-medium'
                            : 'text-orange-600'
                        )}
                      >
                        {holiday.name}
                      </span>
                    )}
                  </div>

                  {/* Events */}
                  <div className="mt-0.5 space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 3).map((event) => {
                      const evtType = getEventType(event.eventTypeId)
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            'flex items-center gap-1 px-1 py-0.5 rounded text-[10px] sm:text-xs truncate transition-opacity hover:opacity-80',
                            evtType ? '' : 'bg-primary/10'
                          )}
                          style={
                            evtType
                              ? { backgroundColor: evtType.color + '20', color: evtType.color }
                              : {}
                          }
                          onClick={(e) => handleEventClick(e, day, event.id)}
                        >
                          {evtType && <EventShape shape={evtType.shape} color={evtType.color} size={14} symbol={evtType.symbol} />}
                          <span className="truncate">{event.title}</span>
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-1">
                        +{dayEvents.length - 3} 更多
                      </div>
                    )}
                  </div>

                  {/* Today indicator */}
                  {isToday(day) && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
