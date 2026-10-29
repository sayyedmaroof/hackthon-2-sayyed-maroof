'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

export interface AuthUser {
  id: string
  email: string
  name: string
}

export type AuthStatus = 'loading' | 'authed' | 'guest'

interface AuthResult {
  ok: boolean
  error?: string
}

interface AuthContextValue {
  user: AuthUser | null
  status: AuthStatus
  /** Runs the action right away when signed in; otherwise asks to sign in and runs it after. */
  requireAuth: (action: () => void) => void
  promptOpen: boolean
  promptMode: 'login' | 'signup'
  openPrompt: (mode?: 'login' | 'signup') => void
  closePrompt: () => void
  login: (email: string, password: string) => Promise<AuthResult>
  signup: (name: string, email: string, password: string) => Promise<AuthResult>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function postJson(url: string, body: Record<string, unknown>): Promise<{ ok: boolean; error?: string; user?: AuthUser }> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await response.json().catch(() => ({}))) as { user?: AuthUser; error?: string }
    if (!response.ok) return { ok: false, error: data.error ?? 'Something went wrong. Try again.' }
    return { ok: true, user: data.user }
  } catch {
    return { ok: false, error: 'Cannot reach the server. Try again.' }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [promptOpen, setPromptOpen] = useState(false)
  const [promptMode, setPromptMode] = useState<'login' | 'signup'>('login')

  const pendingAction = useRef<(() => void) | null>(null)

  // Restore the session (if any) on mount.
  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { user: AuthUser | null }) => {
        if (cancelled) return
        setUser(data.user)
        setStatus(data.user ? 'authed' : 'guest')
      })
      .catch(() => {
        if (!cancelled) setStatus('guest')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openPrompt = useCallback((mode: 'login' | 'signup' = 'login') => {
    setPromptMode(mode)
    setPromptOpen(true)
  }, [])

  const closePrompt = useCallback(() => {
    setPromptOpen(false)
    pendingAction.current = null
  }, [])

  // Require a session before running a protected action (e.g. add to cart).
  const requireAuth = useCallback(
    (action: () => void) => {
      if (status === 'authed') {
        action()
        return
      }
      pendingAction.current = action
      openPrompt('signup')
    },
    [status, openPrompt],
  )

  const finishAuth = useCallback((nextUser: AuthUser | null, runPending: boolean) => {
    setUser(nextUser)
    setStatus(nextUser ? 'authed' : 'guest')
    if (nextUser) {
      setPromptOpen(false)
      if (runPending) {
        const action = pendingAction.current
        pendingAction.current = null
        action?.()
      }
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await postJson('/api/auth/login', { email, password })
      if (result.ok) finishAuth(result.user ?? null, true)
      return { ok: result.ok, error: result.error }
    },
    [finishAuth],
  )

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await postJson('/api/auth/signup', { name, email, password })
      if (result.ok) finishAuth(result.user ?? null, true)
      return { ok: result.ok, error: result.error }
    },
    [finishAuth],
  )

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Even if the request fails, drop the local session state.
    }
    setUser(null)
    setStatus('guest')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      requireAuth,
      promptOpen,
      promptMode,
      openPrompt,
      closePrompt,
      login,
      signup,
      logout,
    }),
    [user, status, requireAuth, promptOpen, promptMode, openPrompt, closePrompt, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
