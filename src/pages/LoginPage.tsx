import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signInWithEmail, signUpWithEmail } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password)
      } else {
        await signInWithEmail(email, password)
      }
      navigate('/')
    } catch (err: any) {
      console.error(err)
      let msg = 'An unexpected error occurred.'
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password.'
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email address is already in use.'
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
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-zinc-950 px-4">
      {/* Dynamic Backing Glows */}
      <div className="absolute top-1/4 left-1/4 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/10 blur-[80px]" />
      <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-500/10 blur-[80px]" />

      <div className="relative z-10 w-full max-w-md animate-slide-up rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="text-center">
          <span className="inline-block rounded-lg border border-teal-500/30 bg-teal-950/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-teal-400">
            TerraMesh System
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-100">
            Seismic Monitoring Portal
          </h2>
          <p className="mt-1.5 text-xs text-zinc-400">
            Deploy and monitor real-time ESP32 geophone networks.
          </p>
        </div>

        {/* Tab switch */}
        <div className="mt-8 flex rounded-xl bg-zinc-950/80 p-1 ring-1 ring-zinc-800/60">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false)
              setError(null)
            }}
            className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold tracking-wide transition-all ${
              !isSignUp
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true)
              setError(null)
            }}
            className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold tracking-wide transition-all ${
              isSignUp
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. engineer@terramesh.net"
              disabled={loading}
              className="mt-1.5 w-full rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="mt-1.5 w-full rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 outline-none transition focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 disabled:opacity-50"
            />
          </div>

          {isSignUp && (
            <div className="animate-slide-up">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="mt-1.5 w-full rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 outline-none transition focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 disabled:opacity-50"
              />
            </div>
          )}

          {/* Feedback display */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-950/20 px-4 py-2.5 text-xs text-red-200 animate-slide-up">
              <div className="flex gap-2">
                <svg className="h-4 w-4 shrink-0 text-red-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="8" cy="8" r="7" />
                  <path d="M8 5v4M8 11.5h.01" />
                </svg>
                <p>{error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold tracking-wide text-zinc-950 shadow-md transition hover:bg-teal-400 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <svg className="h-4 w-4 animate-spin text-zinc-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle className="opacity-25" cx="12" cy="12" r="10" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : isSignUp ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
