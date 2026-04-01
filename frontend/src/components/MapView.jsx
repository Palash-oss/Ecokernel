import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix Leaflet blank marker issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color:${color};width:20px;height:20px;border-radius:50%;border:3px solid #0a0e27;box-shadow:0 0 10px ${color}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const hubIcon = createCustomIcon('#3b82f6');
const originIcon = createCustomIcon('#f7c948');
const destIcon = createCustomIcon('#ff4d4f');

// Helper to center map
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
};

// Map fit bounds helper
const FitBounds = ({ routePoints }) => {
  const map = useMap();
  useEffect(() => {
    if (routePoints && routePoints.length > 0) {
      const bounds = L.latLngBounds(routePoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routePoints, map]);
  return null;
};

const MapView = ({ network, origin, destination, activeRoute }) => {
  const defaultCenter = [21.1458, 79.0882]; // Center of India
  const defaultZoom = 5;

  // Process route geometry
  let routeLines = [];
  let routePointsForBounds = [];

  if (activeRoute && activeRoute.segments && network) {
    activeRoute.segments.forEach(segment => {
      // Determine segment color based on green score/mode
      let color = '#3b82f6'; // default blue
      let weight = 4;
      let dashArray = null;

      if (segment.mode === 'rail') {
        color = '#00d97e'; // Green for rail
        dashArray = '5, 10'; // Dashed line for rail
        weight = 5;
      } else if (segment.disruption) {
        color = '#ef4444'; // Bright red for severe disruption
        dashArray = '10, 10'; // Thick dashes
        weight = 5;
      } else {
        // Road color based on CO2 intensity (kg per km)
        const intensity = segment.co2_kg / segment.distance_km;
        if (intensity > 0.4) color = '#f97316'; // High emissions (orange)
        else if (intensity > 0.2) color = '#f7c948'; // Med emissions (yellow)
        else if (intensity <= 0.0) color = '#00d97e'; // EV
      }

      // If we have actual ORS geometry, use it
      if (segment.geometry && segment.geometry.length > 0) {
        // ORS returns [lng, lat], Leaflet wants [lat, lng]
        const latLngs = segment.geometry.map(coord => [coord[1], coord[0]]);
        routeLines.push({ positions: latLngs, color, weight, dashArray, info: segment });
        routePointsForBounds.push(...latLngs);
      } else {
        // Fallback straight line
        const nodeA = network.nodes.find(n => n.name === segment.from_city);
        const nodeB = network.nodes.find(n => n.name === segment.to_city);
        if (nodeA && nodeB) {
          const latLngs = [[nodeA.lat, nodeA.lng], [nodeB.lat, nodeB.lng]];
          routeLines.push({ positions: latLngs, color, weight, dashArray, info: segment });
          routePointsForBounds.push(...latLngs);
        }
      }
    });
  }

  // Dark map theme
  const mapStyle = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const mapAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return (
    <div className="map-wrapper">
      <MapContainer 
        center={defaultCenter} 
        zoom={defaultZoom} 
        className="leaflet-map"
        zoomControl={false}
      >
        <TileLayer
          url={mapStyle}
          attribution={mapAttribution}
        />
        
        {network && network.nodes.map(node => {
          let icon = hubIcon;
          if (node.name === origin) icon = originIcon;
          if (node.name === destination) icon = destIcon;

          return (
            <Marker 
              key={node.name} 
              position={[node.lat, node.lng]}
              icon={icon}
            >
              <Popup className="dark-popup">
                <strong>{node.name}</strong><br/>
                <span className="text-muted">{node.region} Reg.</span>
              </Popup>
            </Marker>
          );
        })}

        {routeLines.map((line, idx) => (
          <Polyline 
            key={idx}
            positions={line.positions}
            pathOptions={{ 
              color: line.color, 
              weight: line.weight,
              dashArray: line.dashArray,
              opacity: 0.8
            }}
          >
            <Popup className="dark-popup">
              <strong>{line.info.from_city} → {line.info.to_city}</strong><br/>
              Dist: {line.info.distance_km} km<br/>
              Mode: {line.info.mode.toUpperCase()}<br/>
              CO₂: {line.info.co2_kg} kg<br/>
              {line.info.disruption && <span style={{color: '#ef4444'}}>⚠ {line.info.disruption}</span>}
            </Popup>
          </Polyline>
        ))}

        {routePointsForBounds.length > 0 && <FitBounds routePoints={routePointsForBounds} />}
      </MapContainer>
    </div>
  );
};

export default MapView;
