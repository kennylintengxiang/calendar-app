'use client'

import React from 'react'
import { useCalendarStore } from '@/store/calendar-store'
import { EventShape } from './EventShape'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronRight, ChevronLeft, Palette, Shapes } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Legend() {
  const { colorSettings, eventTypes, isLegendOpen, toggleLegend } = useCalendarStore()

  if (!isLegendOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={toggleLegend}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-20 rounded-r-none rounded-l-lg shadow-md h-10 w-6"
        title="展开图例"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
    )
  }

  return (
    <Card className="w-56 lg:w-64 shadow-lg border-l-0 rounded-l-none">
      <CardHeader className="pb-3 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">图例</CardTitle>
          <Button variant="ghost" size="icon" onClick={toggleLegend} className="h-6 w-6">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto">
        {/* Day Color Legend */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">日期背景色</span>
          </div>
          <div className="space-y-1.5">
            {[...colorSettings].sort((a, b) => a.sortOrder - b.sortOrder).map((setting) => (
              <div key={setting.dayType} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded border border-border/50 flex-shrink-0"
                  style={{ backgroundColor: setting.color }}
                />
                <span className="text-xs">{setting.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Event Type Legend */}
        {eventTypes.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Shapes className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">事件类型</span>
            </div>
            <div className="space-y-1.5">
              {[...eventTypes].sort((a, b) => a.sortOrder - b.sortOrder).map((type) => (
                <div key={type.id} className="flex items-center gap-2">
                  <EventShape shape={type.shape} color={type.color} size={22} symbol={type.symbol} />
                  <span className="text-xs">{type.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
