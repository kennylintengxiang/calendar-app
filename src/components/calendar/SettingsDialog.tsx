'use client'

import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCalendarStore, CalendarEventType, Entity } from '@/store/calendar-store'
import { EventShape, SHAPE_OPTIONS } from './EventShape'
import { Trash2, Plus, RefreshCw, GripVertical, ChevronUp, ChevronDown, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function SettingsDialog() {
  const {
    isSettingsDialogOpen,
    closeSettingsDialog,
    isLoadingHolidays,
    refreshHolidays,
    currentDate,
  } = useCalendarStore()

  return (
    <Dialog open={isSettingsDialogOpen} onOpenChange={(open) => !open && closeSettingsDialog()}>
      <DialogContent
        className="sm:max-w-[560px] max-h-[80vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Account Management (Admin only) */}
          <AccountManagementSection />

          {/* Color Settings */}
          <ColorSettingsSection />

          {/* Event Type Management */}
          <EventTypeSection />

          {/* Entity Management */}
          <EntitySection />

          {/* Holiday Refresh */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">节假日数据</h3>
            <p className="text-xs text-muted-foreground">
              点击下方按钮从网络获取最新的中国法定节假日安排数据。如果当年数据尚未更新，将使用内置数据。
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshHolidays(currentDate.getFullYear())}
              disabled={isLoadingHolidays}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingHolidays ? 'animate-spin' : ''}`} />
              {isLoadingHolidays ? '获取中...' : '获取最新节假日'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface AccountInfo {
  id: string
  username: string
  role: string
  createdAt: string
  users: Array<{ id: string; name: string }>
}

function AccountManagementSection() {
  const { isAuthenticated, authAccount } = useCalendarStore()
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<AccountInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user')

  const isAdmin = isAuthenticated && authAccount?.role === 'admin'

  const fetchAccounts = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/accounts')
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.accounts)
      } else {
        toast({ title: '获取账号列表失败', variant: 'destructive' })
      }
    } catch {
      toast({ title: '网络错误', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    if (isAdmin) {
      fetchAccounts()
    }
  }, [isAdmin, fetchAccounts])

  const handleCreate = async () => {
    if (!newUsername.trim() || !newPassword || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/auth/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          displayName: newDisplayName.trim() || undefined,
          role: newRole,
        }),
      })
      if (res.ok) {
        await fetchAccounts()
        setNewUsername('')
        setNewPassword('')
        setNewDisplayName('')
        setNewRole('user')
        setIsAdding(false)
        toast({ title: '创建成功', description: `账号 "${newUsername.trim()}" 已创建` })
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: '创建失败', description: data.error || '未知错误', variant: 'destructive' })
      }
    } catch {
      toast({ title: '网络错误', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, username: string) => {
    try {
      const res = await fetch(`/api/auth/accounts?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchAccounts()
        toast({ title: '已删除', description: `账号 "${username}" 已删除` })
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: '删除失败', description: data.error || '未知错误', variant: 'destructive' })
      }
    } catch {
      toast({ title: '网络错误', variant: 'destructive' })
    }
  }

  if (!isAdmin) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">账号管理</h3>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="h-3 w-3 mr-1" />
          新增
        </Button>
      </div>

      {isAdding && (
        <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">用户名</Label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="用户名 (≥3字符)"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">密码</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="密码 (≥6字符)"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">显示名称（可选）</Label>
              <Input
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="显示名称"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">角色</Label>
              <Select value={newRole} onValueChange={(v: 'user' | 'admin') => setNewRole(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">普通用户</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setIsAdding(false)}>
              取消
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={handleCreate}
              disabled={newUsername.trim().length < 3 || newPassword.length < 6 || isSubmitting}
            >
              {isSubmitting ? '创建中...' : '创建'}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">加载中...</p>
      ) : (
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{account.username}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-medium',
                      account.role === 'admin'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    )}
                  >
                    {account.role === 'admin' ? '管理员' : '用户'}
                  </span>
                  {account.id === authAccount?.id && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">
                      当前
                    </span>
                  )}
                </div>
                {account.users.length > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    关联用户: {account.users.map((u) => u.name).join(', ')}
                  </p>
                )}
              </div>
              {account.id !== authAccount?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => handleDelete(account.id, account.username)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          {accounts.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">暂无账号</p>
          )}
        </div>
      )}
    </div>
  )
}

function ColorSettingsSection() {
  const { colorSettings, updateColorSetting, deleteColorSetting, addColorSetting, reorderColorSettings } = useCalendarStore()
  const [localSettings, setLocalSettings] = useState<Record<string, { color: string; label: string }>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [newDayType, setNewDayType] = useState('')
  const [newColor, setNewColor] = useState('#f0fdf4')
  const [newLabel, setNewLabel] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [localOrder, setLocalOrder] = useState<typeof colorSettings>([])
  const { toast } = useToast()

  // Sort by sortOrder and sync local order
  const sortedSettings = React.useMemo(() => {
    return [...colorSettings].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [colorSettings])

  React.useEffect(() => {
    setLocalOrder(sortedSettings)
  }, [sortedSettings])

  React.useEffect(() => {
    const settings: Record<string, { color: string; label: string }> = {}
    colorSettings.forEach((s) => {
      settings[s.dayType] = { color: s.color, label: s.label }
    })
    setLocalSettings(settings)
  }, [colorSettings])

  const handleColorChange = (dayType: string, color: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      [dayType]: { ...prev[dayType], color },
    }))
  }

  const handleLabelChange = (dayType: string, label: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      [dayType]: { ...prev[dayType], label },
    }))
  }

  const handleSaveColor = (dayType: string) => {
    const setting = localSettings[dayType]
    if (setting) {
      updateColorSetting(dayType, setting.color, setting.label)
    }
  }

  const handleAddColor = async () => {
    if (!newDayType.trim() || !newLabel.trim() || isSubmitting) return

    const duplicate = colorSettings.some(
      (s) => s.dayType.toLowerCase() === newDayType.trim().toLowerCase()
    )
    if (duplicate) {
      toast({ title: '添加失败', description: `日期类型"${newDayType.trim()}"已存在`, variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      await addColorSetting(newDayType.trim(), newColor, newLabel.trim())
      setNewDayType('')
      setNewColor('#f0fdf4')
      setNewLabel('')
      setIsAdding(false)
      toast({ title: '添加成功', description: `日期背景颜色"${newLabel.trim()}"已创建` })
    } catch (e) {
      toast({ title: '添加失败', description: e instanceof Error ? e.message : '未知错误', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteColor = async (id: string) => {
    try {
      await deleteColorSetting(id)
      toast({ title: '已删除' })
    } catch (e) {
      toast({ title: '删除失败', description: '网络错误', variant: 'destructive' })
    }
  }

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverId !== id) {
      setDragOverId(id)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = useCallback(async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverId(null)

    const sourceId = dragId
    if (!sourceId || sourceId === targetId) {
      setDragId(null)
      return
    }

    const newOrder = [...localOrder]
    const sourceIndex = newOrder.findIndex((t) => t.id === sourceId)
    const targetIndex = newOrder.findIndex((t) => t.id === targetId)

    if (sourceIndex === -1 || targetIndex === -1) {
      setDragId(null)
      return
    }

    const [moved] = newOrder.splice(sourceIndex, 1)
    newOrder.splice(targetIndex, 0, moved)
    setLocalOrder(newOrder)
    setDragId(null)

    const items = newOrder.map((t, idx) => ({ id: t.id, sortOrder: idx }))
    await reorderColorSettings(items)
  }, [dragId, localOrder, reorderColorSettings])

  const handleDragEnd = () => {
    setDragId(null)
    setDragOverId(null)
  }

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return
    const newOrder = [...localOrder]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index - 1]
    newOrder[index - 1] = temp
    setLocalOrder(newOrder)
    const items = newOrder.map((t, idx) => ({ id: t.id, sortOrder: idx }))
    await reorderColorSettings(items)
  }

  const handleMoveDown = async (index: number) => {
    if (index >= localOrder.length - 1) return
    const newOrder = [...localOrder]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index + 1]
    newOrder[index + 1] = temp
    setLocalOrder(newOrder)
    const items = newOrder.map((t, idx) => ({ id: t.id, sortOrder: idx }))
    await reorderColorSettings(items)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">日期背景颜色</h3>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="h-3 w-3 mr-1" />
          新增
        </Button>
      </div>

      {isAdding && (
        <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <Input
              value={newDayType}
              onChange={(e) => setNewDayType(e.target.value)}
              placeholder="日期类型标识(英文，如 birthday)"
              className="w-36 h-8 text-xs"
            />
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="显示名称(如 生日)"
              className="w-28 h-8 text-xs"
            />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-8 h-8 rounded border cursor-pointer"
            />
            <Button size="sm" className="h-8 text-xs ml-auto" onClick={handleAddColor} disabled={!newDayType.trim() || !newLabel.trim() || isSubmitting}>
              {isSubmitting ? '添加中...' : '添加'}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">日期类型标识用于区分不同的日期类型，建议使用英文小写</p>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">拖拽或使用箭头按钮调整颜色优先级顺序（排在前面的优先级更高）</p>

      <div className="space-y-1">
        {localOrder.map((setting, index) => (
          <div
            key={setting.id}
            draggable
            onDragStart={(e) => handleDragStart(e, setting.id)}
            onDragOver={(e) => handleDragOver(e, setting.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, setting.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              'flex items-center gap-2 p-1.5 rounded transition-all',
              dragId === setting.id && 'opacity-50 scale-95',
              dragOverId === setting.id && dragId !== setting.id && 'border-t-2 border-primary',
              'hover:bg-muted/50 cursor-grab active:cursor-grabbing'
            )}
          >
            {/* Drag handle */}
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />

            {/* Move up/down buttons */}
            <div className="flex flex-col gap-0.5">
              <button
                className="p-0 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                className="p-0 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => handleMoveDown(index)}
                disabled={index === localOrder.length - 1}
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            {/* Color preview */}
            <div
              className="w-6 h-6 rounded border flex-shrink-0"
              style={{ backgroundColor: localSettings[setting.dayType]?.color || setting.color }}
            />

            <Input
              value={localSettings[setting.dayType]?.label || setting.label}
              onChange={(e) => handleLabelChange(setting.dayType, e.target.value)}
              className="w-20 h-7 text-xs"
            />
            <input
              type="color"
              value={localSettings[setting.dayType]?.color || setting.color}
              onChange={(e) => handleColorChange(setting.dayType, e.target.value)}
              className="w-7 h-7 rounded border cursor-pointer"
            />
            <Input
              value={localSettings[setting.dayType]?.color || setting.color}
              onChange={(e) => handleColorChange(setting.dayType, e.target.value)}
              className="w-20 h-7 text-xs font-mono"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] px-2"
              onClick={() => handleSaveColor(setting.dayType)}
            >
              保存
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => handleDeleteColor(setting.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function EntitySection() {
  const { entities, currentUser, reorderEntities, addEntity, deleteEntity } = useCalendarStore()
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localOrder, setLocalOrder] = useState<Entity[]>([])
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const { toast } = useToast()

  // Sort entities by sortOrder and sync local order
  const sortedEntities = React.useMemo(() => {
    return [...entities].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [entities])

  React.useEffect(() => {
    setLocalOrder(sortedEntities)
  }, [sortedEntities])

  const handleAdd = async () => {
    if (!newName.trim() || isSubmitting) return

    const duplicate = entities.some(
      (e) => e.name.toLowerCase() === newName.trim().toLowerCase()
    )
    if (duplicate) {
      toast({ title: '添加失败', description: `主体"${newName.trim()}"已存在，请使用其他名称`, variant: 'destructive' })
      return
    }

    if (!currentUser) {
      toast({ title: '添加失败', description: '用户信息未加载，请刷新页面重试', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      await addEntity(newName.trim())
      setNewName('')
      setIsAdding(false)
      toast({ title: '添加成功', description: `主体"${newName.trim()}"已创建` })
    } catch (e) {
      console.error('Failed to add entity:', e)
      toast({ title: '添加失败', description: '网络错误，请重试', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteEntity(id)
      toast({ title: '已删除' })
    } catch (e) {
      console.error('Failed to delete entity:', e)
      toast({ title: '删除失败', description: '网络错误', variant: 'destructive' })
    }
  }

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverId !== id) {
      setDragOverId(id)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = useCallback(async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverId(null)

    const sourceId = dragId
    if (!sourceId || sourceId === targetId) {
      setDragId(null)
      return
    }

    const newOrder = [...localOrder]
    const sourceIndex = newOrder.findIndex((t) => t.id === sourceId)
    const targetIndex = newOrder.findIndex((t) => t.id === targetId)

    if (sourceIndex === -1 || targetIndex === -1) {
      setDragId(null)
      return
    }

    const [moved] = newOrder.splice(sourceIndex, 1)
    newOrder.splice(targetIndex, 0, moved)
    setLocalOrder(newOrder)
    setDragId(null)

    const items = newOrder.map((t, idx) => ({ id: t.id, sortOrder: idx }))
    await reorderEntities(items)
  }, [dragId, localOrder, reorderEntities])

  const handleDragEnd = () => {
    setDragId(null)
    setDragOverId(null)
  }

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return
    const newOrder = [...localOrder]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index - 1]
    newOrder[index - 1] = temp
    setLocalOrder(newOrder)
    const items = newOrder.map((t, idx) => ({ id: t.id, sortOrder: idx }))
    await reorderEntities(items)
  }

  const handleMoveDown = async (index: number) => {
    if (index >= localOrder.length - 1) return
    const newOrder = [...localOrder]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index + 1]
    newOrder[index + 1] = temp
    setLocalOrder(newOrder)
    const items = newOrder.map((t, idx) => ({ id: t.id, sortOrder: idx }))
    await reorderEntities(items)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">主体管理</h3>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="h-3 w-3 mr-1" />
          新增
        </Button>
      </div>

      {isAdding && (
        <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="主体名称"
              className="w-32 h-8 text-xs"
            />
            <Button size="sm" className="h-8 text-xs ml-auto" onClick={handleAdd} disabled={!newName.trim() || isSubmitting}>
              {isSubmitting ? '添加中...' : '添加'}
            </Button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">拖拽或使用箭头按钮调整主体显示顺序</p>

      <div className="space-y-1">
        {localOrder.map((entity, index) => (
          <div
            key={entity.id}
            draggable
            onDragStart={(e) => handleDragStart(e, entity.id)}
            onDragOver={(e) => handleDragOver(e, entity.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, entity.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              'flex items-center gap-2 p-1.5 rounded transition-all',
              dragId === entity.id && 'opacity-50 scale-95',
              dragOverId === entity.id && dragId !== entity.id && 'border-t-2 border-primary',
              'hover:bg-muted/50 cursor-grab active:cursor-grabbing'
            )}
          >
            {/* Drag handle */}
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />

            {/* Move up/down buttons */}
            <div className="flex flex-col gap-0.5">
              <button
                className="p-0 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                className="p-0 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => handleMoveDown(index)}
                disabled={index === localOrder.length - 1}
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            <span className="text-sm flex-1">{entity.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(entity.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function EventTypeSection() {
  const { eventTypes, fetchEventTypes, currentUser, reorderEventTypes } = useCalendarStore()
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newShape, setNewShape] = useState('circle')
  const [newColor, setNewColor] = useState('#ef4444')
  const [newSymbol, setNewSymbol] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localOrder, setLocalOrder] = useState<CalendarEventType[]>([])
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const { toast } = useToast()

  // Sort event types by sortOrder and sync local order
  const sortedEventTypes = React.useMemo(() => {
    return [...eventTypes].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [eventTypes])

  React.useEffect(() => {
    setLocalOrder(sortedEventTypes)
  }, [sortedEventTypes])

  const handleAdd = async () => {
    if (!newName.trim() || isSubmitting) return

    const duplicate = eventTypes.some(
      (t) => t.name.toLowerCase() === newName.trim().toLowerCase()
    )
    if (duplicate) {
      toast({ title: '添加失败', description: `事件类型"${newName.trim()}"已存在，请使用其他名称`, variant: 'destructive' })
      return
    }

    if (!currentUser) {
      toast({ title: '添加失败', description: '用户信息未加载，请刷新页面重试', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/settings/event-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), shape: newShape, color: newColor, symbol: newSymbol, userId: currentUser.id }),
      })
      if (res.ok) {
        await fetchEventTypes()
        setNewName('')
        setNewShape('circle')
        setNewColor('#ef4444')
        setNewSymbol('')
        setIsAdding(false)
        toast({ title: '添加成功', description: `事件类型"${newName.trim()}"已创建` })
      } else {
        const data = await res.json().catch(() => ({}))
        const errorMsg = data.error || '未知错误'
        if (res.status === 409) {
          await fetchEventTypes()
        }
        toast({ title: '添加失败', description: errorMsg, variant: 'destructive' })
      }
    } catch (e) {
      console.error('Failed to add event type:', e)
      toast({ title: '添加失败', description: '网络错误，请重试', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const userId = currentUser?.id
      const res = await fetch(`/api/settings/event-types?id=${id}${userId ? `&userId=${userId}` : ''}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchEventTypes()
        toast({ title: '已删除' })
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: '删除失败', description: data.error || '未知错误', variant: 'destructive' })
      }
    } catch (e) {
      console.error('Failed to delete event type:', e)
      toast({ title: '删除失败', description: '网络错误', variant: 'destructive' })
    }
  }

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverId !== id) {
      setDragOverId(id)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = useCallback(async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverId(null)

    const sourceId = dragId
    if (!sourceId || sourceId === targetId) {
      setDragId(null)
      return
    }

    // Reorder locally
    const newOrder = [...localOrder]
    const sourceIndex = newOrder.findIndex((t) => t.id === sourceId)
    const targetIndex = newOrder.findIndex((t) => t.id === targetId)

    if (sourceIndex === -1 || targetIndex === -1) {
      setDragId(null)
      return
    }

    const [moved] = newOrder.splice(sourceIndex, 1)
    newOrder.splice(targetIndex, 0, moved)
    setLocalOrder(newOrder)
    setDragId(null)

    // Persist the new order
    const items = newOrder.map((t, idx) => ({ id: t.id, sortOrder: idx }))
    await reorderEventTypes(items)
  }, [dragId, localOrder, reorderEventTypes])

  const handleDragEnd = () => {
    setDragId(null)
    setDragOverId(null)
  }

  // Move up/down handlers (alternative to drag & drop)
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return
    const newOrder = [...localOrder]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index - 1]
    newOrder[index - 1] = temp
    setLocalOrder(newOrder)
    const items = newOrder.map((t, idx) => ({ id: t.id, sortOrder: idx }))
    await reorderEventTypes(items)
  }

  const handleMoveDown = async (index: number) => {
    if (index >= localOrder.length - 1) return
    const newOrder = [...localOrder]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index + 1]
    newOrder[index + 1] = temp
    setLocalOrder(newOrder)
    const items = newOrder.map((t, idx) => ({ id: t.id, sortOrder: idx }))
    await reorderEventTypes(items)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">事件类型图例</h3>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="h-3 w-3 mr-1" />
          新增
        </Button>
      </div>

      {isAdding && (
        <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="类型名称"
              className="w-24 h-8 text-xs"
            />
            <Select value={newShape} onValueChange={setNewShape}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHAPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-8 h-8 rounded border cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.slice(0, 2))}
              placeholder="标识符(1-2位数字/字母)"
              className="w-40 h-8 text-xs"
              maxLength={2}
            />
            {/* Preview */}
            <div className="flex items-center gap-2 ml-2">
              <span className="text-[10px] text-muted-foreground">预览:</span>
              <EventShape shape={newShape} color={newColor} size={32} symbol={newSymbol} />
            </div>
            <Button size="sm" className="h-8 text-xs ml-auto" onClick={handleAdd} disabled={!newName.trim() || isSubmitting}>
              {isSubmitting ? '添加中...' : '添加'}
            </Button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">拖拽或使用箭头按钮调整图例显示顺序</p>

      <div className="space-y-1">
        {localOrder.map((type, index) => (
          <div
            key={type.id}
            draggable
            onDragStart={(e) => handleDragStart(e, type.id)}
            onDragOver={(e) => handleDragOver(e, type.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, type.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              'flex items-center gap-2 p-1.5 rounded transition-all',
              dragId === type.id && 'opacity-50 scale-95',
              dragOverId === type.id && dragId !== type.id && 'border-t-2 border-primary',
              'hover:bg-muted/50 cursor-grab active:cursor-grabbing'
            )}
          >
            {/* Drag handle */}
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />

            {/* Move up/down buttons */}
            <div className="flex flex-col gap-0.5">
              <button
                className="p-0 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                className="p-0 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => handleMoveDown(index)}
                disabled={index === localOrder.length - 1}
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            <EventShape shape={type.shape} color={type.color} size={26} symbol={type.symbol} />
            <span className="text-sm flex-1">{type.name}</span>
            {type.symbol && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {type.symbol}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">{SHAPE_OPTIONS.find((o) => o.value === type.shape)?.label}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(type.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
