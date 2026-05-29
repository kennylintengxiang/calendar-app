'use client'

import React from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useCalendarStore } from '@/store/calendar-store'
import { Check, ChevronDown } from 'lucide-react'

export function SharedUserSwitcher() {
  const {
    sharedUsers,
    sharedCurrentUserId,
    switchSharedUser,
  } = useCalendarStore()

  const [isOpen, setIsOpen] = React.useState(false)

  const currentUser = sharedUsers.find(u => u.id === sharedCurrentUserId)

  const handleSwitch = async (userId: string) => {
    if (userId === sharedCurrentUserId) {
      setIsOpen(false)
      return
    }
    // Close popover FIRST for immediate visual feedback
    setIsOpen(false)
    try {
      await switchSharedUser(userId)
    } catch {
      // Error handled in store
    }
  }

  if (!currentUser) return null

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 px-2 gap-1.5 text-xs hover:bg-amber-500/10 text-amber-700"
        >
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px] bg-amber-500/20 text-amber-700">
              {currentUser.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline max-w-[80px] truncate">{currentUser.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">切换用户</p>
          {sharedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
              onClick={() => handleSwitch(user.id)}
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm flex-1 truncate">{user.name}</span>
              {user.id === sharedCurrentUserId && (
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
