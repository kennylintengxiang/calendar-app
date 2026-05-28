'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCalendarStore, CalendarMembership } from '@/store/calendar-store'
import { Users, Plus, Trash2, Shield, Eye, Pencil } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function CollaborationDialog() {
  const {
    isCollaborationDialogOpen,
    memberships,
    users,
    currentUser,
    addMember,
    updateMemberRole,
    removeMember,
  } = useCalendarStore()

  const handleClose = () => {
    useCalendarStore.setState({ isCollaborationDialogOpen: false })
  }

  const { toast } = useToast()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'viewer' | 'editor'>('viewer')
  const [isAdding, setIsAdding] = useState(false)

  // Users that can be invited (not self, not already a member)
  const availableUsers = users.filter((u) => {
    if (!currentUser) return false
    if (u.id === currentUser.id) return false
    // Check if already a member
    const isMember = memberships.some(
      (m) => m.calendarUserId === currentUser.id && m.memberUserId === u.id
    )
    return !isMember
  })

  // My calendars that others are members of
  const myCalendarMembers = memberships.filter(
    (m) => m.calendarUserId === currentUser?.id
  )

  // Calendars I'm a member of
  const calendarsImMemberOf = memberships.filter(
    (m) => m.memberUserId === currentUser?.id
  )

  const handleAdd = async () => {
    if (!selectedUserId || !currentUser) return
    setIsAdding(true)
    try {
      await addMember(currentUser.id, selectedUserId, selectedRole)
      setSelectedUserId('')
      setSelectedRole('viewer')
      toast({ title: '协作者已添加', description: '对方现在可以查看您的日历' })
    } catch {
      toast({ title: '添加失败', variant: 'destructive' })
    } finally {
      setIsAdding(false)
    }
  }

  const handleRoleChange = async (id: string, role: 'viewer' | 'editor') => {
    try {
      await updateMemberRole(id, role)
      toast({ title: '权限已更新' })
    } catch {
      toast({ title: '更新失败', variant: 'destructive' })
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await removeMember(id)
      toast({ title: '协作者已移除' })
    } catch {
      toast({ title: '移除失败', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={isCollaborationDialogOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            多用户协作
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Add collaborator */}
          {availableUsers.length > 0 && (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <Label className="text-xs font-medium">邀请新协作者</Label>
              <div className="flex items-center gap-2">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue placeholder="选择用户" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'viewer' | 'editor')}>
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> 查看</span>
                    </SelectItem>
                    <SelectItem value="editor">
                      <span className="flex items-center gap-1"><Pencil className="h-3 w-3" /> 编辑</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={handleAdd}
                  disabled={!selectedUserId || isAdding}
                >
                  <Plus className="h-3.5 w-3.5" />
                  添加
                </Button>
              </div>
            </div>
          )}

          {/* My calendar members */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-primary" />
              我的日历协作者
            </h3>
            {myCalendarMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">
                暂无协作者，邀请其他用户来协作管理日历
              </p>
            ) : (
              <div className="space-y-1.5">
                {myCalendarMembers.map((membership) => (
                  <MemberItem
                    key={membership.id}
                    membership={membership}
                    onRoleChange={handleRoleChange}
                    onRemove={handleRemove}
                    type="owned"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Calendars I'm a member of */}
          {calendarsImMemberOf.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                我参与的日历
              </h3>
              <div className="space-y-1.5">
                {calendarsImMemberOf.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex items-center gap-2 p-2 rounded-lg border"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px] bg-primary/10">
                        {(membership.calendarUser?.name || '?').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">
                        {membership.calendarUser?.name || '未知用户'}的日历
                      </span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      membership.role === 'editor'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {membership.role === 'editor' ? '可编辑' : '只读'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info text */}
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-lg">
            <p>💡 <strong>查看者</strong>：可以查看日历的所有事件，但无法修改</p>
            <p>💡 <strong>编辑者</strong>：可以查看和添加事件到您的日历</p>
            <p>💡 所有协作者都共享相同的日历视图和事件数据</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MemberItem({
  membership,
  onRoleChange,
  onRemove,
  type,
}: {
  membership: CalendarMembership
  onRoleChange: (id: string, role: 'viewer' | 'editor') => void
  onRemove: (id: string) => void
  type: 'owned' | 'member'
}) {
  const user = type === 'owned' ? membership.memberUser : membership.calendarUser
  const [isUpdating, setIsUpdating] = useState(false)

  const handleRoleChange = async (role: 'viewer' | 'editor') => {
    setIsUpdating(true)
    await onRoleChange(membership.id, role)
    setIsUpdating(false)
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border">
      <Avatar className="h-7 w-7">
        <AvatarFallback className="text-[10px] bg-primary/10">
          {(user?.name || '?').charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{user?.name || '未知用户'}</span>
      </div>
      <Select
        value={membership.role}
        onValueChange={(v) => handleRoleChange(v as 'viewer' | 'editor')}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-20 h-7 text-[11px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="viewer">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> 查看</span>
          </SelectItem>
          <SelectItem value="editor">
            <span className="flex items-center gap-1"><Pencil className="h-3 w-3" /> 编辑</span>
          </SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
        onClick={() => onRemove(membership.id)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}
