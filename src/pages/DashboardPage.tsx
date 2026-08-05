import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AddNodeModal } from '../components/AddNodeModal'
import { SeismicMap } from '../components/SeismicMap'
import { NodeSidebar } from '../components/NodeSidebar'
import { useTelemetry } from '../context/telemetryContext'
import type { LatLng } from '../types'

function alertStyles(level: string) {
  if (level === 'critical')
    return 'border-red-500/40 bg-red-950/30 text-red-200'
  if (level === 'elevated')
    return 'border-amber-500/40 bg-amber-950/25 text-amber-100'
  return 'border-teal-500/30 bg-teal-950/20 text-teal-100'
}

function alertHint(level: string) {
  if (level === 'critical') return 'Peak ≥ 2.8 mm/s — treat as high priority'
  if (level === 'elevated') return 'Peak 1.6–2.8 mm/s — investigate'
  return 'Peak under 1.6 mm/s — baseline band'
}

export function DashboardPage() {
  const {
    nodes,
    readings,
    meshEdges,
    triangulation,
    networkMaxMag,
    alertLevel,
    addNode,
    removeNode,
  } = useTelemetry()

  const [placementMode, setPlacementMode] = useState(false)
  const [pendingLatLng, setPendingLatLng] = useState<LatLng | null>(null)

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
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 px-5 py-4 md:px-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-500/90">
            Live mesh
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50 md:text-2xl">
            Galamsey seismic mesh
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Grid of <span className="text-zinc-400">geophones</span>: each station sends{' '}
            <span className="text-zinc-400">magnitude (mm/s)</span>,{' '}
            <span className="text-zinc-400">dominant frequency (Hz)</span>, and{' '}
            <span className="text-zinc-400">radial bearing</span> (° toward the source), plus optional{' '}
            <span className="text-zinc-400">RSSI</span>. Set{' '}
            <code className="text-zinc-400">VITE_WS_URL</code> for your gateway. Samples are logged on{' '}
            <NavHint />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Add Node button */}
          <button
            id="add-node-btn"
            type="button"
            onClick={handleAddNodeClick}
            className="flex items-center gap-2 rounded-xl border border-teal-500/40 bg-teal-950/40 px-4 py-2 text-sm font-medium text-teal-300 shadow-sm transition hover:bg-teal-900/60 hover:text-teal-100 active:scale-[0.97]"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
            Add node
          </button>

          <div
            className={`rounded-2xl border px-4 py-2 text-right text-sm ${alertStyles(alertLevel)}`}
          >
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">
              Peak vibration (any sensor)
            </p>
            <p className="font-mono text-lg font-semibold tabular-nums">{networkMaxMag.toFixed(3)}</p>
            <p className="text-[10px] opacity-90">mm/s — particle-velocity style scalar</p>
            <p className="mt-1 text-[10px] opacity-75">
              Status: <span className="font-medium capitalize">{alertLevel}</span>
            </p>
            <p className="text-[10px] opacity-60">{alertHint(alertLevel)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 px-4 py-2 text-right text-sm">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Data source</p>
            <p className="font-medium text-zinc-200">Live Firebase</p>
            <p className="text-[10px] text-zinc-500">Listening for live ESP32 node telemetry</p>
          </div>
        </div>
      </header>

      {/* Placement mode banner */}
      {placementMode && (
        <div
          id="placement-banner"
          className="flex items-center justify-between gap-3 border-b border-teal-500/30 bg-teal-950/50 px-5 py-2.5 md:px-8"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />
            </span>
            <p className="text-sm font-medium text-teal-200">
              Click anywhere on the map to place your new node
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

      <main className="grid min-h-0 flex-1 gap-4 p-4 md:grid-cols-[minmax(0,1fr)_320px] md:gap-5 md:p-6">
        <section className="relative flex min-h-[min(55vh,560px)] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
          <div className="pointer-events-none absolute left-4 top-4 z-[400] flex max-w-[min(100%,22rem)] flex-col gap-2 sm:max-w-none sm:flex-row sm:flex-wrap">
            <span className="pointer-events-auto rounded-full border border-zinc-700/80 bg-zinc-950/85 px-3 py-1 text-xs text-zinc-300 backdrop-blur">
              Basemap: Ghana · OSM (free) or Mapbox via <code className="text-zinc-400">VITE_MAPBOX_TOKEN</code>
            </span>
            {triangulation.estimate && (
              <span className="pointer-events-auto rounded-full border border-amber-500/40 bg-amber-950/80 px-3 py-1 text-xs leading-snug text-amber-100 backdrop-blur">
                <span className="font-medium">Fused source</span> · model confidence{' '}
                {(triangulation.confidence * 100).toFixed(0)}% · fit RMSE{' '}
                {triangulation.magnitudeFitRmse.toFixed(2)} mm/s
              </span>
            )}
          </div>
          <div className="relative z-0 min-h-[min(55vh,560px)] w-full flex-1">
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

        <NodeSidebar
          nodes={nodes}
          readings={readings}
          estimate={triangulation.estimate}
          meshEdgeCount={meshEdges.length}
          onRemove={removeNode}
        />
      </main>

      <footer className="border-t border-zinc-800/60 px-5 py-3 text-center text-[11px] leading-relaxed text-zinc-600 md:px-8">
        Map pin = <span className="text-zinc-500">energy-weighted fusion</span> from node magnitudes.{' '}
        <span className="text-zinc-500">Confidence</span> = how well a 1/d² decay matches those readings (0–100%).{' '}
        <span className="text-zinc-500">Fit RMSE</span> = average magnitude mismatch in mm/s. Production: sync clocks and use{' '}
        <span className="text-zinc-500">TDOA</span> on arrival times.
      </footer>

      {/* Add Node modal — appears after user picks a map location */}
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
