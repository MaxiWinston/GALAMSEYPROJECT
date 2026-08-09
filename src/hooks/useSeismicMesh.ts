import { useEffect, useMemo, useState } from 'react'
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

export function useSeismicMesh({ nodes }: Props) {
  const [readings, setReadings] = useState<Map<string, NodeReading>>(() => new Map())
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')

  const positionById = useMemo(() => {
    const m = new Map<string, LatLng>()
    for (const n of nodes) m.set(n.id, n.position)
    return m
  }, [nodes])

  const meshEdges: MeshEdge[] = useMemo(
    () => buildKnnMesh(nodes.map((n) => n.id), positionById, 4),
    [nodes, positionById],
  )

  // ── WebSocket Live Telemetry Connection ────────────────────────────────────
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL
    if (!wsUrl) return

    let socket: WebSocket | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null
    let isMounted = true
    let reconnectDelay = 1000

    function connect() {
      if (!isMounted) return
      setConnectionStatus('connecting')
      console.log(`[WebSocket] Connecting to ${wsUrl}...`)
      
      socket = new WebSocket(wsUrl)

      socket.onopen = () => {
        if (!isMounted) return
        setConnectionStatus('connected')
        reconnectDelay = 1000 // Reset backoff delay on success
        console.log('[WebSocket] Connection established')
      }

      socket.onmessage = (event) => {
        if (!isMounted) return
        try {
          const reading = JSON.parse(event.data) as {
            nodeId: string
            magnitudeMmS: number
            frequencyHz: number
            radialBearingDeg?: number
            rssi?: number
            updatedAt?: number
          }

          if (
            reading &&
            typeof reading.nodeId === 'string' &&
            typeof reading.magnitudeMmS === 'number' &&
            typeof reading.frequencyHz === 'number'
          ) {
            setReadings((prev) => {
              const next = new Map(prev)
              next.set(reading.nodeId, {
                nodeId: reading.nodeId,
                magnitudeMmS: reading.magnitudeMmS,
                frequencyHz: reading.frequencyHz,
                radialBearingDeg: reading.radialBearingDeg,
                rssi: reading.rssi,
                updatedAt: Date.now(),
              })
              return next
            })
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err)
        }
      }

      socket.onclose = (event) => {
        if (!isMounted) return
        setConnectionStatus('disconnected')
        console.log(`[WebSocket] Connection closed: code=${event.code}, reason=${event.reason}`)
        
        // Reconnect with exponential backoff capped at 16 seconds
        reconnectTimeout = setTimeout(() => {
          connect()
        }, reconnectDelay)
        reconnectDelay = Math.min(16000, reconnectDelay * 2)
      }

      socket.onerror = (err) => {
        console.error('[WebSocket] Error occurred:', err)
      }
    }

    connect()

    return () => {
      isMounted = false
      if (socket) {
        socket.close()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [])

  // ── Scoped per-node onValue Subscriptions ─────────────────────────────────
  useEffect(() => {
    // If WebSocket is active, bypass Firebase readings subscriptions
    if (import.meta.env.VITE_WS_URL) return
    if (!FIREBASE_ENABLED || nodes.length === 0) return

    const unsubscribers: (() => void)[] = []

    async function attachScopedListeners() {
      const { db } = await import('../lib/firebase')

      for (const node of nodes) {
        const nodeRef = ref(db, `readings/${node.id}`)
        const unsubscribe = onValue(nodeRef, (snapshot) => {
          const r = snapshot.val() as {
            magnitudeMmS?: number
            frequencyHz?: number
            radialBearingDeg?: number
            rssi?: number
            updatedAt?: number
          } | null

          setReadings((prev) => {
            const next = new Map(prev)
            if (r && typeof r.magnitudeMmS === 'number' && typeof r.frequencyHz === 'number') {
              next.set(node.id, {
                nodeId: node.id,
                magnitudeMmS: r.magnitudeMmS,
                frequencyHz: r.frequencyHz,
                radialBearingDeg: r.radialBearingDeg,
                rssi: r.rssi,
                updatedAt: Date.now(),
              })
            } else {
              next.delete(node.id)
            }
            return next
          })
        })
        unsubscribers.push(unsubscribe)
      }
    }

    attachScopedListeners().catch(console.error)

    return () => {
      for (const unsub of unsubscribers) unsub()
    }
  }, [nodes])

  // ── Triangulation ─────────────────────────────────────────────────────────
  const triangulation: TriangulationResult = useMemo(() => {
    const samples = nodes
      .map((n) => {
        const r = readings.get(n.id)
        if (!r) return null
        // Check if reading is fresh (< 30 seconds old)
        if (Date.now() - r.updatedAt > 30000) return null
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

  const networkMaxMag = useMemo(() => {
    let m = 0
    const now = Date.now()
    for (const r of readings.values()) {
      if (now - r.updatedAt <= 30000) {
        m = Math.max(m, r.magnitudeMmS)
      }
    }
    return m
  }, [readings])

  const alertLevel =
    networkMaxMag > 2.8 ? 'critical' : networkMaxMag > 1.6 ? 'elevated' : 'nominal'

  return {
    readings,
    meshEdges,
    triangulation,
    networkMaxMag,
    alertLevel,
    feedMode: (import.meta.env.VITE_WS_URL ? 'websocket' : (FIREBASE_ENABLED ? 'websocket' : 'simulated')) as 'websocket' | 'simulated',
    connectionStatus: import.meta.env.VITE_WS_URL ? connectionStatus : (FIREBASE_ENABLED ? 'connected' : 'disconnected'),
  }
}
