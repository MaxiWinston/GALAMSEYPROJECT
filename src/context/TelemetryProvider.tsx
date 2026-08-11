import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNodeRegistry } from '../hooks/useNodeRegistry'
import { useSeismicMesh } from '../hooks/useSeismicMesh'
import {
  clearTelemetryLogStorage,
  loadTelemetryLog,
  saveTelemetryLog,
  MAX_ROWS,
} from '../lib/telemetryStorage'
import type { TelemetryLogRow } from '../types'
import { TelemetryContext, type TelemetryContextValue } from './telemetryContext'

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const { nodes, addNode, removeNode } = useNodeRegistry()
  const mesh = useSeismicMesh({ nodes })
  const [logRows, setLogRows] = useState<TelemetryLogRow[]>(() => loadTelemetryLog())
  const batchSeq = useRef(0)

  useEffect(() => {
    const { readings, triangulation } = mesh
    if (readings.size === 0) return

    batchSeq.current += 1
    const bid = batchSeq.current
    const sampleTime = Date.now()
    const est = triangulation.estimate

    const batch: TelemetryLogRow[] = []
    for (const n of nodes) {
      if (!n.online) continue
      const r = readings.get(n.id)
      if (!r) continue
      batch.push({
        id: `${sampleTime}-${bid}-${n.id}`,
        sampleTime,
        nodeId: n.id,
        nodeLabel: n.label,
        magnitudeMmS: r.magnitudeMmS,
        frequencyHz: r.frequencyHz,
        vibrationDetected: r.vibrationDetected,
        rssi: r.rssi,
        sensorUpdatedAt: r.updatedAt,
        fusedLat: est ? est[0] : null,
        fusedLng: est ? est[1] : null,
        fusedConfidence: est ? triangulation.confidence : null,
        fusedRmseMmS: est ? triangulation.magnitudeFitRmse : null,
        radialBearingDeg: r.radialBearingDeg,
      })
    }
    if (batch.length === 0) return

    queueMicrotask(() => {
      setLogRows((prev) => [...batch, ...prev].slice(0, MAX_ROWS))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mesh object identity is unstable
  }, [mesh.readings, nodes, mesh.triangulation])

  const logRowsRef = useRef(logRows)
  logRowsRef.current = logRows

  // Throttle saving telemetry log to localStorage to avoid blocking the main thread
  useEffect(() => {
    const timer = setInterval(() => {
      saveTelemetryLog(logRowsRef.current)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const clearLog = useCallback(() => {
    setLogRows([])
    clearTelemetryLogStorage()
  }, [])

  const exportLogCsv = useCallback(() => {
    const headers = [
      'recorded_at_iso',
      'sensor_updated_at_iso',
      'node_id',
      'node_label',
      'magnitude_mm_s',
      'frequency_hz',
      'vibration_detected',
      'rssi_dbm',
      'fused_lat',
      'fused_lng',
      'fused_confidence',
      'fused_rmse_mm_s',
      'radial_bearing_deg',
    ]
    const escape = (v: string | number | boolean | null | undefined) => {
      if (v == null) return ''
      const s = String(v)
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const lines = [headers.join(',')]
    for (const row of logRows) {
      lines.push(
        [
          new Date(row.sampleTime).toISOString(),
          new Date(row.sensorUpdatedAt).toISOString(),
          row.nodeId,
          row.nodeLabel,
          row.magnitudeMmS,
          row.frequencyHz,
          row.vibrationDetected,
          row.rssi ?? '',
          row.fusedLat ?? '',
          row.fusedLng ?? '',
          row.fusedConfidence ?? '',
          row.fusedRmseMmS ?? '',
          row.radialBearingDeg ?? '',
        ]
          .map(escape)
          .join(','),
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `terramesh-telemetry-${new Date().toISOString().slice(0, 19)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [logRows])

  const value = useMemo<TelemetryContextValue>(
    () => ({
      nodes,
      readings: mesh.readings,
      meshEdges: mesh.meshEdges,
      triangulation: mesh.triangulation,
      networkMaxMag: mesh.networkMaxMag,
      alertLevel: mesh.alertLevel,
      feedMode: mesh.feedMode,
      connectionStatus: mesh.connectionStatus,
      logRows,
      clearLog,
      exportLogCsv,
      addNode,
      removeNode,
    }),
    [
      nodes,
      mesh.readings,
      mesh.meshEdges,
      mesh.triangulation,
      mesh.networkMaxMag,
      mesh.alertLevel,
      mesh.feedMode,
      mesh.connectionStatus,
      logRows,
      clearLog,
      exportLogCsv,
      addNode,
      removeNode,
    ],
  )

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>
}
