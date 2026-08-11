# GalamseyMonitor — Gateway Server

A lightweight Node.js server that acts as the bridge between your **ESP32 geophone nodes** and the **GalamseyMonitor web dashboard**.

```
[ESP32 Node-1]  ──POST /ingest──►
[ESP32 Node-2]  ──POST /ingest──►  Gateway (Railway)  ──WSS /ws──► Browser Dashboard
```

---

## API Reference

### `POST /ingest` — Node telemetry push
ESP32 nodes call this endpoint after each reading.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <INGEST_SECRET>   ← only if INGEST_SECRET is set
```

**Body:**
```json
{
  "nodeId":           "n1",     // must match the node ID registered in the frontend
  "magnitudeMmS":     1.24,     // peak vibration velocity mm/s
  "frequencyHz":      22.8,     // dominant frequency Hz
  "radialBearingDeg": 142.3,    // optional — azimuth ° toward source
  "rssi":             -68       // optional — WiFi/LoRa signal strength dBm
}
```

**Response:**
```json
{ "ok": true, "delivered": 2 }  // delivered = number of WS browser clients notified
```

---

### `GET /readings` — Latest reading per node (REST polling fallback)
```json
[
  { "nodeId": "n1", "magnitudeMmS": 1.24, "frequencyHz": 22.8, "updatedAt": 1234567890, "stale": false },
  { "nodeId": "n2", "magnitudeMmS": 0.85, "frequencyHz": 18.3, "updatedAt": 1234567880, "stale": false }
]
```

### `GET /nodes` — Node online status
```json
[
  { "nodeId": "n1", "online": true,  "lastSeen": 1234567890 },
  { "nodeId": "n2", "online": false, "lastSeen": 1234567700 }
]
```

### `GET /health` — Uptime probe
```json
{ "status": "ok", "uptime": 3600, "nodes": 2, "wsClients": 1 }
```

### `WS /ws` — Live feed (browser connects here)
The frontend sets `VITE_WS_URL=wss://<your-railway-url>/ws` and receives every ingested reading as a JSON frame automatically.

---

## Local Development

```bash
cd server
cp .env.example .env      # fill in values
npm install
npm run dev               # uses --watch for hot reload
```

Test with curl:
```bash
# Push a fake reading
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer change-me-to-a-strong-random-string" \
  -d '{"nodeId":"n1","magnitudeMmS":1.2,"frequencyHz":24.5,"rssi":-68}'

# Check latest readings
curl http://localhost:3000/readings
```

---

## Deploy to Railway

1. **Install Railway CLI** (once):
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Create project & deploy**:
   ```bash
   cd server
   railway init          # creates a new Railway project
   railway up            # deploys from this directory
   ```

3. **Set environment variables** in the Railway dashboard (or via CLI):
   ```bash
   railway variables set INGEST_SECRET=<your-strong-secret>
   railway variables set CORS_ORIGIN=https://your-frontend-url.vercel.app
   ```

4. **Get your public URL**:
   ```bash
   railway domain        # e.g. galamsey-gateway.up.railway.app
   ```

5. **Wire up the frontend** — in `galamsey-monitor/.env`:
   ```
   VITE_WS_URL=wss://galamsey-gateway.up.railway.app/ws
   ```
   Then rebuild and redeploy the frontend.

---

## ESP32 Firmware Snippet (Arduino / PlatformIO)

Add this to your ESP32 sketch. Replace the placeholders with your actual values.

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* GATEWAY_URL    = "https://galamsey-gateway.up.railway.app/ingest";
const char* INGEST_SECRET  = "change-me-to-a-strong-random-string";
const char* NODE_ID        = "n1";   // "n2" for the second node

void postReading(float magnitudeMmS, float frequencyHz, float bearingDeg, int rssi) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(GATEWAY_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + INGEST_SECRET);

  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["nodeId"]       = NODE_ID;
  doc["magnitudeMmS"] = magnitudeMmS;
  doc["frequencyHz"]  = frequencyHz;
  if (bearingDeg >= 0) doc["radialBearingDeg"] = bearingDeg;
  doc["rssi"]         = rssi;

  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  if (httpCode == 200) {
    Serial.println("[gateway] ingest OK");
  } else {
    Serial.printf("[gateway] ingest FAILED: %d\n", httpCode);
  }
  http.end();
}
```

Call `postReading(mag, freq, bearing, WiFi.RSSI())` after each geophone FFT cycle.

---

## Environment Variables

| Variable          | Default | Description |
|-------------------|---------|-------------|
| `PORT`            | `3000`  | HTTP port (Railway sets automatically) |
| `INGEST_SECRET`   | *(empty)* | Bearer token for `/ingest`. **Highly recommended in production.** |
| `CORS_ORIGIN`     | `*`     | Allowed CORS origin for REST endpoints |
| `NODE_TIMEOUT_MS` | `30000` | ms before a node is marked offline |
