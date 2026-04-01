import React, { useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

const GlobalGlobe = ({ network, activeRoute }) => {
  const globeEl = useRef();

  const cities = network?.nodes || [];

  // Transform cities to globe data
  const gData = cities.map(city => ({
    lat: city.lat || (Math.random() * 180 - 90),
    lng: city.lng || (Math.random() * 360 - 180),
    size: 0.1,
    color: '#69f6b8',
    label: city.name
  }));

  // Prepare active route arcs
  const arcData = activeRoute ? [{
    startLat: cities.find(c => c.name === activeRoute.segments[0].from_city)?.lat || 20,
    startLng: cities.find(c => c.name === activeRoute.segments[0].from_city)?.lng || 77,
    endLat: cities.find(c => c.name === activeRoute.segments[activeRoute.segments.length - 1].to_city)?.lat || 19,
    endLng: cities.find(c => c.name === activeRoute.segments[activeRoute.segments.length - 1].to_city)?.lng || 72,
    color: ['#69f6b8', '#046b43']
  }] : [];

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', background: '#000', borderRadius: '15px', overflow: 'hidden' }}>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        pointsData={gData}
        pointAltitude={0.05}
        pointColor={() => '#69f6b8'}
        pointRadius={0.15}
        labelsData={gData}
        labelLat={d => d.lat}
        labelLng={d => d.lng}
        labelText={d => d.label}
        labelSize={1.5}
        labelColor={() => '#fff'}
        labelDotRadius={0.1}
        arcsData={arcData}
        arcColor={() => '#69f6b8'}
        arcDashLength={0.5}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        arcStroke={0.5}
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere={true}
        atmosphereColor="#69f6b8"
        atmosphereDayAlpha={0.3}
      />
    </div>
  );
};

export default GlobalGlobe;
arcColor = { d => d.isGreen ? '#69f6b8' : 'rgba(255, 51, 102, 0.2)' }
arcDashLength = { d => d.isGreen ? 0.8 : 0.4 }
arcDashGap = { 0.1}
arcDashAnimateTime = { d => d.isGreen ? 1000 : 3000 }
arcStroke = { d => d.isGreen ? 1.0 : 0.2 }

showAtmosphere = { true}
atmosphereColor = "#69f6b8"
atmosphereDayAlpha = { 0.2}
  />
    </div >
  );
};

export default GlobalGlobe;
