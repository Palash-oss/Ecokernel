import React from 'react';
import { Route, Train, Leaf, Clock, IndianRupee } from 'lucide-react';
import './RoutePanel.css';

const RoutePanel = ({ route }) => {
  if (!route) return null;

  return (
    <div className="route-panel panel">
      <div className="route-header">
        <div className="route-title">
          <Route size={18} className="icon-blue" />
          <h2>Selected Route Details</h2>
        </div>
        <div className={`green-score-badge ${route.green_score > 70 ? 'high' : route.green_score > 30 ? 'med' : 'low'}`}>
          <Leaf size={14} />
          <span>Score {route.green_score.toFixed(1)}</span>
        </div>
      </div>

      <div className="route-metrics">
        <div className="metric-box">
          <Clock size={16} />
          <div className="metric-val">{Math.round(route.total_time_minutes / 60)}h {Math.round(route.total_time_minutes % 60)}m</div>
          <div className="metric-lbl">Total Time</div>
        </div>
        
        <div className="metric-box">
          <IndianRupee size={16} />
          <div className="metric-val">{route.total_cost_inr.toLocaleString('en-IN')}</div>
          <div className="metric-lbl">Est. Cost (INR)</div>
        </div>
        
        <div className="metric-box highlight">
          <Leaf size={16} />
          <div className="metric-val">{route.total_co2_kg.toFixed(1)} kg</div>
          <div className="metric-lbl">CO₂ Emission</div>
        </div>

        {/* CARBON TAX PREDICTOR (Module 2) */}
        <div className="metric-box tax-box">
          <IndianRupee size={16} />
          <div className="metric-val">₹{Math.round(route.total_co2_kg * 0.85)}</div>
          <div className="metric-lbl">Est. Carbon Tax</div>
        </div>
      </div>

      <div className="segments-list">
        <h3>Leg-by-Leg Breakdown</h3>
        <div className="segments-scroll">
          {route.segments.map((seg, idx) => (
            <div key={idx} className="segment-card">
              <div className="seg-icon">
                {seg.mode === 'rail' ? <Train size={16} /> : <Route size={16} />}
              </div>
              <div className="seg-details">
                <div className="seg-path">{seg.from_city} → {seg.to_city}</div>
                <div className="seg-stats">
                  <span>{seg.distance_km} km</span>
                  <span>•</span>
                  <span>{seg.mode.toUpperCase()}</span>
                  <span>•</span>
                  <span className={seg.co2_kg / seg.distance_km > 0.2 ? 'text-red' : 'text-green'}>
                    {seg.co2_kg.toFixed(1)} kg CO₂
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoutePanel;
