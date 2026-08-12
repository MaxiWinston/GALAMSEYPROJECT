import { predictVibrationAI } from './aiSeismicClassifier'

export type VibrationCategory =
  | 'ambient'
  | 'footsteps'
  | 'car'
  | 'digging'
  | 'tractor'
  | 'articulated_truck'
  | 'bulldozer'

export type SourceClassification = {
  category: VibrationCategory
  label: string
  shortLabel: string
  threatLevel: 'nominal' | 'low' | 'medium' | 'high' | 'critical'
  confidence: number // 0 - 100%
  description: string
  iconName: string
  colorClass: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
}

/**
 * Standard Ambient / Idle classification helper.
 */
function ambientClassification(desc?: string): SourceClassification {
  return {
    category: 'ambient',
    label: 'Ambient Ground Noise',
    shortLabel: 'Ambient / Idle',
    threatLevel: 'nominal',
    confidence: 98,
    description: desc || 'Quiescent baseline ground motion. Station is idle.',
    iconName: 'wave',
    colorClass: 'text-zinc-400',
    badgeBg: 'bg-zinc-900/60',
    badgeText: 'text-zinc-400',
    badgeBorder: 'border-zinc-800',
  }
}

/**
 * Classify seismic activity using our AI Neural Network Model (`predictVibrationAI`).
 */
export function classifyVibration(
  magnitudeMmS: number,
  frequencyHz: number,
  vibrationDetected?: boolean,
  vibrationRmsMv?: number,
  acVibrationMv?: number,
  rawSignalMv?: number,
): SourceClassification {
  const aiResult = predictVibrationAI(
    magnitudeMmS,
    frequencyHz,
    vibrationDetected,
    vibrationRmsMv,
    acVibrationMv,
    rawSignalMv,
  )
  return aiResult.classification
}

/**
 * Fuse multi-node network readings to generate a unified network-wide threat classification.
 */
export function classifyNetworkVibration(
  readingsMap: Map<string, { magnitudeMmS: number; frequencyHz: number; vibrationDetected?: boolean; vibrationRmsMv?: number; updatedAt: number }>,
): SourceClassification {
  let maxMag = 0
  let matchedFreq = 0
  let matchedDetected = false
  let matchedRms = 0
  const now = Date.now()

  for (const r of readingsMap.values()) {
    if (now - r.updatedAt <= 30_000 && r.magnitudeMmS > maxMag) {
      maxMag = r.magnitudeMmS
      matchedFreq = r.frequencyHz
      matchedDetected = r.vibrationDetected ?? r.magnitudeMmS >= 0.35
      matchedRms = r.vibrationRmsMv ?? 0
    }
  }

  if (maxMag < 0.35) {
    return ambientClassification('All nodes are quiescent. Baseline ambient ground state.')
  }

  return classifyVibration(maxMag, matchedFreq, matchedDetected, matchedRms)
}
