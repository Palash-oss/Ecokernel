import React, { useState, useEffect } from 'react';
import api from './api/client';
import Navbar from './components/Navbar';
import Controls from './components/Controls';
import MapView from './components/MapView';
import RouteList from './components/RouteList';
import RoutePanel from './components/RoutePanel';
import CarbonBadge from './components/CarbonBadge';
import LandingPage from './components/LandingPage';
import EmissionsReport from './components/EmissionsReport';
import ContractManager from './components/ContractManager';
import WarpTransition from './components/WarpTransition';
import CopilotChat from './components/CopilotChat';
import './App.css';

function App() {
  // Application State
  const [showDashboard, setShowDashboard] = useState(false);
  const [isWarping, setIsWarping] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  const [network, setNetwork] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [carbonLevel, setCarbonLevel] = useState(null);

  // Optimisation State
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [runHistory, setRunHistory] = useState([]);
  const [paretoFront, setParetoFront] = useState(null);
  const [activeRouteId, setActiveRouteId] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);

  // Initial Data Load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [netData, vehData, carbonData] = await Promise.all([
          api.getNetwork(),
          api.getVehicles(),
          api.getCarbonIntensity()
        ]);

        setNetwork(netData);
        setVehicles(vehData);
        setCarbonLevel(carbonData);

        // Fetch forecast data for the dashboard
        const fcstData = await api.getDemandForecast();
        if (fcstData && fcstData.forecasts) {
          setForecast(fcstData.forecasts);
        }
      } catch (err) {
        console.error("Error fetching initial data:", err);
      }
    };

    fetchInitialData();
  }, []);

  // Handle Optimisation Request
  const handleOptimize = async (params) => {
    setIsOptimizing(true);
    
    try {
      // Always use fast optimizer for coordinate-based address routing
      const result = await api.optimizeFast(params);
      if (result && result.solutions) {
        setParetoFront(result);
        
        // Save to history so MapView and Report can use the custom coordinates
        const runRecord = {
          id: Date.now(),
          origin: params.origin.address,
          destination: params.destination.address,
          origin_lat: params.origin.lat,
          origin_lng: params.origin.lng,
          dest_lat: params.destination.lat,
          dest_lng: params.destination.lng,
          vehicle: params.vehicle_type,
          load: params.load_tonnes,
          timestamp: new Date().toLocaleTimeString(),
        };
        setRunHistory(prev => [runRecord, ...prev]);

        if (result.solutions.length > 0) {
          const defaultRoute = result.best_green || result.solutions[0];
          setActiveRoute(defaultRoute);
          setActiveRouteId(defaultRoute.id);
        }
      }
    } catch (err) {
      console.error("Optimization failed:", err);
      alert("Optimization failed: " + (err?.response?.data?.detail || err.message || "Unknown error"));
    } finally {
      setIsOptimizing(false);
    }
  };

  // Handle Route Selection from Chart
  const handleSelectRoute = (id) => {
    setActiveRouteId(id);
    const route = paretoFront.solutions.find(s => s.id === id);
    if (route) setActiveRoute(route);
  };

  if (isWarping) {
    return <WarpTransition onComplete={() => {
      setIsWarping(false);
      setShowDashboard(true);
    }} />;
  }

  if (!showDashboard) {
    return <LandingPage onEnter={() => setIsWarping(true)} />;
  }

  if (!network) {
    return (
      <div className="loading-screen">
        <div className="loader large"></div>
        <h2>Initializing EcoKernel Engine...</h2>
        <p>Connecting to backend and fetching logistics data</p>
      </div>
    );
  }

  // Derive origin and destination from active route if exists
  // Add coordinates from past optimisations if available
  const activeParams = runHistory[0] || null;
  const rtOrigin = activeRoute ? activeRoute.segments[0].from_city : (activeParams?.origin || null);
  const rtDest = activeRoute ? activeRoute.segments[activeRoute.segments.length - 1].to_city : (activeParams?.destination || null);

  return (
    <div className="app-container">
      <Navbar currentView={currentView} onViewChange={setCurrentView} />

      <main className="main-content">
        {currentView === 'dashboard' && (
          <div className="dashboard-grid">
            {/* Left Sidebar */}
            <div className="left-column">
              <Controls
                vehicles={vehicles}
                onOptimize={handleOptimize}
                isOptimizing={isOptimizing}
              />
              <CarbonBadge gridIntensity={carbonLevel} />
            </div>

            {/* Right Area */}
            <div className="right-column">
              <div className="map-container panel">
                <MapView
                  network={network}
                  origin={rtOrigin}
                  destination={rtDest}
                  activeRoute={activeRoute}
                  optimisationParams={activeParams}
                />
              </div>

              {(paretoFront || isOptimizing) && (
                <div className="results-container">
                  <RouteList
                    solutions={paretoFront?.solutions}
                    activeId={activeRouteId}
                    onSelect={handleSelectRoute}
                  />
                  {activeRoute && <RoutePanel route={activeRoute} />}
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'emissions' && (
          <EmissionsReport paretoFront={paretoFront} activeRouteId={activeRouteId} runHistory={runHistory} />
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
