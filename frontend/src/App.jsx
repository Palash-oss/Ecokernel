import React, { useState, useEffect } from 'react';
import api from './api/client';
import Navbar from './components/Navbar';
import Controls from './components/Controls';
import MapView from './components/MapView';
import RouteList from './components/RouteList';
import RoutePanel from './components/RoutePanel';
import DemandCard from './components/DemandCard';
import CarbonBadge from './components/CarbonBadge';
import LandingPage from './components/LandingPage';
import NetworkModel from './components/NetworkModel';
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
  
  const [targetDest, setTargetDest] = useState('Delhi');

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
        
        // Fetch forecast for Delhi by default
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
    setTargetDest(params.destination);
    
    try {
      const result = await api.optimizeRoute(params);
      setParetoFront(result);
      
      // Calculate a baseline (worst-case scenario) for savings calculation in report
      // Determine the maximum CO2 produced in this pareto front
      const maxCo2 = Math.max(...result.solutions.map(s => s.total_co2_kg));
      // Baseline is 35% worse (older trucks, bad traffic)
      const baselineCo2 = maxCo2 * 1.35; 
      // The best CO2 is the minimum found
      const bestCo2 = result.best_green ? result.best_green.total_co2_kg : Math.min(...result.solutions.map(s => s.total_co2_kg));
      
      const runRecord = {
        id: Date.now(),
        origin: params.origin,
        destination: params.destination,
        vehicle: params.vehicle_type,
        load: params.load_tonnes,
        baselineCo2,
        optimizedCo2: bestCo2,
        savings: baselineCo2 - bestCo2,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setRunHistory(prev => [runRecord, ...prev]);
      
      // Select first solution by default
      if (result.solutions && result.solutions.length > 0) {
        setActiveRouteId(result.solutions[0].id);
        setActiveRoute(result.solutions[0]);
      } else {
        setActiveRouteId(null);
        setActiveRoute(null);
      }
    } catch (err) {
      console.error("Optimisation failed:", err);
      alert("Optimisation failed. Is the backend running?");
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
  const rtOrigin = activeRoute ? activeRoute.segments[0].from_city : "Delhi";
  const rtDest = activeRoute ? activeRoute.segments[activeRoute.segments.length - 1].to_city : "Mumbai";

  return (
    <div className="app-container">
      <Navbar currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="main-content">
        {currentView === 'dashboard' && (
          <div className="dashboard-grid">
            {/* Left Sidebar */}
            <div className="left-column">
              <Controls 
                cities={network.nodes} 
                vehicles={vehicles} 
                onOptimize={handleOptimize}
                isOptimizing={isOptimizing}
              />
              <DemandCard forecastData={forecast} destination={targetDest} />
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

        {currentView === 'network' && (
          <NetworkModel network={network} />
        )}

        {currentView === 'emissions' && (
          <EmissionsReport paretoFront={paretoFront} activeRouteId={activeRouteId} runHistory={runHistory} />
        )}

        {currentView === 'contracts' && (
          <ContractManager vehicles={vehicles} cities={network.nodes} />
        )}
      </main>
      <CopilotChat />
    </div>
  );
}

export default App;
