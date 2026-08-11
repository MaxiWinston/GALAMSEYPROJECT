import { useCallback, useState, useEffect } from 'react'
import { ref, onValue, set, remove } from 'firebase/database'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import type { LatLng, SensorNode } from '../types'

// Default nodes — two physical deployment points inside the Atewa Range Forest Reserve.
const DEFAULT_NODES: SensorNode[] = [
  { id: 'n1', label: 'GEO-Node-1', position: [6.1050, -0.5850], online: false }, // north-central forest
  { id: 'n2', label: 'GEO-Node-2', position: [6.0420, -0.6280], online: false }, // south-west forest
]

export type AddNodePayload = {
  id: string
  label: string
  position: LatLng
}

export function useNodeRegistry() {
  const { user } = useAuth()
  const [nodes, setNodes] = useState<SensorNode[]>(DEFAULT_NODES)

  useEffect(() => {
    if (!user) {
      setNodes(DEFAULT_NODES)
      return
    }

    const nodesRef = ref(db, `users/${user.uid}/nodes`)
    const unsubscribe = onValue(nodesRef, (snapshot) => {
      const val = snapshot.val()
      if (val) {
        // Convert object dictionary to SensorNode[] array
        const list: SensorNode[] = Object.entries(val).map(([id, item]: [string, any]) => ({
          id,
          label: item.label,
          position: item.position as LatLng,
          online: item.online ?? false,
        }))
        setNodes(list)
      } else {
        // Seed default nodes on first load
        const initialNodes: Record<string, any> = {}
        DEFAULT_NODES.forEach((node) => {
          initialNodes[node.id] = {
            label: node.label,
            position: node.position,
            online: false,
          }
        })
        set(nodesRef, initialNodes).catch(console.error)
      }
    })

    return () => unsubscribe()
  }, [user])

  const addNode = useCallback((payload: AddNodePayload) => {
    if (!user) return
    if (nodes.some((n) => n.id === payload.id)) return

    const nodeRef = ref(db, `users/${user.uid}/nodes/${payload.id}`)
    set(nodeRef, {
      label: payload.label,
      position: payload.position,
      online: true,
    }).catch(console.error)
  }, [user, nodes])

  const removeNode = useCallback((id: string) => {
    if (!user) return
    const nodeRef = ref(db, `users/${user.uid}/nodes/${id}`)
    remove(nodeRef).catch(console.error)
  }, [user])

  return { nodes, addNode, removeNode }
}

