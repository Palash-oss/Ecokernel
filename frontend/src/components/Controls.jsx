import React, { useState } from 'react';
import { Play, Settings2, SlidersHorizontal, MapPin } from 'lucide-react';
import './Controls.css';

const Controls = ({ 
  cities, 
  vehicles, 
  onOptimize, 
  isOptimizing 
}) => {
  const [origin, setOrigin] = useState('Mumbai');
  const [destination, setDestination] = useState('Delhi');
  const [vehicleId, setVehicleId] = useState('ashok_leyland_euro6');
  const [priority, setPriority] = useState(50); // 0 = Cost, 100 = Green
  const [load, setLoad] = useState(10.0);

  const handleOptimize = () => {
    if (origin === destination) {
      alert("Origin and destination must be different");
      return;
    }
    
    // Pass priority as 0.0 - 1.0 back to engine
    onOptimize({
      origin,
      destination,
      vehicle_type: vehicleId,
      load_tonnes: Number(load),
      priority: priority / 100.0,
      max_solutions: 15
    });
  };

  return (
    <div className="controls-panel panel">
      <div className="panel-header">
        <Settings2 size={18} className="icon-emerald" />
        <h2>Mission Parameters</h2>
      </div>

      <div className="controls-body">
        <div className="form-row">
          <div className="form-group flex-1">
            <label>Origin Hub</label>
            <div className="input-with-icon">
              <MapPin size={14} />
              <select 
                className="form-control" 
                value={origin} 
                onChange={e => setOrigin(e.target.value)}
              >
                {cities.map(c => <option key={`o-${c.name}`} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="form-group flex-1">
            <label>Destination Hub</label>
            <div className="input-with-icon">
              <MapPin size={14} className="icon-dest" />
              <select 
                className="form-control" 
                value={destination} 
                onChange={e => setDestination(e.target.value)}
              >
                {cities.map(c => <option key={`d-${c.name}`} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group flex-2">
            <label>FLEET ASSIGNMENT</label>
            <select 
              className="form-control"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">Select a truck</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group flex-1">
            <label>CARGO<br/>(TONNES)</label>
            <input 
              type="number" 
              className="form-control"
              value={load}
              onChange={(e) => setLoad(Number(e.target.value))}
              min="1"
              max="50"
            />
          </div>
        </div>

        <div className="form-group slider-group mt-3">
          <label className="flex-between">
            <span><SlidersHorizontal size={14} /> Optimisation Priority</span>
            <span className="slider-value">{priority}% Green</span>
          </label>
          <div className="slider-labels">
            <span>Least Cost/Time</span>
            <span>Lowest CO₂ Target</span>
          </div>
          <input 
            type="range" 
            min="0" max="100" 
            value={priority} 
            onChange={e => setPriority(e.target.value)}
            className="priority-slider"
          />
        </div>

        <button 
          className="btn-primary mt-4" 
          onClick={handleOptimize}
          disabled={isOptimizing}
        >
          {isOptimizing ? (
            <>Calculating Pareto Front <span className="loader"></span></>
          ) : (
            <><Play size={16} fill="currentColor" /> Generate Green Routes</>
          )}
        </button>
      </div>
    </div>
  );
};

export default Controls;
