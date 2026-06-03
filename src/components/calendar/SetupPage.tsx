'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react'

interface SetupPageProps {
  onSetupSuccess: (account: {
    id: string
    username: string
    role: string
    users: Array<{ id: string; name: string; avatar: string }>
  }) => void
}

export function SetupPage({ onSetupSuccess }: SetupPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码至少6个字符')
      return
    }

    if (username.length < 3) {
      setError('用户名至少3个字符')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          displayName: displayName || undefined,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        onSetupSuccess(data.account)
      } else {
        setError(data.error || '初始化失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">初始化管理员账号</h1>
          <p className="text-sm text-muted-foreground">
            首次使用，请创建管理员账号以保护您的日历数据
          </p>
        </div>

        {/* Setup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">管理员用户名</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="至少3个字符"
              autoComplete="username"
              disabled={isLoading}
              required
              minLength={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">显示名称（可选）</Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="如：张三"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少6个字符"
                autoComplete="new-password"
                disabled={isLoading}
                required
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认密码</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              autoComplete="new-password"
              disabled={isLoading}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !username || !password || !confirmPassword}
          >
            {isLoading ? '创建中...' : '创建管理员账号'}
          </Button>
        </form>

        {/* Info */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-medium">安全提示</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>• 管理员可以管理所有账号和数据</li>
            <li>• 密码使用加密存储，无法还原</li>
            <li>• 设置后可在设置中添加其他账号</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
