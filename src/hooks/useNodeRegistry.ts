import { useCallback, useState, useEffect } from 'react'
import { ref, onValue, set, remove } from 'firebase/database'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import type { LatLng, SensorNode } from '../types'

// Default nodes — physical deployment points inside the Atewa Range Forest Reserve.
const DEFAULT_NODES: SensorNode[] = [
  { id: 'n1', label: 'GEO-Node-1', position: [6.1050, -0.5850], online: false }, // north-central forest
  { id: 'n2', label: 'GEO-Node-2', position: [6.0420, -0.6280], online: false }, // south-west forest
]

export type AddNodePayload = {
  id: string
  label: string
  position: LatLng
}

/**
 * Robustly parse latitude/longitude from various Firebase RTDB structures:
 * - Array: [6.105, -0.585]
 * - Object: { lat: 6.105, lng: -0.585 }
 * - Indexed object: { "0": 6.105, "1": -0.585 }
 */
function parsePosition(pos: any, fallback: LatLng): LatLng {
  if (Array.isArray(pos) && pos.length >= 2) {
    const lat = Number(pos[0])
    const lng = Number(pos[1])
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng]
  }
  if (pos && typeof pos === 'object') {
    const lat = Number(pos.lat ?? pos[0] ?? pos['0'])
    const lng = Number(pos.lng ?? pos[1] ?? pos['1'])
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng]
  }
  return fallback
}

export function useNodeRegistry() {
  const { user } = useAuth()
  const [nodes, setNodes] = useState<SensorNode[]>(DEFAULT_NODES)

  useEffect(() => {
    // Top-level `nodes/` in Firebase RTDB is the single authoritative source of truth
    const topNodesRef = ref(db, 'nodes')

    const unsubscribe = onValue(topNodesRef, (snapshot) => {
      const val = snapshot.val()

      if (val && typeof val === 'object' && Object.keys(val).length > 0) {
        // Build exact list from Firebase nodes/ tree — deleted nodes are completely excluded
        const currentNodes: SensorNode[] = Object.entries(val).map(([id, item]: [string, any]) => {
          const fallback = DEFAULT_NODES.find((d) => d.id === id)?.position ?? [6.1050, -0.5850]
          return {
            id,
            label: item.label ?? `GEO-Node-${id}`,
            position: parsePosition(item.position, fallback),
            online: item.online ?? true,
          }
        })

        setNodes(currentNodes)
      } else {
        // Seed default nodes on initial load if database nodes/ path is empty
        const initialNodes: Record<string, any> = {}
        const initialReadings: Record<string, any> = {}
        const now = Date.now()

        DEFAULT_NODES.forEach((node) => {
          const posObj = { lat: node.position[0], lng: node.position[1] }
          initialNodes[node.id] = {
            deviceId: node.id,
            label: node.label,
            position: posObj,
            online: false,
            updatedAt: now,
          }
          initialReadings[node.id] = {
            deviceId: node.id,
            label: node.label,
            magnitudeMmS: 0,
            frequencyHz: 0,
            vibrationDetected: false,
            position: posObj,
            updatedAt: now,
          }
        })

        set(ref(db, 'nodes'), initialNodes).catch(console.error)
        set(ref(db, 'readings'), initialReadings).catch(console.error)
        setNodes(DEFAULT_NODES)
      }
    })

    return () => unsubscribe()
  }, [])

  const addNode = useCallback(
    (payload: AddNodePayload) => {
      const newNode: SensorNode = {
        id: payload.id,
        label: payload.label,
        position: payload.position,
        online: true,
      }

      // 1. Immediately update local state
      setNodes((prev) => {
        if (prev.some((n) => n.id === payload.id)) {
          return prev.map((n) => (n.id === payload.id ? newNode : n))
        }
        return [...prev, newNode]
      })

      const posObj = {
        lat: payload.position[0],
        lng: payload.position[1],
      }
      const now = Date.now()

      // 2. Write to top-level `nodes/<id>` in Firebase RTDB
      set(ref(db, `nodes/${payload.id}`), {
        deviceId: payload.id,
        label: payload.label,
        position: posObj,
        online: true,
        updatedAt: now,
      }).catch((err) => console.error('[Firebase] Failed to write nodes/', err))

      // 3. Write baseline record to `readings/<id>` in Firebase RTDB
      set(ref(db, `readings/${payload.id}`), {
        deviceId: payload.id,
        label: payload.label,
        magnitudeMmS: 0,
        frequencyHz: 0,
        vibrationDetected: false,
        position: posObj,
        updatedAt: now,
      }).catch((err) => console.error('[Firebase] Failed to write readings/', err))

      // 4. Save under user's node list if authenticated
      if (user) {
        set(ref(db, `users/${user.uid}/nodes/${payload.id}`), {
          label: payload.label,
          position: posObj,
          online: true,
        }).catch((err) => console.error('[Firebase] Failed to write users/nodes/', err))
      }
    },
    [user],
  )

  const removeNode = useCallback(
    (id: string) => {
      // 1. Immediately update local state so UI updates instantly
      setNodes((prev) => prev.filter((n) => n.id !== id))

      // 2. Remove node from top-level `nodes/<id>` and `readings/<id>` in Firebase RTDB
      remove(ref(db, `nodes/${id}`)).catch((err) => console.error('[Firebase] Failed to remove nodes/', err))
      remove(ref(db, `readings/${id}`)).catch((err) => console.error('[Firebase] Failed to remove readings/', err))

      // 3. Remove from user node list if authenticated
      if (user) {
        remove(ref(db, `users/${user.uid}/nodes/${id}`)).catch((err) => console.error('[Firebase] Failed to remove users/nodes/', err))
      }
    },
    [user],
  )

  return { nodes, addNode, removeNode }
}
