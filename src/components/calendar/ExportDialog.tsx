'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useCalendarStore } from '@/store/calendar-store'
import { useToast } from '@/hooks/use-toast'
import { Download, Calendar, ChevronDown, ExternalLink, CheckCircle2 } from 'lucide-react'

export function ExportDialog() {
  const { isExportDialogOpen, closeExportDialog, currentUser } = useCalendarStore()
  const { toast } = useToast()

  const now = new Date()
  const currentYear = now.getFullYear()

  const [startYear, setStartYear] = useState(String(currentYear))
  const [startMonth, setStartMonth] = useState('01')
  const [endYear, setEndYear] = useState(String(currentYear))
  const [endMonth, setEndMonth] = useState('12')
  const [isExporting, setIsExporting] = useState(false)
  const [isTutorialOpen, setIsTutorialOpen] = useState(false)

  // Generate year options: 2020 to current year + 1
  const years = []
  for (let y = 2020; y <= currentYear + 1; y++) {
    years.push(String(y))
  }

  // Generate month options: 1-12
  const months = Array.from({ length: 12 }, (_, i) => {
    const val = String(i + 1).padStart(2, '0')
    return { value: val, label: `${i + 1}月` }
  })

  const handleExport = async () => {
    if (!currentUser) return

    setIsExporting(true)
    try {
      // Compute start and end dates
      const startDate = `${startYear}-${startMonth}-01`

      // Get last day of endMonth
      const endYearNum = parseInt(endYear)
      const endMonthNum = parseInt(endMonth)
      const lastDay = new Date(endYearNum, endMonthNum, 0).getDate()
      const endDate = `${endYear}-${endMonth}-${lastDay}`

      const res = await fetch(
        `/api/export?start=${startDate}&end=${endDate}&userId=${currentUser.id}`
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: '导出失败' }))
        throw new Error(data.error || '导出失败')
      }

      // Create blob and trigger download
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `calendar-${startYear}${startMonth}-to-${endYear}${endMonth}.ics`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: '导出成功',
        description: 'ICS 文件已下载，可以导入到 Google Calendar 等日历应用',
      })
      closeExportDialog()
    } catch (error) {
      toast({
        title: '导出失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleClose = () => {
    closeExportDialog()
  }

  return (
    <Dialog open={isExportDialogOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            导出日历
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground">
            选择要导出的日期范围，将生成 ICS 格式文件，可导入到 Google Calendar、Outlook 等日历应用。
          </p>

          {/* Date range selectors */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <label className="text-sm font-medium">日期范围</label>
            <div className="flex items-center gap-2">
              {/* Start year */}
              <Select value={startYear} onValueChange={setStartYear}>
                <SelectTrigger className="h-8 text-xs w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y} className="text-xs">
                      {y}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Start month */}
              <Select value={startMonth} onValueChange={setStartMonth}>
                <SelectTrigger className="h-8 text-xs w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Separator */}
              <span className="text-sm text-muted-foreground px-1">~</span>

              {/* End year */}
              <Select value={endYear} onValueChange={setEndYear}>
                <SelectTrigger className="h-8 text-xs w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y} className="text-xs">
                      {y}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* End month */}
              <Select value={endMonth} onValueChange={setEndMonth}>
                <SelectTrigger className="h-8 text-xs w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export button */}
          <Button
            className="w-full h-9"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-1.5" />
            {isExporting ? '导出中...' : '导出 ICS 文件'}
          </Button>

          {/* Google Calendar import tutorial */}
          <Collapsible open={isTutorialOpen} onOpenChange={setIsTutorialOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
                <Calendar className="h-4 w-4" />
                <span className="flex-1 text-left font-medium">
                  如何在 Google Calendar 中导入
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isTutorialOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <ol className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium">1</span>
                    <span>
                      打开 Google Calendar (
                      <a
                        href="https://calendar.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        calendar.google.com
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      )
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium">2</span>
                    <span>在左侧面板点击 &quot;+&quot; 号，选择&quot;新建日历&quot;</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium">3</span>
                    <span>输入日历名称（如&quot;中国日历&quot;），点击&quot;创建日历&quot;</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium">4</span>
                    <span>在左侧面板找到新建的日历，点击三个点菜单，选择&quot;设置和共享&quot;</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium">5</span>
                    <span>切换到&quot;导入日历&quot;标签</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium">6</span>
                    <span>点击&quot;选择文件&quot;，选择刚才下载的 .ics 文件</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium">7</span>
                    <span>在&quot;添加到日历&quot;下拉框中选择刚才新建的日历</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium">8</span>
                    <span className="flex items-center gap-1">
                      点击&quot;导入&quot;按钮完成导入
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    </span>
                  </li>
                </ol>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogContent>
    </Dialog>
  )
}
