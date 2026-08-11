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
 * Classify seismic activity based on peak particle velocity (magnitude in mm/s),
 * dominant peak spectral frequency (Hz), and vibrationDetected flag.
 *
 * Ground motion calibration thresholds:
 * 1. Ambient / Idle: mag < 0.35 mm/s (unless low-freq footsteps 1-9.5 Hz) OR vibrationDetected = false
 * 2. Human Footsteps: mag 0.10-0.35 mm/s, freq 1.0-9.5 Hz
 * 3. Light Vehicle / Car: mag 0.35-0.90 mm/s, freq >= 10.0 Hz (Requires mag >= 0.35 mm/s)
 * 4. Manual Digging / Shoveling: mag 0.90-1.60 mm/s, freq 5.0-17.5 Hz
 * 5. Agricultural Tractor: mag 1.60-2.80 mm/s, freq 17.5-40.0 Hz
 * 6. Heavy Articulated Truck: mag 2.80-4.50 mm/s, freq 10.0-30.0 Hz
 * 7. Bulldozer / Heavy Excavator Mining: mag > 4.50 mm/s
 */
export function classifyVibration(
  magnitudeMmS: number,
  frequencyHz: number,
  vibrationDetected?: boolean,
  _vibrationRmsMv?: number,
): SourceClassification {
  const mag = Math.max(0, magnitudeMmS)
  const freq = Math.max(0, frequencyHz)

  // Explicitly idle if vibrationDetected is false
  if (vibrationDetected === false) {
    return {
      category: 'ambient',
      label: 'Ambient Ground Noise',
      shortLabel: 'Ambient / Idle',
      threatLevel: 'nominal',
      confidence: 98,
      description: 'Quiescent baseline ground motion. Station is idle.',
      iconName: 'wave',
      colorClass: 'text-zinc-400',
      badgeBg: 'bg-zinc-900/60',
      badgeText: 'text-zinc-400',
      badgeBorder: 'border-zinc-800',
    }
  }

  // 1. Human Footsteps / Walking (0.10 - 0.35 mm/s, low freq <= 9.5 Hz)
  if (mag >= 0.10 && mag <= 0.35 && (freq === 0 || freq <= 9.5)) {
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

  // 2. Low-magnitude Ground Baseline (< 0.35 mm/s) -> ALWAYS Ambient / Idle (Never Vehicle)
  if (mag < 0.35) {
    return {
      category: 'ambient',
      label: 'Ambient Ground Noise',
      shortLabel: 'Ambient / Idle',
      threatLevel: 'nominal',
      confidence: 98,
      description: 'Low-level baseline ground movement. No vehicle or machinery active.',
      iconName: 'wave',
      colorClass: 'text-zinc-400',
      badgeBg: 'bg-zinc-900/60',
      badgeText: 'text-zinc-400',
      badgeBorder: 'border-zinc-800',
    }
  }

  // 3. Light Vehicle / Car (0.35 - 0.90 mm/s, freq >= 10.0 Hz)
  if (mag <= 0.90 && (freq >= 10.0 || freq === 0)) {
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

  // 4. Manual Digging / Shoveling (0.90 - 1.60 mm/s, freq 5-17.5 Hz)
  if (mag <= 1.60 && freq <= 17.5) {
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

  // 5. Agricultural Tractor (1.60 - 2.80 mm/s, freq 17.5-40 Hz)
  if (mag <= 2.80 && freq >= 17.5) {
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

  // 6. Heavy Articulated Truck (2.80 - 4.50 mm/s, freq 10-30 Hz)
  if (mag <= 4.50 && freq <= 30.0) {
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

  // 7. Heavy Excavator / Bulldozer / Earthmoving (mag > 4.50 mm/s)
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

  return classifyVibration(maxMag, matchedFreq, matchedDetected, matchedRms)
}
