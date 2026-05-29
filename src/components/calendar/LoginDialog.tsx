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
import { Calendar, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function LoginDialog() {
  const { isLoginDialogOpen, closeLoginDialog, login, setup } = useCalendarStore()
  const { toast } = useToast()

  const [mode, setMode] = useState<'login' | 'setup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const account = await login(username, password)
      if (account) {
        toast({ title: '登录成功' })
        resetForm()
      } else {
        setError('用户名或密码错误')
      }
    } catch {
      setError('登录失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (username.length < 3) {
      setError('用户名至少3个字符')
      return
    }
    if (password.length < 6) {
      setError('密码至少6个字符')
      return
    }

    setIsLoading(true)
    try {
      const account = await setup(username, password, displayName || undefined)
      if (account) {
        toast({ title: '设置成功', description: '已创建管理员账号' })
        resetForm()
      } else {
        setError('设置失败')
      }
    } catch {
      setError('设置失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setUsername('')
    setPassword('')
    setDisplayName('')
    setError('')
    setShowPassword(false)
  }

  const handleClose = () => {
    closeLoginDialog()
    resetForm()
  }

  return (
    <Dialog open={isLoginDialogOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {mode === 'login' ? '登录以编辑日历' : '创建管理员账号'}
          </DialogTitle>
        </DialogHeader>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-username" className="text-xs">用户名</Label>
              <Input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                disabled={isLoading}
                required
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-xs">密码</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  disabled={isLoading}
                  required
                  className="h-9 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button type="submit" className="w-full h-9" disabled={isLoading || !username || !password}>
              {isLoading ? '登录中...' : '登录'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="setup-username" className="text-xs">用户名</Label>
              <Input
                id="setup-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="至少3个字符"
                disabled={isLoading}
                required
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-password" className="text-xs">密码</Label>
              <div className="relative">
                <Input
                  id="setup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少6个字符"
                  disabled={isLoading}
                  required
                  className="h-9 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-displayname" className="text-xs">显示名称（可选）</Label>
              <Input
                id="setup-displayname"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="日历显示的名称"
                disabled={isLoading}
                className="h-9"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button type="submit" className="w-full h-9" disabled={isLoading}>
              {isLoading ? '创建中...' : '创建管理员'}
            </Button>
          </form>
        )}

        <div className="text-center">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-primary underline"
            onClick={() => {
              setMode(mode === 'login' ? 'setup' : 'login')
              setError('')
            }}
          >
            {mode === 'login' ? '首次使用？创建管理员账号' : '已有账号？登录'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
