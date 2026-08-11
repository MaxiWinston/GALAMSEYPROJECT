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
    const unsubscribers: (() => void)[] = []

    // 1. Listen to top-level `nodes/` in Firebase RTDB
    const topNodesRef = ref(db, 'nodes')
    const unsubTopNodes = onValue(topNodesRef, (snapshot) => {
      const val = snapshot.val()
      if (val && typeof val === 'object') {
        const topList: SensorNode[] = Object.entries(val).map(([id, item]: [string, any]) => {
          const fallback = DEFAULT_NODES.find((d) => d.id === id)?.position ?? [6.1050, -0.5850]
          return {
            id,
            label: item.label ?? `GEO-Node-${id}`,
            position: parsePosition(item.position, fallback),
            online: item.online ?? true,
          }
        })

        if (topList.length > 0) {
          setNodes((prev) => {
            const nextMap = new Map(prev.map((n) => [n.id, n]))
            for (const tn of topList) {
              nextMap.set(tn.id, tn)
            }
            return Array.from(nextMap.values())
          })
        }
      }
    })
    unsubscribers.push(unsubTopNodes)

    // 2. Listen to top-level `readings/` in Firebase RTDB (catches sensors that post readings directly)
    const topReadingsRef = ref(db, 'readings')
    const unsubTopReadings = onValue(topReadingsRef, (snapshot) => {
      const val = snapshot.val()
      if (val && typeof val === 'object') {
        const readingNodes: SensorNode[] = Object.entries(val).map(([id, item]: [string, any]) => {
          const fallback = DEFAULT_NODES.find((d) => d.id === id)?.position ?? [6.1050, -0.5850]
          return {
            id,
            label: item.nodeLabel ?? item.label ?? `GEO-Node-${id}`,
            position: parsePosition(item.position, fallback),
            online: true,
          }
        })

        if (readingNodes.length > 0) {
          setNodes((prev) => {
            const nextMap = new Map(prev.map((n) => [n.id, n]))
            for (const rn of readingNodes) {
              if (!nextMap.has(rn.id)) {
                nextMap.set(rn.id, rn)
              }
            }
            return Array.from(nextMap.values())
          })
        }
      }
    })
    unsubscribers.push(unsubTopReadings)

    // 3. Listen to user-specific node list if authenticated
    if (user) {
      const userNodesRef = ref(db, `users/${user.uid}/nodes`)
      const unsubUserNodes = onValue(userNodesRef, (snapshot) => {
        const val = snapshot.val()
        if (val && typeof val === 'object') {
          const userList: SensorNode[] = Object.entries(val).map(([id, item]: [string, any]) => {
            const fallback = DEFAULT_NODES.find((d) => d.id === id)?.position ?? [6.1050, -0.5850]
            return {
              id,
              label: item.label ?? `GEO-Node-${id}`,
              position: parsePosition(item.position, fallback),
              online: item.online ?? true,
            }
          })

          if (userList.length > 0) {
            setNodes((prev) => {
              const nextMap = new Map(prev.map((n) => [n.id, n]))
              for (const un of userList) {
                nextMap.set(un.id, un)
              }
              return Array.from(nextMap.values())
            })
          }
        }
      })
      unsubscribers.push(unsubUserNodes)
    }

    return () => {
      for (const unsub of unsubscribers) unsub()
    }
  }, [user])

  const addNode = useCallback(
    (payload: AddNodePayload) => {
      const newNode: SensorNode = {
        id: payload.id,
        label: payload.label,
        position: payload.position,
        online: true,
      }

      // 1. Instantly update local React state
      setNodes((prev) => {
        if (prev.some((n) => n.id === payload.id)) {
          return prev.map((n) => (n.id === payload.id ? newNode : n))
        }
        return [...prev, newNode]
      })

      // Clean lat/lng object for Firebase RTDB
      const positionObj = {
        lat: payload.position[0],
        lng: payload.position[1],
      }

      // 2. Write to top-level `nodes/<id>` in Firebase RTDB
      const topNodeRef = ref(db, `nodes/${payload.id}`)
      set(topNodeRef, {
        deviceId: payload.id,
        label: payload.label,
        position: positionObj,
        online: true,
        updatedAt: Date.now(),
      }).catch((err) => console.error('[Firebase] Failed to write nodes/', err))

      // 3. Write baseline telemetry record to top-level `readings/<id>` in Firebase RTDB
      const topReadingRef = ref(db, `readings/${payload.id}`)
      set(topReadingRef, {
        deviceId: payload.id,
        label: payload.label,
        magnitudeMmS: 0,
        frequencyHz: 0,
        vibrationDetected: false,
        position: positionObj,
        updatedAt: Date.now(),
      }).catch((err) => console.error('[Firebase] Failed to write readings/', err))

      // 4. Save to user's personalized node list if authenticated
      if (user) {
        const userNodeRef = ref(db, `users/${user.uid}/nodes/${payload.id}`)
        set(userNodeRef, {
          label: payload.label,
          position: positionObj,
          online: true,
        }).catch((err) => console.error('[Firebase] Failed to write users/nodes/', err))
      }
    },
    [user],
  )

  const removeNode = useCallback(
    (id: string) => {
      // 1. Remove from local state
      setNodes((prev) => prev.filter((n) => n.id !== id))

      // 2. Remove from top-level `nodes/<id>` and `readings/<id>` in Firebase RTDB
      remove(ref(db, `nodes/${id}`)).catch(console.error)
      remove(ref(db, `readings/${id}`)).catch(console.error)

      // 3. Remove from user node list if authenticated
      if (user) {
        const userNodeRef = ref(db, `users/${user.uid}/nodes/${id}`)
        remove(userNodeRef).catch(console.error)
      }
    },
    [user],
  )

  return { nodes, addNode, removeNode }
}
