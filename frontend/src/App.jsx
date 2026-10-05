import React, { useState, useEffect, useCallback } from 'react';
import api, { API_ROOT } from './api/client';
import Navbar from './components/Navbar';
import Controls from './components/Controls';
import MapView from './components/MapView';
import RouteList from './components/RouteList';
import RoutePanel from './components/RoutePanel';
import CarbonBadge from './components/CarbonBadge';
import LandingPage from './components/LandingPage';
import EmissionsReport from './components/EmissionsReport';
import ContractManager from './components/ContractManager';
import WeeklyForecastRadar from './components/WeeklyForecastRadar';
import WarpTransition from './components/WarpTransition';
import CopilotChat from './components/CopilotChat';
import QuantumMetricsCard from './components/QuantumMetricsCard';
import './App.css';

function App() {
  // Application State
  const [showDashboard, setShowDashboard] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  const [network, setNetwork] = useState({ nodes: [], edges: [] });
  const [vehicles, setVehicles] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [carbonLevel, setCarbonLevel] = useState(null);

  // Optimisation State
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedDepartureTime, setSelectedDepartureTime] = useState('');
  const [lastOptimizedParams, setLastOptimizedParams] = useState(null);

  // Active corridor for Weekly Forecast (set by last optimization)
  const [activeCorridor, setActiveCorridor] = useState(null);
  const [paretoFront, setParetoFront] = useState(null);
  const [activeRouteId, setActiveRouteId] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);

  // Emissions report refresh trigger — bumped after every save so EmissionsReport re-fetches
  const [emissionsRefreshKey, setEmissionsRefreshKey] = useState(0);

  // Initial Data Load (Resilient non-blocking fetch)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [netData, vehData, carbonData] = await Promise.all([
          api.getNetwork(),
          api.getVehicles(),
          api.getCarbonIntensity()
        ]);

        if (netData) setNetwork(netData);
        if (vehData) setVehicles(vehData);
        if (carbonData) setCarbonLevel(carbonData);

        const fcstData = await api.getDemandForecast();
        if (fcstData && fcstData.forecasts) {
          setForecast(fcstData.forecasts);
        }
      } catch (err) {
        console.warn("Backend syncing in background:", err?.message);
      }
    };

    fetchInitialData();
  }, []);

  // Clean duplicated strings like Mumbaimumbai -> Mumbai
  const cleanAddressString = (str) => {
    if (!str) return '';
    let s = String(str).trim();
    const half = Math.floor(s.length / 2);
    if (s.length >= 4 && s.slice(0, half).toLowerCase() === s.slice(half).toLowerCase()) {
      s = s.slice(0, half);
    }
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  // Handle Optimisation Request
  const handleOptimize = async (params) => {
    setIsOptimizing(true);
    setLastOptimizedParams(params);
    if (params.departure_time !== undefined) {
      setSelectedDepartureTime(params.departure_time || '');
    }
    
    try {
      const result = await api.optimizeFast(params);
      if (result && result.solutions && result.solutions.length > 0) {
        setParetoFront(result);
        
        const defaultRoute = result.best_green || result.solutions[0];
        const cleanOrigin = cleanAddressString(params.origin?.address || 'Mumbai');
        const cleanDest = cleanAddressString(params.destination?.address || 'Delhi');

        // ── Update active corridor for Weekly Forecast ──────────────
        setActiveCorridor({
          origin: cleanOrigin,
          dest: cleanDest,
          lat1: params.origin?.lat,
          lng1: params.origin?.lng,
          lat2: params.destination?.lat,
          lng2: params.destination?.lng,
        });

        // ── Persist route to DB (async, non-blocking) ───────────────
        const savePayload = {
          origin_address: cleanOrigin,
          destination_address: cleanDest,
          origin_lat: params.origin?.lat || 0,
          origin_lng: params.origin?.lng || 0,
          dest_lat: params.destination?.lat || 0,
          dest_lng: params.destination?.lng || 0,
          vehicle_type: params.vehicle_type || 'unknown',
          load_tonnes: params.load_tonnes || 0,
          total_distance_km: defaultRoute.total_distance_km || 0,
          total_time_minutes: defaultRoute.total_time_minutes || 0,
          total_cost_inr: defaultRoute.total_cost_inr || 0,
          total_co2_kg: defaultRoute.total_co2_kg || 0,
          green_score: defaultRoute.green_score || 0,
          strategy: defaultRoute.strategy || 'balanced',
          segments: defaultRoute.segments || [],
        };

        fetch(`${API_ROOT}/api/routes/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savePayload),
        })
          .then(() => setEmissionsRefreshKey(k => k + 1))
          .catch(err => console.warn('Route save failed (non-critical):', err?.message));

        setActiveRoute(defaultRoute);
        setActiveRouteId(defaultRoute.id);
      }
    } catch (err) {
      console.error("Optimization error:", err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyDepartureTime = (newTime) => {
    setSelectedDepartureTime(newTime);
    if (lastOptimizedParams) {
      handleOptimize({
        ...lastOptimizedParams,
        departure_time: newTime
      });
    }
  };

  const handleSelectRoute = (id) => {
    setActiveRouteId(id);
    const route = paretoFront?.solutions.find(s => s.id === id);
    if (route) setActiveRoute(route);
  };

  if (!showDashboard) {
    return <LandingPage onEnter={() => setShowDashboard(true)} />;
  }

  const rtOrigin = activeRoute ? activeRoute.segments[0].from_city : (activeCorridor?.origin || null);
  const rtDest = activeRoute ? activeRoute.segments[activeRoute.segments.length - 1].to_city : (activeCorridor?.dest || null);

  return (
    <div className="app-container">
      <Navbar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onGoLanding={() => setShowDashboard(false)} 
      />

      <main className="main-content">
        {currentView === 'dashboard' && (
          <div className="dashboard-grid">
            {/* Left Sidebar */}
            <div className="left-column">
              <Controls
                vehicles={vehicles}
                onOptimize={handleOptimize}
                isOptimizing={isOptimizing}
                externalDepartureTime={selectedDepartureTime}
                onDepartureTimeChange={setSelectedDepartureTime}
              />
              <CarbonBadge gridIntensity={carbonLevel} />
              <QuantumMetricsCard />
            </div>

            {/* Right Area */}
            <div className="right-column">
              <div className="map-container panel">
                <MapView
                  network={network}
                  origin={rtOrigin}
                  destination={rtDest}
                  activeRoute={activeRoute}
                />
              </div>

              {(paretoFront || isOptimizing) && (
                <div className="results-container">
                  <RouteList
                    solutions={paretoFront?.solutions}
                    activeId={activeRouteId}
                    onSelect={handleSelectRoute}
                  />
                  {activeRoute && (
                    <RoutePanel 
                      route={activeRoute} 
                      onApplyDepartureTime={handleApplyDepartureTime}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'weekly' && (
          <WeeklyForecastRadar activeCorridor={activeCorridor} />
        )}

        {currentView === 'emissions' && (
          <EmissionsReport
            paretoFront={paretoFront}
            activeRouteId={activeRouteId}
            refreshKey={emissionsRefreshKey}
          />
        )}

        {currentView === 'contracts' && (
          <ContractManager vehicles={vehicles} />
        )}
      </main>
      <CopilotChat />
    </div>
  );
}

export default App;
