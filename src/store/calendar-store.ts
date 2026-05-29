import { create } from 'zustand'

export type CalendarView = 'day' | 'week' | 'month' | 'year'

export interface CalendarEventType {
  id: string
  name: string
  shape: string
  color: string
  symbol: string
  sortOrder: number
}

export interface Entity {
  id: string
  name: string
  sortOrder: number
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string | null
  startDate: string
  endDate?: string | null
  allDay: boolean
  eventTypeId?: string | null
  eventType?: CalendarEventType | null
  entityIds: string[]
  entities: Entity[]
}

export interface Holiday {
  id: string
  date: string
  name: string
  type: string
  year: number
}

export interface DayColorSetting {
  id: string
  dayType: string
  color: string
  label: string
  sortOrder: number
}

export interface CalendarUser {
  id: string
  name: string
  avatar: string
}

export interface ShareLink {
  id: string
  token: string
  userId: string
  name: string
  expiresAt: string | null
  createdAt: string
}

export interface CalendarMembership {
  id: string
  calendarUserId: string
  memberUserId: string
  role: 'viewer' | 'editor'
  calendarUser?: CalendarUser
  memberUser?: CalendarUser
}

export interface AuthAccount {
  id: string
  username: string
  role: string
  users: Array<{ id: string; name: string; avatar: string }>
}

const CURRENT_USER_KEY = 'calendar-current-user-id'

function getSavedUserId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(CURRENT_USER_KEY)
  } catch {
    return null
  }
}

function saveUserId(id: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CURRENT_USER_KEY, id)
  } catch {
    // ignore
  }
}

function clearSavedUserId() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CURRENT_USER_KEY)
  } catch {
    // ignore
  }
}

function getShareTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get('share')
  } catch {
    return null
  }
}

interface CalendarState {
  // View state
  currentView: CalendarView
  currentDate: Date
  setCurrentView: (view: CalendarView) => void
  setCurrentDate: (date: Date) => void
  navigateDate: (direction: 'prev' | 'next' | 'today') => void

  // Events
  events: CalendarEvent[]
  setEvents: (events: CalendarEvent[]) => void
  addEvent: (event: CalendarEvent) => void
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void
  removeEvent: (id: string) => void
  fetchEvents: (start?: string, end?: string) => Promise<void>

  // Event types
  eventTypes: CalendarEventType[]
  setEventTypes: (types: CalendarEventType[]) => void
  fetchEventTypes: () => Promise<void>

  // Holidays
  holidays: Holiday[]
  setHolidays: (holidays: Holiday[]) => void
  fetchHolidays: (year: number) => Promise<void>
  refreshHolidays: (year: number) => Promise<void>

  // Entities
  entities: Entity[]
  setEntities: (entities: Entity[]) => void
  fetchEntities: () => Promise<void>
  addEntity: (name: string) => Promise<void>
  updateEntity: (id: string, data: { name?: string }) => Promise<void>
  deleteEntity: (id: string) => Promise<void>
  reorderEntities: (items: Array<{ id: string; sortOrder: number }>) => Promise<void>

  // Color settings
  colorSettings: DayColorSetting[]
  setColorSettings: (settings: DayColorSetting[]) => void
  fetchColorSettings: () => Promise<void>
  updateColorSetting: (dayType: string, color: string, label: string) => Promise<void>
  deleteColorSetting: (id: string) => Promise<void>
  addColorSetting: (dayType: string, color: string, label: string) => Promise<void>
  reorderColorSettings: (items: Array<{ id: string; sortOrder: number }>) => Promise<void>

  // Event dialog
  isEventDialogOpen: boolean
  editingEvent: CalendarEvent | null
  selectedDate: Date | null
  openEventDialog: (date: Date, event?: CalendarEvent) => void
  closeEventDialog: () => void

  // Settings dialog
  isSettingsDialogOpen: boolean
  openSettingsDialog: () => void
  closeSettingsDialog: () => void

  // Share dialog
  isShareDialogOpen: boolean

  // Collaboration dialog
  isCollaborationDialogOpen: boolean

  // Legend panel
  isLegendOpen: boolean
  toggleLegend: () => void

  // User management
  currentUser: CalendarUser | null
  users: CalendarUser[]
  setCurrentUser: (user: CalendarUser) => void
  fetchUsers: () => Promise<void>
  createUser: (name: string, avatar?: string) => Promise<void>
  updateUser: (id: string, data: { name?: string; avatar?: string }) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  switchUser: (userId: string) => Promise<void>

  // Init for user
  initForUser: (userId: string) => Promise<void>

  // Share links
  shareLinks: ShareLink[]
  fetchShareLinks: () => Promise<void>
  createShareLink: (name?: string, expiresAt?: string) => Promise<void>
  deleteShareLink: (id: string) => Promise<void>

  // Shared calendar / read-only mode
  isReadOnly: boolean
  shareToken: string | null
  sharedCalendarOwner: CalendarUser | null
  sharedUsers: CalendarUser[]
  sharedCurrentUserId: string | null
  fetchSharedCalendar: (token: string, userId?: string) => Promise<void>
  switchSharedUser: (userId: string) => Promise<void>
  exitReadOnly: () => Promise<void>

  // Collaboration
  memberships: CalendarMembership[]
  fetchMemberships: () => Promise<void>
  addMember: (calendarUserId: string, memberUserId: string, role: 'viewer' | 'editor') => Promise<void>
  updateMemberRole: (id: string, role: 'viewer' | 'editor') => Promise<void>
  removeMember: (id: string) => Promise<void>

  // Import dialog
  isImportDialogOpen: boolean
  openImportDialog: () => void
  closeImportDialog: () => void

  // Export dialog
  isExportDialogOpen: boolean
  openExportDialog: () => void
  closeExportDialog: () => void

  // Login dialog (deferred auth)
  isLoginDialogOpen: boolean
  openLoginDialog: () => void
  closeLoginDialog: () => void

  // Auth state
  isAuthenticated: boolean
  authAccount: AuthAccount | null
  checkAuth: () => Promise<void>
  login: (username: string, password: string) => Promise<AuthAccount | null>
  setup: (username: string, password: string, displayName?: string) => Promise<AuthAccount | null>
  logout: () => Promise<void>

  // Import calendar
  importCalendar: (userId: string, fileType: 'ics' | 'json' | 'csv' | 'excel', content: string) => Promise<{ imported: number; skipped: number; eventTypesMatched: number; eventTypesCreated: number; errors: string[] }>

  // Reorder event types
  reorderEventTypes: (items: Array<{ id: string; sortOrder: number }>) => Promise<void>

  // Initialization
  isInitialized: boolean
  initialize: () => Promise<void>

  // Loading states
  isLoadingHolidays: boolean
}

function serializeEvent(e: Record<string, unknown>): CalendarEvent {
  // eventEntities is the junction table from API: [{ id, eventId, entityId, entity: { id, name, sortOrder } }]
  const eventEntities = (e.eventEntities as Array<Record<string, unknown>>) || []
  const entities: Entity[] = eventEntities.map((ee) => {
    const ent = ee.entity as Record<string, unknown>
    return {
      id: (ent?.id || ee.entityId) as string,
      name: (ent?.name || '') as string,
      sortOrder: ((ent?.sortOrder as number) || 0),
    }
  }).filter((ent) => ent.id && ent.name)
  const entityIds = entities.map((ent) => ent.id)

  return {
    id: e.id as string,
    title: e.title as string,
    description: e.description as string | null | undefined,
    startDate: e.startDate instanceof Date ? e.startDate.toISOString() : String(e.startDate),
    endDate: e.endDate instanceof Date ? e.endDate.toISOString() : e.endDate ? String(e.endDate) : null,
    allDay: e.allDay as boolean,
    eventTypeId: (e.eventTypeId as string) || null,
    eventType: e.eventType ? {
      id: (e.eventType as Record<string, unknown>).id as string,
      name: (e.eventType as Record<string, unknown>).name as string,
      shape: (e.eventType as Record<string, unknown>).shape as string,
      color: (e.eventType as Record<string, unknown>).color as string,
      symbol: ((e.eventType as Record<string, unknown>).symbol as string) || '',
      sortOrder: ((e.eventType as Record<string, unknown>).sortOrder as number) || 0,
    } : null,
    entityIds,
    entities,
  }
}

function serializeUser(u: Record<string, unknown>): CalendarUser {
  return {
    id: u.id as string,
    name: u.name as string,
    avatar: (u.avatar as string) || '',
  }
}

function serializeShareLink(s: Record<string, unknown>): ShareLink {
  return {
    id: s.id as string,
    token: s.token as string,
    userId: s.userId as string,
    name: s.name as string,
    expiresAt: s.expiresAt ? String(s.expiresAt) : null,
    createdAt: s.createdAt ? String(s.createdAt) : '',
  }
}

function serializeMembership(m: Record<string, unknown>): CalendarMembership {
  return {
    id: m.id as string,
    calendarUserId: m.calendarUserId as string,
    memberUserId: m.memberUserId as string,
    role: m.role as 'viewer' | 'editor',
    calendarUser: m.calendarUser ? serializeUser(m.calendarUser as Record<string, unknown>) : undefined,
    memberUser: m.memberUser ? serializeUser(m.memberUser as Record<string, unknown>) : undefined,
  }
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  // View state
  currentView: 'month',
  currentDate: new Date(),
  setCurrentView: (view) => set({ currentView: view }),
  setCurrentDate: (date) => set({ currentDate: date }),

  navigateDate: (direction) => {
    const { currentView, currentDate } = get()
    const d = new Date(currentDate)
    if (direction === 'today') {
      set({ currentDate: new Date() })
      return
    }
    const delta = direction === 'next' ? 1 : -1
    switch (currentView) {
      case 'day':
        d.setDate(d.getDate() + delta)
        break
      case 'week':
        d.setDate(d.getDate() + delta * 7)
        break
      case 'month':
        d.setMonth(d.getMonth() + delta)
        break
      case 'year':
        d.setFullYear(d.getFullYear() + delta)
        break
    }
    set({ currentDate: d })
  },

  // Events
  events: [],
  setEvents: (events) => set({ events }),
  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
  updateEvent: (id, updates) =>
    set((s) => ({
      events: s.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),
  removeEvent: (id) =>
    set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

  fetchEvents: async (start, end) => {
    try {
      const { isReadOnly, shareToken, sharedCurrentUserId, currentUser } = get()
      const params = new URLSearchParams()
      if (start) params.set('start', start)
      if (end) params.set('end', end)
      // In read-only mode, use sharedCurrentUserId to filter events
      if (isReadOnly && sharedCurrentUserId) {
        params.set('userId', sharedCurrentUserId)
      } else if (!isReadOnly && currentUser?.id) {
        params.set('userId', currentUser.id)
      }
      // Share token for API validation (if needed)
      if (isReadOnly && shareToken) {
        params.set('shareToken', shareToken)
      }
      const res = await fetch(`/api/events?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const events = (data.events || data || []).map(serializeEvent)
        set({ events })
      }
    } catch (e) {
      console.error('Failed to fetch events:', e)
    }
  },

  // Event types
  eventTypes: [],
  setEventTypes: (types) => set({ eventTypes: types }),
  fetchEventTypes: async () => {
    try {
      const { isReadOnly, sharedCurrentUserId, currentUser } = get()
      const params = new URLSearchParams()
      if (isReadOnly && sharedCurrentUserId) {
        params.set('userId', sharedCurrentUserId)
      } else if (!isReadOnly && currentUser?.id) {
        params.set('userId', currentUser.id)
      }
      const qs = params.toString()
      const res = await fetch(`/api/settings/event-types${qs ? `?${qs}` : ''}`)
      if (res.ok) {
        const data = await res.json()
        const rawTypes = data.eventTypes || data || []
        const eventTypes = rawTypes.map((t: Record<string, unknown>) => ({
          id: t.id as string,
          name: t.name as string,
          shape: t.shape as string,
          color: t.color as string,
          symbol: (t.symbol as string) || '',
          sortOrder: (t.sortOrder as number) || 0,
        }))
        set({ eventTypes })
      }
    } catch (e) {
      console.error('Failed to fetch event types:', e)
    }
  },

  // Holidays
  holidays: [],
  setHolidays: (holidays) => set({ holidays }),
  fetchHolidays: async (year) => {
    try {
      const res = await fetch(`/api/holidays?year=${year}`)
      if (res.ok) {
        const data = await res.json()
        const holidays = data.holidays || data || []
        if (holidays.length > 0) {
          set({ holidays })
        }
      }
    } catch (e) {
      console.error('Failed to fetch holidays:', e)
    }
  },

  refreshHolidays: async (year) => {
    set({ isLoadingHolidays: true })
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      })
      if (res.ok) {
        const data = await res.json()
        const holidays = data.holidays || data || []
        set({ holidays })
      }
    } catch (e) {
      console.error('Failed to refresh holidays:', e)
    } finally {
      set({ isLoadingHolidays: false })
    }
  },

  // Entities
  entities: [],
  setEntities: (entities) => set({ entities }),
  fetchEntities: async () => {
    try {
      const { isReadOnly, sharedCurrentUserId, currentUser } = get()
      let userId = ''
      if (isReadOnly && sharedCurrentUserId) {
        userId = sharedCurrentUserId
      } else if (!isReadOnly && currentUser?.id) {
        userId = currentUser.id
      } else return
      const res = await fetch(`/api/settings/entities?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        const entities = (data.entities || data || []).map((e: Record<string, unknown>) => ({
          id: e.id as string,
          name: e.name as string,
          sortOrder: (e.sortOrder as number) || 0,
        }))
        set({ entities })
      }
    } catch (e) {
      console.error('Failed to fetch entities:', e)
    }
  },
  addEntity: async (name) => {
    try {
      const { currentUser } = get()
      if (!currentUser) return
      const res = await fetch('/api/settings/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, userId: currentUser.id }),
      })
      if (res.ok) {
        const data = await res.json()
        const entity = data.entity || data
        set((s) => ({ entities: [...s.entities, { id: entity.id, name: entity.name, sortOrder: entity.sortOrder || 0 }] }))
      }
    } catch (e) {
      console.error('Failed to add entity:', e)
    }
  },
  updateEntity: async (id, data) => {
    try {
      const res = await fetch('/api/settings/entities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      })
      if (res.ok) {
        const responseData = await res.json()
        const updated = responseData.entity || responseData
        set((s) => ({
          entities: s.entities.map((e) => (e.id === id ? { ...e, ...updated } : e)),
        }))
      }
    } catch (e) {
      console.error('Failed to update entity:', e)
    }
  },
  deleteEntity: async (id) => {
    try {
      const { currentUser } = get()
      const res = await fetch(`/api/settings/entities?id=${id}${currentUser?.id ? `&userId=${currentUser.id}` : ''}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        set((s) => ({ entities: s.entities.filter((e) => e.id !== id) }))
      }
    } catch (e) {
      console.error('Failed to delete entity:', e)
    }
  },
  reorderEntities: async (items) => {
    try {
      const { currentUser } = get()
      const res = await fetch('/api/settings/entities/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, userId: currentUser?.id }),
      })
      if (res.ok) {
        set((s) => ({
          entities: s.entities.map((e) => {
            const item = items.find((i) => i.id === e.id)
            return item ? { ...e, sortOrder: item.sortOrder } : e
          }).sort((a, b) => a.sortOrder - b.sortOrder),
        }))
      }
    } catch (e) {
      console.error('Failed to reorder entities:', e)
    }
  },

  // Color settings
  colorSettings: [],
  setColorSettings: (settings) => set({ colorSettings: settings }),
  fetchColorSettings: async () => {
    try {
      const { isReadOnly, sharedCurrentUserId, currentUser } = get()
      const params = new URLSearchParams()
      if (isReadOnly && sharedCurrentUserId) {
        params.set('userId', sharedCurrentUserId)
      } else if (!isReadOnly && currentUser?.id) {
        params.set('userId', currentUser.id)
      }
      const qs = params.toString()
      const res = await fetch(`/api/settings/colors${qs ? `?${qs}` : ''}`)
      if (res.ok) {
        const data = await res.json()
        const colorSettings = (data.settings || data || []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          dayType: s.dayType as string,
          color: s.color as string,
          label: s.label as string,
          sortOrder: (s.sortOrder as number) || 0,
        }))
        set({ colorSettings })
      }
    } catch (e) {
      console.error('Failed to fetch color settings:', e)
    }
  },

  updateColorSetting: async (dayType, color, label) => {
    try {
      const { currentUser } = get()
      const res = await fetch('/api/settings/colors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayType, color, label, userId: currentUser?.id }),
      })
      if (res.ok) {
        set((s) => ({
          colorSettings: s.colorSettings.map((cs) =>
            cs.dayType === dayType ? { ...cs, color, label } : cs
          ),
        }))
      }
    } catch (e) {
      console.error('Failed to update color setting:', e)
    }
  },

  deleteColorSetting: async (id) => {
    try {
      const { currentUser } = get()
      const res = await fetch(`/api/settings/colors?id=${id}${currentUser?.id ? `&userId=${currentUser.id}` : ''}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        set((s) => ({
          colorSettings: s.colorSettings.filter((cs) => cs.id !== id),
        }))
      }
    } catch (e) {
      console.error('Failed to delete color setting:', e)
    }
  },

  addColorSetting: async (dayType, color, label) => {
    try {
      const { currentUser } = get()
      if (!currentUser) return
      const res = await fetch('/api/settings/colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayType, color, label, userId: currentUser.id }),
      })
      if (res.ok) {
        const data = await res.json()
        const newSetting = data.setting || data
        set((s) => ({
          colorSettings: [...s.colorSettings, {
            id: newSetting.id as string,
            dayType: newSetting.dayType as string,
            color: newSetting.color as string,
            label: newSetting.label as string,
            sortOrder: (newSetting.sortOrder as number) || 0,
          }],
        }))
      }
    } catch (e) {
      console.error('Failed to add color setting:', e)
      throw e
    }
  },

  reorderColorSettings: async (items) => {
    const { currentUser } = get()
    try {
      const res = await fetch('/api/settings/colors/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, userId: currentUser?.id }),
      })
      if (res.ok) {
        set((s) => ({
          colorSettings: s.colorSettings.map((cs) => {
            const item = items.find((i) => i.id === cs.id)
            return item ? { ...cs, sortOrder: item.sortOrder } : cs
          }).sort((a, b) => a.sortOrder - b.sortOrder),
        }))
      }
    } catch (e) {
      console.error('Failed to reorder color settings:', e)
    }
  },

  // Event dialog
  isEventDialogOpen: false,
  editingEvent: null,
  selectedDate: null,
  openEventDialog: (date, event) => {
    const { isReadOnly, isAuthenticated } = get()
    // In read-only mode, only allow viewing event details (no creation/editing)
    if (isReadOnly && !event) return
    // If not authenticated and not in read-only mode, require login for editing
    if (!isReadOnly && !isAuthenticated && !event) {
      get().openLoginDialog()
      return
    }
    if (!isReadOnly && !isAuthenticated && event) {
      // Viewing is OK, but mark as read-only in the dialog
    }
    set({
      isEventDialogOpen: true,
      selectedDate: date,
      editingEvent: event || null,
    })
  },
  closeEventDialog: () =>
    set({ isEventDialogOpen: false, editingEvent: null, selectedDate: null }),

  // Settings dialog
  isSettingsDialogOpen: false,
  openSettingsDialog: () => set({ isSettingsDialogOpen: true }),
  closeSettingsDialog: () => set({ isSettingsDialogOpen: false }),

  // Share dialog
  isShareDialogOpen: false,

  // Collaboration dialog
  isCollaborationDialogOpen: false,

  // Legend panel
  isLegendOpen: true,
  toggleLegend: () => set((s) => ({ isLegendOpen: !s.isLegendOpen })),

  // =====================
  // User management
  // =====================
  currentUser: null,
  users: [],
  setCurrentUser: (user) => {
    saveUserId(user.id)
    set({ currentUser: user })
  },

  fetchUsers: async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        const rawUsers = data.users || data || []
        const users = rawUsers.map((u: Record<string, unknown>) => serializeUser(u))
        set({ users })
      }
    } catch (e) {
      console.error('Failed to fetch users:', e)
    }
  },

  createUser: async (name, avatar) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar: avatar || '' }),
      })
      if (res.ok) {
        const data = await res.json()
        const user = serializeUser(data.user || data)
        set((s) => ({ users: [...s.users, user] }))
        get().setCurrentUser(user)
        await get().initForUser(user.id)
      }
    } catch (e) {
      console.error('Failed to create user:', e)
    }
  },

  updateUser: async (id, data) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const responseData = await res.json()
        const updated = serializeUser(responseData.user || responseData)
        set((s) => ({
          users: s.users.map((u) => (u.id === id ? updated : u)),
          currentUser: s.currentUser?.id === id ? updated : s.currentUser,
        }))
      }
    } catch (e) {
      console.error('Failed to update user:', e)
    }
  },

  deleteUser: async (id) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        const { currentUser, users } = get()
        const remaining = users.filter((u) => u.id !== id)
        set({ users: remaining })

        if (currentUser?.id === id) {
          if (remaining.length > 0) {
            await get().switchUser(remaining[0].id)
          } else {
            clearSavedUserId()
            set({ currentUser: null })
          }
        }
      }
    } catch (e) {
      console.error('Failed to delete user:', e)
    }
  },

  switchUser: async (userId) => {
    const { users } = get()
    const user = users.find((u) => u.id === userId)
    if (user) {
      get().setCurrentUser(user)
      await get().initForUser(userId)
    }
  },

  // =====================
  // Init for user
  // =====================
  initForUser: async (userId) => {
    try {
      // Initialize default data for this user
      await fetch('/api/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      // Fetch all data for this user in parallel
      const now = new Date()
      const year = now.getFullYear()

      await Promise.all([
        get().fetchColorSettings(),
        get().fetchEventTypes(),
        get().fetchEntities(),
        get().refreshHolidays(year),
        get().fetchEvents(),
        get().fetchShareLinks(),
        get().fetchMemberships(),
      ])
    } catch (e) {
      console.error('Failed to init for user:', e)
    }
  },

  // =====================
  // Share links
  // =====================
  shareLinks: [],

  fetchShareLinks: async () => {
    try {
      const { currentUser } = get()
      if (!currentUser) return
      const res = await fetch(`/api/share?userId=${currentUser.id}`)
      if (res.ok) {
        const data = await res.json()
        const rawLinks = data.shareLinks || data || []
        const shareLinks = rawLinks.map((s: Record<string, unknown>) => serializeShareLink(s))
        set({ shareLinks })
      }
    } catch (e) {
      console.error('Failed to fetch share links:', e)
    }
  },

  createShareLink: async (name, expiresAt) => {
    try {
      const { currentUser } = get()
      if (!currentUser) return
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          name: name || '分享链接',
          expiresAt: expiresAt || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const link = serializeShareLink(data.shareLink || data)
        set((s) => ({ shareLinks: [...s.shareLinks, link] }))
      }
    } catch (e) {
      console.error('Failed to create share link:', e)
    }
  },

  deleteShareLink: async (id) => {
    try {
      const res = await fetch(`/api/share?id=${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        set((s) => ({ shareLinks: s.shareLinks.filter((l) => l.id !== id) }))
      }
    } catch (e) {
      console.error('Failed to delete share link:', e)
    }
  },

  // =====================
  // Shared calendar / Read-only mode
  // =====================
  isReadOnly: false,
  shareToken: null,
  sharedCalendarOwner: null,
  sharedUsers: [],
  sharedCurrentUserId: null,

  fetchSharedCalendar: async (token, userId) => {
    try {
      const url = userId
        ? `/api/share/${token}?userId=${userId}`
        : `/api/share/${token}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        const owner = data.owner ? serializeUser(data.owner as Record<string, unknown>) : null
        const sharedUsers = (data.users || []).map((u: Record<string, unknown>) => serializeUser(u))
        const sharedCurrentUserId = (data.currentUserId as string) || null
        const events = (data.events || []).map(serializeEvent)
        const eventTypes = (data.eventTypes || []).map((t: Record<string, unknown>) => ({
          id: t.id as string,
          name: t.name as string,
          shape: t.shape as string,
          color: t.color as string,
          symbol: (t.symbol as string) || '',
          sortOrder: (t.sortOrder as number) || 0,
        }))
        const colorSettings = (data.colorSettings || []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          dayType: s.dayType as string,
          color: s.color as string,
          label: s.label as string,
          sortOrder: (s.sortOrder as number) || 0,
        }))
        const holidays = data.holidays || []
        const entities = (data.entities || []).map((e: Record<string, unknown>) => ({
          id: e.id as string,
          name: e.name as string,
          sortOrder: (e.sortOrder as number) || 0,
        }))

        set({
          isReadOnly: true,
          shareToken: token,
          sharedCalendarOwner: owner,
          sharedUsers,
          sharedCurrentUserId,
          events,
          eventTypes,
          colorSettings,
          holidays,
          entities,
        })
      }
    } catch (e) {
      console.error('Failed to fetch shared calendar:', e)
    }
  },

  switchSharedUser: async (userId) => {
    const { shareToken } = get()
    if (!shareToken) return
    await get().fetchSharedCalendar(shareToken, userId)
  },

  exitReadOnly: async () => {
    const { currentUser } = get()
    set({
      isReadOnly: false,
      shareToken: null,
      sharedCalendarOwner: null,
      sharedUsers: [],
      sharedCurrentUserId: null,
    })
    // Clean up URL - remove share parameter
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.has('share')) {
        params.delete('share')
        const newUrl = params.toString()
          ? `${window.location.pathname}?${params.toString()}`
          : window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
    // Re-fetch current user's data
    if (currentUser) {
      await get().initForUser(currentUser.id)
    }
  },

  // =====================
  // Collaboration
  // =====================
  memberships: [],

  fetchMemberships: async () => {
    try {
      const { currentUser } = get()
      if (!currentUser) return
      const res = await fetch(`/api/collaboration?userId=${currentUser.id}`)
      if (res.ok) {
        const data = await res.json()
        const rawMemberships = data.memberships || data || []
        const memberships = rawMemberships.map((m: Record<string, unknown>) => serializeMembership(m))
        set({ memberships })
      }
    } catch (e) {
      console.error('Failed to fetch memberships:', e)
    }
  },

  addMember: async (calendarUserId, memberUserId, role) => {
    try {
      const { currentUser } = get()
      if (!currentUser) return
      const res = await fetch('/api/collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarUserId,
          memberUserId,
          role,
          userId: currentUser.id,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const membership = serializeMembership(data.membership || data)
        set((s) => ({ memberships: [...s.memberships, membership] }))
      }
    } catch (e) {
      console.error('Failed to add member:', e)
    }
  },

  updateMemberRole: async (id, role) => {
    try {
      const res = await fetch('/api/collaboration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role }),
      })
      if (res.ok) {
        set((s) => ({
          memberships: s.memberships.map((m) =>
            m.id === id ? { ...m, role } : m
          ),
        }))
      }
    } catch (e) {
      console.error('Failed to update member role:', e)
    }
  },

  removeMember: async (id) => {
    try {
      const res = await fetch(`/api/collaboration?id=${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        set((s) => ({
          memberships: s.memberships.filter((m) => m.id !== id),
        }))
      }
    } catch (e) {
      console.error('Failed to remove member:', e)
    }
  },

  // =====================
  // Import dialog
  // =====================
  isImportDialogOpen: false,
  openImportDialog: () => set({ isImportDialogOpen: true }),
  closeImportDialog: () => set({ isImportDialogOpen: false }),

  // =====================
  // Export dialog
  // =====================
  isExportDialogOpen: false,
  openExportDialog: () => set({ isExportDialogOpen: true }),
  closeExportDialog: () => set({ isExportDialogOpen: false }),

  // =====================
  // Login dialog (deferred auth)
  // =====================
  isLoginDialogOpen: false,
  openLoginDialog: () => set({ isLoginDialogOpen: true }),
  closeLoginDialog: () => set({ isLoginDialogOpen: false }),

  // =====================
  // Auth state
  // =====================
  isAuthenticated: false,
  authAccount: null,

  checkAuth: async () => {
    try {
      const res = await fetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        if (data.authenticated && data.account) {
          set({
            isAuthenticated: true,
            authAccount: data.account,
          })
          // Sync users from auth account
          if (data.account.users) {
            const authUsers = data.account.users.map((u: Record<string, unknown>) => serializeUser(u))
            const { users } = get()
            // If store users are empty, set them from auth
            if (users.length === 0) {
              set({ users: authUsers })
            }
          }
        } else {
          set({ isAuthenticated: false, authAccount: null })
        }
      }
    } catch {
      set({ isAuthenticated: false, authAccount: null })
    }
  },

  login: async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (res.ok) {
        const data = await res.json()
        const account = data.account as AuthAccount
        set({ isAuthenticated: true, authAccount: account, isLoginDialogOpen: false })
        // Sync users
        if (account.users) {
          const authUsers = account.users.map((u: Record<string, unknown>) => serializeUser(u))
          set({ users: authUsers })
          // Set current user to first user if none set
          const { currentUser } = get()
          if (!currentUser && authUsers.length > 0) {
            get().setCurrentUser(authUsers[0])
            await get().initForUser(authUsers[0].id)
          }
        }
        return account
      }
      return null
    } catch {
      return null
    }
  },

  setup: async (username, password, displayName) => {
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName }),
      })
      if (res.ok) {
        const data = await res.json()
        const account = data.account as AuthAccount
        set({ isAuthenticated: true, authAccount: account, isLoginDialogOpen: false })
        // Sync users from setup
        if (account.users) {
          const authUsers = account.users.map((u: Record<string, unknown>) => serializeUser(u))
          set({ users: authUsers })
          if (authUsers.length > 0) {
            get().setCurrentUser(authUsers[0])
            await get().initForUser(authUsers[0].id)
          }
        }
        return account
      }
      return null
    } catch {
      return null
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      set({
        isAuthenticated: false,
        authAccount: null,
      })
    } catch {
      // ignore
    }
  },

  // =====================
  // Import calendar
  // =====================
  importCalendar: async (userId, fileType, content) => {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, fileType, content }),
    })
    if (res.ok) {
      const result = await res.json()
      await Promise.all([
        get().fetchEvents(),
        get().fetchEventTypes(),
      ])
      return result
    }
    const errorData = await res.json().catch(() => ({ error: 'Import failed' }))
    throw new Error(errorData.error || 'Import failed')
  },

  // =====================
  // Reorder event types
  // =====================
  reorderEventTypes: async (items) => {
    const { currentUser } = get()
    try {
      const res = await fetch('/api/settings/event-types/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, userId: currentUser?.id }),
      })
      if (res.ok) {
        set((s) => ({
          eventTypes: s.eventTypes.map((et) => {
            const item = items.find((i) => i.id === et.id)
            return item ? { ...et, sortOrder: item.sortOrder } : et
          }).sort((a, b) => a.sortOrder - b.sortOrder),
        }))
      }
    } catch (e) {
      console.error('Failed to reorder event types:', e)
    }
  },

  // =====================
  // Initialization
  // =====================
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return
    try {
      // Step 1: Check for share token in URL
      const shareToken = getShareTokenFromUrl()
      if (shareToken) {
        await get().fetchSharedCalendar(shareToken)
        set({ isInitialized: true })
        return
      }

      // Step 2: Check auth in background (non-blocking)
      get().checkAuth()

      // Step 3: Fetch all users (no auth required for reading)
      await get().fetchUsers()
      const { users } = get()

      // Step 4: If no users exist, create a default user
      if (users.length === 0) {
        await get().createUser('默认用户')
      } else {
        // Try to restore from localStorage
        const savedUserId = getSavedUserId()
        const targetUser = savedUserId
          ? users.find((u) => u.id === savedUserId)
          : null

        if (targetUser) {
          get().setCurrentUser(targetUser)
          await get().initForUser(targetUser.id)
        } else {
          // Fallback to first user
          get().setCurrentUser(users[0])
          await get().initForUser(users[0].id)
        }
      }

      set({ isInitialized: true })
    } catch (e) {
      console.error('Failed to initialize:', e)
      set({ isInitialized: true })
    }
  },

  isLoadingHolidays: false,
}))
