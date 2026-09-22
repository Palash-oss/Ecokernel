import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker,
} from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Zap, Activity, Clock, Layers, Eye, EyeOff, Radio } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// ─── Leaflet default icon fix ──────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ─── Tile Layers — ALL FREE, NO API KEY ───────────────────
const TILE_LAYERS = {
  light: {
    label: 'Light',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  dark: {
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    label: 'Dark',
    attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
  },
  terrain: {
    label: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
};

// ─── Icon Factories ────────────────────────────────────────
const createCustomIcon = (color, pulse = false) =>
  L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="pin-marker ${pulse ? 'pin-pulse' : ''}" style="background:${color};box-shadow:0 0 ${pulse ? 20 : 10}px ${color}80"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const createNetworkNodeIcon = (color, label) =>
  L.divIcon({
    className: 'network-node-wrapper',
    html: `
      <div class="network-node" style="border-color:${color}">
        <div class="network-node-core" style="background:${color}"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

const vehicleIcon = L.divIcon({
  className: 'vehicle-sim-icon',
  html: `<div class="vehicle-pulse-dot">🚛</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const liveGpsIcon = L.divIcon({
  className: 'live-gps-icon',
  html: `<div class="live-gps-dot"><div class="live-gps-ring"></div></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const originIcon = createCustomIcon('#10b981', true);
const destIcon = createCustomIcon('#f43f5e', true);

// ─── Smooth Arc Geometry (20-point great-circle) ──────────
function interpolateGreatCircle(lat1, lng1, lat2, lng2, steps = 22) {
  const toRad = d => (d * Math.PI) / 180;
  const toDeg = r => (r * 180) / Math.PI;
  const φ1 = toRad(lat1), λ1 = toRad(lng1);
  const φ2 = toRad(lat2), λ2 = toRad(lng2);
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((φ2 - φ1) / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
  ));
  if (d < 0.001) return [[lat1, lng1], [lat2, lng2]];
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    pts.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))]);
  }
  return pts;
}

// ─── Map Fit Bounds ────────────────────────────────────────
const FitBounds = ({ routePoints }) => {
  const map = useMap();
  useEffect(() => {
    if (routePoints && routePoints.length > 1) {
      map.fitBounds(L.latLngBounds(routePoints), { padding: [60, 60], animate: true, duration: 1.4 });
    }
  }, [routePoints, map]);
  return null;
};

// ─── Tile Layer Switcher ───────────────────────────────────
const DynamicTileLayer = ({ tileStyle }) => {
  const layer = TILE_LAYERS[tileStyle] || TILE_LAYERS.light;
  return <TileLayer url={layer.url} attribution={layer.attribution} maxZoom={layer.maxZoom} />;
};

// ─── Animated Freight Particle Along Route ─────────────────
const FreightParticle = ({ routePoints, color = '#10b981', delay = 0 }) => {
  const [pos, setPos] = useState(null);
  const stepRef = useRef(delay % Math.max(routePoints.length, 1));

  useEffect(() => {
    if (!routePoints || routePoints.length === 0) return;
    const interval = setInterval(() => {
      stepRef.current = (stepRef.current + 1) % routePoints.length;
      setPos(routePoints[stepRef.current]);
    }, 280);
    return () => clearInterval(interval);
  }, [routePoints]);

  if (!pos) return null;
  return (
    <CircleMarker
      center={pos}
      radius={5}
      pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: 0 }}
    />
  );
};

// ─── Main MapView ──────────────────────────────────────────
const MapView = ({ network, origin, destination, activeRoute, optimisationParams }) => {
  const defaultCenter = [22.5, 80.5];
  const defaultZoom = 5;

  const [tileStyle, setTileStyle] = useState('light');
  const [showNetwork, setShowNetwork] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [liveGps, setLiveGps] = useState(null);
  const [telemetryVehicles, setTelemetryVehicles] = useState([]);

  // Live GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      pos => setLiveGps([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // WebSocket Live Telemetry Stream
  useEffect(() => {
    let ws = null;
    try {
      ws = new WebSocket('ws://localhost:8001/ws/telemetry');
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'TELEMETRY_STREAM' && data.vehicles) {
            setTelemetryVehicles(data.vehicles);
          }
        } catch (e) {}
      };
      ws.onerror = (err) => console.warn("WebSocket telemetry offline:", err);
    } catch (err) {}

    return () => {
      if (ws) ws.close();
    };
  }, []);


  const customOrigin = optimisationParams?.origin_lat
    ? { lat: optimisationParams.origin_lat, lng: optimisationParams.origin_lng, name: optimisationParams.origin }
    : null;
  const customDest = optimisationParams?.dest_lat
    ? { lat: optimisationParams.dest_lat, lng: optimisationParams.dest_lng, name: optimisationParams.destination }
    : null;

  // Build route polylines
  let routeLines = [];
  let routePointsForBounds = [];
  let allRoutePoints = [];

  if (activeRoute?.segments) {
    activeRoute.segments.forEach(segment => {
      let color = '#34d399';
      let weight = 5;
      let dashArray = null;

      if (segment.mode === 'rail') { color = '#10b981'; dashArray = '6, 8'; weight = 5; }

      else if (segment.mode === 'electric') { color = '#a3e635'; weight = 5; }
      else if (segment.disruption) { color = '#ef4444'; dashArray = '10, 10'; weight = 5; }
      else {
        const intensity = segment.co2_kg / Math.max(segment.distance_km, 1);
        color = intensity > 0.3 ? '#f97316' : intensity > 0.15 ? '#f59e0b' : '#10b981';
      }

      let latLngs = [];
      if (segment.geometry && segment.geometry.length > 2) {
        // Real geometry from OSRM — use it directly
        latLngs = segment.geometry.map(c => [c[1], c[0]]);
      } else if (segment.geometry && segment.geometry.length === 2) {
        // Only start+end — interpolate smooth great-circle arc
        const [s, e] = segment.geometry;
        latLngs = interpolateGreatCircle(s[1], s[0], e[1], e[0], 24);
      } else {
        // No geometry — build from known coords
        const findCoords = (cityName) => {
          if (!network?.nodes) return null;
          const n = network.nodes.find(nd => nd.name.toLowerCase() === cityName?.toLowerCase());
          return n ? [n.lat, n.lng] : null;
        };
        const startC = customOrigin && segment.from_city === customOrigin.name
          ? [customOrigin.lat, customOrigin.lng]
          : findCoords(segment.from_city);
        const endC = customDest && segment.to_city === customDest.name
          ? [customDest.lat, customDest.lng]
          : findCoords(segment.to_city);
        if (startC && endC) {
          latLngs = interpolateGreatCircle(startC[0], startC[1], endC[0], endC[1], 24);
        }
      }

      if (latLngs.length > 0) {
        routeLines.push({ positions: latLngs, color, weight, dashArray, info: segment });
        routePointsForBounds.push(...latLngs);
        allRoutePoints.push(...latLngs);
      }
    });
  }

  // Origin / destination pins
  let startPos = null, endPos = null;
  if (activeRoute?.segments?.length > 0) {
    const firstSeg = activeRoute.segments[0];
    const lastSeg = activeRoute.segments[activeRoute.segments.length - 1];
    const findNodeCoords = cityName => {
      const n = network?.nodes?.find(nd => nd.name.toLowerCase() === cityName?.toLowerCase());
      return n ? [n.lat, n.lng] : null;
    };
    startPos = firstSeg.geometry?.length > 0
      ? [firstSeg.geometry[0][1], firstSeg.geometry[0][0]]
      : (customOrigin ? [customOrigin.lat, customOrigin.lng] : findNodeCoords(firstSeg.from_city));
    endPos = lastSeg.geometry?.length > 0
      ? [lastSeg.geometry[lastSeg.geometry.length - 1][1], lastSeg.geometry[lastSeg.geometry.length - 1][0]]
      : (customDest ? [customDest.lat, customDest.lng] : findNodeCoords(lastSeg.to_city));
  }

  // Region colors for network nodes
  const regionColor = (region) => {
    const map = { North: '#60a5fa', South: '#34d399', East: '#fbbf24', West: '#a78bfa', Central: '#fb7185' };
    return map[region] || '#94a3b8';
  };

  return (
    <div className="map-wrapper">
      {/* HUD Overlay */}
      <div className="map-hud-overlay">
        <div className="hud-badge">
          <Activity size={14} className="text-emerald" style={{ color: '#10b981' }} />
          <span>GIS VECTOR TELEMETRY</span>
          <span className="hud-live-dot" />
        </div>
        {activeRoute && (
          <div className="hud-stats">
            <div className="hud-stat-item">
              <span className="hud-lbl">DIST</span>
              <span className="hud-val">{activeRoute.total_distance_km} km</span>
            </div>
            <div className="hud-stat-item">
              <span className="hud-lbl">CO₂</span>
              <span className="hud-val" style={{ color: '#10b981' }}>{activeRoute.total_co2_kg} kg</span>
            </div>
            <div className="hud-stat-item">
              <span className="hud-lbl">COST</span>
              <span className="hud-val" style={{ color: '#f59e0b' }}>₹{activeRoute.total_cost_inr?.toLocaleString()}</span>
            </div>
            <div className="hud-stat-item">
              <span className="hud-lbl">MODE</span>
              <span className="hud-val">{activeRoute.modes_used?.join('+').toUpperCase()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Map Controls */}
      <div className="map-ctrl-panel">
        <button
          className="map-ctrl-btn primary"
          onClick={() => setShowControls(p => !p)}
          title="Map Controls"
        >
          <Layers size={16} />
        </button>
        {showControls && (
          <div className="map-ctrl-dropdown">
            <div className="map-ctrl-section-label">TILE STYLE</div>
            {Object.entries(TILE_LAYERS).map(([key, val]) => (
              <button
                key={key}
                className={`map-ctrl-tile-btn ${tileStyle === key ? 'active' : ''}`}
                onClick={() => setTileStyle(key)}
              >
                {val.label}
              </button>
            ))}
            <div className="map-ctrl-divider" />
            <div className="map-ctrl-section-label">OVERLAYS</div>
            <button
              className={`map-ctrl-toggle-btn ${showNetwork ? 'active' : ''}`}
              onClick={() => setShowNetwork(p => !p)}
            >
              {showNetwork ? <Eye size={13} /> : <EyeOff size={13} />}
              <span>Network Graph</span>
            </button>
            <button
              className={`map-ctrl-toggle-btn ${showParticles ? 'active' : ''}`}
              onClick={() => setShowParticles(p => !p)}
            >
              {showParticles ? <Eye size={13} /> : <EyeOff size={13} />}
              <span>Freight Particles</span>
            </button>
          </div>
        )}
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="leaflet-map"
        zoomControl={false}
      >
        <DynamicTileLayer tileStyle={tileStyle} />

        {/* ── Network Graph Overlay (all 24 hubs) ─────────── */}
        {showNetwork && network?.nodes?.map((node, idx) => (
          <Marker
            key={`hub-${idx}`}
            position={[node.lat, node.lng]}
            icon={createNetworkNodeIcon(regionColor(node.region), node.name)}
            zIndexOffset={-100}
          >
            <Popup className="dark-popup">
              <div className="popup-hub">
                <div className="popup-hub-dot" style={{ background: regionColor(node.region) }} />
                <strong>{node.name}</strong>
              </div>
              <span className="popup-region">{node.region} Region Hub</span>
            </Popup>
          </Marker>
        ))}

        {/* ── Network Edges (road corridors) ──────────────── */}
        {showNetwork && network?.edges?.map((edge, idx) => {
          const fromNode = network.nodes?.find(n => n.name === edge.from_city);
          const toNode = network.nodes?.find(n => n.name === edge.to_city);
          if (!fromNode || !toNode) return null;
          const pts = interpolateGreatCircle(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng, 12);
          return (
            <Polyline
              key={`edge-${idx}`}
              positions={pts}
              pathOptions={{
                color: edge.has_rail ? '#34d399' : '#94a3b8',
                weight: edge.has_rail ? 1.5 : 0.8,
                opacity: edge.disruption ? 0.9 : 0.22,
                dashArray: edge.has_rail ? '4, 6' : null,
              }}
            />
          );
        })}

        {/* ── Active Route Polylines ───────────────────────── */}
        {routeLines.map((line, idx) => (
          <Polyline
            key={`route-${idx}`}
            positions={line.positions}
            pathOptions={{ color: line.color, weight: line.weight + 1, dashArray: line.dashArray, opacity: 0.95 }}
          >
            <Popup className="dark-popup">
              <strong>{line.info.from_city} → {line.info.to_city}</strong><br />
              Distance: <b>{line.info.distance_km} km</b><br />
              Mode: <b>{line.info.mode?.toUpperCase()}</b><br />
              CO₂: <b>{line.info.co2_kg} kg</b><br />
              {line.info.energy_kwh && <span>Energy: <b>{line.info.energy_kwh} kWh</b><br /></span>}
              {line.info.disruption && <span style={{ color: '#ef4444' }}>⚠ {line.info.disruption}</span>}
            </Popup>
          </Polyline>
        ))}

        {/* ── Route glow effect (wider, lower opacity) ──── */}
        {routeLines.map((line, idx) => (
          <Polyline
            key={`glow-${idx}`}
            positions={line.positions}
            pathOptions={{ color: line.color, weight: line.weight + 8, opacity: 0.12, interactive: false }}
          />
        ))}

        {/* ── Origin / Destination Markers ────────────────── */}
        {startPos && (
          <Marker position={startPos} icon={originIcon} zIndexOffset={500}>
            <Popup className="dark-popup">
              <strong>{activeRoute?.segments[0]?.from_city}</strong><br />
              <span>📦 Origin Freight Hub</span>
            </Popup>
          </Marker>
        )}
        {endPos && (
          <Marker position={endPos} icon={destIcon} zIndexOffset={500}>
            <Popup className="dark-popup">
              <strong>{activeRoute?.segments[activeRoute.segments.length - 1]?.to_city}</strong><br />
              <span>🏁 Destination Corridor</span>
            </Popup>
          </Marker>
        )}

        {/* ── Animated Freight Particles ───────────────────── */}
        {showParticles && allRoutePoints.length > 2 && (
          <>
            <FreightParticle routePoints={allRoutePoints} color="#10b981" delay={0} />
            <FreightParticle routePoints={allRoutePoints} color="#60a5fa" delay={Math.floor(allRoutePoints.length / 3)} />
            <FreightParticle routePoints={allRoutePoints} color="#fbbf24" delay={Math.floor(allRoutePoints.length * 2 / 3)} />
          </>
        )}

        {/* ── Live GPS Position ────────────────────────────── */}
        {liveGps && (
          <Marker position={liveGps} icon={liveGpsIcon} zIndexOffset={1000}>
            <Popup className="dark-popup">
              <strong>Your Live Location</strong><br />
              <span>{liveGps[0].toFixed(4)}, {liveGps[1].toFixed(4)}</span>
            </Popup>
          </Marker>
        )}

        {/* ── Live WebSocket Fleet Telemetry Vehicles ─────── */}
        {telemetryVehicles.map((v, idx) => (
          <Marker 
            key={`telemetry-v-${v.id}-${idx}`}
            position={[v.lat, v.lng]}
            icon={createCustomIcon(v.type === 'electric' ? '#34d399' : '#f59e0b', true)}
            zIndexOffset={800}
          >
            <Popup className="dark-popup">
              <div className="text-xs font-bold text-emerald-400 mb-1">🛰️ LIVE OBD-II TELEMETRY</div>
              <strong>{v.name} ({v.id})</strong><br />
              Status: <b className="text-emerald-300">{v.status}</b><br />
              Speed: <b>{v.speed_kmh} km/h</b><br />
              Battery SOC: <b className={v.soc_percent < 20 ? 'text-red-400' : 'text-emerald-400'}>{v.soc_percent}%</b><br />
              Motor Temp: <b>{v.motor_temp_c}°C</b> | Load: <b>{v.payload_tonnes} T</b>
            </Popup>
          </Marker>
        ))}


        {/* ── Auto-fit map to route ────────────────────────── */}
        {routePointsForBounds.length > 0 && <FitBounds routePoints={routePointsForBounds} />}
      </MapContainer>

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-item"><span className="legend-dot" style={{ background: '#10b981' }} />Rail / EV</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#38bdf8' }} />Road</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#ef4444' }} />Disrupted</div>
        {liveGps && <div className="legend-item"><span className="legend-dot gps-blink" style={{ background: '#3b82f6' }} />GPS Live</div>}
      </div>
    </div>
  );
};

export default MapView;
