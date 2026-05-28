'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCalendarStore } from '@/store/calendar-store'
import { Link2, Copy, Trash2, Plus, Clock, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function ShareDialog() {
  const {
    isShareDialogOpen,
    shareLinks,
    createShareLink,
    deleteShareLink,
    currentUser,
  } = useCalendarStore()

  const handleClose = () => {
    useCalendarStore.setState({ isShareDialogOpen: false })
  }

  const { toast } = useToast()
  const [newName, setNewName] = useState('')
  const [newExpiresAt, setNewExpiresAt] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!currentUser) return
    setIsCreating(true)
    try {
      await createShareLink(newName || undefined, newExpiresAt || undefined)
      setNewName('')
      setNewExpiresAt('')
      toast({ title: '分享链接已创建', description: '可以复制链接分享给他人' })
    } catch {
      toast({ title: '创建失败', variant: 'destructive' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}?share=${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(token)
      toast({ title: '链接已复制', description: '可以直接粘贴分享给他人' })
      setTimeout(() => setCopiedToken(null), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedToken(token)
      toast({ title: '链接已复制', description: '可以直接粘贴分享给他人' })
      setTimeout(() => setCopiedToken(null), 2000)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteShareLink(id)
      toast({ title: '链接已删除' })
    } catch {
      toast({ title: '删除失败', variant: 'destructive' })
    }
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <Dialog open={isShareDialogOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            只读分享链接
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground">
            创建只读分享链接后，其他人通过链接只能查看您的日历，无法修改任何内容。您可以设置链接名称和过期时间。
          </p>

          {/* Create new share link */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">链接名称</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例如：分享给团队"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">过期时间（可选）</Label>
                <Input
                  type="datetime-local"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              onClick={handleCreate}
              disabled={isCreating}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {isCreating ? '创建中...' : '创建分享链接'}
            </Button>
          </div>

          {/* Existing share links */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">已创建的链接 ({shareLinks.length})</h3>
            {shareLinks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">暂无分享链接</p>
            ) : (
              <div className="space-y-2">
                {shareLinks.map((link) => {
                  const expired = isExpired(link.expiresAt)
                  return (
                    <div
                      key={link.id}
                      className={`p-3 border rounded-lg space-y-2 ${expired ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{link.name}</span>
                          {expired && (
                            <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                              已过期
                            </span>
                          )}
                          {link.expiresAt && !expired && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {new Date(link.expiresAt).toLocaleDateString('zh-CN')}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(link.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] bg-muted px-2 py-1 rounded flex-1 truncate">
                          {window.location.origin}?share={link.token}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 shrink-0"
                          onClick={() => handleCopyLink(link.token)}
                        >
                          {copiedToken === link.token ? (
                            <>
                              <Check className="h-3 w-3" />
                              已复制
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              复制
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
