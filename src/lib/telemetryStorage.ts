import type { TelemetryLogRow } from '../types'

const LS_KEY = 'terramesh_telemetry_v1'
const MAX_ROWS = 5000

export function loadTelemetryLog(): TelemetryLogRow[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as TelemetryLogRow[]
  } catch {
    return []
  }
}

export function saveTelemetryLog(rows: TelemetryLogRow[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rows.slice(0, MAX_ROWS)))
  } catch {
    /* quota or private mode */
  }
}

export function clearTelemetryLogStorage() {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    /* ignore */
  }
}

export { MAX_ROWS }
