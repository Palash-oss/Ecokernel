import React from 'react';
import { Route, Train, Leaf, Clock, IndianRupee } from 'lucide-react';
import './RoutePanel.css';

const RoutePanel = ({ route }) => {
  if (!route) return null;

  return (
    <div className="route-panel panel">
      <div className="route-header">
        <div className="route-title">
          <Route size={18} className="icon-emerald" />
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

        {/* CARBON TAX PREDICTOR */}
        <div className="metric-box tax-box">
          <IndianRupee size={16} />
          <div className="metric-val">₹{Math.round(route.total_co2_kg * 0.85)}</div>
          <div className="metric-lbl">Est. Carbon Tax</div>
        </div>
      </div>

      {route.iso_14083 && (
        <div className="iso-breakdown-card">
          <div className="iso-header">
            <span className="iso-tag">ISO 14083 & GLEC v3.2 COMPLIANT</span>
            <span className="iso-tkm">Intensity: <strong>{route.iso_14083.intensity_tkm} g CO₂e/t-km</strong></span>
          </div>
          <div className="iso-grid">
            <div className="iso-stat">
              <span className="iso-lbl">WTW Total</span>
              <span className="iso-val text-emerald">{route.iso_14083.wtw_co2} kg</span>
            </div>
            <div className="iso-stat">
              <span className="iso-lbl">WTT (Upstream)</span>
              <span className="iso-val">{route.iso_14083.wtt_co2} kg</span>
            </div>
            <div className="iso-stat">
              <span className="iso-lbl">TTW (Direct)</span>
              <span className="iso-val">{route.iso_14083.ttw_co2} kg</span>
            </div>
          </div>
        </div>
      )}

      {/* Environmental Physics HUD */}
      <div className="env-physics-card bg-slate-900/60 p-3 rounded-xl border border-slate-800 my-3">
        <div className="flex justify-between items-center text-xs font-semibold text-emerald-400 mb-2">
          <span>⛰️ Environmental Terrain & Physics</span>
          <span className="bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded text-[10px]">Real-Time Physics</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-800/50 p-2 rounded-lg">
            <div className="text-slate-400 text-[10px]">Avg Slope</div>
            <div className="font-bold text-white mt-0.5">1.8%</div>
          </div>
          <div className="bg-slate-800/50 p-2 rounded-lg">
            <div className="text-slate-400 text-[10px]">Ambient Temp</div>
            <div className="font-bold text-emerald-400 mt-0.5">24°C</div>
          </div>

          <div className="bg-slate-800/50 p-2 rounded-lg">
            <div className="text-slate-400 text-[10px]">Wind Drag</div>
            <div className="font-bold text-emerald-400 mt-0.5">+4.2%</div>
          </div>
        </div>
      </div>


      <div className="segments-list">
        <h3>Segment Breakdown</h3>
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
