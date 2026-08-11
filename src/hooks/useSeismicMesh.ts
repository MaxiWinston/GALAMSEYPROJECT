import { useEffect, useMemo, useRef, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { buildKnnMesh, estimateSourceFromMesh } from '../lib/geo'
import type { LatLng, MeshEdge, NodeReading, SensorNode, TriangulationResult } from '../types'

// Firebase is active when all VITE_FIREBASE_* vars are set
const FIREBASE_ENABLED =
  !!import.meta.env.VITE_FIREBASE_API_KEY &&
  !!import.meta.env.VITE_FIREBASE_DATABASE_URL

type Props = {
  nodes: SensorNode[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve the node ID from an incoming message.
 * Firmware may send either `deviceId` (preferred) or `nodeId` (legacy).
 */
function resolveDeviceId(payload: Record<string, unknown>): string | null {
  if (typeof payload.deviceId === 'string' && payload.deviceId.trim()) {
    return payload.deviceId.trim()
  }
  if (typeof payload.nodeId === 'string' && payload.nodeId.trim()) {
    return payload.nodeId.trim()
  }
  return null
}

/**
 * Coerce vibrationDetected from the wire (bool, 0/1, "true"/"false").
 * If omitted/undefined, defaults to true if magnitudeMmS >= 0.1 mm/s.
 */
function coerceBool(v: unknown, magnitudeMmS?: number): boolean {
  if (typeof v === 'boolean') return v
  if (v === 1 || v === '1' || v === 'true') return true
  if (v === 0 || v === '0' || v === 'false') return false
  if (typeof magnitudeMmS === 'number') {
    return magnitudeMmS >= 0.1
  }
  return false
}

// ── Simulation seed ───────────────────────────────────────────────────────────

const SIM_INTERVAL_MS = 1200

function buildSimReading(nodeId: string): NodeReading {
  const mag = Math.max(0, 0.3 + (Math.random() - 0.45) * 1.8)
  const freq = 15 + Math.random() * 60
  return {
    nodeId,
    magnitudeMmS: mag,
    frequencyHz: freq,
    vibrationDetected: mag >= 0.15,
    radialBearingDeg: Math.random() * 360,
    rssi: -(50 + Math.floor(Math.random() * 40)),
    updatedAt: Date.now(),
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useSeismicMesh({ nodes }: Props) {
  const [readings, setReadings] = useState<Map<string, NodeReading>>(() => new Map())
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'disconnected'
  >('disconnected')

  // Keep a stable ref so the sim interval can access current nodes without
  // re-registering on every node change
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes

  const positionById = useMemo(() => {
    const m = new Map<string, LatLng>()
    for (const n of nodes) m.set(n.id, n.position)
    return m
  }, [nodes])

  const meshEdges: MeshEdge[] = useMemo(
    () => buildKnnMesh(nodes.map((n) => n.id), positionById, 4),
    [nodes, positionById],
  )

  // ── WebSocket live feed ──────────────────────────────────────────────────────
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL
    if (!wsUrl) return

    let socket: WebSocket | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let isMounted = true
    let reconnectDelay = 1000

    function connect() {
      if (!isMounted) return
      setConnectionStatus('connecting')
      console.log(`[WebSocket] Connecting to ${wsUrl}…`)
      socket = new WebSocket(wsUrl as string)

      socket.onopen = () => {
        if (!isMounted) return
        setConnectionStatus('connected')
        reconnectDelay = 1000
        console.log('[WebSocket] Connected')
      }

      socket.onmessage = (event) => {
        if (!isMounted) return
        try {
          const raw = JSON.parse(event.data) as Record<string, unknown>

          const deviceId = resolveDeviceId(raw)
          const magnitudeMmS =
            typeof raw.magnitudeMmS === 'number' ? raw.magnitudeMmS : NaN
          const frequencyHz =
            typeof raw.frequencyHz === 'number' ? raw.frequencyHz : NaN

          if (!deviceId || isNaN(magnitudeMmS) || isNaN(frequencyHz)) {
            console.warn('[WebSocket] Skipped malformed message', raw)
            return
          }

          const reading: NodeReading = {
            nodeId: deviceId,
            magnitudeMmS,
            frequencyHz,
            vibrationDetected: coerceBool(raw.vibrationDetected, magnitudeMmS),
            radialBearingDeg:
              typeof raw.radialBearingDeg === 'number'
                ? raw.radialBearingDeg
                : undefined,
            rssi: typeof raw.rssi === 'number' ? raw.rssi : undefined,
            // Prefer updatedAt from the message if it looks like a unix-ms timestamp
            updatedAt:
              typeof raw.updatedAt === 'number' && raw.updatedAt > 1_000_000_000
                ? raw.updatedAt
                : Date.now(),
          }

          setReadings((prev) => {
            const next = new Map(prev)
            next.set(deviceId, reading)
            return next
          })
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err)
        }
      }

      socket.onclose = (event) => {
        if (!isMounted) return
        setConnectionStatus('disconnected')
        console.log(`[WebSocket] Closed: code=${event.code}`)
        reconnectTimeout = setTimeout(connect, reconnectDelay)
        reconnectDelay = Math.min(16_000, reconnectDelay * 2)
      }

      socket.onerror = (err) => {
        console.error('[WebSocket] Error:', err)
      }
    }

    connect()
    return () => {
      isMounted = false
      socket?.close()
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [])

  // ── Firebase Realtime Database listener ─────────────────────────────────────
  // Reads from both `readings/` and `nodes/` paths where ESP32 firmware posts telemetry
  useEffect(() => {
    // Skip if WebSocket is configured (takes priority)
    if (import.meta.env.VITE_WS_URL) return
    if (!FIREBASE_ENABLED) return

    const unsubscribers: (() => void)[] = []

    async function attachListeners() {
      const { db } = await import('../lib/firebase')

      const parseReading = (raw: Record<string, any>, fallbackId: string): NodeReading | null => {
        if (!raw || typeof raw !== 'object') return null
        const magnitudeMmS = typeof raw.magnitudeMmS === 'number' ? raw.magnitudeMmS : 0
        const frequencyHz = typeof raw.frequencyHz === 'number' ? raw.frequencyHz : 0
        const deviceId = (raw.deviceId ?? fallbackId).toString().trim()
        if (!deviceId) return null

        return {
          nodeId: deviceId,
          magnitudeMmS,
          frequencyHz,
          vibrationDetected: coerceBool(raw.vibrationDetected, magnitudeMmS),
          radialBearingDeg: typeof raw.radialBearingDeg === 'number' ? raw.radialBearingDeg : undefined,
          rssi: typeof raw.rssi === 'number' ? raw.rssi : undefined,
          vibrationRmsMv: typeof raw.vibrationRmsMv === 'number' ? raw.vibrationRmsMv : undefined,
          acVibrationMv: typeof raw.acVibrationMv === 'number' ? raw.acVibrationMv : undefined,
          rawSignalMv: typeof raw.rawSignalMv === 'number' ? raw.rawSignalMv : undefined,
          biasMv: typeof raw.biasMv === 'number' ? raw.biasMv : undefined,
          updatedAt:
            typeof raw.updatedAt === 'number' && raw.updatedAt > 1_000_000_000
              ? raw.updatedAt
              : Date.now(),
        }
      }

      // 1. Top-level `readings` dictionary listener (e.g. readings/n1, readings/n2)
      const readingsRef = ref(db, 'readings')
      const unsubReadings = onValue(readingsRef, (snapshot) => {
        const val = snapshot.val()
        if (!val || typeof val !== 'object') {
          setReadings(new Map())
          return
        }
        const next = new Map<string, NodeReading>()
        for (const [key, item] of Object.entries(val)) {
          if (item && typeof item === 'object') {
            const parsed = parseReading(item as Record<string, any>, key)
            if (parsed) next.set(parsed.nodeId, parsed)
          }
        }
        setReadings(next)
      })
      unsubscribers.push(unsubReadings)

      // 2. Top-level `nodes` dictionary listener (fallback path)
      const nodesRef = ref(db, 'nodes')
      const unsubNodes = onValue(nodesRef, (snapshot) => {
        const val = snapshot.val()
        if (!val || typeof val !== 'object') return
        setReadings((prev) => {
          const next = new Map(prev)
          for (const [key, item] of Object.entries(val)) {
            if (item && typeof item === 'object') {
              const parsed = parseReading(item as Record<string, any>, key)
              if (parsed) next.set(parsed.nodeId, parsed)
            }
          }
          return next
        })
      })
      unsubscribers.push(unsubNodes)

      // 3. Per-node explicit subscriptions for registered nodes
      for (const node of nodes) {
        const perNodeRef = ref(db, `readings/${node.id}`)
        const unsubPerNode = onValue(perNodeRef, (snapshot) => {
          const item = snapshot.val()
          if (item && typeof item === 'object') {
            const parsed = parseReading(item as Record<string, any>, node.id)
            if (parsed) {
              setReadings((prev) => {
                const next = new Map(prev)
                next.set(parsed.nodeId, parsed)
                return next
              })
            }
          }
        })
        unsubscribers.push(unsubPerNode)
      }
    }

    attachListeners().catch(console.error)

    return () => {
      for (const unsub of unsubscribers) unsub()
    }
  }, [nodes])

  // ── Simulated feed (no Firebase, no WebSocket) ───────────────────────────────
  useEffect(() => {
    if (import.meta.env.VITE_WS_URL || FIREBASE_ENABLED) return

    const id = setInterval(() => {
      const currentNodes = nodesRef.current
      if (currentNodes.length === 0) return
      setReadings((prev) => {
        const next = new Map(prev)
        for (const n of currentNodes) {
          next.set(n.id, buildSimReading(n.id))
        }
        return next
      })
    }, SIM_INTERVAL_MS)

    return () => clearInterval(id)
  }, [])

  // ── Triangulation ────────────────────────────────────────────────────────────
  const triangulation: TriangulationResult = useMemo(() => {
    const now = Date.now()
    const samples = nodes
      .map((n) => {
        const r = readings.get(n.id)
        if (!r) return null
        // Only use fresh readings (< 30 s) with positive vibration magnitude
        if (now - r.updatedAt > 30_000) return null
        if (r.magnitudeMmS <= 0.05) return null
        return { position: n.position, magnitude: r.magnitudeMmS }
      })
      .filter((x): x is { position: LatLng; magnitude: number } => x !== null)

    const est = estimateSourceFromMesh(samples, 0.14)
    if (!est) return { estimate: null, confidence: 0, magnitudeFitRmse: 0 }
    return {
      estimate: est.estimate,
      confidence: est.confidence,
      magnitudeFitRmse: est.magnitudeFitRmse,
    }
  }, [nodes, readings])

  // ── Network-level derived values ─────────────────────────────────────────────
  const networkMaxMag = useMemo(() => {
    let m = 0
    const now = Date.now()
    for (const r of readings.values()) {
      if (now - r.updatedAt <= 30_000 && r.magnitudeMmS > 0) {
        m = Math.max(m, r.magnitudeMmS)
      }
    }
    return m
  }, [readings])

  const alertLevel =
    networkMaxMag > 2.8 ? 'critical' : networkMaxMag > 1.6 ? 'elevated' : 'nominal'

  const feedMode: 'websocket' | 'simulated' = import.meta.env.VITE_WS_URL
    ? 'websocket'
    : FIREBASE_ENABLED
      ? 'websocket'   // Firebase also shows as "live" in the UI
      : 'simulated'

  const resolvedConnectionStatus =
    import.meta.env.VITE_WS_URL
      ? connectionStatus
      : FIREBASE_ENABLED
        ? 'connected'
        : 'disconnected'

  return {
    readings,
    meshEdges,
    triangulation,
    networkMaxMag,
    alertLevel,
    feedMode,
    connectionStatus: resolvedConnectionStatus,
  }
}
