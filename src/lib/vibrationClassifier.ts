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
 * dominant peak spectral frequency (Hz), and optional electrical signal voltage (mV).
 *
 * Calibration parameters derived from geophone seismic vibration signatures:
 * 1. Ambient Ground Noise: mag < 0.05 mm/s
 * 2. Human Footsteps / Walking: mag 0.05-0.35 mm/s, freq 1.0-8.0 Hz
 * 3. Light Vehicle / Car: mag 0.35-0.90 mm/s, freq 12.0-25.0 Hz
 * 4. Manual Digging / Shoveling: mag 0.90-1.60 mm/s, freq 5.0-15.0 Hz
 * 5. Agricultural Tractor: mag 1.60-2.80 mm/s, freq 18.0-35.0 Hz
 * 6. Heavy Articulated Truck: mag 2.80-4.50 mm/s, freq 10.0-28.0 Hz
 * 7. Bulldozer / Excavator Heavy Mining: mag > 4.50 mm/s (or heavy low-mid freq)
 */
export function classifyVibration(
  magnitudeMmS: number,
  frequencyHz: number,
  _vibrationRmsMv?: number,
): SourceClassification {
  const mag = Math.max(0, magnitudeMmS)
  const freq = Math.max(0, frequencyHz)

  // 1. Ambient Ground Noise (< 0.05 mm/s)
  if (mag < 0.05) {
    return {
      category: 'ambient',
      label: 'Ambient Ground Noise',
      shortLabel: 'Ambient',
      threatLevel: 'nominal',
      confidence: 98,
      description: 'Quiescent baseline ground motion. No activity detected.',
      iconName: 'wave',
      colorClass: 'text-zinc-400',
      badgeBg: 'bg-zinc-900/60',
      badgeText: 'text-zinc-400',
      badgeBorder: 'border-zinc-800',
    }
  }

  // 2. Human Footsteps / Walking (0.05 - 0.35 mm/s, low freq 1-9 Hz)
  if (mag <= 0.35 && (freq === 0 || freq <= 9.5)) {
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

  // 3. Light Vehicle / Car (0.35 - 0.90 mm/s, freq 10-26 Hz)
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

  // 4. Manual Digging / Shoveling (0.90 - 1.60 mm/s, freq 5-17 Hz)
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

  // 5. Agricultural Tractor (1.60 - 2.80 mm/s, freq 18-40 Hz)
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
  readingsMap: Map<string, { magnitudeMmS: number; frequencyHz: number; vibrationRmsMv?: number; updatedAt: number }>,
): SourceClassification {
  let maxMag = 0
  let matchedFreq = 0
  let matchedRms = 0
  const now = Date.now()

  for (const r of readingsMap.values()) {
    if (now - r.updatedAt <= 30_000 && r.magnitudeMmS > maxMag) {
      maxMag = r.magnitudeMmS
      matchedFreq = r.frequencyHz
      matchedRms = r.vibrationRmsMv ?? 0
    }
  }

  return classifyVibration(maxMag, matchedFreq, matchedRms)
}
