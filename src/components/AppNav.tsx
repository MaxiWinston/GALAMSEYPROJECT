import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30'
      : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200',
  ].join(' ')

export function AppNav() {
  const { user, logOut } = useAuth()

  return (
    <nav className="sticky top-0 z-[500] border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-3 backdrop-blur-md md:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-500/90">
            TerraMesh
          </span>
          <div className="flex gap-1">
            <NavLink to="/" end className={linkClass}>
              Monitor
            </NavLink>
            <NavLink to="/data" className={linkClass}>
              Recorded data
            </NavLink>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end text-right">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Active Account</span>
              <span className="text-xs font-mono text-zinc-300">{user.email}</span>
            </div>
            <button
              onClick={() => logOut().catch(console.error)}
              className="rounded-lg border border-zinc-800 hover:border-red-500/30 hover:bg-red-950/10 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-red-300 transition active:scale-[0.97]"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

