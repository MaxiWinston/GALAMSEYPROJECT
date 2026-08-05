export type LatLng = [number, number]

export type SensorNode = {
  id: string
  label: string
  position: LatLng
  online: boolean
}

/** One telemetry sample from a geophone station (ESP32 gateway → UI). */
export type NodeReading = {
  /** Node id; must match `SensorNode.id`. */
  nodeId: string
  /** Peak (or RMS) vibration level in millimetres per second — same unit as ISO “vibration velocity” style summaries. */
  magnitudeMmS: number
  /** Dominant frequency of the vibration band you are monitoring (e.g. FFT peak), in hertz. */
  frequencyHz: number
  /**
   * Azimuth toward the energy source, degrees clockwise from north (0–360).
   * Radial-channel style: direction from this geophone toward the event; sim fills from ground truth.
   */
  radialBearingDeg?: number
  /** Optional received signal strength for mesh / LoRa / Wi‑Fi hop to the gateway, in dBm. */
  rssi?: number
  updatedAt: number
}

export type MeshEdge = readonly [string, string]

/** Output of `estimateSourceFromMesh` — a map position plus how trustworthy the fit is. */
export type TriangulationResult = {
  /** Estimated geographic location of the fused “source” (lat, lng). */
  estimate: LatLng | null
  /**
   * How well a simple distance-decay model matches observed magnitudes at this point, mapped to 0–1.
   * 1 ≈ excellent fit; 0 ≈ poor fit. Not a statistical confidence interval.
   */
  confidence: number
  /**
   * Root-mean-square error between observed magnitudes and the model’s predicted magnitudes, in mm/s.
   * Lower is better. (This is not a distance in kilometres.)
   */
  magnitudeFitRmse: number
}

/** One persisted row: a node reading captured with wall-clock + optional fused map state. */
export type TelemetryLogRow = {
  id: string
  /** When the UI stored this batch (milliseconds since epoch). */
  sampleTime: number
  nodeId: string
  nodeLabel: string
  magnitudeMmS: number
  frequencyHz: number
  rssi?: number
  /** `updatedAt` from the sensor message when present. */
  sensorUpdatedAt: number
  fusedLat: number | null
  fusedLng: number | null
  fusedConfidence: number | null
  fusedRmseMmS: number | null
  /** Radial bearing ° (toward source) when recorded. */
  radialBearingDeg?: number
}
