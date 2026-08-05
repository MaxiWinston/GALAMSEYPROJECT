import type { LatLng } from '../types'

const EARTH_KM = 6371

/** Geographic azimuth from `from` to `to`, degrees clockwise from north (0–360). */
export function bearingDeg(from: LatLng, to: LatLng): number {
  const φ1 = (from[0] * Math.PI) / 180
  const φ2 = (to[0] * Math.PI) / 180
  const Δλ = ((to[1] - from[1]) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)
  return ((θ * 180) / Math.PI + 360) % 360
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const [lat1, lon1] = a
  const [lat2, lon2] = b
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(x)))
}

/**
 * Mesh fusion: estimate source from node positions and magnitudes.
 * Uses inverse-distance–weighted energy (proxy for arrival-time / attenuation fusion).
 * Returns `magnitudeFitRmse` in mm/s (not kilometres). Production: prefer TDOA with synced clocks.
 */
export function estimateSourceFromMesh(
  samples: { position: LatLng; magnitude: number }[],
  ambient = 0.15,
): { estimate: LatLng; confidence: number; magnitudeFitRmse: number } | null {
  const valid = samples.filter((s) => s.magnitude > ambient + 0.02)
  if (valid.length < 3) return null

  const fitError = (candidate: LatLng): number => {
    const predicted = valid.map((s) => {
      const dKm = Math.max(0.05, haversineKm(s.position, candidate))
      return 1 / (dKm * dKm)
    })
    const denom = predicted.reduce((a, b) => a + b * b, 0)
    if (denom <= 1e-9) return Number.POSITIVE_INFINITY
    const scale =
      valid.reduce((acc, s, i) => acc + s.magnitude * predicted[i], 0) / denom

    let sse = 0
    for (let i = 0; i < valid.length; i++) {
      const dKm = Math.max(0.05, haversineKm(valid[i].position, candidate))
      const model = scale / (dKm * dKm) + ambient
      sse += (model - valid[i].magnitude) ** 2
    }
    return Math.sqrt(sse / valid.length)
  }

  let sumW = 0
  let lat = 0
  let lng = 0
  for (const s of valid) {
    const excess = Math.max(0, s.magnitude - ambient)
    const w = excess ** 2
    sumW += w
    lat += s.position[0] * w
    lng += s.position[1] * w
  }
  if (sumW < 1e-6) return null
  let best: LatLng = [lat / sumW, lng / sumW]
  let bestErr = fitError(best)

  // Coarse-to-fine nonlinear search around the weighted seed.
  for (const stepKm of [40, 20, 10, 5, 2, 1, 0.5]) {
    const latStep = stepKm / 110.574
    const lonStep = stepKm / (111.32 * Math.max(0.2, Math.cos((best[0] * Math.PI) / 180)))
    const candidates: LatLng[] = [
      best,
      [best[0] + latStep, best[1]],
      [best[0] - latStep, best[1]],
      [best[0], best[1] + lonStep],
      [best[0], best[1] - lonStep],
      [best[0] + latStep, best[1] + lonStep],
      [best[0] + latStep, best[1] - lonStep],
      [best[0] - latStep, best[1] + lonStep],
      [best[0] - latStep, best[1] - lonStep],
    ]
    for (const c of candidates) {
      const err = fitError(c)
      if (err < bestErr) {
        bestErr = err
        best = c
      }
    }
  }

  const rmse = bestErr
  const confidence = Math.max(0, Math.min(1, 1 - rmse / 2))

  return { estimate: best, confidence, magnitudeFitRmse: rmse }
}

export function distanceToEstimate(nodePosition: LatLng, estimate: LatLng | null): number | null {
  if (!estimate) return null
  return haversineKm(nodePosition, estimate)
}

/** Bearing ° toward source: recorded radial channel, else computed toward fused estimate. */
export function displayRadialBearing(
  position: LatLng,
  reading: { radialBearingDeg?: number } | undefined,
  estimate: LatLng | null,
): number | null {
  if (reading?.radialBearingDeg != null) return reading.radialBearingDeg
  if (estimate) return bearingDeg(position, estimate)
  return null
}

export function buildKnnMesh(nodeIds: string[], positions: Map<string, LatLng>, k: number): [string, string][] {
  const edges = new Set<string>()
  const pairs: [string, string][] = []

  for (const id of nodeIds) {
    const p = positions.get(id)
    if (!p) continue
    const dists = nodeIds
      .filter((o) => o !== id)
      .map((o) => {
        const q = positions.get(o)
        return q ? { o, d: haversineKm(p, q) } : null
      })
      .filter((x): x is { o: string; d: number } => x !== null)
    dists.sort((a, b) => a.d - b.d)
    for (let i = 0; i < Math.min(k, dists.length); i++) {
      const a = id < dists[i].o ? id : dists[i].o
      const b = id < dists[i].o ? dists[i].o : id
      const key = `${a}|${b}`
      if (!edges.has(key)) {
        edges.add(key)
        pairs.push([a, b])
      }
    }
  }
  return pairs
}
