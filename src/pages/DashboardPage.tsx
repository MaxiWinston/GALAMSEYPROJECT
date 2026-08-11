import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AddNodeModal } from '../components/AddNodeModal'
import { SeismicMap } from '../components/SeismicMap'
import { NodeSidebar } from '../components/NodeSidebar'
import { NotificationCenter } from '../components/NotificationCenter'
import { useTelemetry } from '../context/telemetryContext'
import { classifyNetworkVibration } from '../lib/vibrationClassifier'
import type { LatLng } from '../types'

/* ── Alert colour helpers ─────────────────────────────────────── */
function alertStyles(level: string) {
  if (level === 'critical') return 'border-red-500/40 bg-red-950/30 text-red-200'
  if (level === 'elevated') return 'border-amber-500/40 bg-amber-950/25 text-amber-100'
  return 'border-teal-500/30 bg-teal-950/20 text-teal-100'
}

function alertHint(level: string) {
  if (level === 'critical') return 'Peak ≥ 2.8 mm/s — high priority'
  if (level === 'elevated') return '1.6–2.8 mm/s — investigate'
  return '< 1.6 mm/s — baseline'
}

function alertDotColor(level: string) {
  if (level === 'critical') return 'bg-red-400'
  if (level === 'elevated') return 'bg-amber-400'
  return 'bg-teal-400'
}

/* ── Connection chip label ────────────────────────────────────── */
function connectionLabel(feedMode: string, connectionStatus: string) {
  if (feedMode !== 'websocket') return 'Simulated'
  if (connectionStatus === 'connected') return 'Live'
  if (connectionStatus === 'connecting') return 'Connecting…'
  return 'Offline'
}

/* ── Floating Action Button ───────────────────────────────────── */
function FAB({ onClick }: { onClick: () => void }) {
  return (
    <button
      id="fab-add-node"
      type="button"
      onClick={onClick}
      aria-label="Add node"
      className="md:hidden relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 shadow-xl shadow-teal-900/50 transition active:scale-90"
      style={{
        position: 'fixed',
        bottom: 'calc(var(--bottom-bar-h) + var(--sab) + 80px)',
        right: '20px',
        zIndex: 460,
      }}
    >
      {/* pulse ring */}
      <span className="absolute inset-0 rounded-full bg-teal-400/30 animate-ping" style={{ animationDuration: '2s' }} />
      <svg
        className="relative h-6 w-6 text-white"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M8 3v10M3 8h10" />
      </svg>
    </button>
  )
}

/* ── Horizontal stat chip strip (mobile) ─────────────────────── */
function StatChips({
  networkMaxMag,
  alertLevel,
  feedMode,
  connectionStatus,
}: {
  networkMaxMag: number
  alertLevel: string
  feedMode: string
  connectionStatus: string
}) {
  const dotColor =
    feedMode === 'websocket'
      ? connectionStatus === 'connected'
        ? 'bg-teal-400'
        : connectionStatus === 'connecting'
          ? 'bg-amber-400 animate-pulse'
          : 'bg-red-500'
      : 'bg-zinc-500'

  return (
    <div
      className="md:hidden flex gap-2 overflow-x-auto px-4 py-2 animate-fade-in-down"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      {/* Peak vibration chip */}
      <div
        className={`flex shrink-0 flex-col rounded-2xl border px-3 py-2 text-right ${alertStyles(alertLevel)}`}
      >
        <p className="text-[9px] font-medium uppercase tracking-wider opacity-70">
          Peak vibration
        </p>
        <p className="font-mono text-base font-bold tabular-nums leading-none">
          {networkMaxMag.toFixed(3)}
        </p>
        <p className="text-[9px] opacity-75">mm/s</p>
        <p className="mt-0.5 text-[9px] capitalize opacity-60">
          {alertHint(alertLevel)}
        </p>
      </div>

      {/* Connection status chip */}
      <div
        className={`flex shrink-0 flex-col rounded-2xl border px-3 py-2 text-right transition-all duration-300 ${
          feedMode === 'websocket'
            ? connectionStatus === 'connected'
              ? 'border-teal-500/30 bg-teal-950/20 text-teal-200'
              : connectionStatus === 'connecting'
                ? 'border-amber-500/30 bg-amber-950/20 text-amber-200'
                : 'border-red-500/30 bg-red-950/20 text-red-200'
            : 'border-zinc-700/60 bg-zinc-900/50 text-zinc-300'
        }`}
      >
        <p className="text-[9px] font-medium uppercase tracking-wider text-zinc-500">
          Data source
        </p>
        <div className="flex items-center justify-end gap-1.5 mt-1">
          <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
          <p className="font-semibold tracking-tight text-sm leading-none">
            {connectionLabel(feedMode, connectionStatus)}
          </p>
        </div>
        <p className="mt-1 text-[9px] text-zinc-500">
          {feedMode === 'websocket' ? 'WebSocket gateway' : 'Local simulation'}
        </p>
      </div>

      {/* Alert level chip */}
      <div
        className={`flex shrink-0 flex-col rounded-2xl border px-3 py-2 ${alertStyles(alertLevel)}`}
      >
        <p className="text-[9px] font-medium uppercase tracking-wider opacity-70">
          Alert level
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`h-2 w-2 rounded-full ${alertDotColor(alertLevel)}`} />
          <p className="font-bold capitalize tracking-tight">{alertLevel}</p>
        </div>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const {
    nodes,
    readings,
    meshEdges,
    triangulation,
    networkMaxMag,
    alertLevel,
    feedMode,
    connectionStatus,
    addNode,
    removeNode,
  } = useTelemetry()

  const [placementMode, setPlacementMode] = useState(false)
  const [pendingLatLng, setPendingLatLng] = useState<LatLng | null>(null)

  const networkClassification = useMemo(
    () => classifyNetworkVibration(readings),
    [readings],
  )

  function handleAddNodeClick() {
    setPlacementMode(true)
    setPendingLatLng(null)
  }

  function handleMapClick(latlng: LatLng) {
    setPendingLatLng(latlng)
    setPlacementMode(false)
  }

  function handleModalConfirm(payload: Parameters<typeof addNode>[0]) {
    addNode(payload)
    setPendingLatLng(null)
  }

  function handleModalCancel() {
    setPendingLatLng(null)
    setPlacementMode(false)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900">

      {/* ══ DESKTOP header (hidden on mobile) ═══════════════════ */}
      <header className="hidden md:flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 px-5 py-4 md:px-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-500/90">
            Live mesh
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50 md:text-2xl">
            Galamsey seismic mesh
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Grid of <span className="text-zinc-400">geophones</span>: each station
            sends <span className="text-zinc-400">magnitude (mm/s)</span>,{' '}
            <span className="text-zinc-400">dominant frequency (Hz)</span>, and{' '}
            <span className="text-zinc-400">radial bearing</span> (° toward the
            source), plus optional <span className="text-zinc-400">RSSI</span>. Set{' '}
            <code className="text-zinc-400">VITE_WS_URL</code> for your gateway.
            Samples are logged on{' '}
            <NavHint />.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Add Node button (desktop) */}
          <button
            id="add-node-btn"
            type="button"
            onClick={handleAddNodeClick}
            className="flex items-center gap-2 rounded-xl border border-teal-500/40 bg-teal-950/40 px-4 py-2 text-sm font-medium text-teal-300 shadow-sm transition hover:bg-teal-900/60 hover:text-teal-100 active:scale-[0.97]"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M8 3v10M3 8h10" />
            </svg>
            Add node
          </button>

          {/* Source calibration card */}
          <div className={`rounded-2xl border px-4 py-2 text-right text-sm ${networkClassification.badgeBg} ${networkClassification.badgeBorder}`}>
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">
              Source Calibration
            </p>
            <p className={`font-mono text-base font-semibold ${networkClassification.colorClass}`}>
              {networkClassification.shortLabel}
            </p>
            <p className="text-[10px] opacity-90 mt-0.5">{networkClassification.label}</p>
            <p className="text-[10px] opacity-75">
              Confidence: <span className="font-mono font-semibold">{networkClassification.confidence}%</span>
            </p>
          </div>

          {/* Desktop stat cards */}
          <div className={`rounded-2xl border px-4 py-2 text-right text-sm ${alertStyles(alertLevel)}`}>
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">
              Peak vibration (any sensor)
            </p>
            <p className="font-mono text-lg font-semibold tabular-nums">
              {networkMaxMag.toFixed(3)}
            </p>
            <p className="text-[10px] opacity-90">mm/s — particle-velocity scalar</p>
            <p className="mt-1 text-[10px] opacity-75">
              Status: <span className="font-medium capitalize">{alertLevel}</span>
            </p>
            <p className="text-[10px] opacity-60">{alertHint(alertLevel)}</p>
          </div>

          <div
            className={`rounded-2xl border px-4 py-2 text-right text-sm transition-all duration-300 ${
              feedMode === 'websocket'
                ? connectionStatus === 'connected'
                  ? 'border-teal-500/30 bg-teal-950/20 text-teal-200'
                  : connectionStatus === 'connecting'
                    ? 'border-amber-500/30 bg-amber-950/20 text-amber-200 animate-pulse'
                    : 'border-red-500/30 bg-red-950/20 text-red-200'
                : 'border-zinc-700/60 bg-zinc-900/50 text-zinc-200'
            }`}
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Data source
            </p>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              {feedMode === 'websocket' && (
                <span className="relative flex h-2 w-2">
                  {connectionStatus === 'connected' && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                  )}
                  {connectionStatus === 'connecting' && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      connectionStatus === 'connected'
                        ? 'bg-teal-400'
                        : connectionStatus === 'connecting'
                          ? 'bg-amber-400'
                          : 'bg-red-500'
                    }`}
                  />
                </span>
              )}
              <p className="font-semibold tracking-tight">
                {feedMode === 'websocket'
                  ? connectionStatus === 'connected'
                    ? 'Live Gateway (WS)'
                    : connectionStatus === 'connecting'
                      ? 'Connecting...'
                      : 'Gateway Offline'
                  : 'Simulated Data'}
              </p>
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {feedMode === 'websocket'
                ? connectionStatus === 'connected'
                  ? 'Streaming live node telemetry'
                  : connectionStatus === 'connecting'
                    ? 'Reconnecting to stream...'
                    : 'Gateway disconnected'
                : 'Local simulation active'}
            </p>
          </div>
        </div>
      </header>

      {/* ══ MOBILE: compact title row ════════════════════════════ */}
      <div className="md:hidden flex items-center justify-between gap-3 border-b border-zinc-800/60 px-4 py-3"
        style={{ paddingTop: 'calc(0.75rem + var(--sat))' }}
      >
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-teal-500/90">
            TerraMesh · Live mesh
          </p>
          <h1 className="mt-0.5 truncate text-base font-bold tracking-tight text-zinc-50">
            Galamsey Monitor
          </h1>
        </div>
        {/* Mini connection dot & Notification Center */}
        <div className="flex items-center gap-2.5 shrink-0">
          <NotificationCenter />
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              feedMode === 'websocket'
                ? connectionStatus === 'connected'
                  ? 'bg-teal-400 animate-pulse'
                  : connectionStatus === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-red-500'
                : 'bg-zinc-500'
            }`}
          />
          <span className="text-[10px] text-zinc-400">
            {connectionLabel(feedMode, connectionStatus)}
          </span>
        </div>
      </div>

      {/* ══ MOBILE: stat chips row ════════════════════════════════ */}
      <StatChips
        networkMaxMag={networkMaxMag}
        alertLevel={alertLevel}
        feedMode={feedMode}
        connectionStatus={connectionStatus}
      />

      {/* ══ Placement mode banner ════════════════════════════════ */}
      {placementMode && (
        <div
          id="placement-banner"
          className="flex items-center justify-between gap-3 border-b border-teal-500/30 bg-teal-950/50 px-4 py-2.5 md:px-8"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />
            </span>
            <p className="text-sm font-medium text-teal-200">
              Tap the map to place your new node
            </p>
          </div>
          <button
            type="button"
            onClick={handleModalCancel}
            className="text-xs text-teal-400/70 underline-offset-2 hover:text-teal-200 hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ══ MAIN content area ════════════════════════════════════ */}
      <main className="grid min-h-0 flex-1 gap-4 p-4 md:grid-cols-[minmax(0,1fr)_320px] md:gap-5 md:p-6">

        {/* Map section */}
        <section className="relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]
          min-h-[min(72vh,720px)] md:min-h-[640px] flex-1
        ">
          {/* Map overlay badges */}
          <div className="pointer-events-none absolute left-3 top-3 z-[400] flex max-w-[min(100%,22rem)] flex-col gap-1.5 sm:flex-row sm:flex-wrap">
            <span className="pointer-events-auto rounded-full border border-zinc-700/80 bg-zinc-950/85 px-2.5 py-1 text-[10px] text-zinc-300 backdrop-blur">
              Ghana · OSM / Mapbox
            </span>
            {triangulation.estimate && (
              <span className="pointer-events-auto rounded-full border border-amber-500/40 bg-amber-950/80 px-2.5 py-1 text-[10px] leading-snug text-amber-100 backdrop-blur">
                <span className="font-medium">Fused</span> ·{' '}
                {(triangulation.confidence * 100).toFixed(0)}% confidence ·{' '}
                RMSE {triangulation.magnitudeFitRmse.toFixed(2)} mm/s
              </span>
            )}
          </div>

          <div className="relative z-0 min-h-[min(72vh,720px)] md:min-h-[640px] w-full flex-1">
            <SeismicMap
              nodes={nodes}
              readings={readings}
              meshEdges={meshEdges}
              estimate={triangulation.estimate}
              confidence={triangulation.confidence}
              magnitudeFitRmse={triangulation.magnitudeFitRmse}
              placementMode={placementMode}
              onMapClick={handleMapClick}
            />
          </div>
        </section>

        {/* Desktop sidebar (md+) */}
        <NodeSidebar
          nodes={nodes}
          readings={readings}
          estimate={triangulation.estimate}
          meshEdgeCount={meshEdges.length}
          onRemove={removeNode}
          variant="sidebar"
          networkMaxMag={networkMaxMag}
          alertLevel={alertLevel}
        />
      </main>

      {/* ══ Footer (desktop only) ════════════════════════════════ */}
      <footer className="hidden md:block border-t border-zinc-800/60 px-5 py-3 text-center text-[11px] leading-relaxed text-zinc-600 md:px-8">
        Map pin = <span className="text-zinc-500">energy-weighted fusion</span> from node
        magnitudes.{' '}
        <span className="text-zinc-500">Confidence</span> = how well a 1/d² decay matches
        those readings (0–100%).{' '}
        <span className="text-zinc-500">Fit RMSE</span> = average magnitude mismatch in
        mm/s. Production: sync clocks and use{' '}
        <span className="text-zinc-500">TDOA</span> on arrival times.
      </footer>

      {/* ══ Mobile: FAB + bottom sheet ═══════════════════════════ */}
      <FAB onClick={handleAddNodeClick} />

      <NodeSidebar
        nodes={nodes}
        readings={readings}
        estimate={triangulation.estimate}
        meshEdgeCount={meshEdges.length}
        onRemove={removeNode}
        variant="sheet"
        networkMaxMag={networkMaxMag}
        alertLevel={alertLevel}
      />

      {/* Add Node modal */}
      {pendingLatLng && (
        <AddNodeModal
          position={pendingLatLng}
          existingIds={nodes.map((n) => n.id)}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}
    </div>
  )
}

function NavHint() {
  return (
    <Link to="/data" className="text-teal-400/90 underline-offset-2 hover:underline">
      Recorded data
    </Link>
  )
}
