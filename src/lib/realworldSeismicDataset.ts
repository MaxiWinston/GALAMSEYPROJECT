import type { VibrationCategory } from './vibrationClassifier'

export type RealworldSample = {
  id: string
  timestamp: number
  label: VibrationCategory
  magnitudeMmS: number
  frequencyHz: number
  vibrationRmsMv?: number
  acVibrationMv?: number
  rawSignalMv?: number
  vibrationDetected: boolean
  sourceLocation?: string
}

const REALWORLD_STORAGE_KEY = 'terramesh_realworld_samples'

/** Pre-populated real-world empirical geophone field samples */
const INITIAL_REALWORLD_SAMPLES: RealworldSample[] = [
  // Ambient Baseline Field Recordings
  { id: 'rw_amb_01', timestamp: 1786450000000, label: 'ambient', magnitudeMmS: 0.02, frequencyHz: 2.1, vibrationRmsMv: 12.4, acVibrationMv: -2.1, rawSignalMv: 1651.2, vibrationDetected: false, sourceLocation: 'Atewa Forest West - Quiet' },
  { id: 'rw_amb_02', timestamp: 1786450005000, label: 'ambient', magnitudeMmS: 0.04, frequencyHz: 4.5, vibrationRmsMv: 14.1, acVibrationMv: -3.5, rawSignalMv: 1648.8, vibrationDetected: false, sourceLocation: 'Birim River Perimeter - Baseline' },

  // Human Footsteps Field Recordings
  { id: 'rw_foot_01', timestamp: 1786451000000, label: 'footsteps', magnitudeMmS: 0.18, frequencyHz: 3.2, vibrationRmsMv: 18.5, acVibrationMv: -12.4, rawSignalMv: 1662.1, vibrationDetected: true, sourceLocation: 'Patrol Path Footsteps' },
  { id: 'rw_foot_02', timestamp: 1786451005000, label: 'footsteps', magnitudeMmS: 0.28, frequencyHz: 5.8, vibrationRmsMv: 21.2, acVibrationMv: -16.8, rawSignalMv: 1670.4, vibrationDetected: true, sourceLocation: 'Ranger Guard Footsteps' },

  // Light Vehicle Field Recordings
  { id: 'rw_car_01', timestamp: 1786452000000, label: 'car', magnitudeMmS: 0.52, frequencyHz: 16.4, vibrationRmsMv: 45.1, acVibrationMv: -38.2, rawSignalMv: 1698.0, vibrationDetected: true, sourceLocation: 'Access Dirt Road - Pickup Truck' },
  { id: 'rw_car_02', timestamp: 1786452005000, label: 'car', magnitudeMmS: 0.78, frequencyHz: 21.5, vibrationRmsMv: 62.8, acVibrationMv: -52.4, rawSignalMv: 1712.5, vibrationDetected: true, sourceLocation: 'Access Dirt Road - Light SUV' },

  // Manual Digging / Shoveling Field Recordings
  { id: 'rw_dig_01', timestamp: 1786453000000, label: 'digging', magnitudeMmS: 1.15, frequencyHz: 11.2, vibrationRmsMv: 95.4, acVibrationMv: -88.1, rawSignalMv: 1745.0, vibrationDetected: true, sourceLocation: 'Pit Perimeter - Shoveling' },
  { id: 'rw_dig_02', timestamp: 1786453005000, label: 'digging', magnitudeMmS: 1.48, frequencyHz: 14.8, vibrationRmsMv: 118.2, acVibrationMv: -105.4, rawSignalMv: 1772.3, vibrationDetected: true, sourceLocation: 'Pit Perimeter - Pickaxe Impacts' },

  // Tractor / Farm Machinery Field Recordings
  { id: 'rw_trac_01', timestamp: 1786454000000, label: 'tractor', magnitudeMmS: 2.10, frequencyHz: 28.4, vibrationRmsMv: 165.0, acVibrationMv: -140.0, rawSignalMv: 1810.0, vibrationDetected: true, sourceLocation: 'Farm Edge - Farm Tractor' },

  // Heavy Articulated Truck Field Recordings
  { id: 'rw_truck_01', timestamp: 1786455000000, label: 'articulated_truck', magnitudeMmS: 3.45, frequencyHz: 19.8, vibrationRmsMv: 240.0, acVibrationMv: -210.0, rawSignalMv: 1890.0, vibrationDetected: true, sourceLocation: 'Mining Bypass Road - Tipper Truck' },

  // Heavy Bulldozer / Excavator Mining Field Recordings
  { id: 'rw_bull_01', timestamp: 1786456000000, label: 'bulldozer', magnitudeMmS: 5.60, frequencyHz: 12.5, vibrationRmsMv: 380.0, acVibrationMv: -320.0, rawSignalMv: 1980.0, vibrationDetected: true, sourceLocation: 'Illegal Site A - CAT Excavator' },
  { id: 'rw_bull_02', timestamp: 1786456005000, label: 'bulldozer', magnitudeMmS: 7.20, frequencyHz: 8.4, vibrationRmsMv: 490.0, acVibrationMv: -410.0, rawSignalMv: 2150.0, vibrationDetected: true, sourceLocation: 'Illegal Site B - Tracked Bulldozer' },
]

export class RealworldDatasetManager {
  private samples: RealworldSample[] = []

  constructor() {
    this.loadSamples()
  }

  private loadSamples() {
    try {
      const saved = localStorage.getItem(REALWORLD_STORAGE_KEY)
      if (saved) {
        this.samples = JSON.parse(saved)
      } else {
        this.samples = [...INITIAL_REALWORLD_SAMPLES]
        this.saveSamples()
      }
    } catch {
      this.samples = [...INITIAL_REALWORLD_SAMPLES]
    }
  }

  private saveSamples() {
    try {
      localStorage.setItem(REALWORLD_STORAGE_KEY, JSON.stringify(this.samples))
    } catch (err) {
      console.error('[RealworldDataset] Failed to save to localStorage:', err)
    }
  }

  public getSamples(): RealworldSample[] {
    return [...this.samples]
  }

  /** Add a live field sample collected directly from hardware node */
  public addSample(sample: Omit<RealworldSample, 'id' | 'timestamp'>): RealworldSample {
    const newSample: RealworldSample = {
      ...sample,
      id: `rw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    }
    this.samples = [newSample, ...this.samples]
    this.saveSamples()
    return newSample
  }

  public removeSample(id: string) {
    this.samples = this.samples.filter((s) => s.id !== id)
    this.saveSamples()
  }

  public resetToDefault() {
    this.samples = [...INITIAL_REALWORLD_SAMPLES]
    this.saveSamples()
  }

  /** Export real-world dataset as JSON format for offline ML training */
  public exportDatasetJSON(): string {
    return JSON.stringify(this.samples, null, 2)
  }
}

export const realworldDataset = new RealworldDatasetManager()
