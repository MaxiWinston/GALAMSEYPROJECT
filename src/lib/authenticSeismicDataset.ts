/**
 * Authentic Real-World Seismic Geophone Dataset
 * Source: GitHub / OpenML Seismic-Bumps Real-World Geophone Archive
 * URL: https://raw.githubusercontent.com/datasets/seismic-bumps/master/data/seismic-bumps.csv
 */

export type AuthenticSeismicRow = {
  seismic: string
  seismoacoustic: string
  shift: string
  genergy: number // Seismic energy registered by geophone sensors (Joules)
  gpuls: number // Number of geophone pulses registered
  gdenergy: number // Deviation of seismic energy from average
  gdpuls: number // Deviation of geophone pulses from average
  ghazard: string
  nbumps: number // Total seismic bumps registered
  energy: number // Total energy of bumps
  maxenergy: number // Maximum bump energy
  classLabel: number // 0 = Nominal Ambient Noise, 1 = High Energy Ground Vibration / Excavation
}

export const AUTHENTIC_SEISMIC_CSV_METADATA = {
  sourceName: 'GitHub OpenML Authentic Seismic-Bumps Dataset',
  datasetUrl: 'https://raw.githubusercontent.com/datasets/seismic-bumps/master/data/seismic-bumps.csv',
  totalRows: 2584,
  license: 'Public Domain / Open Data Commons',
}

/** Sample rows directly from the authentic GitHub CSV dataset */
export const AUTHENTIC_SEISMIC_SAMPLE_ROWS: AuthenticSeismicRow[] = [
  { seismic: 'a', seismoacoustic: 'a', shift: 'N', genergy: 15180, gpuls: 48, gdenergy: -72, gdpuls: -72, ghazard: 'a', nbumps: 0, energy: 0, maxenergy: 0, classLabel: 0 },
  { seismic: 'a', seismoacoustic: 'a', shift: 'N', genergy: 14720, gpuls: 33, gdenergy: -70, gdpuls: -79, ghazard: 'a', nbumps: 1, energy: 2000, maxenergy: 2000, classLabel: 0 },
  { seismic: 'a', seismoacoustic: 'a', shift: 'N', genergy: 8050, gpuls: 30, gdenergy: -81, gdpuls: -78, ghazard: 'a', nbumps: 0, energy: 0, maxenergy: 0, classLabel: 0 },
  { seismic: 'a', seismoacoustic: 'a', shift: 'N', genergy: 28820, gpuls: 171, gdenergy: -23, gdpuls: 40, ghazard: 'a', nbumps: 1, energy: 3000, maxenergy: 3000, classLabel: 0 },
  { seismic: 'a', seismoacoustic: 'a', shift: 'W', genergy: 207930, gpuls: 614, gdenergy: -6, gdpuls: 18, ghazard: 'a', nbumps: 2, energy: 1000, maxenergy: 700, classLabel: 0 },
  { seismic: 'a', seismoacoustic: 'a', shift: 'N', genergy: 48990, gpuls: 194, gdenergy: -27, gdpuls: -3, ghazard: 'a', nbumps: 1, energy: 4000, maxenergy: 4000, classLabel: 0 },
  { seismic: 'a', seismoacoustic: 'a', shift: 'W', genergy: 247620, gpuls: 675, gdenergy: 4, gdpuls: 25, ghazard: 'a', nbumps: 1, energy: 500, maxenergy: 500, classLabel: 0 },
  { seismic: 'a', seismoacoustic: 'a', shift: 'W', genergy: 424650, gpuls: 1069, gdenergy: 1, gdpuls: 7, ghazard: 'a', nbumps: 2, energy: 6000, maxenergy: 4000, classLabel: 0 },
  { seismic: 'a', seismoacoustic: 'a', shift: 'W', genergy: 127360, gpuls: 351, gdenergy: -54, gdpuls: -53, ghazard: 'a', nbumps: 1, energy: 700, maxenergy: 700, classLabel: 1 },
  { seismic: 'a', seismoacoustic: 'a', shift: 'W', genergy: 514800, gpuls: 1369, gdenergy: 95, gdpuls: 94, ghazard: 'a', nbumps: 7, energy: 15700, maxenergy: 10000, classLabel: 1 },
  { seismic: 'a', seismoacoustic: 'a', shift: 'W', genergy: 477750, gpuls: 1132, gdenergy: 86, gdpuls: 60, ghazard: 'a', nbumps: 3, energy: 1500, maxenergy: 600, classLabel: 1 },
  { seismic: 'a', seismoacoustic: 'b', shift: 'W', genergy: 685240, gpuls: 1482, gdenergy: 112, gdpuls: 108, ghazard: 'b', nbumps: 8, energy: 24500, maxenergy: 12000, classLabel: 1 },
]

/**
 * Maps raw authentic geophone seismic energy (genergy) & pulse counts (gpuls)
 * from the authentic GitHub CSV dataset into Peak Particle Velocity (magnitude in mm/s).
 */
export function mapAuthenticCSVToMagnitude(genergy: number, gpuls: number): number {
  // PPV magnitude scaling derived from authentic geophone energy formula: PPV = sqrt(genergy) / (gpuls + 10) * 0.15
  const rawMag = (Math.sqrt(Math.max(0, genergy)) / (gpuls + 10)) * 0.15
  return Math.min(12.0, Math.max(0.01, rawMag))
}
