import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { classifyVibration } from '../lib/vibrationClassifier'

export type SeismicNotification = {
  id: string
  timestamp: number
  nodeId: string
  nodeLabel?: string
  magnitudeMmS: number
  frequencyHz: number
  classificationLabel: string
  threatLevel: 'nominal' | 'low' | 'medium' | 'high' | 'critical'
  message: string
  read: boolean
}

type NotificationContextValue = {
  notifications: SeismicNotification[]
  unreadCount: number
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
  browserAlertsEnabled: boolean
  requestBrowserPermission: () => Promise<boolean>
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  triggerTestNotification: () => void
  processReadingAlert: (nodeId: string, nodeLabel: string, magnitudeMmS: number, frequencyHz: number) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

/** Play synthesizer alarm sound using Web Audio API */
function playAlarmSound(threatLevel: 'medium' | 'high' | 'critical') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    const now = ctx.currentTime

    if (threatLevel === 'critical') {
      // Urgent double beep siren
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(880, now) // A5
      osc.frequency.setValueAtTime(440, now + 0.15)
      osc.frequency.setValueAtTime(880, now + 0.3)
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45)
      osc.start(now)
      osc.stop(now + 0.45)
    } else if (threatLevel === 'high') {
      // High alert tone
      osc.type = 'square'
      osc.frequency.setValueAtTime(660, now)
      osc.frequency.setValueAtTime(520, now + 0.2)
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35)
      osc.start(now)
      osc.stop(now + 0.35)
    } else {
      // Soft notification chime
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, now) // D5
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)
      osc.start(now)
      osc.stop(now + 0.25)
    }
  } catch (err) {
    console.warn('[Audio] AudioContext sound trigger failed:', err)
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<SeismicNotification[]>(() => {
    try {
      const saved = localStorage.getItem('galamsey_notifications')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('galamsey_sound') !== 'false'
    } catch {
      return true
    }
  })

  const [browserAlertsEnabled, setBrowserAlertsEnabled] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  })

  const lastAlertTimesRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    try {
      localStorage.setItem('galamsey_notifications', JSON.stringify(notifications.slice(0, 50)))
    } catch (err) {
      console.error('[Notifications] Failed to save to localStorage:', err)
    }
  }, [notifications])

  useEffect(() => {
    try {
      localStorage.setItem('galamsey_sound', String(soundEnabled))
    } catch {}
  }, [soundEnabled])

  const requestBrowserPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false
    }
    try {
      const permission = await Notification.requestPermission()
      const granted = permission === 'granted'
      setBrowserAlertsEnabled(granted)
      return granted
    } catch {
      return false
    }
  }, [])

  const addNotification = useCallback((n: Omit<SeismicNotification, 'id' | 'timestamp' | 'read'>) => {
    const newItem: SeismicNotification = {
      ...n,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      read: false,
    }

    setNotifications((prev) => [newItem, ...prev].slice(0, 50))

    // Play sound if enabled and threat level is medium or higher
    if (soundEnabled && (n.threatLevel === 'medium' || n.threatLevel === 'high' || n.threatLevel === 'critical')) {
      playAlarmSound(n.threatLevel)
    }

    // Trigger HTML5 Notification if granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`🚨 ${n.classificationLabel}`, {
          body: `${n.nodeLabel || n.nodeId}: ${n.message}`,
          icon: '/favicon.png',
        })
      } catch {}
    }
  }, [soundEnabled])

  const processReadingAlert = useCallback(
    (nodeId: string, nodeLabel: string, magnitudeMmS: number, frequencyHz: number) => {
      if (magnitudeMmS < 0.9) return // Only alert on significant seismic events (>= 0.9 mm/s)

      const now = Date.now()
      const lastAlert = lastAlertTimesRef.current.get(nodeId) ?? 0

      // Debounce alerts per node: max 1 notification per node every 12 seconds
      if (now - lastAlert < 12_000) return
      lastAlertTimesRef.current.set(nodeId, now)

      const classification = classifyVibration(magnitudeMmS, frequencyHz)
      const msg = `Vibration level reached ${magnitudeMmS.toFixed(3)} mm/s (${frequencyHz.toFixed(1)} Hz) — ${classification.description}`

      addNotification({
        nodeId,
        nodeLabel,
        magnitudeMmS,
        frequencyHz,
        classificationLabel: classification.label,
        threatLevel: classification.threatLevel,
        message: msg,
      })
    },
    [addNotification],
  )

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const triggerTestNotification = useCallback(() => {
    addNotification({
      nodeId: 'n1',
      nodeLabel: 'GEO-Node-1',
      magnitudeMmS: 4.85,
      frequencyHz: 14.2,
      classificationLabel: 'Bulldozer / Heavy Excavator',
      threatLevel: 'critical',
      message: 'Vibration level reached 4.850 mm/s — Heavy excavator earthmoving activity detected inside Atewa forest reserve!',
    })
  }, [addNotification])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        soundEnabled,
        setSoundEnabled,
        browserAlertsEnabled,
        requestBrowserPermission,
        markAsRead,
        markAllAsRead,
        clearAll,
        triggerTestNotification,
        processReadingAlert,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return ctx
}
