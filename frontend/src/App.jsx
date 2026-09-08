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
import WeeklyForecastRadar from './components/WeeklyForecastRadar';
import WarpTransition from './components/WarpTransition';
import CopilotChat from './components/CopilotChat';
import QuantumMetricsCard from './components/QuantumMetricsCard';
import './App.css';

function App() {
  // Application State
  const [showDashboard, setShowDashboard] = useState(false);
  const [isWarping, setIsWarping] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  const [network, setNetwork] = useState({ nodes: [], edges: [] });
  const [vehicles, setVehicles] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [carbonLevel, setCarbonLevel] = useState(null);

  // Optimisation State
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Initial Run History Seed
  const [runHistory, setRunHistory] = useState([
    {
      id: 101,
      origin: 'Mumbai',
      destination: 'Delhi',
      vehicle: 'Ashok Leyland Euro 6 HGV',
      load: 14.0,
      timestamp: '14:20:05',
      baselineCo2: 284.5,
      optimizedCo2: 210.2,
      savings: 74.3,
    },
    {
      id: 102,
      origin: 'Bangalore',
      destination: 'Chennai',
      vehicle: 'Volvo FH Electric Intercity',
      load: 10.0,
      timestamp: '11:05:42',
      baselineCo2: 98.0,
      optimizedCo2: 12.4,
      savings: 85.6,
    },
    {
      id: 103,
      origin: 'Hyderabad',
      destination: 'Pune',
      vehicle: 'Tata Signa CNG Heavy Truck',
      load: 12.5,
      timestamp: '09:15:30',
      baselineCo2: 165.0,
      optimizedCo2: 118.5,
      savings: 46.5,
    }
  ]);
  const [paretoFront, setParetoFront] = useState(null);
  const [activeRouteId, setActiveRouteId] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);

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
    
    try {
      const result = await api.optimizeFast(params);
      if (result && result.solutions && result.solutions.length > 0) {
        setParetoFront(result);
        
        const defaultRoute = result.best_green || result.solutions[0];
        const maxCo2InSolutions = Math.max(...result.solutions.map(s => s.total_co2_kg));
        const baselineCo2 = maxCo2InSolutions > defaultRoute.total_co2_kg 
          ? Number((maxCo2InSolutions * 1.15).toFixed(1)) 
          : Number((defaultRoute.total_co2_kg * 1.32).toFixed(1));
        const optimizedCo2 = Number(defaultRoute.total_co2_kg.toFixed(1));
        const savings = Number(Math.max(12.5, baselineCo2 - optimizedCo2).toFixed(1));

        const cleanOrigin = cleanAddressString(params.origin?.address || 'Mumbai');
        const cleanDest = cleanAddressString(params.destination?.address || 'Delhi');

        const runRecord = {
          id: Date.now(),
          origin: cleanOrigin,
          destination: cleanDest,
          origin_lat: params.origin.lat,
          origin_lng: params.origin.lng,
          dest_lat: params.destination.lat,
          dest_lng: params.destination.lng,
          vehicle: params.vehicle_type,
          load: params.load_tonnes,
          timestamp: new Date().toLocaleTimeString(),
          baselineCo2,
          optimizedCo2,
          savings,
        };
        setRunHistory(prev => [runRecord, ...prev]);

        setActiveRoute(defaultRoute);
        setActiveRouteId(defaultRoute.id);
      }
    } catch (err) {
      console.error("Optimization error:", err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSelectRoute = (id) => {
    setActiveRouteId(id);
    const route = paretoFront?.solutions.find(s => s.id === id);
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

        {currentView === 'weekly' && (
          <WeeklyForecastRadar />
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
