import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/* ── Desktop top nav link styles ──────────────────────────────── */
const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30'
      : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200',
  ].join(' ')

/* ── Icons ────────────────────────────────────────────────────── */
function IconMonitor({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <rect x="3" y="3" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
      {/* activity blip */}
      <path d="M7 10l2.5-3 3 5 2-2.5 2 2.5" strokeWidth={active ? 2 : 1.6} />
    </svg>
  )
}

function IconData({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <rect x="3" y="3" width="18" height="4" rx="1.5" />
      <rect x="3" y="10" width="18" height="4" rx="1.5" />
      <rect x="3" y="17" width="18" height="4" rx="1.5" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
    </svg>
  )
}

/* ── Bottom Tab Bar (mobile only) ─────────────────────────────── */
function BottomTabBar() {
  const { user, logOut } = useAuth()
  const location = useLocation()
  const isMonitor = location.pathname === '/'
  const isData = location.pathname === '/data'

  return (
    <nav
      id="bottom-tab-bar"
      className="md:hidden fixed bottom-0 inset-x-0 z-[500] border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md"
      style={{ paddingBottom: 'var(--sab)' }}
    >
      <div className="flex items-stretch">
        {/* Monitor tab */}
        <NavLink
          to="/"
          end
          id="tab-monitor"
          className="tab-item flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-colors"
          style={{ color: isMonitor ? 'rgb(94 234 212)' : 'rgb(113 113 122)' }}
        >
          <span
            className="transition-transform duration-150"
            style={{ transform: isMonitor ? 'scale(1.12)' : 'scale(1)' }}
          >
            <IconMonitor active={isMonitor} />
          </span>
          <span className="text-[10px] font-semibold tracking-wide">Monitor</span>
          {isMonitor && (
            <span className="absolute bottom-[calc(var(--sab)+0px)] w-8 h-0.5 rounded-full bg-teal-400" />
          )}
        </NavLink>

        {/* Data Log tab */}
        <NavLink
          to="/data"
          id="tab-data"
          className="tab-item flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-colors"
          style={{ color: isData ? 'rgb(94 234 212)' : 'rgb(113 113 122)' }}
        >
          <span
            className="transition-transform duration-150"
            style={{ transform: isData ? 'scale(1.12)' : 'scale(1)' }}
          >
            <IconData active={isData} />
          </span>
          <span className="text-[10px] font-semibold tracking-wide">Data Log</span>
          {isData && (
            <span className="absolute bottom-[calc(var(--sab)+0px)] w-8 h-0.5 rounded-full bg-teal-400" />
          )}
        </NavLink>

        {/* Account / Sign-out tab */}
        {user && (
          <button
            id="tab-account"
            type="button"
            onClick={() => logOut().catch(console.error)}
            className="tab-item flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-zinc-500 transition-colors active:text-red-400"
          >
            <IconUser />
            <span className="text-[10px] font-semibold tracking-wide max-w-[72px] truncate">
              {user.email?.split('@')[0] ?? 'Account'}
            </span>
          </button>
        )}
      </div>
    </nav>
  )
}

/* ── Main AppNav component ────────────────────────────────────── */
export function AppNav() {
  const { user, logOut } = useAuth()

  return (
    <>
      {/* ── Desktop / tablet top nav (hidden on mobile) ── */}
      <nav className="hidden md:block sticky top-0 z-[500] border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-3 backdrop-blur-md md:px-8">
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
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Active Account
                </span>
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

      {/* ── Mobile bottom tab bar ── */}
      <BottomTabBar />
    </>
  )
}
