import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Zap, Activity, Clock, ShieldCheck } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Div Icons
const createCustomIcon = (color, pulse = false) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color:${color};width:22px;height:22px;border-radius:50%;border:3px solid #030712;box-shadow:0 0 ${pulse ? '20px' : '10px'} ${color}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

const vehicleIcon = L.divIcon({
  className: 'vehicle-sim-icon',
  html: `<div class="vehicle-pulse-dot">🚚</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const originIcon = createCustomIcon('#69f6b8', true);
const destIcon = createCustomIcon('#ff716c', true);

// Map fit bounds helper
const FitBounds = ({ routePoints }) => {
  const map = useMap();
  useEffect(() => {
    if (routePoints && routePoints.length > 0) {
      const bounds = L.latLngBounds(routePoints);
      map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.2 });
    }
  }, [routePoints, map]);
  return null;
};

// Animated vehicle simulation
const AnimatedVehicleMarker = ({ routePoints }) => {
  const [currentPos, setCurrentPos] = useState(null);

  useEffect(() => {
    if (!routePoints || routePoints.length === 0) return;
    let step = 0;
    const interval = setInterval(() => {
      step = (step + 1) % routePoints.length;
      setCurrentPos(routePoints[step]);
    }, 350);

    return () => clearInterval(interval);
  }, [routePoints]);

  if (!currentPos) return null;

  return (
    <Marker position={currentPos} icon={vehicleIcon}>
      <Popup className="dark-popup">
        <strong>Fleet Telemetry Simulation</strong><br />
        <span style={{ color: '#69f6b8' }}>⚡ Real-time QIGA-PIEP Physics Dynamic Telemetry</span>
      </Popup>
    </Marker>
  );
};

const MapView = ({ network, origin, destination, activeRoute, optimisationParams }) => {
  const defaultCenter = [21.1458, 79.0882]; // Center of India
  const defaultZoom = 5;

  let routeLines = [];
  let routePointsForBounds = [];

  const customOrigin = optimisationParams?.origin_lat ? { lat: optimisationParams.origin_lat, lng: optimisationParams.origin_lng, name: optimisationParams.origin } : null;
  const customDest = optimisationParams?.dest_lat ? { lat: optimisationParams.dest_lat, lng: optimisationParams.dest_lng, name: optimisationParams.destination } : null;

  if (activeRoute && activeRoute.segments) {
    activeRoute.segments.forEach(segment => {
      let color = '#38bdf8'; // Cyan default
      let weight = 5;
      let dashArray = null;

      if (segment.mode === 'rail') {
        color = '#10b981'; // Green for rail
        dashArray = '6, 8';
        weight = 5;
      } else if (segment.mode === 'electric') {
        color = '#69f6b8'; // Mint EV
        weight = 5;
      } else if (segment.disruption) {
        color = '#ef4444'; // Red disruption
        dashArray = '10, 10';
        weight = 5;
      } else {
        const intensity = segment.co2_kg / Math.max(segment.distance_km, 1);
        if (intensity > 0.3) color = '#f97316';
        else if (intensity > 0.15) color = '#f59e0b';
        else color = '#69f6b8';
      }

      if (segment.geometry && segment.geometry.length > 0) {
        const latLngs = segment.geometry.map(coord => [coord[1], coord[0]]);
        routeLines.push({ positions: latLngs, color, weight, dashArray, info: segment });
        routePointsForBounds.push(...latLngs);
      } else {
        const latALngA = customOrigin && segment.from_city === customOrigin.name ? [customOrigin.lat, customOrigin.lng] : null;
        const latBLngB = customDest && segment.to_city === customDest.name ? [customDest.lat, customDest.lng] : null;
        if (latALngA && latBLngB) {
          const latLngs = [latALngA, latBLngB];
          routeLines.push({ positions: latLngs, color, weight, dashArray, info: segment });
          routePointsForBounds.push(...latLngs);
        }
      }
    });
  }

  // CartoDB Positron Light Tiles
  const lightMapTileUrl = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  const mapAttribution = '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    <div className="map-wrapper">
      {/* Floating Telemetry HUD Header on Map */}
      <div className="map-hud-overlay">
        <div className="hud-badge">
          <Activity size={14} className="text-emerald animate-pulse" />
          <span>GIS VECTOR TELEMETRY</span>
        </div>
        {activeRoute && (
          <div className="hud-stats">
            <div className="hud-stat-item">
              <span className="hud-lbl">DIST</span>
              <span className="hud-val">{activeRoute.total_distance_km} km</span>
            </div>
            <div className="hud-stat-item">
              <span className="hud-lbl">CO₂</span>
              <span className="hud-val text-emerald">{activeRoute.total_co2_kg} kg</span>
            </div>
            <div className="hud-stat-item">
              <span className="hud-lbl">COST</span>
              <span className="hud-val text-amber">₹{activeRoute.total_cost_inr.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <MapContainer 
        center={defaultCenter} 
        zoom={defaultZoom} 
        className="leaflet-map"
        zoomControl={false}
      >
        {/* CartoDB Positron Light Tile Layer */}
        <TileLayer
          url={lightMapTileUrl}
          attribution={mapAttribution}
          maxZoom={18}
        />

        {activeRoute && activeRoute.segments && activeRoute.segments.length > 0 && (() => {
          const firstSeg = activeRoute.segments[0];
          const lastSeg = activeRoute.segments[activeRoute.segments.length - 1];

          const findNodeCoords = (cityName) => {
            if (!network?.nodes) return null;
            const found = network.nodes.find(n => n.name.toLowerCase() === cityName?.toLowerCase() || cityName?.toLowerCase().includes(n.name.toLowerCase()));
            return found ? [found.lat, found.lng] : null;
          };

          let startPos = firstSeg.geometry?.length > 0 
            ? [firstSeg.geometry[0][1], firstSeg.geometry[0][0]] 
            : (customOrigin ? [customOrigin.lat, customOrigin.lng] : findNodeCoords(firstSeg.from_city));

          let endPos = lastSeg.geometry?.length > 0 
            ? [lastSeg.geometry[lastSeg.geometry.length - 1][1], lastSeg.geometry[lastSeg.geometry.length - 1][0]] 
            : (customDest ? [customDest.lat, customDest.lng] : findNodeCoords(lastSeg.to_city));

          return (
            <>
              {startPos && (
                <Marker position={startPos} icon={originIcon}>
                  <Popup className="dark-popup">
                    <strong>{firstSeg.from_city}</strong><br/>
                    <span className="text-muted">Origin Freight Hub</span>
                  </Popup>
                </Marker>
              )}
              {endPos && (
                <Marker position={endPos} icon={destIcon}>
                  <Popup className="dark-popup">
                    <strong>{lastSeg.to_city}</strong><br/>
                    <span className="text-muted">Destination Corridor</span>
                  </Popup>
                </Marker>
              )}
            </>
          );
        })()}

        {routeLines.map((line, idx) => (
          <Polyline 
            key={idx}
            positions={line.positions}
            pathOptions={{ 
              color: line.color, 
              weight: line.weight,
              dashArray: line.dashArray,
              opacity: 0.95
            }}
          >
            <Popup className="dark-popup">
              <strong>{line.info.from_city} → {line.info.to_city}</strong><br/>
              Distance: <b>{line.info.distance_km} km</b><br/>
              Mode: <b>{line.info.mode.toUpperCase()}</b><br/>
              Emissions: <b>{line.info.co2_kg} kg CO₂</b><br/>
              {line.info.energy_kwh && <span>Energy: <b>{line.info.energy_kwh} kWh</b><br/></span>}
              {line.info.disruption && <span style={{color: '#ef4444'}}>⚠ {line.info.disruption}</span>}
            </Popup>
          </Polyline>
        ))}

        {/* Animated simulation vehicle */}
        {routePointsForBounds.length > 0 && <AnimatedVehicleMarker routePoints={routePointsForBounds} />}
        {routePointsForBounds.length > 0 && <FitBounds routePoints={routePointsForBounds} />}
      </MapContainer>
    </div>
  );
};

export default MapView;
