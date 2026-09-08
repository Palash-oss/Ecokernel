import React, { useState, useEffect, useRef } from 'react';
import { Settings2, MapPin, Navigation, Search, Truck, Zap, Sliders, ArrowRight, CheckCircle2 } from 'lucide-react';
import api from '../api/client';
import './Controls.css';

const PRESET_CORRIDORS = [
  { origin: { name: "Mumbai", lat: 19.0760, lng: 72.8777 }, dest: { name: "Delhi", lat: 28.7041, lng: 77.1025 }, label: "Mumbai → Delhi" },
  { origin: { name: "Bangalore", lat: 12.9716, lng: 77.5946 }, dest: { name: "Chennai", lat: 13.0827, lng: 80.2707 }, label: "BLR → Chennai" },
  { origin: { name: "Hyderabad", lat: 17.3850, lng: 78.4867 }, dest: { name: "Pune", lat: 18.5204, lng: 73.8567 }, label: "HYD → Pune" },
];

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const CustomLocationInput = ({ label, value, onChange, onSelect, placeholder, isOrigin = false }) => {
  const [query, setQuery] = useState(typeof value === 'string' ? value : (value?.name || ""));
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const wrapperRef = useRef(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const newValue = typeof value === 'string' ? value : (value?.name || "");
    setQuery(newValue);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const doFetch = async () => {
      if (!debouncedQuery || debouncedQuery.length < 3) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }
      try {
        const results = await api.searchPlaces(debouncedQuery, 6);
        if (Array.isArray(results) && results.length > 0) {
          setSuggestions(results);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Search failed:", err);
      }
    };
    doFetch();
  }, [debouncedQuery]);

  const handleSelect = (s) => {
    setQuery(s.name);
    setSuggestions([]);
    setShowDropdown(false);
    onSelect(s);
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const data = await api.reverseGeocode(lat, lng);
          const name = data?.name || `Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
          setQuery(name);
          onSelect({ name, lat, lng });
        } catch (err) {
          setQuery("My Location");
          onSelect({ name: "My Location", lat, lng });
        } finally {
          setIsLocating(false);
        }
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="loc-group" ref={wrapperRef}>
      <label className="loc-label">{label}</label>
      <div className={`loc-box ${isOrigin ? 'border-origin' : 'border-dest'}`}>
        <div className="loc-icon-pre">
          {isOrigin ? <div className="dot-origin" /> : <MapPin size={16} className="pin-dest" />}
        </div>
        <input 
          type="text" 
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={e => e.target.select()}
          className="loc-input"
          placeholder={placeholder}
          autoComplete="off"
        />
        {isOrigin && (
          <button 
            className="loc-gps-btn" 
            onClick={handleCurrentLocation} 
            disabled={isLocating}
            title="Use current location"
            type="button"
          >
            {isLocating ? <div className="spinner-tiny" /> : <Navigation size={14} />}
          </button>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="loc-dropdown">
          {suggestions.map((s, idx) => {
            const parts = s.name.split(',').map(p => p.trim()).filter(Boolean);
            const mainTitle = parts[0] || s.name;
            const subTitle = parts.length > 1 ? parts.slice(1).join(', ') : '';
            return (
              <div key={idx} className="loc-suggestion-item" onClick={() => handleSelect(s)}>
                <div className="s-icon">
                  <MapPin size={14} />
                </div>
                <div className="s-info">
                  <div className="s-title">{mainTitle}</div>
                  {subTitle && <div className="s-subtitle">{subTitle}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Controls = ({ vehicles, onOptimize, isOptimizing }) => {
  const [origin, setOrigin] = useState({ name: 'Mumbai', lat: 19.0760, lng: 72.8777 });
  const [destination, setDestination] = useState({ name: 'Delhi', lat: 28.7041, lng: 77.1025 });
  const [vehicleId, setVehicleId] = useState('ashok_leyland_euro6');
  const [priority, setPriority] = useState(50);
  const [load, setLoad] = useState(10.0);

  const handleApplyPreset = (preset) => {
    setOrigin(preset.origin);
    setDestination(preset.dest);
  };

  const handleGo = async () => {
    let finalOrigin = { ...origin };
    let finalDest = { ...destination };

    const resolveLocation = async (loc) => {
      if (loc.lat && loc.lng) return loc;
      if (!loc.name) return null;
      try {
        const results = await api.searchPlaces(loc.name, 1);
        if (results && results.length > 0) {
          return { name: loc.name, lat: results[0].lat, lng: results[0].lng };
        }
      } catch (err) { console.error("Resolve failed", err); }
      return null;
    };

    if (!finalOrigin.lat) finalOrigin = await resolveLocation(finalOrigin);
    if (!finalDest.lat) finalDest = await resolveLocation(finalDest);

    if (!finalOrigin?.name || !finalDest?.name) {
      alert("Please enter valid origin and destination addresses.");
      return;
    }

    onOptimize({
      origin: { address: finalOrigin.name, lat: finalOrigin.lat ?? null, lng: finalOrigin.lng ?? null },
      destination: { address: finalDest.name, lat: finalDest.lat ?? null, lng: finalDest.lng ?? null },
      vehicle_type: vehicleId,
      load_tonnes: Number(load),
      priority: priority / 100.0
    });
  };

  return (
    <div className="ctrl-panel">
      <div className="ctrl-header">
        <div className="flex-center gap-2">
          <Settings2 size={18} className="text-emerald" />
          <h2 className="ctrl-title-text">MISSION PARAMETERS</h2>
        </div>
        <span className="live-badge">QIGA-PIEP ACTIVE</span>
      </div>

      <div className="ctrl-body">
        {/* Preset Chips */}
        <div className="presets-row">
          <span className="presets-lbl">Quick Presets:</span>
          <div className="presets-chips">
            {PRESET_CORRIDORS.map((p, idx) => (
              <button key={idx} className="preset-chip" onClick={() => handleApplyPreset(p)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Route Inputs */}
        <div className="route-box">
          <CustomLocationInput
            label="Origin Hub"
            value={origin.name}
            onChange={v => setOrigin({ ...origin, name: v })}
            onSelect={setOrigin}
            placeholder="Search starting city / address..."
            isOrigin={true}
          />
          <CustomLocationInput
            label="Destination Hub"
            value={destination.name}
            onChange={v => setDestination({ ...destination, name: v })}
            onSelect={setDestination}
            placeholder="Search delivery destination..."
            isOrigin={false}
          />
        </div>

        {/* Fleet & Payload */}
        <div className="fleet-grid">
          <div className="input-field">
            <label>VEHICLE FLEET</label>
            <select value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.fuel_type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
          <div className="input-field">
            <label>CARGO (TONNES)</label>
            <input 
              type="number" 
              value={load} 
              min="0.5" 
              max="50" 
              step="0.5" 
              onChange={e => setLoad(Number(e.target.value))} 
            />
          </div>
        </div>

        {/* Optimization Priority Slider */}
        <div className="prio-card">
          <div className="prio-header">
            <span>Optimization Weight</span>
            <span className="prio-badge">{priority}% Green Focus</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={priority} 
            onChange={e => setPriority(e.target.value)} 
          />
          <div className="prio-labels">
            <span>Cost Efficient (0%)</span>
            <span>Eco Friendly (100%)</span>
          </div>
        </div>

        {/* Action Button */}
        <button className="btn-generate" onClick={handleGo} disabled={isOptimizing}>
          {isOptimizing ? (
            <div className="flex-center gap-2">
              <div className="spinner-medium" />
              <span>QIGA Engine Solving...</span>
            </div>
          ) : (
            <div className="flex-center gap-2">
              <span>GENERATE GREEN ROUTE</span>
              <ArrowRight size={18} />
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default Controls;
