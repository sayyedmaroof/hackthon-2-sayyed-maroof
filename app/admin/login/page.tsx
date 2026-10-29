'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        setError(data?.error ?? 'Sign-in failed. Please try again.')
        return
      }
      toast.success('Welcome back, admin.')
      router.replace('/admin')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-20">
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sapphire text-ice">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <h1 className="font-serif text-3xl text-ink">Admin sign-in</h1>
        <p className="mt-1 text-sm text-mist">
          Restricted to ScentBuild Studio staff.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Email
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@scentbuild.app"
              className="w-full rounded-xl border border-input bg-white py-2.5 pl-10 pr-3 text-sm text-ink outline-none focus:border-azure"
            />
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Password
          <span className="relative block">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-input bg-white py-2.5 pl-10 pr-3 text-sm text-ink outline-none focus:border-azure"
            />
          </span>
        </label>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-sapphire py-2.5 text-sm font-semibold text-ice transition hover:bg-sapphire-mid disabled:opacity-60"
        >
          <KeyRound className="h-4 w-4" />
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-xs text-mist">
        Not an admin? <Link href="/" className="underline hover:text-ink">Back to store</Link>
      </p>
    </div>
  )
}
