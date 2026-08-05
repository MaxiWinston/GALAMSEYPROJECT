import { createContext, useContext } from 'react'
import type { MeshEdge, NodeReading, SensorNode, TelemetryLogRow, TriangulationResult } from '../types'
import type { AddNodePayload } from '../hooks/useNodeRegistry'

type FeedMode = 'websocket' | 'simulated'

export type TelemetryContextValue = {
  nodes: SensorNode[]
  readings: Map<string, NodeReading>
  meshEdges: MeshEdge[]
  triangulation: TriangulationResult
  networkMaxMag: number
  alertLevel: string
  feedMode: FeedMode
  logRows: TelemetryLogRow[]
  clearLog: () => void
  exportLogCsv: () => void
  addNode: (payload: AddNodePayload) => void
  removeNode: (id: string) => void
}

export const TelemetryContext = createContext<TelemetryContextValue | null>(null)

export function useTelemetry() {
  const ctx = useContext(TelemetryContext)
  if (!ctx) throw new Error('useTelemetry must be used within TelemetryProvider')
  return ctx
}
