import { useRef, useState } from 'react'
import { displayRadialBearing, distanceToEstimate } from '../lib/geo'
import type { LatLng, NodeReading, SensorNode } from '../types'

type Props = {
  nodes: SensorNode[]
  readings: Map<string, NodeReading>
  estimate: LatLng | null
  meshEdgeCount: number
  onRemove: (id: string) => void
  /** 'sheet' = mobile bottom-sheet, 'sidebar' = desktop panel (default) */
  variant?: 'sheet' | 'sidebar'
  networkMaxMag?: number
  alertLevel?: string
}

/* ── Compact node card used in both variants ──────────────────── */
function NodeCard({
  n,
  r,
  estimate,
  onRemove,
}: {
  n: SensorNode
  r: NodeReading | undefined
  estimate: LatLng | null
  onRemove: (id: string) => void
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const isOnline = r ? Date.now() - r.updatedAt < 30000 : false
  // A node is "active" only when the firmware reports vibrationDetected = true
  const isActive = isOnline && (r?.vibrationDetected ?? false)
  const mag = r?.magnitudeMmS ?? 0
  const freq = r?.frequencyHz ?? 0
  const dist = distanceToEstimate(n.position, estimate)
  const radial = displayRadialBearing(n.position, r, estimate)
  const bar = Math.min(100, (mag / 4) * 100)
  const isPendingRemove = confirmId === n.id

  const barColor =
    mag >= 2.8
      ? 'from-red-600 to-red-400'
      : mag >= 1.6
        ? 'from-amber-600 to-amber-400'
        : 'from-teal-600 to-amber-400'

  return (
    <li className="rounded-xl border border-zinc-800/60 bg-zinc-950/50 px-3 py-3 transition hover:border-zinc-700 active:border-zinc-600">
      {/* Row 1: status + label + remove */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                isActive
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
                  : isOnline
                    ? 'bg-zinc-400'
                    : 'bg-zinc-600'
              }`}
              title={
                isActive ? 'Vibration detected' : isOnline ? 'Online — no vibration' : 'No telemetry in 30s'
              }
            />
            <p className="truncate text-sm font-semibold text-zinc-100">{n.label}</p>
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
            Geophone ·{' '}
            <span
              className={
                isActive
                  ? 'font-semibold text-emerald-400'
                  : isOnline
                    ? 'text-zinc-400'
                    : 'text-zinc-600'
              }
            >
              {isActive ? 'vibrating' : isOnline ? 'online' : 'offline'}
            </span>
          </p>
          {radial != null && (
            <p className="mt-1 font-mono text-[10px] text-cyan-400/90">
              Radial {radial.toFixed(1)}°{' '}
              <span className="text-zinc-600">from N</span>
            </p>
          )}
        </div>

        {/* Right column: distance badge + remove btn */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {dist != null && (
            <span
              className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-right font-mono text-[10px] leading-tight text-amber-400"
              title="Distance to fused pin"
            >
              {dist.toFixed(1)} km
              <br />
              <span className="text-amber-500/70">to pin</span>
            </span>
          )}
          {isPendingRemove ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
              <button
                id={`confirm-remove-${n.id}`}
                type="button"
                onClick={() => {
                  onRemove(n.id)
                  setConfirmId(null)
                }}
                className="rounded bg-red-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-red-300 ring-1 ring-red-700/60 hover:bg-red-800/70"
              >
                Confirm
              </button>
            </div>
          ) : (
            <button
              id={`remove-node-${n.id}`}
              type="button"
              title={`Remove ${n.label}`}
              onClick={() => setConfirmId(n.id)}
              className="rounded p-1 text-zinc-700 transition hover:bg-red-950/60 hover:text-red-400 active:scale-90"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: magnitude + frequency */}
      <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Vibration
          </p>
          <p className="mt-0.5 font-mono text-teal-300">{mag.toFixed(3)} mm/s</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Frequency
          </p>
          <p className="mt-0.5 font-mono text-cyan-300">{freq.toFixed(1)} Hz</p>
        </div>
      </div>

      {/* Bar */}
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-300 ${barColor}`}
          style={{ width: `${bar}%` }}
          title={`${bar.toFixed(0)}% of 4 mm/s reference`}
        />
      </div>
    </li>
  )
}

/* ── Bottom sheet (mobile variant) ───────────────────────────── */
const SHEET_STATES = {
  collapsed: 'collapsed', // peek only
  half: 'half',           // ~50%
  full: 'full',           // full
} as const
type SheetState = typeof SHEET_STATES[keyof typeof SHEET_STATES]

function BottomSheet({
  nodes,
  readings,
  estimate,
  meshEdgeCount,
  onRemove,
  networkMaxMag = 0,
  alertLevel = 'normal',
}: Omit<Props, 'variant'>) {
  const [sheetState, setSheetState] = useState<SheetState>('collapsed')
  const dragStartY = useRef<number | null>(null)
  const dragStartState = useRef<SheetState>('collapsed')
  const sheetRef = useRef<HTMLDivElement>(null)

  const alertBadge =
    alertLevel === 'critical'
      ? 'border-red-500/40 bg-red-950/30 text-red-300'
      : alertLevel === 'elevated'
        ? 'border-amber-500/40 bg-amber-950/25 text-amber-200'
        : 'border-teal-500/30 bg-teal-950/20 text-teal-300'

  /* translate-y values per state */
  const translateY =
    sheetState === 'full'
      ? '0%'
      : sheetState === 'half'
        ? '48%'
        : 'calc(100% - 108px)' // peek height

  /* ── drag gesture ── */
  function onPointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY
    dragStartState.current = sheetState
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragStartY.current === null) return
    const dy = e.clientY - dragStartY.current
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none'
      const baseTranslate =
        dragStartState.current === 'full'
          ? 0
          : dragStartState.current === 'half'
            ? sheetRef.current.offsetHeight * 0.48
            : sheetRef.current.offsetHeight - 108
      const clamped = Math.max(0, baseTranslate + dy)
      sheetRef.current.style.transform = `translateY(${clamped}px)`
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (dragStartY.current === null) return
    const dy = e.clientY - dragStartY.current
    dragStartY.current = null
    if (sheetRef.current) {
      sheetRef.current.style.transition = ''
      sheetRef.current.style.transform = ''
    }
    // snap decision
    if (dy < -60) {
      setSheetState(dragStartState.current === 'collapsed' ? 'half' : 'full')
    } else if (dy > 60) {
      setSheetState(dragStartState.current === 'full' ? 'half' : 'collapsed')
    }
    // else no change (snap back)
  }

  function cycleSheet() {
    setSheetState((s) =>
      s === 'collapsed' ? 'half' : s === 'half' ? 'full' : 'collapsed',
    )
  }

  return (
    <div
      id="node-bottom-sheet"
      ref={sheetRef}
      className="md:hidden fixed inset-x-0 bottom-0 z-[450] flex flex-col rounded-t-3xl border-t border-zinc-800/80 bg-zinc-950/95 shadow-[0_-8px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl"
      style={{
        transform: `translateY(${translateY})`,
        transition: 'transform 380ms cubic-bezier(0.16,1,0.3,1)',
        height: '88vh',
        paddingBottom: 'calc(var(--bottom-bar-h) + var(--sab))',
        willChange: 'transform',
      }}
    >
      {/* Drag handle area */}
      <div
        className="flex cursor-grab flex-col items-center pt-3 pb-1 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={cycleSheet}
        aria-label="Toggle node panel"
        role="button"
      >
        <div className="drag-handle" />
      </div>

      {/* Peek summary row (always visible) */}
      <div className="flex items-center justify-between gap-3 px-4 pb-2">
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-4 w-4 text-teal-400"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          <span className="text-sm font-semibold text-zinc-200">
            {nodes.length} Geophone{nodes.length !== 1 ? 's' : ''}
          </span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-teal-400">
            {meshEdgeCount} links
          </span>
        </div>
        <span
          className={`rounded-xl border px-3 py-1 font-mono text-xs font-semibold ${alertBadge}`}
        >
          {networkMaxMag.toFixed(3)} mm/s
        </span>
      </div>

      {/* Scrollable node list */}
      <ul className="flex flex-col gap-2 overflow-y-auto px-4 pb-2 pt-1">
        {nodes.length === 0 && (
          <li className="py-10 text-center text-sm text-zinc-600">
            No geophones yet. Tap{' '}
            <span className="font-semibold text-teal-400">+</span> to add one.
          </li>
        )}
        {nodes.map((n) => (
          <NodeCard
            key={n.id}
            n={n}
            r={readings.get(n.id)}
            estimate={estimate}
            onRemove={onRemove}
          />
        ))}
      </ul>
    </div>
  )
}

/* ── Desktop sidebar (unchanged) ──────────────────────────────── */
function Sidebar({
  nodes,
  readings,
  estimate,
  meshEdgeCount,
  onRemove,
}: Omit<Props, 'variant' | 'networkMaxMag' | 'alertLevel'>) {
  return (
    <aside className="hidden md:flex max-h-none flex-col gap-3 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Geophones
        </h2>
        <span className="max-w-[10rem] rounded-full bg-zinc-800 px-2 py-0.5 text-right font-mono text-[10px] leading-tight text-teal-400">
          {meshEdgeCount} mesh links
        </span>
      </div>
      <p className="text-[10px] leading-relaxed text-zinc-600">
        Each station is a{' '}
        <span className="text-zinc-500">geophone</span> reporting magnitude,
        frequency, and{' '}
        <span className="text-zinc-500">radial bearing</span> (° from north
        toward the source). Teal rays on the map point from each geophone to
        the fused estimate.
      </p>
      <ul className="flex flex-col gap-2 overflow-y-auto pr-1">
        {nodes.map((n) => (
          <NodeCard
            key={n.id}
            n={n}
            r={readings.get(n.id)}
            estimate={estimate}
            onRemove={onRemove}
          />
        ))}
      </ul>
    </aside>
  )
}

/* ── Public export ────────────────────────────────────────────── */
export function NodeSidebar({
  nodes,
  readings,
  estimate,
  meshEdgeCount,
  onRemove,
  variant = 'sidebar',
  networkMaxMag,
  alertLevel,
}: Props) {
  return (
    <>
      {/* Mobile bottom sheet */}
      <BottomSheet
        nodes={nodes}
        readings={readings}
        estimate={estimate}
        meshEdgeCount={meshEdgeCount}
        onRemove={onRemove}
        networkMaxMag={networkMaxMag}
        alertLevel={alertLevel}
      />
      {/* Desktop sidebar */}
      {variant === 'sidebar' && (
        <Sidebar
          nodes={nodes}
          readings={readings}
          estimate={estimate}
          meshEdgeCount={meshEdgeCount}
          onRemove={onRemove}
        />
      )}
    </>
  )
}
