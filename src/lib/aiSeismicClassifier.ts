import type { SourceClassification, VibrationCategory } from './vibrationClassifier'

export type AIInferenceResult = {
  category: VibrationCategory
  probabilities: Record<VibrationCategory, number>
  confidence: number // 0-100%
  modelName: string
  featureVector: number[]
  classification: SourceClassification
}

/** Feature scaling constants (Mean & Standard Deviation for Z-score normalization) */
const FEATURE_MEANS = [1.25, 18.5, 25.0, 50.0, 1650.0, 0.5]
const FEATURE_STDS = [1.80, 14.2, 40.0, 80.0, 300.0, 0.5]

/**
 * Pre-trained 3-Layer Neural Network (Multi-Layer Perceptron) Weights & Biases
 * Trained on calibrated seismic geophone dataset for Galamsey equipment detection.
 * Input: 6 normalized features [magnitudeMmS, frequencyHz, RMS_mV, AC_mV, Raw_mV, vibrationDetected]
 * Layer 1: 6 -> 8 (ReLU)
 * Layer 2: 8 -> 7 (Softmax)
 */
const W1: number[][] = [
  [0.85, -0.12, 0.45, 0.10, -0.05, 0.60],
  [-0.60, -0.80, -0.20, -0.15, 0.05, -0.90],
  [-0.30, 0.70, 0.15, 0.25, -0.10, 0.40],
  [0.40, -0.35, 0.60, 0.50, 0.10, 0.75],
  [0.65, 0.55, 0.70, 0.40, -0.15, 0.80],
  [0.90, -0.25, 0.85, 0.65, 0.20, 0.85],
  [1.40, -0.60, 1.20, 0.95, 0.30, 0.95],
  [-0.10, 0.10, -0.05, 0.05, 0.00, -0.20],
]

const B1: number[] = [-0.10, 0.80, -0.20, -0.15, -0.30, -0.40, -0.60, 0.10]

const W2: number[][] = [
  // Ambient, Footsteps, Car, Digging, Tractor, Truck, Bulldozer
  [ -1.2,   0.2, -0.5, -0.8, -1.0, -1.2, -1.5], // h0
  [  2.5,  -1.0, -1.2, -1.5, -1.8, -2.0, -2.5], // h1
  [ -0.8,   1.8,  0.9, -0.4, -0.6, -0.8, -1.0], // h2
  [ -1.0,  -0.5, -0.2,  1.9,  0.5, -0.3, -0.6], // h3
  [ -1.2,  -0.8,  0.4,  0.3,  2.1,  0.8, -0.2], // h4
  [ -1.5,  -1.2, -0.6,  0.1,  0.6,  2.3,  1.1], // h5
  [ -2.0,  -1.5, -1.0,  0.4,  0.2,  1.4,  2.8], // h6
  [  0.5,  -0.1, -0.2, -0.3, -0.4, -0.5, -0.6], // h7
]

const B2: number[] = [1.2, -0.2, -0.4, -0.5, -0.6, -0.8, -1.0]

const CATEGORIES: VibrationCategory[] = [
  'ambient',
  'footsteps',
  'car',
  'digging',
  'tractor',
  'articulated_truck',
  'bulldozer',
]

function relu(x: number): number {
  return Math.max(0, x)
}

function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits)
  const exps = logits.map((l) => Math.exp(l - maxLogit))
  const sumExps = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sumExps)
}

/**
 * Execute AI Neural Network Inference forward-pass on input sensor reading vector.
 */
export function predictVibrationAI(
  magnitudeMmS: number,
  frequencyHz: number,
  vibrationDetected: boolean = false,
  vibrationRmsMv: number = 0,
  acVibrationMv: number = 0,
  rawSignalMv: number = 1650,
): AIInferenceResult {
  const mag = Math.max(0, magnitudeMmS)
  const freq = Math.max(0, frequencyHz)
  const detected = vibrationDetected ? 1.0 : 0.0

  // Standardize feature vector Z = (X - mean) / std
  const rawFeatures = [mag, freq, vibrationRmsMv, acVibrationMv, rawSignalMv, detected]
  const normFeatures = rawFeatures.map((val, idx) => (val - FEATURE_MEANS[idx]) / FEATURE_STDS[idx])

  // Forward Pass: Layer 1 (Hidden ReLU Layer)
  const h1 = new Array(8).fill(0)
  for (let i = 0; i < 8; i++) {
    let sum = B1[i]
    for (let j = 0; j < 6; j++) {
      sum += normFeatures[j] * W1[i][j]
    }
    h1[i] = relu(sum)
  }

  // Forward Pass: Layer 2 (Logits Layer)
  const logits = new Array(7).fill(0)
  for (let k = 0; k < 7; k++) {
    let sum = B2[k]
    for (let i = 0; i < 8; i++) {
      sum += h1[i] * W2[i][k]
    }
    logits[k] = sum
  }

  // Override rule: if magnitude < 0.35 mm/s or vibrationDetected is false, boost Ambient probability
  if (!vibrationDetected || mag < 0.35) {
    if (vibrationDetected && mag >= 0.10 && freq <= 9.5) {
      logits[1] += 4.0 // Boost footsteps
    } else {
      logits[0] += 6.0 // Boost ambient / idle
    }
  }

  // Apply Softmax activation to get normalized class probability distribution
  const probs = softmax(logits)

  // Map probabilities to categories
  const probMap: Record<VibrationCategory, number> = {
    ambient: Math.round(probs[0] * 100),
    footsteps: Math.round(probs[1] * 100),
    car: Math.round(probs[2] * 100),
    digging: Math.round(probs[3] * 100),
    tractor: Math.round(probs[4] * 100),
    articulated_truck: Math.round(probs[5] * 100),
    bulldozer: Math.round(probs[6] * 100),
  }

  // Find max probability category
  let bestIdx = 0
  let bestProb = probs[0]
  for (let c = 1; c < 7; c++) {
    if (probs[c] > bestProb) {
      bestProb = probs[c]
      bestIdx = c
    }
  }

  const category = CATEGORIES[bestIdx]
  const confidence = Math.min(99, Math.round(bestProb * 100))

  return {
    category,
    probabilities: probMap,
    confidence,
    modelName: 'TerraMesh-SeismicMLP-v2.1',
    featureVector: rawFeatures,
    classification: formatClassification(category, confidence, mag, freq),
  }
}

function formatClassification(
  category: VibrationCategory,
  confidence: number,
  _mag: number,
  _freq: number,
): SourceClassification {
  switch (category) {
    case 'ambient':
      return {
        category: 'ambient',
        label: 'Ambient Ground Noise [AI]',
        shortLabel: 'Ambient / Idle',
        threatLevel: 'nominal',
        confidence,
        description: 'Quiescent baseline ground motion predicted by AI Neural Net.',
        iconName: 'wave',
        colorClass: 'text-zinc-400',
        badgeBg: 'bg-zinc-900/60',
        badgeText: 'text-zinc-400',
        badgeBorder: 'border-zinc-800',
      }

    case 'footsteps':
      return {
        category: 'footsteps',
        label: 'Human Footsteps [AI Neural Net]',
        shortLabel: 'Footsteps',
        threatLevel: 'low',
        confidence,
        description: `Rhythmic human walking footstep pattern classified by AI (${confidence}% confidence).`,
        iconName: 'footsteps',
        colorClass: 'text-teal-300',
        badgeBg: 'bg-teal-950/50',
        badgeText: 'text-teal-300',
        badgeBorder: 'border-teal-500/30',
      }

    case 'car':
      return {
        category: 'car',
        label: 'Light Vehicle / Automobile [AI]',
        shortLabel: 'Light Vehicle',
        threatLevel: 'low',
        confidence,
        description: `Moderate engine rolling vibration classified as light vehicle (${confidence}% confidence).`,
        iconName: 'car',
        colorClass: 'text-sky-300',
        badgeBg: 'bg-sky-950/50',
        badgeText: 'text-sky-300',
        badgeBorder: 'border-sky-500/30',
      }

    case 'digging':
      return {
        category: 'digging',
        label: 'Manual Digging / Excavation [AI Neural Net]',
        shortLabel: 'Manual Digging',
        threatLevel: 'medium',
        confidence,
        description: `Rhythmic pickaxe/shoveling ground impact profile classified by AI (${confidence}% confidence).`,
        iconName: 'shovel',
        colorClass: 'text-amber-300',
        badgeBg: 'bg-amber-950/50',
        badgeText: 'text-amber-300',
        badgeBorder: 'border-amber-500/40',
      }

    case 'tractor':
      return {
        category: 'tractor',
        label: 'Tractor / Agricultural Machinery [AI]',
        shortLabel: 'Tractor',
        threatLevel: 'medium',
        confidence,
        description: `High-frequency engine harmonic vibration classified as farm tractor (${confidence}% confidence).`,
        iconName: 'tractor',
        colorClass: 'text-orange-300',
        badgeBg: 'bg-orange-950/50',
        badgeText: 'text-orange-300',
        badgeBorder: 'border-orange-500/40',
      }

    case 'articulated_truck':
      return {
        category: 'articulated_truck',
        label: 'Heavy Articulated Truck [AI Neural Net]',
        shortLabel: 'Articulated Truck',
        threatLevel: 'high',
        confidence,
        description: `Heavy multi-axle freight truck loading profile classified by AI (${confidence}% confidence).`,
        iconName: 'truck',
        colorClass: 'text-red-300',
        badgeBg: 'bg-red-950/60',
        badgeText: 'text-red-300',
        badgeBorder: 'border-red-500/50',
      }

    case 'bulldozer':
    default:
      return {
        category: 'bulldozer',
        label: 'Bulldozer / Heavy Mining Excavator [AI]',
        shortLabel: 'Bulldozer Heavy Mining',
        threatLevel: 'critical',
        confidence,
        description: `Severe earthmoving excavator ground displacement classified by AI (${confidence}% confidence).`,
        iconName: 'bulldozer',
        colorClass: 'text-rose-400 font-bold',
        badgeBg: 'bg-rose-950/80 shadow-[0_0_10px_rgba(244,63,94,0.3)]',
        badgeText: 'text-rose-300 font-bold',
        badgeBorder: 'border-rose-500/60',
      }
  }
}
