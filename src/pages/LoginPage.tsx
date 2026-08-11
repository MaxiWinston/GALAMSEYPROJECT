import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signInWithEmail } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }

    setLoading(true)
    try {
      await signInWithEmail(email, password)
      navigate('/')
    } catch (err: any) {
      console.error(err)
      let msg = 'An unexpected error occurred.'
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        msg = 'Invalid email or password.'
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.'
      } else if (err.message) {
        msg = err.message
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-zinc-950 px-4"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
    >
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/10 blur-[90px]" />
      <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-500/10 blur-[90px]" />

      <div className="relative z-10 w-full max-w-md animate-slide-up rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Brand badge */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-950/40 px-3 py-1.5">
            {/* Waveform icon */}
            <svg viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4 text-teal-400">
              <path d="M1 7h2.5l2-6L8 13l2.5-8L13 7h1.5l2-3L18 7h1" />
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-teal-400">
              TerraMesh System
            </span>
          </span>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
            Seismic Monitoring Portal
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Authorised personnel only. Sign in to continue.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
          {/* Email */}
          <div>
            <label
              htmlFor="login-email"
              className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400"
            >
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="engineer@terramesh.net"
              disabled={loading}
              className="mt-2 w-full rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 disabled:opacity-50"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="login-password"
              className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400"
            >
              Password
            </label>
            <div className="relative mt-2">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/50 py-3 pl-4 pr-11 text-zinc-200 placeholder-zinc-700 outline-none transition focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 disabled:opacity-50"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500 hover:text-zinc-300 transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
                    <path d="M3 3l14 14M12.5 12.6a4 4 0 01-5.1-5.1M8 5.4A4 4 0 0114.6 12M1.5 10S4 5 10 5M10 5c1.5 0 2.9.4 4 1.1M18.5 10S16 15 10 15c-1.5 0-2.9-.4-4-1.1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
                    <ellipse cx="10" cy="10" rx="9" ry="6" />
                    <circle cx="10" cy="10" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-950/20 px-4 py-3 animate-slide-up">
              <div className="flex gap-2.5">
                <svg className="h-4 w-4 shrink-0 mt-0.5 text-red-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="8" cy="8" r="7" />
                  <path d="M8 5v4M8 11.5h.01" />
                </svg>
                <p className="text-xs text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-3.5 text-sm font-semibold tracking-wide text-zinc-950 shadow-md transition hover:bg-teal-400 active:scale-[0.98] disabled:opacity-50 min-h-[52px]"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin text-zinc-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle className="opacity-25" cx="12" cy="12" r="10" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Signing in…</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Disclaimer */}
        <p className="mt-6 text-center text-[11px] text-zinc-600">
          This system monitors seismic activity related to galamsey operations.
          Unauthorised access is strictly prohibited.
        </p>
      </div>
    </div>
  )
}
