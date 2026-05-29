'use client'

import React, { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useCalendarStore } from '@/store/calendar-store'
import { UserPlus, Trash2, LogOut, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function UserSwitcher() {
  const {
    currentUser,
    users,
    switchUser,
    createUser,
    deleteUser,
  } = useCalendarStore()

  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const handleCreate = async () => {
    if (!newUserName.trim()) return
    setIsCreating(true)
    try {
      await createUser(newUserName.trim())
      setNewUserName('')
      setShowCreate(false)
      toast({ title: '用户已创建', description: '已自动切换到新用户' })
    } catch {
      toast({ title: '创建失败', variant: 'destructive' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleSwitch = async (userId: string) => {
    if (userId === currentUser?.id) {
      setIsOpen(false)
      return
    }
    // Close popover FIRST for immediate visual feedback
    setIsOpen(false)
    try {
      await switchUser(userId)
      toast({ title: '已切换用户' })
    } catch {
      toast({ title: '切换失败', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (users.length <= 1) {
      toast({ title: '无法删除', description: '至少需要保留一个用户', variant: 'destructive' })
      return
    }
    try {
      await deleteUser(id)
      toast({ title: '用户已删除' })
    } catch {
      toast({ title: '删除失败', variant: 'destructive' })
    }
  }

  if (!currentUser) return null

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 px-2 gap-1.5 text-xs hover:bg-muted"
        >
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {currentUser.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline max-w-[80px] truncate">{currentUser.name}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">切换用户</p>
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer group"
              onClick={() => handleSwitch(user.id)}
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm flex-1 truncate">{user.name}</span>
              {user.id === currentUser.id && (
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
              {user.id !== currentUser.id && users.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(user.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}

          {/* Create new user */}
          {showCreate ? (
            <div className="p-2 border rounded-md mt-2 space-y-2">
              <Input
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="输入用户名"
                className="h-7 text-xs"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={handleCreate}
                  disabled={!newUserName.trim() || isCreating}
                >
                  {isCreating ? '创建中...' : '创建'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    setShowCreate(false)
                    setNewUserName('')
                  }}
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full h-8 text-xs gap-1 mt-1"
              onClick={() => setShowCreate(true)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              新增用户
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
