// components/composables/useCoastSnap.js
// Georreferenciación Inteligente (Actividad 2.2):
// Proyecta cada marcador al punto más cercano sobre la línea de costa,
// obtenida de OpenStreetMap via la API Overpass.
//
// Flujo de estados:
//   idle → loading → snapping → preview → (confirmar) → done
//                                        → (cancelar)  → idle

import { ref } from 'vue'
import L from 'leaflet'

export function useCoastSnap() {
  const snapStatus = ref('') // '', 'loading', 'snapping', 'preview', 'done', 'error'
  const snapMessage = ref('')

  // Array de propuestas: [{ feature, newLon, newLat, origLon, origLat }]
  const snapProposals = ref([])

  // Capas Leaflet del preview (líneas + marcadores ghost)
  let previewLayers = []

  // ── Overpass ──────────────────────────────────────────────────────────────

  /**
   * Fetches coastline ways from OpenStreetMap Overpass API
   * within the given bounding box, and returns an array of
   * coordinate pairs [[lat, lon], ...] representing all segments.
   */
  async function fetchCoastlineSegments(south, west, north, east) {
    const pad = 0.05
    const bbox = `${south - pad},${west - pad},${north + pad},${east + pad}`
    const query = `[out:json][timeout:30];way["natural"="coastline"](${bbox});(._; >;);out body;`
    const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
    const response = await fetch(`${apiUrl}/api/overpass/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })
    if (!response.ok) throw new Error(`Overpass API error: ${response.status}`)
    const data = await response.json()

    const nodeMap = {}
    for (const el of data.elements) {
      if (el.type === 'node') {
        nodeMap[el.id] = { lat: el.lat, lon: el.lon }
      }
    }

    const segments = []
    for (const el of data.elements) {
      if (el.type === 'way' && el.nodes) {
        const coords = el.nodes.map((nid) => nodeMap[nid]).filter(Boolean)
        if (coords.length >= 2) segments.push(coords)
      }
    }
    return segments
  }

  // ── Geometría ─────────────────────────────────────────────────────────────

  function projectPointOnSegment(pLat, pLon, aLat, aLon, bLat, bLon) {
    const dx = bLon - aLon
    const dy = bLat - aLat
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return { lat: aLat, lon: aLon, distSq: squaredDist(pLat, pLon, aLat, aLon) }
    let t = ((pLon - aLon) * dx + (pLat - aLat) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
    const qLon = aLon + t * dx
    const qLat = aLat + t * dy
    return { lat: qLat, lon: qLon, distSq: squaredDist(pLat, pLon, qLat, qLon) }
  }

  function squaredDist(lat1, lon1, lat2, lon2) {
    const dlat = lat2 - lat1
    const dlon = lon2 - lon1
    const cosLat = Math.cos((lat1 * Math.PI) / 180)
    return dlat * dlat + (dlon * cosLat) * (dlon * cosLat)
  }

  function nearestCoastPoint(pLat, pLon, coastSegments) {
    let best = null
    for (const segment of coastSegments) {
      for (let i = 0; i < segment.length - 1; i++) {
        const a = segment[i]
        const b = segment[i + 1]
        const proj = projectPointOnSegment(pLat, pLon, a.lat, a.lon, b.lat, b.lon)
        if (best === null || proj.distSq < best.distSq) best = proj
      }
    }
    return best
  }

  // ── Preview Leaflet layers ─────────────────────────────────────────────────

  /**
   * Draws ghost markers and connector lines for each proposal on the map.
   * @param {Ref<L.Map>} mapRef - the reactive ref wrapping the Leaflet map instance
   */
  function drawPreview(mapRef) {
    clearPreviewLayers(mapRef)
    const leafletMap = mapRef?.value
    if (!leafletMap) return

    for (const p of snapProposals.value) {
      // Original position: semitransparent grey circle
      const origMarker = L.circleMarker([p.origLat, p.origLon], {
        radius: 7,
        color: '#94a3b8',
        fillColor: '#94a3b8',
        fillOpacity: 0.35,
        opacity: 0.7,
        weight: 1.5,
        dashArray: '3 3',
      }).addTo(leafletMap)

      // New position: bright accent circle
      const newMarker = L.circleMarker([p.newLat, p.newLon], {
        radius: 7,
        color: '#22d3ee',
        fillColor: '#22d3ee',
        fillOpacity: 0.5,
        opacity: 0.9,
        weight: 2,
      }).addTo(leafletMap)

      // Connector line
      const line = L.polyline(
        [
          [p.origLat, p.origLon],
          [p.newLat, p.newLon],
        ],
        {
          color: '#22d3ee',
          weight: 1,
          opacity: 0.55,
          dashArray: '4 5',
        },
      ).addTo(leafletMap)

      previewLayers.push(origMarker, newMarker, line)
    }
  }

  function clearPreviewLayers(mapRef) {
    const leafletMap = mapRef?.value
    for (const layer of previewLayers) {
      try {
        if (leafletMap) leafletMap.removeLayer(layer)
        else layer.remove()
      } catch (_) {}
    }
    previewLayers = []
  }

  // ── API persistence ────────────────────────────────────────────────────────

  async function persistFeatureLocation(feature) {
    const imageId = feature.properties.image_id
    const lat = feature.geometry.coordinates[1]
    const lon = feature.geometry.coordinates[0]
    const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
    try {
      const response = await fetch(
        `${baseUrl}/api/images/${imageId}/location/`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: lat, longitude: lon }),
        },
      )
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        console.error(`[useCoastSnap] Backend error for location of image ID ${imageId}:`, err)
      }
    } catch (e) {
      console.error(`[useCoastSnap] Network error for location of image ID ${imageId}:`, e)
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Phase 1: Compute proposals and show preview. Does NOT mutate feature coordinates.
   *
   * @param {Ref} geoJsonData - the reactive GeoJSON ref from useCampaign
   * @param {Ref} mapRef      - the reactive ref wrapping the Leaflet map instance
   */
  async function snapAllToCoast(geoJsonData, mapRef) {
    if (!geoJsonData.value?.features?.length) {
      snapStatus.value = 'error'
      snapMessage.value = 'No hay marcadores cargados.'
      return
    }

    const mappedFeatures = geoJsonData.value.features.filter(
      (f) =>
        f.geometry?.coordinates?.length === 2 &&
        !(f.properties.gps_matched === false && !f.properties.manual_placement),
    )

    if (mappedFeatures.length === 0) {
      snapStatus.value = 'error'
      snapMessage.value = 'No hay marcadores ubicados en el mapa.'
      return
    }

    // Bounding box
    let south = Infinity, north = -Infinity, west = Infinity, east = -Infinity
    for (const f of mappedFeatures) {
      const [lon, lat] = f.geometry.coordinates
      if (lat < south) south = lat
      if (lat > north) north = lat
      if (lon < west) west = lon
      if (lon > east) east = lon
    }

    snapStatus.value = 'loading'
    snapMessage.value = 'Descargando datos de la línea de costa...'

    let coastSegments
    try {
      coastSegments = await fetchCoastlineSegments(south, west, north, east)
    } catch (err) {
      snapStatus.value = 'error'
      snapMessage.value = `Error al obtener la costa: ${err.message}`
      console.error('[useCoastSnap] fetchCoastlineSegments error:', err)
      return
    }

    if (coastSegments.length === 0) {
      snapStatus.value = 'error'
      snapMessage.value = 'No se encontró línea de costa en el área de los marcadores.'
      return
    }

    snapStatus.value = 'snapping'
    snapMessage.value = `Calculando proyecciones sobre ${coastSegments.reduce((s, seg) => s + seg.length - 1, 0)} segmentos de costa...`

    await new Promise((r) => setTimeout(r, 50))

    // Build proposals — NO mutations yet
    const proposals = []
    for (const feature of mappedFeatures) {
      const [origLon, origLat] = feature.geometry.coordinates
      const nearest = nearestCoastPoint(origLat, origLon, coastSegments)
      if (nearest) {
        proposals.push({
          feature,
          origLat,
          origLon,
          newLat: nearest.lat,
          newLon: nearest.lon,
        })
      }
    }

    snapProposals.value = proposals

    if (proposals.length === 0) {
      snapStatus.value = 'error'
      snapMessage.value = 'No se pudieron calcular nuevas posiciones.'
      return
    }

    // Draw preview on the map
    drawPreview(mapRef)

    snapStatus.value = 'preview'
    snapMessage.value = `${proposals.length} marcadores serán ajustados a la costa. ¿Confirmar?`
  }

  /**
   * Phase 2a: Apply proposals, persist to backend, clean up.
   *
   * @param {Ref} mapRef        - the reactive ref wrapping the Leaflet map instance
   * @param {Function} renderMarkers - re-render function from useCampaign
   */
  async function confirmSnap(mapRef, renderMarkers) {
    clearPreviewLayers(mapRef)

    // Capture before clearing
    const proposals = snapProposals.value.slice()

    for (const p of proposals) {
      p.feature.geometry.coordinates = [p.newLon, p.newLat]
      p.feature.properties.manual_placement = true
      if (p.feature.properties.gps) {
        p.feature.properties.gps.latitude = p.newLat
        p.feature.properties.gps.longitude = p.newLon
      }
    }

    renderMarkers()

    snapStatus.value = 'done'
    snapMessage.value = `${proposals.length} marcadores ajustados a la costa.`
    snapProposals.value = []

    // Persist all affected features to the backend (fire-and-forget per feature)
    Promise.all(
      proposals.map(async (p) => {
        // Coast snap ONLY changes location, but we persist both just in case,
        // or just persist location.
        await persistFeatureLocation(p.feature)
      })
    ).catch(
      (e) => console.error('[useCoastSnap] confirmSnap persistence error:', e),
    )

    setTimeout(() => {
      snapStatus.value = ''
      snapMessage.value = ''
    }, 4000)
  }

  /**
   * Phase 2b: Discard proposals, clean up preview layers.
   *
   * @param {Ref} mapRef - the reactive ref wrapping the Leaflet map instance
   */
  function cancelSnap(mapRef) {
    clearPreviewLayers(mapRef)
    snapProposals.value = []
    snapStatus.value = ''
    snapMessage.value = ''
  }

  function dismissSnap() {
    snapStatus.value = ''
    snapMessage.value = ''
  }

  return {
    snapStatus,
    snapMessage,
    snapProposals,
    snapAllToCoast,
    confirmSnap,
    cancelSnap,
    dismissSnap,
  }
}
