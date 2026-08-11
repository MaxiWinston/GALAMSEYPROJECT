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
 * Classify seismic activity based on peak particle velocity (magnitude in mm/s),
 * dominant peak spectral frequency (Hz), and vibrationDetected flag.
 *
 * Rules:
 * - If idle or mag < 0.35 mm/s -> ALWAYS Ambient Ground Noise (Never Vehicle)
 * - Light Vehicle: mag >= 0.35 mm/s AND mag <= 0.90 mm/s AND freq >= 10 Hz
 * - Manual Digging: mag 0.90 - 1.60 mm/s
 * - Tractor: mag 1.60 - 2.80 mm/s
 * - Articulated Truck: mag 2.80 - 4.50 mm/s
 * - Heavy Bulldozer: mag > 4.50 mm/s
 */
export function classifyVibration(
  magnitudeMmS: number,
  frequencyHz: number,
  vibrationDetected?: boolean,
  _vibrationRmsMv?: number,
): SourceClassification {
  const mag = Math.max(0, magnitudeMmS)
  const freq = Math.max(0, frequencyHz)

  // 1. Explicitly idle if vibrationDetected is false or magnitude is under vehicle threshold (< 0.35 mm/s)
  if (vibrationDetected === false || mag < 0.35) {
    // Optional low-magnitude footstep check if explicitly vibrating between 0.10 and 0.35 mm/s at low Hz (1-9.5)
    if (vibrationDetected === true && mag >= 0.10 && mag < 0.35 && freq > 0 && freq <= 9.5) {
      const conf = Math.min(96, Math.round(75 + (0.35 - mag) * 50))
      return {
        category: 'footsteps',
        label: 'Human Footsteps / Walking',
        shortLabel: 'Footsteps',
        threatLevel: 'low',
        confidence: conf,
        description: 'Low-frequency rhythmic pulses characteristic of human walking or foot movement.',
        iconName: 'footsteps',
        colorClass: 'text-teal-300',
        badgeBg: 'bg-teal-950/50',
        badgeText: 'text-teal-300',
        badgeBorder: 'border-teal-500/30',
      }
    }
    return ambientClassification('Quiescent baseline ground motion. Station is idle.')
  }

  // 2. Light Vehicle / Car (0.35 - 0.90 mm/s, freq >= 10.0 Hz)
  if (mag >= 0.35 && mag <= 0.90 && (freq >= 10.0 || freq === 0)) {
    return {
      category: 'car',
      label: 'Light Vehicle / Automobile',
      shortLabel: 'Light Vehicle',
      threatLevel: 'low',
      confidence: 88,
      description: 'Continuous moderate-frequency engine vibration from light road vehicles.',
      iconName: 'car',
      colorClass: 'text-sky-300',
      badgeBg: 'bg-sky-950/50',
      badgeText: 'text-sky-300',
      badgeBorder: 'border-sky-500/30',
    }
  }

  // 3. Manual Digging / Shoveling (0.90 - 1.60 mm/s, freq <= 17.5 Hz)
  if (mag > 0.90 && mag <= 1.60 && freq <= 17.5) {
    return {
      category: 'digging',
      label: 'Manual Digging / Shoveling',
      shortLabel: 'Manual Digging',
      threatLevel: 'medium',
      confidence: 91,
      description: 'Impulsive ground impacts consistent with manual digging, pickaxes, or shoveling.',
      iconName: 'shovel',
      colorClass: 'text-amber-300',
      badgeBg: 'bg-amber-950/50',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-500/40',
    }
  }

  // 4. Agricultural Tractor (1.60 - 2.80 mm/s, freq >= 17.5 Hz)
  if (mag > 1.60 && mag <= 2.80 && freq >= 17.5) {
    return {
      category: 'tractor',
      label: 'Tractor / Farm Machinery',
      shortLabel: 'Tractor',
      threatLevel: 'medium',
      confidence: 89,
      description: 'High-frequency engine harmonics and steady rolling chassis vibration.',
      iconName: 'tractor',
      colorClass: 'text-orange-300',
      badgeBg: 'bg-orange-950/50',
      badgeText: 'text-orange-300',
      badgeBorder: 'border-orange-500/40',
    }
  }

  // 5. Heavy Articulated Truck (2.80 - 4.50 mm/s, freq <= 30.0 Hz)
  if (mag > 2.80 && mag <= 4.50 && freq <= 30.0) {
    return {
      category: 'articulated_truck',
      label: 'Heavy Articulated Truck',
      shortLabel: 'Articulated Truck',
      threatLevel: 'high',
      confidence: 93,
      description: 'High-magnitude ground loading from heavy multi-axle freight vehicles.',
      iconName: 'truck',
      colorClass: 'text-red-300',
      badgeBg: 'bg-red-950/60',
      badgeText: 'text-red-300',
      badgeBorder: 'border-red-500/50',
    }
  }

  // 6. Heavy Excavator / Bulldozer / Earthmoving (mag > 4.50 mm/s)
  if (mag > 4.50) {
    return {
      category: 'bulldozer',
      label: 'Bulldozer / Heavy Excavator',
      shortLabel: 'Bulldozer Mining',
      threatLevel: 'critical',
      confidence: 96,
      description: 'Severe high-amplitude ground displacement caused by heavy earthmoving machinery or illegal excavation.',
      iconName: 'bulldozer',
      colorClass: 'text-rose-400 font-bold',
      badgeBg: 'bg-rose-950/80 shadow-[0_0_10px_rgba(244,63,94,0.3)]',
      badgeText: 'text-rose-300 font-bold',
      badgeBorder: 'border-rose-500/60',
    }
  }

  return ambientClassification()
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
