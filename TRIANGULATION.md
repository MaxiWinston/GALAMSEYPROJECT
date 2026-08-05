# How the fused “source” on the map is computed

Code: `src/lib/geo.ts` → `estimateSourceFromMesh`. Types and field meanings: `src/types.ts`.

---

## Parameter reference (what each number means)

### Per sensor (each ESP32 / gateway message)

| Field / UI label | Unit | Meaning |
|------------------|------|--------|
| **Vibration magnitude** | **mm/s** | How strong the ground is shaking at that node, as a **scalar** (e.g. **peak** or **RMS** vibration velocity in the band you care about). Same *kind* of quantity as common “mm/s” machinery vibration specs—not raw g without calibration. |
| **Dominant frequency** | **Hz** | The **main frequency line** in your processing (e.g. strongest FFT bin or band-pass centroid). Used for display and future rules; **the fusion pin does not use frequency yet**—only magnitude + positions. |
| **RSSI** (optional) | **dBm** | How strong the **radio link** is from that node toward the gateway (Wi‑Fi, LoRa, etc.). **Not** ground vibration—only mesh / connectivity diagnostics. |
| **Distance to fused pin** | **km** | **Great-circle distance** on Earth from that sensor’s GPS fix to the **amber estimated source** on the map. Helps you see which nodes drive the estimate. |

### Network summary (header cards)

| Label | Meaning |
|-------|--------|
| **Peak vibration (any sensor)** | The **largest** `magnitudeMmS` among all nodes **right now**. One number to spot network-wide spikes. |
| **mm/s — particle-velocity style scalar** | Reminder that the value is in **millimetres per second**, a vibration **velocity** level, not a map distance. |
| **Status: nominal / elevated / critical** | Simple **threshold bands** on that peak: &lt; 1.6 → nominal, 1.6–2.8 → elevated, ≥ 2.8 → critical. Tune in `useSeismicMesh` if your baselines differ. |

### Fused source (amber marker + chip)

| Label | Meaning |
|-------|--------|
| **Fused source** | The **estimated geographic point** where the algorithm places the “source” after combining all qualifying node magnitudes (see algorithm below). |
| **Model confidence** (0–100%) | **Not** a formal statistical confidence interval. It is `1 - (RMSE / 2)` capped to 0–1, where RMSE measures how well a simple **distance-decay** model matches observed magnitudes at that point. **Higher ⇒ the 1/d² story fits the data better.** |
| **Fit RMSE** | **Root-mean-square error** between **observed** magnitudes (mm/s) and **model-predicted** magnitudes (mm/s) at the fused location. **Lower is better.** This is **not** an error measured in kilometres (older code wrongly called this “residual km”). |

### Mesh drawing

| Label | Meaning |
|-------|--------|
| **Mesh links** | Lines between each node and its **k = 3** nearest neighbors (by Haversine distance). **Visualization only**—the math does not use the graph edges, only each node’s position and magnitude. |

---

## Algorithm (short)

1. Drop readings at or near **background** (`magnitude ≤ ambient + 0.02`; default `ambient = 0.15` mm/s).
2. Require **≥ 3** nodes above that floor.
3. **Position estimate** = weighted average of node coordinates, weight = `(magnitude − ambient)²` on excess energy.
4. **Fit RMSE** = after fixing that point, fit a **scale × 1/d² + ambient** curve to magnitudes and take RMSE of residuals in **mm/s**.
5. **Model confidence** derived from that RMSE as above.

This is **energy-weighted fusion**, not **TDOA triangulation**. For production seismic-style localization, add **synchronized timestamps** and solve **time differences of arrival**.

---

## Tuning (code)

- **`ambient`** in `estimateSourceFromMesh` — raise if idle sites always read “noisy” so they do not dominate.
- **Alert thresholds** — `networkMaxMag` comparisons in `useSeismicMesh` (`alertLevel`).
