'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-store'
import { cn } from '@/lib/utils'

export function AuthDialog() {
  const { promptOpen, promptMode, closePrompt, openPrompt, login, signup, user } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Reset when the dialog is (re)opened.
  useEffect(() => {
    if (promptOpen) {
      setError(null)
      setBusy(false)
      setPassword('')
    } else {
      // allow exit animation to finish before clearing
      const timer = window.setTimeout(() => {
        setError(null)
        setBusy(false)
        setEmail('')
        setPassword('')
        setName('')
      }, 200)
      return () => window.clearTimeout(timer)
    }
  }, [promptOpen])

  const isSignup = promptMode === 'signup'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    const result = isSignup
      ? await signup(name.trim(), email.trim(), password)
      : await login(email.trim(), password)
    setBusy(false)
    if (!result.ok) {
      setError(result.error ?? 'Something went wrong. Try again.')
      return
    }
    toast.success(isSignup ? `Welcome to ScentBuild, ${(user?.name ?? 'you').split(' ')[0]}!` : 'Signed in.')
  }

  if (!promptOpen) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#051334]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={isSignup ? 'Create account' : 'Sign in'}
      onClick={closePrompt}
    >
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-[2rem] border border-border bg-card p-6 shadow-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.3em] text-azure">My account</p>
            <h2 className="mt-2 font-serif text-3xl text-ink">
              {isSignup ? 'Create your account.' : 'Welcome back.'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isSignup
                ? 'Sign up to keep your blends, cart and orders in your account.'
                : 'Sign in to sync your blends and cart across visits.'}
            </p>
          </div>
          <button
            type="button"
            onClick={closePrompt}
            aria-label="Close"
            className="rounded-full border border-border p-2 text-muted-foreground transition hover:bg-ice hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {isSignup && (
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Full name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                autoComplete="name"
                className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-azure"
              />
            </label>
          )}
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-azure"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Password</span>
            <input
              type="password"
              required
              minLength={isSignup ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? 'At least 8 characters' : '••••••••'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-azure"
            />
          </label>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-ice transition hover:bg-sapphire-mid',
              busy && 'opacity-60',
            )}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isSignup ? 'Already have an account?' : 'New to ScentBuild Studio?'}{' '}
          <button
            type="button"
            onClick={() => openPrompt(isSignup ? 'login' : 'signup')}
            className="font-medium text-azure underline-offset-4 hover:underline"
          >
            {isSignup ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  )
}
