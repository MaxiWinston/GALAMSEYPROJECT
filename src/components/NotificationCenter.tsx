import { useState, useEffect } from 'react'
import { useNotifications } from '../context/NotificationContext'

function formatTimeAgo(timestamp: number) {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000)
  if (diffSec < 10) return 'Just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  return `${diffHr}h ago`
}

function threatBadge(level: string) {
  if (level === 'critical') return 'bg-red-950/80 border-red-500/50 text-red-300'
  if (level === 'high') return 'bg-rose-950/60 border-rose-500/40 text-rose-300'
  if (level === 'medium') return 'bg-amber-950/60 border-amber-500/40 text-amber-300'
  return 'bg-teal-950/50 border-teal-500/30 text-teal-300'
}

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    browserAlertsEnabled,
    requestBrowserPermission,
    markAsRead,
    markAllAsRead,
    clearAll,
    triggerTestNotification,
  } = useNotifications()

  const [isOpen, setIsOpen] = useState(false)
  const [toast, setToast] = useState<typeof notifications[number] | null>(null)

  // Show floating toast whenever a new unread critical/high notification arrives
  useEffect(() => {
    if (notifications.length > 0 && !notifications[0].read) {
      const newest = notifications[0]
      if (newest.threatLevel === 'critical' || newest.threatLevel === 'high' || newest.threatLevel === 'medium') {
        setToast(newest)
        const t = setTimeout(() => setToast(null), 6000)
        return () => clearTimeout(t)
      }
    }
  }, [notifications])

  return (
    <div className="relative">
      {/* ── Bell Trigger Button ───────────────────────────────────────── */}
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => {
          setIsOpen((prev) => !prev)
          if (!isOpen && unreadCount > 0) markAllAsRead()
        }}
        className="relative flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 active:scale-95"
        title="Seismic Notifications"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[1.1rem] items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Slide-out Notification Drawer / Dropdown ──────────────────── */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[550]" onClick={() => setIsOpen(false)} />

          <div
            id="notification-dropdown"
            className="absolute right-0 top-12 z-[560] w-[min(90vw,24rem)] rounded-2xl border border-zinc-700/80 bg-zinc-950/95 shadow-2xl backdrop-blur-xl animate-slide-up"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-100">Alert Center</span>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                  {notifications.length} total
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Sound Toggle */}
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`rounded-lg p-1.5 text-xs transition ${
                    soundEnabled ? 'bg-teal-950/60 text-teal-300' : 'bg-zinc-800/60 text-zinc-500'
                  }`}
                  title={soundEnabled ? 'Mute alarm sound' : 'Unmute alarm sound'}
                >
                  {soundEnabled ? '🔊' : '🔇'}
                </button>
                {/* Clear All */}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-[11px] text-zinc-500 hover:text-red-400 hover:underline px-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Browser Permission Banner */}
            {!browserAlertsEnabled && (
              <div className="flex items-center justify-between border-b border-zinc-800/60 bg-amber-950/30 px-4 py-2.5 text-xs">
                <span className="text-amber-200/90 text-[11px]">Enable desktop push notifications?</span>
                <button
                  type="button"
                  onClick={requestBrowserPermission}
                  className="rounded bg-amber-500/20 px-2.5 py-1 font-medium text-amber-200 text-[10px] hover:bg-amber-500/30"
                >
                  Enable
                </button>
              </div>
            )}

            {/* Notification List */}
            <div className="max-h-[22rem] overflow-y-auto divide-y divide-zinc-900 px-1 py-1">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-xs text-zinc-500">
                  No seismic alerts recorded yet.
                  <button
                    type="button"
                    onClick={triggerTestNotification}
                    className="mt-3 block mx-auto rounded-lg border border-teal-500/30 bg-teal-950/40 px-3 py-1.5 text-xs text-teal-300 hover:bg-teal-900/50"
                  >
                    Test Alert Trigger 🚨
                  </button>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={`flex flex-col gap-1.5 p-3 text-xs transition cursor-pointer hover:bg-zinc-900/60 ${
                      !n.read ? 'bg-zinc-900/40 font-medium' : 'opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${threatBadge(n.threatLevel)}`}>
                        {n.classificationLabel}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-500">{formatTimeAgo(n.timestamp)}</span>
                    </div>

                    <p className="text-zinc-200 leading-snug">{n.message}</p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-0.5">
                      <span>Node: {n.nodeLabel || n.nodeId}</span>
                      <span className="text-teal-400 font-semibold">{n.magnitudeMmS.toFixed(3)} mm/s</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Floating Alert Toast Banner ─────────────────────────────────── */}
      {toast && (
        <div className="fixed top-4 right-4 z-[700] max-w-sm rounded-2xl border border-red-500/60 bg-red-950/90 p-4 shadow-[0_8px_30px_rgba(239,68,68,0.4)] backdrop-blur-xl animate-bounce-short">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚨</span>
              <div>
                <h4 className="font-bold text-red-100 text-sm">{toast.classificationLabel}</h4>
                <p className="text-[11px] text-red-200/90 mt-0.5">{toast.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-red-300 hover:text-white text-xs font-bold p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
