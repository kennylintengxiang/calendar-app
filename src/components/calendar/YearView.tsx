'use client'

import React, { useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  isSameMonth,
  isToday,
  isWeekend,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useCalendarStore, CalendarView } from '@/store/calendar-store'
import { EventShape } from './EventShape'
import { cn } from '@/lib/utils'

const WEEKDAYS_MIN = ['一', '二', '三', '四', '五', '六', '日']
const MONTHS = Array.from({ length: 12 }, (_, i) => i)

export function YearView() {
  const { currentDate, events, holidays, colorSettings, eventTypes, setCurrentView, setCurrentDate } = useCalendarStore()
  const year = currentDate.getFullYear()

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

  const getEventType = (typeId?: string | null) => {
    if (!typeId) return null
    return eventTypes.find((t) => t.id === typeId)
  }

  const getMiniMonthDays = (month: number) => {
    const monthDate = new Date(year, month, 1)
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })

    const days: (Date | null)[] = []
    let day = calStart
    while (day <= monthEnd || days.length % 7 !== 0) {
      days.push(isSameMonth(day, monthDate) ? day : null)
      day = addDays(day, 1)
      if (days.length > 42) break
    }
    while (days.length % 7 !== 0) {
      days.push(null)
    }
    return days
  }

  const getDayBgStyle = (date: Date): React.CSSProperties => {
    const holiday = getHolidayForDate(date)
    const hasEvents = getEventsForDate(date).length > 0

    if (isToday(date)) {
      const s = colorSettings.find((s) => s.dayType === 'today')
      return s ? { backgroundColor: s.color } : { backgroundColor: '#fef2f2' }
    }
    if (holiday?.type === 'workday') {
      const s = colorSettings.find((s) => s.dayType === 'workday')
      return s ? { backgroundColor: s.color } : { backgroundColor: '#fff7ed' }
    }
    if (holiday?.type === 'holiday') {
      const s = colorSettings.find((s) => s.dayType === 'holiday')
      return s ? { backgroundColor: s.color } : { backgroundColor: '#dcfce7' }
    }
    if (hasEvents) {
      const s = colorSettings.find((s) => s.dayType === 'scheduled')
      return s ? { backgroundColor: s.color } : { backgroundColor: '#fef9c3' }
    }
    if (isWeekend(date)) {
      const s = colorSettings.find((s) => s.dayType === 'weekend')
      return s ? { backgroundColor: s.color } : { backgroundColor: '#f0fdf4' }
    }
    return {}
  }

  const handleMonthClick = (month: number) => {
    setCurrentDate(new Date(year, month, 1))
    setCurrentView('month')
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MONTHS.map((month) => {
          const days = getMiniMonthDays(month)
          const monthDate = new Date(year, month, 1)
          const monthName = format(monthDate, 'M月', { locale: zhCN })

          return (
            <div
              key={month}
              className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleMonthClick(month)}
            >
              <div className="text-center text-base font-bold mb-3">
                {monthName}
              </div>
              <div className="grid grid-cols-7 gap-[3px]">
                {WEEKDAYS_MIN.map((wd, wdi) => (
                  <div key={wd} className={cn(
                    "text-center text-[10px] font-medium pb-1",
                    wdi >= 5 ? "text-red-400" : "text-muted-foreground"
                  )}>
                    {wd}
                  </div>
                ))}
                {days.map((day, i) => {
                  if (!day) {
                    return <div key={i} className="h-8" />
                  }

                  const dayEvents = getEventsForDate(day)
                  const holiday = getHolidayForDate(day)
                  const bgStyle = getDayBgStyle(day)
                  const wdi = i % 7 // weekday index

                  // Get up to 4 event types for shape indicators
                  const eventTypesForDay = dayEvents
                    .filter(e => e.eventTypeId)
                    .slice(0, 4)
                    .map(e => getEventType(e.eventTypeId))
                    .filter(Boolean) as { id: string; name: string; shape: string; color: string; symbol: string }[]

                  // Deduplicate by event type id
                  const uniqueEventTypes = eventTypesForDay.filter(
                    (t, idx, arr) => arr.findIndex(x => x.id === t.id) === idx
                  )

                  return (
                    <div
                      key={i}
                      className={cn(
                        "relative flex flex-col items-center justify-center h-10 rounded-sm",
                        "transition-colors",
                      )}
                      style={bgStyle}
                    >
                      {/* Date number with background color covering it */}
                      <span
                        className={cn(
                          'text-[11px] leading-none font-medium',
                          isToday(day) && 'font-bold text-primary',
                          wdi >= 5 && !isToday(day) && holiday?.type !== 'workday' && 'text-red-500',
                          holiday?.type === 'workday' && !isToday(day) && 'text-orange-600'
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {/* Event shape indicators - up to 3 */}
                      {uniqueEventTypes.length > 0 && (
                        <div className="flex items-center gap-[1px] mt-[1px]">
                          {uniqueEventTypes.map((et, idx) => (
                            <EventShape
                              key={idx}
                              shape={et.shape}
                              color={et.color}
                              size={12}
                              symbol={et.symbol}
                            />
                          ))}
                        </div>
                      )}
                      {/* More events indicator */}
                      {dayEvents.length > uniqueEventTypes.length && uniqueEventTypes.length >= 4 && (
                        <span className="text-[7px] text-muted-foreground leading-none">
                          +{dayEvents.length - 4}
                        </span>
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
  )
}
