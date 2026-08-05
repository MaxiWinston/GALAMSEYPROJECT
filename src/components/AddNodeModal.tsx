import { useEffect, useId, useRef, useState } from 'react'
import type { AddNodePayload } from '../hooks/useNodeRegistry'
import type { LatLng } from '../types'

type Props = {
  position: LatLng
  existingIds: string[]
  onConfirm: (payload: AddNodePayload) => void
  onCancel: () => void
}

function formatLatLng([lat, lng]: LatLng) {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(5)}°${ns}, ${Math.abs(lng).toFixed(5)}°${ew}`
}

export function AddNodeModal({ position, existingIds, onConfirm, onCancel }: Props) {
  const baseId = useId()
  const labelRef = useRef<HTMLInputElement>(null)

  // Suggest next sequential ID
  const suggestId = () => {
    let i = existingIds.length + 1
    while (existingIds.includes(`n${i}`)) i++
    return `n${i}`
  }

  const [nodeId, setNodeId] = useState(suggestId)
  const [label, setLabel] = useState(`GEO-Node-${existingIds.length + 1}`)
  const [idError, setIdError] = useState('')

  // Auto-focus label on open
  useEffect(() => {
    labelRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  function validate() {
    if (!nodeId.trim()) { setIdError('Node ID is required.'); return false }
    if (existingIds.includes(nodeId.trim())) { setIdError('This ID is already in use.'); return false }
    setIdError('')
    return true
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    onConfirm({ id: nodeId.trim(), label: label.trim() || nodeId.trim(), position })
  }

  return (
    /* Backdrop */
    <div
      id={`${baseId}-backdrop`}
      className="fixed inset-0 z-[600] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-title`}
        className="animate-slide-up w-full max-w-md rounded-t-3xl border border-zinc-700/70 bg-zinc-900 shadow-2xl sm:rounded-3xl"
        style={{ animationDuration: '220ms' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 px-6 pt-6 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-500/90">
              New node
            </p>
            <h2 id={`${baseId}-title`} className="mt-1 text-lg font-semibold text-zinc-50">
              Connect geophone
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Placement: <span className="font-mono text-zinc-300">{formatLatLng(position)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="mt-0.5 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Label */}
          <div>
            <label
              htmlFor={`${baseId}-label`}
              className="mb-1.5 block text-xs font-medium text-zinc-400"
            >
              Display label
            </label>
            <input
              ref={labelRef}
              id={`${baseId}-label`}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. GEO-Node-3"
              className="w-full rounded-xl border border-zinc-700/80 bg-zinc-800/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-teal-500/70 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {/* Node ID */}
          <div>
            <label
              htmlFor={`${baseId}-id`}
              className="mb-1.5 block text-xs font-medium text-zinc-400"
            >
              Node ID <span className="text-zinc-600">(must match your firmware config)</span>
            </label>
            <input
              id={`${baseId}-id`}
              type="text"
              value={nodeId}
              onChange={(e) => { setNodeId(e.target.value); setIdError('') }}
              placeholder="e.g. n3"
              className={`w-full rounded-xl border bg-zinc-800/60 px-3.5 py-2.5 font-mono text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:ring-2 ${
                idError
                  ? 'border-red-500/70 focus:border-red-500/70 focus:ring-red-500/20'
                  : 'border-zinc-700/80 focus:border-teal-500/70 focus:ring-teal-500/20'
              }`}
            />
            {idError && (
              <p className="mt-1.5 text-[11px] text-red-400">{idError}</p>
            )}
          </div>

          {/* Coordinates (read-only) */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-zinc-400">GPS position</p>
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-800/30 px-3.5 py-2.5">
                <p className="text-[10px] text-zinc-600">Latitude</p>
                <p className="font-mono text-sm text-zinc-300">{position[0].toFixed(5)}</p>
              </div>
              <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-800/30 px-3.5 py-2.5">
                <p className="text-[10px] text-zinc-600">Longitude</p>
                <p className="font-mono text-sm text-zinc-300">{position[1].toFixed(5)}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-zinc-700/80 bg-zinc-800/60 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700/60 hover:text-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/40 transition hover:bg-teal-500 active:scale-[0.98]"
            >
              Connect node
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
