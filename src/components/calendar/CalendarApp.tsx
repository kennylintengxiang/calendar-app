'use client'

import React, { useEffect } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useCalendarStore, CalendarView } from '@/store/calendar-store'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { YearView } from './YearView'
import { EventDialog } from './EventDialog'
import { SettingsDialog } from './SettingsDialog'
import { ShareDialog } from './ShareDialog'
import { CollaborationDialog } from './CollaborationDialog'
import { ImportDialog } from './ImportDialog'
import { ExportDialog } from './ExportDialog'
import { LoginDialog } from './LoginDialog'
import { UserSwitcher } from './UserSwitcher'
import { SharedUserSwitcher } from './SharedUserSwitcher'
import { Legend } from './Legend'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Download,
  Upload,
  CalendarDays,
  CalendarRange,
  Calendar,
  LayoutGrid,
  Link2,
  Users,
  Eye,
  X,
  PanelRight,
  LogIn,
  LogOut,
  Shield,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const VIEW_OPTIONS: { value: CalendarView; label: string; icon: React.ReactNode }[] = [
  { value: 'day', label: '日', icon: <CalendarDays className="h-4 w-4" /> },
  { value: 'week', label: '周', icon: <CalendarRange className="h-4 w-4" /> },
  { value: 'month', label: '月', icon: <Calendar className="h-4 w-4" /> },
  { value: 'year', label: '年', icon: <LayoutGrid className="h-4 w-4" /> },
]

export function CalendarApp() {
  const {
    currentView,
    currentDate,
    setCurrentView,
    navigateDate,
    isInitialized,
    initialize,
    openSettingsDialog,
    openImportDialog,
    openExportDialog,
    events,
    isReadOnly,
    sharedCalendarOwner,
    sharedUsers,
    sharedCurrentUserId,
    exitReadOnly,
    currentUser,
    isAuthenticated,
    openLoginDialog,
    logout,
    isLegendOpen,
    toggleLegend,
  } = useCalendarStore()

  const { toast } = useToast()

  // State for share and collaboration dialogs
  const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false)
  const [isCollaborationDialogOpen, setIsCollaborationDialogOpen] = React.useState(false)

  // Sync dialog state to store
  useEffect(() => {
    useCalendarStore.setState({ isShareDialogOpen, isCollaborationDialogOpen })
  }, [isShareDialogOpen, isCollaborationDialogOpen])

  useEffect(() => {
    // Initialize with a timeout safety net
    const initTimeout = setTimeout(() => {
      if (!useCalendarStore.getState().isInitialized) {
        console.warn('Initialization timed out, forcing initialized state')
        useCalendarStore.setState({ isInitialized: true })
      }
    }, 15000) // 15 second timeout

    initialize().finally(() => clearTimeout(initTimeout))
  }, [initialize])

  // Re-fetch holidays when year changes
  useEffect(() => {
    if (!isInitialized) return
    const year = currentDate.getFullYear()
    const { fetchHolidays } = useCalendarStore.getState()
    fetchHolidays(year)
  }, [currentDate, currentView, isInitialized])

  const handleLogout = async () => {
    try {
      await logout()
      toast({ title: '已退出登录', description: '您仍可查看日历，编辑时需重新登录' })
    } catch {
      toast({ title: '退出失败', variant: 'destructive' })
    }
  }

  const getDateTitle = () => {
    switch (currentView) {
      case 'day':
        return format(currentDate, 'yyyy年M月d日 EEEE', { locale: zhCN })
      case 'week': {
        const d = new Date(currentDate)
        const dayOfWeek = d.getDay() || 7
        const monday = new Date(d)
        monday.setDate(d.getDate() - dayOfWeek + 1)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        return `${format(monday, 'M月d日', { locale: zhCN })} - ${format(sunday, 'M月d日', { locale: zhCN })}`
      }
      case 'month':
        return format(currentDate, 'yyyy年M月', { locale: zhCN })
      case 'year':
        return format(currentDate, 'yyyy年', { locale: zhCN })
    }
  }

  const currentSharedUserName = sharedUsers.find(u => u.id === sharedCurrentUserId)?.name || sharedCalendarOwner?.name || '他人'

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">加载日历数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Read-only banner */}
      {isReadOnly && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-center gap-2">
          <Eye className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-xs text-amber-700 font-medium">
            只读模式 — 正在查看 {currentSharedUserName}的日历
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-amber-700 hover:text-amber-900 gap-1 ml-2"
            onClick={exitReadOnly}
          >
            <X className="h-3 w-3" />
            退出
          </Button>
        </div>
      )}

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2">
          <div className="flex items-center gap-2">
            {isReadOnly ? <SharedUserSwitcher /> : <UserSwitcher />}
            <Calendar className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold hidden sm:inline">
              {isReadOnly ? `${currentSharedUserName}的日历` : '日历'}
            </h1>
            {/* Auth status indicator */}
            {!isReadOnly && isAuthenticated && (
              <span className="text-[10px] text-muted-foreground hidden sm:inline flex items-center gap-0.5">
                <Shield className="h-3 w-3 text-green-600" />
                已登录
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Navigation */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateDate('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-2 sm:px-3"
                onClick={() => navigateDate('today')}
              >
                今天
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateDate('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Date title */}
            <h2 className="text-xs sm:text-sm font-semibold min-w-[80px] sm:min-w-[160px] text-center">
              {getDateTitle()}
            </h2>
          </div>

          {/* View switcher & actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <ToggleGroup
              type="single"
              value={currentView}
              onValueChange={(val) => {
                if (val) setCurrentView(val as CalendarView)
              }}
              className="hidden sm:flex"
            >
              {VIEW_OPTIONS.map((opt) => (
                <ToggleGroupItem
                  key={opt.value}
                  value={opt.value}
                  aria-label={opt.label}
                  className="h-8 px-3 text-xs gap-1"
                >
                  {opt.icon}
                  <span className="hidden md:inline">{opt.label}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            {/* Mobile view switcher */}
            <div className="sm:hidden">
              <select
                value={currentView}
                onChange={(e) => setCurrentView(e.target.value as CalendarView)}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                {VIEW_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}视图
                  </option>
                ))}
              </select>
            </div>

            {/* Share button - only show when authenticated */}
            {!isReadOnly && isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsShareDialogOpen(true)}
                title="分享链接"
              >
                <Link2 className="h-4 w-4" />
              </Button>
            )}

            {/* Collaboration button - only show when authenticated */}
            {!isReadOnly && isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsCollaborationDialogOpen(true)}
                title="多用户协作"
              >
                <Users className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={openImportDialog}
              title="导入日历"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={openExportDialog}
              title="导出日历"
            >
              <Download className="h-4 w-4" />
            </Button>
            {!isReadOnly && isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={openSettingsDialog}
                title="设置"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            {/* Auth button */}
            {!isReadOnly && (
              isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleLogout}
                  title="退出登录"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={openLoginDialog}
                  title="登录"
                >
                  <LogIn className="h-4 w-4" />
                </Button>
              )
            )}
            {/* Mobile legend toggle */}
            <MobileLegendToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          {currentView === 'month' && <MonthView />}
          {currentView === 'week' && <WeekView />}
          {currentView === 'day' && <DayView />}
          {currentView === 'year' && <YearView />}
        </div>

        {/* Legend sidebar */}
        <div className="hidden md:block">
          <Legend />
        </div>

        {/* Mobile Legend overlay */}
        <MobileLegendOverlay />
      </main>

      {/* Footer */}
      <footer className="border-t py-2 px-4 bg-muted/30 mt-auto">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {isReadOnly
              ? `只读模式 · ${currentSharedUserName}的日历`
              : `中国日历 · 支持法定节假日 · 可导出Outlook`}
          </span>
          <span>{events.length} 个事件</span>
        </div>
      </footer>

      {/* Dialogs */}
      <EventDialog />
      <SettingsDialog />
      <ShareDialog />
      <CollaborationDialog />
      <ImportDialog />
      <ExportDialog />
      <LoginDialog />
    </div>
  )
}

/** Mobile-only legend toggle button in the header */
function MobileLegendToggle() {
  const { isLegendOpen, toggleLegend } = useCalendarStore()
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 md:hidden"
      onClick={toggleLegend}
      title={isLegendOpen ? '关闭图例' : '打开图例'}
    >
      <PanelRight className={`h-4 w-4 ${isLegendOpen ? 'text-primary' : ''}`} />
    </Button>
  )
}

/** Mobile-only legend overlay that slides in from the right */
function MobileLegendOverlay() {
  const { isLegendOpen, toggleLegend } = useCalendarStore()

  if (!isLegendOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40 md:hidden"
        onClick={toggleLegend}
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 md:hidden animate-in slide-in-from-right duration-200">
        <Legend />
      </div>
    </>
  )
}
