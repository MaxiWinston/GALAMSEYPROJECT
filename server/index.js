// ─────────────────────────────────────────────────────────────────────────────
// GalamseyMonitor — Node Gateway
// Accepts HTTP POST from ESP32 geophone nodes and broadcasts each reading
// to all connected browser WebSocket clients.
//
// Endpoints:
//   POST /ingest            ← ESP32 nodes push readings here
//   GET  /nodes             ← latest online/offline status per node
//   GET  /readings          ← latest reading per node (REST polling fallback)
//   GET  /health            ← uptime probe
//   WS   /ws                ← browser frontend connects here (live feed)
// ─────────────────────────────────────────────────────────────────────────────

import express from 'express'
import cors from 'cors'
import http from 'http'
import { WebSocketServer } from 'ws'

// ── Config ────────────────────────────────────────────────────────────────────
const PORT          = parseInt(process.env.PORT ?? '3000', 10)
const INGEST_SECRET = process.env.INGEST_SECRET ?? ''          // empty = no auth
const CORS_ORIGIN   = process.env.CORS_ORIGIN  ?? '*'          // restrict in prod
const NODE_TIMEOUT_MS = parseInt(process.env.NODE_TIMEOUT_MS ?? '30000', 10) // 30 s

// ── In-memory state ───────────────────────────────────────────────────────────
/**
 * @type {Map<string, {
 *   nodeId: string
 *   magnitudeMmS: number
 *   frequencyHz: number
 *   vibrationDetected: boolean
 *   radialBearingDeg?: number
 *   rssi?: number
 *   updatedAt: number
 * }>}
 */
const latestReadings = new Map()

// ── Express app ───────────────────────────────────────────────────────────────
const app = express()
app.use(express.json())
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
}))

// ── Auth middleware (only applied to /ingest) ─────────────────────────────────
// ── Auth middleware (only applied to /ingest) ─────────────────────────────────
function checkIngestAuth(req, res, next) {
  if (!INGEST_SECRET) return next()                     // auth disabled
  const authHeader = req.headers['authorization'] ?? req.headers['Authorization'] ?? ''
  let token = ''
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  } else if (authHeader.startsWith('bearer ')) {
    token = authHeader.slice(7)
  } else {
    token = authHeader
  }

  // Fallback to query parameter if header is empty
  if (!token && req.query) {
    token = req.query.secret ?? req.query.token ?? ''
  }

  if (token.trim() !== INGEST_SECRET.trim()) {
    console.warn(`[ingest] auth failed: invalid token provided "${token}"`)
    return res.status(401).json({ error: 'Unauthorized — invalid or missing Bearer token' })
  }
  next()
}

// ── POST /ingest ──────────────────────────────────────────────────────────────
app.post('/ingest', checkIngestAuth, (req, res) => {
  const body = req.body ?? {}

  // Accept `deviceId` (preferred) or legacy `nodeId`
  const nodeId = (body.deviceId ?? body.nodeId ?? '').toString().trim()

  // Coerce stringified numbers if needed (ESP32 may send as string)
  let magnitudeMmS = body.magnitudeMmS
  if (typeof magnitudeMmS === 'string') magnitudeMmS = parseFloat(magnitudeMmS)

  let frequencyHz = body.frequencyHz
  if (typeof frequencyHz === 'string') frequencyHz = parseFloat(frequencyHz)

  let radialBearingDeg = body.radialBearingDeg
  if (typeof radialBearingDeg === 'string') radialBearingDeg = parseFloat(radialBearingDeg)

  let rssi = body.rssi
  if (typeof rssi === 'string') rssi = parseInt(rssi, 10)

  // Coerce vibrationDetected from bool, 0/1, or "true"/"false"
  let vibrationDetected = body.vibrationDetected
  if (typeof vibrationDetected === 'string') {
    vibrationDetected = vibrationDetected === 'true' || vibrationDetected === '1'
  } else if (typeof vibrationDetected === 'number') {
    vibrationDetected = vibrationDetected === 1
  } else if (typeof vibrationDetected !== 'boolean') {
    vibrationDetected = false
  }

  if (!nodeId) {
    const err = 'Missing required field: deviceId (string)'
    console.warn(`[ingest] validation failed: ${err}`, body)
    return res.status(400).json({ error: err })
  }
  if (typeof magnitudeMmS !== 'number' || isNaN(magnitudeMmS)) {
    const err = 'Missing required field: magnitudeMmS (number)'
    console.warn(`[ingest] validation failed: ${err}`, body)
    return res.status(400).json({ error: err })
  }
  if (typeof frequencyHz !== 'number' || isNaN(frequencyHz)) {
    const err = 'Missing required field: frequencyHz (number)'
    console.warn(`[ingest] validation failed: ${err}`, body)
    return res.status(400).json({ error: err })
  }

  const reading = {
    nodeId,
    deviceId: nodeId,   // echo back both keys for client compatibility
    magnitudeMmS,
    frequencyHz,
    vibrationDetected,
    ...(typeof radialBearingDeg === 'number' && !isNaN(radialBearingDeg) && { radialBearingDeg }),
    ...(typeof rssi === 'number' && !isNaN(rssi) && { rssi }),
    updatedAt: Date.now(),
  }

  latestReadings.set(nodeId, reading)

  // Broadcast to all connected WS clients
  const payload = JSON.stringify(reading)
  let delivered = 0
  wss.clients.forEach((client) => {
    if (client.readyState === 1 /* OPEN */) {
      client.send(payload)
      delivered++
    }
  })

  console.log(
    `[ingest] device=${nodeId} mag=${magnitudeMmS} hz=${frequencyHz} vib=${vibrationDetected} → ${delivered} ws client(s)`,
  )
  return res.json({ ok: true, delivered })
})

// ── GET /readings ─────────────────────────────────────────────────────────────
app.get('/readings', (_req, res) => {
  const now = Date.now()
  const result = []
  for (const r of latestReadings.values()) {
    result.push({
      ...r,
      stale: (now - r.updatedAt) > NODE_TIMEOUT_MS,
    })
  }
  res.json(result)
})

// ── GET /nodes ────────────────────────────────────────────────────────────────
app.get('/nodes', (_req, res) => {
  const now = Date.now()
  const result = []
  for (const r of latestReadings.values()) {
    result.push({
      nodeId: r.nodeId,
      online: (now - r.updatedAt) <= NODE_TIMEOUT_MS,
      lastSeen: r.updatedAt,
    })
  }
  res.json(result)
})

// ── GET /health ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    nodes: latestReadings.size,
    wsClients: wss?.clients.size ?? 0,
  })
})

// ── HTTP + WebSocket server ───────────────────────────────────────────────────
const server = http.createServer(app)

const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (ws, req) => {
  const ip = req.headers['x-forwarded-for'] ?? req.socket.remoteAddress
  console.log(`[ws] client connected from ${ip} (total: ${wss.clients.size})`)

  // Send current snapshot to newly connected client
  for (const reading of latestReadings.values()) {
    if (ws.readyState === 1) ws.send(JSON.stringify(reading))
  }

  ws.on('close', () => {
    console.log(`[ws] client disconnected (total: ${wss.clients.size})`)
  })

  ws.on('error', (err) => {
    console.error('[ws] client error:', err.message)
  })
})

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║  GalamseyMonitor Gateway                         ║
║  HTTP  → http://localhost:${PORT}                   ║
║  WS    → ws://localhost:${PORT}/ws                  ║
║  Auth  → ${INGEST_SECRET ? 'ENABLED (INGEST_SECRET set)' : 'DISABLED (set INGEST_SECRET to enable)'}    ║
╚══════════════════════════════════════════════════╝
`)
})

server.on('error', (err) => {
  console.error('Server error:', err)
  process.exit(1)
})
