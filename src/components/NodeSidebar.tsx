import { useState } from 'react'
import { displayRadialBearing, distanceToEstimate } from '../lib/geo'
import type { LatLng, NodeReading, SensorNode } from '../types'

type Props = {
  nodes: SensorNode[]
  readings: Map<string, NodeReading>
  estimate: LatLng | null
  meshEdgeCount: number
  onRemove: (id: string) => void
}

export function NodeSidebar({ nodes, readings, estimate, meshEdgeCount, onRemove }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)

  function handleRemoveClick(id: string) {
    if (confirmId === id) {
      onRemove(id)
      setConfirmId(null)
    } else {
      setConfirmId(id)
    }
  }

  function handleCancelConfirm() {
    setConfirmId(null)
  }

  return (
    <aside className="flex max-h-[40vh] flex-col gap-3 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 backdrop-blur-md md:max-h-none">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Geophones
        </h2>
        <span
          className="max-w-[10rem] rounded-full bg-zinc-800 px-2 py-0.5 text-right font-mono text-[10px] leading-tight text-teal-400"
          title="Grid mesh links between nearest stations (visual only)"
        >
          {meshEdgeCount} mesh links
        </span>
      </div>
      <p className="text-[10px] leading-relaxed text-zinc-600">
        Each station is a <span className="text-zinc-500">geophone</span> reporting magnitude, frequency, and{' '}
        <span className="text-zinc-500">radial bearing</span> (° from north toward the source). Teal rays on the map
        point from each geophone to the fused estimate.
      </p>
      <ul className="flex flex-col gap-2 overflow-y-auto pr-1">
        {nodes.map((n) => {
          const r = readings.get(n.id)
          const isOnline = r ? Date.now() - r.updatedAt < 30000 : false
          const mag = r?.magnitudeMmS ?? 0
          const freq = r?.frequencyHz ?? 0
          const dist = distanceToEstimate(n.position, estimate)
          const radial = displayRadialBearing(n.position, r, estimate)
          const bar = Math.min(100, (mag / 4) * 100)
          const isPendingRemove = confirmId === n.id

          return (
            <li
              key={n.id}
              className="rounded-xl border border-zinc-800/60 bg-zinc-950/50 px-3 py-2.5 transition hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-zinc-600'}`}
                      title={isOnline ? 'Node is actively streaming telemetry' : 'No telemetry received in the last 30s'}
                    />
                    <p className="text-sm font-medium text-zinc-100">{n.label}</p>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
                    Geophone · ESP32 link · <span className={isOnline ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}>{isOnline ? 'online' : 'offline'}</span>
                  </p>
                  {radial != null ? (
                    <p className="mt-1 font-mono text-[10px] text-cyan-400/90">
                      Radial {radial.toFixed(1)}° <span className="text-zinc-600">from N</span>
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {dist != null && (
                    <span
                      className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-right font-mono text-[10px] leading-tight text-amber-400"
                      title="Great-circle distance from this sensor to the amber fused pin on the map"
                    >
                      {dist.toFixed(1)} km
                      <br />
                      <span className="text-amber-500/80">to fused pin</span>
                    </span>
                  )}
                  {/* Remove button — first click prompts, second click confirms */}
                  {isPendingRemove ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleCancelConfirm}
                        className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300"
                      >
                        Cancel
                      </button>
                      <button
                        id={`confirm-remove-${n.id}`}
                        type="button"
                        onClick={() => handleRemoveClick(n.id)}
                        className="rounded bg-red-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-red-300 ring-1 ring-red-700/60 hover:bg-red-800/70 hover:text-red-100"
                      >
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <button
                      id={`remove-node-${n.id}`}
                      type="button"
                      title={`Remove ${n.label}`}
                      onClick={() => handleRemoveClick(n.id)}
                      className="rounded p-0.5 text-zinc-700 transition hover:bg-red-950/60 hover:text-red-400"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 3l10 10M13 3L3 13" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                    Vibration magnitude
                  </p>
                  <p className="mt-0.5 font-mono text-teal-300">{mag.toFixed(3)} mm/s</p>
                  <p className="mt-0.5 text-[10px] text-zinc-600">peak or RMS at node</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                    Dominant frequency
                  </p>
                  <p className="mt-0.5 font-mono text-cyan-300">{freq.toFixed(1)} Hz</p>
                  <p className="mt-0.5 text-[10px] text-zinc-600">e.g. FFT peak</p>
                </div>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-600 to-amber-400 transition-[width] duration-300"
                  style={{ width: `${bar}%` }}
                  title={`Relative vibration level (${bar.toFixed(0)}% of 4 mm/s reference)`}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
