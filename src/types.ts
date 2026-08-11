export type LatLng = [number, number]

export type SensorNode = {
  id: string
  label: string
  position: LatLng
  online: boolean
}

/**
 * One telemetry sample from a geophone station.
 * Fields match what the ESP32 firmware writes to Firebase `nodes/<deviceId>`.
 */
export type NodeReading = {
  /** Internal node id — mapped from the Firebase document key (deviceId). */
  nodeId: string
  /** Peak (or RMS) vibration level in millimetres per second. */
  magnitudeMmS: number
  /** Dominant frequency of the vibration band (FFT peak), in hertz. */
  frequencyHz: number
  /**
   * True when the firmware's vibration threshold was exceeded.
   * A node is considered "active" only when this is true.
   */
  vibrationDetected: boolean
  /**
   * Azimuth toward the energy source, degrees clockwise from north (0–360).
   * Optional — not all firmware builds report this.
   */
  radialBearingDeg?: number
  /** Wi-Fi RSSI in dBm. Optional. */
  rssi?: number
  /** Firebase ServerTimestamp in milliseconds (unix epoch). */
  updatedAt: number
}

export type MeshEdge = readonly [string, string]

/** Output of `estimateSourceFromMesh` — a map position plus how trustworthy the fit is. */
export type TriangulationResult = {
  /** Estimated geographic location of the fused "source" (lat, lng). */
  estimate: LatLng | null
  /**
   * How well a simple distance-decay model matches observed magnitudes at this point, mapped to 0–1.
   * 1 ≈ excellent fit; 0 ≈ poor fit.
   */
  confidence: number
  /**
   * Root-mean-square error between observed magnitudes and the model's predicted magnitudes, in mm/s.
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
  /** True when the firmware's vibration threshold was exceeded at recording time. */
  vibrationDetected: boolean
  rssi?: number
  /** `updatedAt` from the Firebase sensor document (ServerTimestamp ms). */
  sensorUpdatedAt: number
  fusedLat: number | null
  fusedLng: number | null
  fusedConfidence: number | null
  fusedRmseMmS: number | null
  /** Radial bearing ° (toward source) when recorded. */
  radialBearingDeg?: number
}
