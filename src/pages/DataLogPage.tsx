import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTelemetry } from '../context/telemetryContext'

function formatTs(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
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
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-500/90">
              Archive
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">Recorded data</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Every live sample batch is appended with <span className="text-zinc-400">recorded time</span>{' '}
              (when the dashboard captured it) and <span className="text-zinc-400">sensor updated time</span>{' '}
              (from the message).               Current store: <span className="text-zinc-400">{logRows.length}</span> rows (cap 5,000). Data
              stays in this browser until you clear it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/"
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
            >
              ← Monitor
            </Link>
            <button
              type="button"
              onClick={exportLogCsv}
              disabled={logRows.length === 0}
              className="rounded-xl border border-teal-600/50 bg-teal-950/40 px-4 py-2 text-sm font-medium text-teal-200 hover:bg-teal-900/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                if (logRows.length === 0) return
                if (window.confirm('Clear all recorded rows from this browser?')) clearLog()
              }}
              disabled={logRows.length === 0}
              className="rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear log
            </button>
          </div>
        </header>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex max-w-md flex-1 flex-col gap-1 text-xs text-zinc-500">
            Filter
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Node id, label, or date text…"
              className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-teal-600/50 focus:outline-none focus:ring-1 focus:ring-teal-600/40"
            />
          </label>
          <p className="font-mono text-xs text-zinc-600">
            Showing {filtered.length} of {logRows.length}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
          <div className="max-h-[min(70vh,720px)] overflow-auto">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
                <tr className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="whitespace-nowrap px-3 py-3">Recorded at</th>
                  <th className="whitespace-nowrap px-3 py-3">Sensor updated</th>
                  <th className="whitespace-nowrap px-3 py-3">Geophone</th>
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
                        <span className="mt-0.5 block font-mono text-[10px] text-zinc-600">{row.nodeId}</span>
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
                        {row.fusedConfidence != null ? `${(row.fusedConfidence * 100).toFixed(0)}%` : '—'}
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
