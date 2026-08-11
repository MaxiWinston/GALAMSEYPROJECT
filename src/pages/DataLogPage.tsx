import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTelemetry } from '../context/telemetryContext'
import { classifyVibration } from '../lib/vibrationClassifier'

function formatTs(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}

function formatTsShort(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/* ── Bar colour by magnitude ──────────────────────────────────── */
function magBarColor(mag: number) {
  if (mag >= 2.8) return 'from-red-600 to-red-400'
  if (mag >= 1.6) return 'from-amber-600 to-amber-400'
  return 'from-teal-600 to-emerald-400'
}

function magTextColor(mag: number) {
  if (mag >= 2.8) return 'text-red-300'
  if (mag >= 1.6) return 'text-amber-300'
  return 'text-teal-300'
}

/* ── Mobile row card ──────────────────────────────────────────── */
function LogCard({ row }: { row: ReturnType<typeof useTelemetry>['logRows'][number] }) {
  const bar = Math.min(100, (row.magnitudeMmS / 4) * 100)
  const classification = useMemo(
    () => classifyVibration(row.magnitudeMmS, row.frequencyHz, row.vibrationDetected),
    [row.magnitudeMmS, row.frequencyHz, row.vibrationDetected],
  )
  return (
    <li className="rounded-xl border border-zinc-800/60 bg-zinc-900/60 px-4 py-3.5 space-y-2.5 transition hover:border-zinc-700 active:border-zinc-600">
      {/* Top row: geophone name + timestamp */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                row.vibrationDetected
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)] animate-pulse'
                  : 'bg-zinc-600'
              }`}
            />
            <p className="truncate text-sm font-semibold text-zinc-100">
              {row.nodeLabel}
            </p>
            {row.vibrationDetected && (
              <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-400">
                Vibrating
              </span>
            )}
          </div>
          <p className="font-mono text-[10px] text-zinc-600">{row.nodeId}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-zinc-400">{formatTsShort(row.sampleTime)}</p>
          {row.sensorUpdatedAt !== row.sampleTime && (
            <p className="text-[9px] text-zinc-600">
              Sensor: {formatTsShort(row.sensorUpdatedAt)}
            </p>
          )}
        </div>
      </div>

      {/* Magnitude bar */}
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Vibration
          </span>
          <span className={`font-mono text-sm font-bold tabular-nums ${magTextColor(row.magnitudeMmS)}`}>
            {row.magnitudeMmS.toFixed(3)} mm/s
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ${magBarColor(row.magnitudeMmS)}`}
            style={{ width: `${bar}%` }}
          />
        </div>
      </div>

      {/* Calibrated Source Classification */}
      <div className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1 text-xs ${classification.badgeBg} ${classification.badgeBorder}`}>
        <span className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">Calibrated Source:</span>
        <span className={`text-[10px] font-semibold ${classification.badgeText}`}>
          {classification.label} ({classification.confidence}%)
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-600">
            Frequency
          </p>
          <p className="font-mono text-xs text-cyan-300 tabular-nums">
            {row.frequencyHz.toFixed(1)} Hz
          </p>
        </div>
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-600">
            Radial °
          </p>
          <p className="font-mono text-xs text-cyan-300/90 tabular-nums">
            {row.radialBearingDeg != null ? `${row.radialBearingDeg.toFixed(1)}°` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-600">
            RSSI
          </p>
          <p className="font-mono text-xs text-zinc-400 tabular-nums">
            {row.rssi != null ? `${row.rssi}` : '—'}
          </p>
        </div>
      </div>

      {/* Fused estimate (if available) */}
      {(row.fusedLat != null && row.fusedLng != null) && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-950/15 px-3 py-1.5">
          <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Fused location</p>
          <div className="text-right">
            <p className="font-mono text-[11px] text-amber-200">
              {row.fusedLat.toFixed(4)}, {row.fusedLng.toFixed(4)}
            </p>
            <p className="font-mono text-[10px] text-zinc-500">
              {row.fusedConfidence != null ? `${(row.fusedConfidence * 100).toFixed(0)}% conf` : ''}
              {row.fusedRmseMmS != null ? ` · ${row.fusedRmseMmS.toFixed(2)} RMSE` : ''}
            </p>
          </div>
        </div>
      )}
    </li>
  )
}

/* ── Search icon ──────────────────────────────────────────────── */
function SearchIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-4 w-4 text-zinc-500"
    >
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M15 15l3 3" />
    </svg>
  )
}

export function DataLogPage() {
  const { logRows, clearLog, exportLogCsv } = useTelemetry()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return logRows
    return logRows.filter(
      (r) =>
        r.nodeId.toLowerCase().includes(q) ||
        r.nodeLabel.toLowerCase().includes(q) ||
        formatTs(r.sampleTime).toLowerCase().includes(q),
    )
  }, [logRows, query])

  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 px-4 py-5 md:py-6 md:px-8"
      style={{ paddingBottom: 'calc(var(--bottom-bar-h) + var(--sab) + 1rem)' }}
    >
      <div className="mx-auto w-full max-w-[1600px]">

        {/* ── Page header ─────────────────────────────────────── */}
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-500/90">
              Archive
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
              Recorded data
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-zinc-500">
              Every sample batch is appended with{' '}
              <span className="text-zinc-400">recorded time</span> and{' '}
              <span className="text-zinc-400">sensor updated time</span>.{' '}
              Store: <span className="text-zinc-400">{logRows.length}</span> rows (cap
              5,000). Stays in this browser until cleared.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Back link (mobile only, since desktop has top nav) */}
            <Link
              to="/"
              className="md:hidden flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 active:scale-95"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5">
                <path d="M10 3L5 8l5 5" />
              </svg>
              Monitor
            </Link>
            <Link
              to="/"
              className="hidden md:flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
            >
              ← Monitor
            </Link>
            <button
              type="button"
              onClick={exportLogCsv}
              disabled={logRows.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-teal-600/50 bg-teal-950/40 px-3 py-2.5 text-sm font-medium text-teal-200 hover:bg-teal-900/40 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95 transition"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5">
                <path d="M8 2v8M5 7l3 3 3-3M3 13h10" />
              </svg>
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                if (logRows.length === 0) return
                if (window.confirm('Clear all recorded rows?')) clearLog()
              }}
              disabled={logRows.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-red-900/50 bg-red-950/20 px-3 py-2.5 text-sm font-medium text-red-200 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95 transition"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5">
                <path d="M3 4h10M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" />
              </svg>
              Clear log
            </button>
          </div>
        </header>

        {/* ── Filter bar ──────────────────────────────────────── */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex max-w-md flex-1 flex-col gap-1 text-xs text-zinc-500">
            <span className="sr-only">Filter</span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <SearchIcon />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Node id, label, or date text…"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-teal-600/50 focus:outline-none focus:ring-1 focus:ring-teal-600/40"
              />
            </div>
          </label>
          <p className="font-mono text-xs text-zinc-600">
            Showing{' '}
            <span className="text-zinc-400">{filtered.length}</span> of{' '}
            <span className="text-zinc-400">{logRows.length}</span>
          </p>
        </div>

        {/* ── MOBILE: card list ────────────────────────────────── */}
        <div className="sm:hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/30 py-20 text-center">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-12 w-12 text-zinc-700 mb-4">
                <rect x="6" y="10" width="36" height="28" rx="4" />
                <path d="M16 22h16M16 30h10" />
              </svg>
              <p className="text-sm text-zinc-500">
                {logRows.length === 0
                  ? 'No rows yet. Open Monitor and wait for samples.'
                  : 'No rows match your filter.'}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {filtered.map((row) => (
                <LogCard key={row.id} row={row} />
              ))}
            </ul>
          )}
        </div>

        {/* ── DESKTOP: table (sm+) ─────────────────────────────── */}
        <div className="hidden sm:block overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
          <div className="max-h-[min(70vh,720px)] overflow-auto">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
                <tr className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="whitespace-nowrap px-3 py-3">Recorded at</th>
                  <th className="whitespace-nowrap px-3 py-3">Sensor updated</th>
                  <th className="whitespace-nowrap px-3 py-3">Geophone</th>
                  <th className="whitespace-nowrap px-3 py-3">Vibration</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right">Radial °</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right">Mag (mm/s)</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right">Freq (Hz)</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right">RSSI</th>
                  <th className="whitespace-nowrap px-3 py-3">Fused lat, lng</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right">Conf.</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right">RMSE</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center text-zinc-500">
                      {logRows.length === 0
                        ? 'No rows yet. Open the monitor and wait for samples, or connect your WebSocket feed.'
                        : 'No rows match your filter.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-zinc-800/60 hover:bg-zinc-800/30"
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-zinc-300">
                        {formatTs(row.sampleTime)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-zinc-400">
                        {formatTs(row.sensorUpdatedAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-zinc-200">{row.nodeLabel}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-zinc-600">
                          {row.nodeId}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            row.vibrationDetected
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-900/60 text-zinc-600 border border-zinc-800'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              row.vibrationDetected ? 'bg-emerald-400' : 'bg-zinc-600'
                            }`}
                          />
                          {row.vibrationDetected ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-cyan-300/90 tabular-nums">
                        {row.radialBearingDeg != null ? `${row.radialBearingDeg.toFixed(1)}°` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-teal-300 tabular-nums">
                        {row.magnitudeMmS.toFixed(3)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-cyan-300 tabular-nums">
                        {row.frequencyHz.toFixed(1)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-zinc-400 tabular-nums">
                        {row.rssi != null ? `${row.rssi}` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-amber-200/90">
                        {row.fusedLat != null && row.fusedLng != null
                          ? `${row.fusedLat.toFixed(4)}, ${row.fusedLng.toFixed(4)}`
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-zinc-400 tabular-nums">
                        {row.fusedConfidence != null
                          ? `${(row.fusedConfidence * 100).toFixed(0)}%`
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-zinc-400 tabular-nums">
                        {row.fusedRmseMmS != null ? row.fusedRmseMmS.toFixed(2) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
