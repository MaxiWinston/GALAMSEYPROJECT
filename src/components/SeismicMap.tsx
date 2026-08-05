import { useEffect, useMemo, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { displayRadialBearing } from '../lib/geo'
import type { LatLng, MeshEdge, NodeReading, SensorNode } from '../types'

const RESERVE_CENTER: LatLng = [6.1050, -0.5850]
const DEFAULT_ZOOM = 11.5

function formatLatLng([lat, lng]: LatLng) {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(4)}°${ns}, ${Math.abs(lng).toFixed(4)}°${ew}`
}

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim()

function osmTiles() {
  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    tileSize: 256,
    zoomOffset: 0,
  }
}

function mapboxTiles(token: string) {
  return {
    url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`,
    attribution:
      '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    tileSize: 512,
    zoomOffset: -1,
  }
}

// ----- Placement click handler (mounted inside MapContainer) -----
function PlacementHandler({ onMapClick }: { onMapClick: (latlng: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

// ----- Cursor style injection -----
function PlacementCursor({ active }: { active: boolean }) {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.leaflet-container')
    if (!el) return
    el.style.cursor = active ? 'crosshair' : ''
    return () => { el.style.cursor = '' }
  }, [active])
  return null
}

type Props = {
  nodes: SensorNode[]
  readings: Map<string, NodeReading>
  meshEdges: MeshEdge[]
  estimate: LatLng | null
  confidence: number
  magnitudeFitRmse: number
  placementMode?: boolean
  onMapClick?: (latlng: LatLng) => void
}

export function SeismicMap({
  nodes,
  readings,
  meshEdges,
  estimate,
  confidence,
  magnitudeFitRmse,
  placementMode = false,
  onMapClick,
}: Props) {
  const [mapboxFailed, setMapboxFailed] = useState(false)
  const tiles = useMemo(() => {
    if (MAPBOX_TOKEN && !mapboxFailed) return mapboxTiles(MAPBOX_TOKEN)
    return osmTiles()
  }, [mapboxFailed])

  const meshLines = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n.position]))
    return meshEdges
      .map(([a, b]) => {
        const p = byId.get(a)
        const q = byId.get(b)
        if (!p || !q) return null
        return [p, q] as [LatLng, LatLng]
      })
      .filter((x): x is [LatLng, LatLng] => x !== null)
  }, [meshEdges, nodes])

  /** Radial rays: each geophone toward fused source */
  const radialLines = useMemo(() => {
    if (!estimate) return []
    return nodes.map((n) => [n.position, estimate] as [LatLng, LatLng])
  }, [estimate, nodes])

  return (
    <MapContainer
      center={RESERVE_CENTER}
      zoom={DEFAULT_ZOOM}
      className="z-0 h-full min-h-[420px] w-full"
      scrollWheelZoom
      preferCanvas
    >
      <TileLayer
        key={tiles.url}
        attribution={tiles.attribution}
        url={tiles.url}
        tileSize={tiles.tileSize}
        zoomOffset={tiles.zoomOffset}
        eventHandlers={{
          tileerror: () => {
            if (MAPBOX_TOKEN && !mapboxFailed) setMapboxFailed(true)
          },
        }}
      />

      {/* Placement mode handlers */}
      {placementMode && onMapClick && <PlacementHandler onMapClick={onMapClick} />}
      <PlacementCursor active={placementMode} />

      {meshLines.map((line, i) => (
        <Polyline
          key={i}
          positions={line.map(([lat, lng]) => L.latLng(lat, lng))}
          pathOptions={{
            color: '#3f3f46',
            weight: 2,
            opacity: 0.55,
            dashArray: '6 10',
          }}
        />
      ))}

      {radialLines.map((line, i) => (
        <Polyline
          key={`rad-${i}`}
          positions={line.map(([lat, lng]) => L.latLng(lat, lng))}
          pathOptions={{
            color: '#2dd4bf',
            weight: 1.5,
            opacity: 0.45,
            dashArray: '4 10',
          }}
        />
      ))}

      {nodes.map((n) => {
        const r = readings.get(n.id)
        const isOnline = r ? Date.now() - r.updatedAt < 30000 : false
        const mag = isOnline ? (r?.magnitudeMmS ?? 0) : 0
        const freq = r?.frequencyHz ?? 0
        const radius = 6 + Math.min(22, mag * 7)
        const hue = Math.max(0, Math.min(200, 120 - mag * 35))
        const fill = isOnline ? `hsl(${hue}, 85%, 48%)` : '#52525b'
        const radial = displayRadialBearing(n.position, r, estimate)

        return (
          <CircleMarker
            key={n.id}
            center={L.latLng(n.position[0], n.position[1])}
            radius={radius}
            pathOptions={{
              color: '#fafafa',
              weight: 1.5,
              fillColor: fill,
              fillOpacity: 0.82,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.95} permanent={false}>
              <span className="font-semibold text-zinc-900">{n.label}</span>
            </Tooltip>
            <Popup>
              <div className="min-w-[200px] text-zinc-900">
                <p className="font-semibold">{n.label}</p>
                <p className="mt-0.5 text-[10px] text-zinc-600">Geophone station · radial record</p>
                <dl className="mt-2 space-y-1.5 font-mono text-[11px] leading-snug">
                  {radial != null ? (
                    <div>
                      <dt className="text-zinc-500">Radial bearing</dt>
                      <dd>
                        {radial.toFixed(1)}° <span className="text-zinc-500">clockwise from N</span>
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-zinc-500">Vibration magnitude</dt>
                    <dd>
                      {mag.toFixed(3)} mm/s <span className="text-zinc-500">(peak or RMS)</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Dominant frequency</dt>
                    <dd>
                      {freq.toFixed(1)} Hz <span className="text-zinc-500">(e.g. FFT peak)</span>
                    </dd>
                  </div>
                  {r?.rssi != null ? (
                    <div>
                      <dt className="text-zinc-500">Link RSSI</dt>
                      <dd>
                        {r.rssi} dBm <span className="text-zinc-500">(mesh / radio to gateway)</span>
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-zinc-500">Position</dt>
                    <dd>{formatLatLng(n.position)}</dd>
                  </div>
                </dl>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}

      {estimate && (
        <CircleMarker
          center={L.latLng(estimate[0], estimate[1])}
          radius={14}
          pathOptions={{
            color: '#fbbf24',
            weight: 3,
            fillColor: '#f59e0b',
            fillOpacity: 0.35,
          }}
        >
          <Tooltip direction="bottom" offset={[0, 8]}>
            <span className="font-medium text-zinc-900">
              Fused source · {(confidence * 100).toFixed(0)}% model confidence
            </span>
          </Tooltip>
          <Popup>
            <div className="max-w-[220px] text-zinc-900">
              <p className="font-semibold">Fused source estimate</p>
              <p className="mt-0.5 text-[11px] text-zinc-600">
                From energy-weighted combination of sensor magnitudes (not TDOA).
              </p>
              <dl className="mt-2 space-y-1.5 font-mono text-[11px] leading-snug">
                <div>
                  <dt className="text-zinc-500">Coordinates</dt>
                  <dd>{formatLatLng(estimate)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Model confidence</dt>
                  <dd>
                    {(confidence * 100).toFixed(0)}%{' '}
                    <span className="text-zinc-500">(decay model fit, not a CI)</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Fit RMSE</dt>
                  <dd>
                    {magnitudeFitRmse.toFixed(2)} mm/s{' '}
                    <span className="text-zinc-500">(observed vs predicted magnitude)</span>
                  </dd>
                </div>
              </dl>
            </div>
          </Popup>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
