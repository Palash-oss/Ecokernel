import React, { useState, useEffect, useRef } from 'react';
import { Play, Settings2, SlidersHorizontal, MapPin, Navigation, Search, AlertCircle } from 'lucide-react';
import api from '../api/client';
import './Controls.css';

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const LocationInput = ({ label, value, onChange, onSelect, placeholder, showCurrentLocation }) => {
  const [query, setQuery] = useState(value?.name || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const wrapperRef = useRef(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    // Correctly handle both object-based and string-based values
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
    // Fetch suggestions when debounced query changes to reduce requests
    const doFetch = async () => {
      if (!debouncedQuery || debouncedQuery.length < 3) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }
      try {
        const results = await api.searchPlaces(debouncedQuery, 8);
        if (Array.isArray(results)) {
          setSuggestions(results);
          setShowDropdown(results.length > 0);
        }
      } catch (err) {
        console.error("Search failed:", err);
      }
    };
    doFetch();
  }, [debouncedQuery]);

  const fetchSuggestions = async (val) => {
    // Deprecated: replaced by debounced hook above
    return;
  };

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
          const name = data?.name || "My Location";
          setQuery(name);
          onSelect({ name, lat, lng });
        } catch (err) {
          console.error("Reverse geocode failed", err);
        } finally {
          setIsLocating(false);
        }
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true }
    );
  };

  const renderIcon = (type) => {
    const style = { color: 'rgba(255,255,255,0.4)' };
    if (type === 'city' || type === 'town') return <MapPin size={16} style={{ ...style, color: '#10b981' }} />;
    if (type === 'house' || type === 'building') return <Search size={14} style={style} />;
    return <Navigation size={14} style={style} />;
  };

  return (
    <div className="relative w-full" ref={wrapperRef} style={{ zIndex: showDropdown ? 9999 : 50 }}>
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 ml-1 block">{label}</label>
      <div className="relative flex items-center bg-slate-900/90 border border-white/10 rounded-xl transition-all duration-300 focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/20">
        <div className="pl-4 pr-2 py-3 flex items-center justify-center text-slate-500 shrink-0">
          {label === "Origin" ? <div className="w-2 h-2 rounded-full border-2 border-emerald-500" /> : <MapPin size={16} />}
        </div>
        <input 
          type="text" 
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            onChange(e.target.value);
          }}
          className="flex-1 bg-transparent border-none outline-none py-3 text-sm text-slate-100 placeholder:text-slate-600"
          placeholder={placeholder}
          autoComplete="off"
        />
        {showCurrentLocation && (
          <button 
            className="p-3 mr-1 text-slate-500 hover:text-emerald-500 transition-colors disabled:opacity-50 shrink-0"
            onClick={handleCurrentLocation} 
            disabled={isLocating}
            type="button"
          >
            {isLocating ? <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /> : <Navigation size={14} fill="currentColor" />}
          </button>
        )}
      </div>
      
      {showDropdown && suggestions.length > 0 && (
        <div className="fixed bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10000 max-h-80 overflow-y-auto w-full max-w-sm"
          style={{
            top: wrapperRef.current ? wrapperRef.current.getBoundingClientRect().bottom + window.scrollY + 8 : 'auto',
            left: wrapperRef.current ? wrapperRef.current.getBoundingClientRect().left + window.scrollX : 'auto',
            width: wrapperRef.current ? wrapperRef.current.offsetWidth : 'auto'
          }}
        >
          {suggestions.map((s, idx) => (
            <div 
              key={idx} 
              className="flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-white/10 border-b border-white/5 last:border-0"
              onClick={() => handleSelect(s)}
            >
              <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-white/5 rounded-full mt-0.5">
                {renderIcon(s.type)}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="text-sm font-bold text-white truncate">{s.name.split(',')[0]}</div>
                <div className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">{s.name.split(',').slice(1).join(',')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Controls = ({ vehicles, onOptimize, isOptimizing }) => {
  const [origin, setOrigin] = useState({ name: '', lat: null, lng: null });
  const [destination, setDestination] = useState({ name: '', lat: null, lng: null });
  const [vehicleId, setVehicleId] = useState('ashok_leyland_euro6');
  const [priority, setPriority] = useState(50);
  const [load, setLoad] = useState(10.0);
  const [isLocating, setIsLocating] = useState(false);

  // Auto-detect user's current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          try {
            const data = await api.reverseGeocode(lat, lng);
            setOrigin({ name: data.name || "My Location", lat, lng });
          } catch (err) {
            // Fallback: set coordinates without reverse geocode
            setOrigin({ name: "My Location", lat, lng });
          }
        },
        () => {
          // Geolocation denied or failed - silent fail, user can manually enter
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
      );
    }
  }, []);

  const handleCurrentLoc = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const data = await api.reverseGeocode(lat, lng);
          setOrigin({ name: data.name || "My Location", lat, lng });
        } catch {
          setOrigin({ name: "My Location", lat, lng });
        } finally {
          setIsLocating(false);
        }
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleGo = async () => {
    let finalOrigin = { ...origin };
    let finalDest = { ...destination };

    // Resolve coordinates if not already set
    const resolveLocation = async (loc) => {
      if (loc.lat && loc.lng) return loc;
      if (!loc.name) return null;
      
      try {
        const results = await api.searchPlaces(loc.name, 1);
        if (results && results.length > 0) {
          const f = results[0];
          return {
            name: loc.name,
            lat: f.lat,
            lng: f.lng
          };
        }
      } catch (err) { console.error("Auto-resolve failed", err); }
      return null;
    };

    if (!finalOrigin.lat) finalOrigin = await resolveLocation(finalOrigin);
    if (!finalDest.lat) finalDest = await resolveLocation(finalDest);

    if (!finalOrigin?.name || !finalDest?.name) {
      alert("Please enter valid origin and destination addresses.");
      return;
    }

    const sameCoords =
      finalOrigin.lat != null &&
      finalOrigin.lng != null &&
      finalDest.lat != null &&
      finalDest.lng != null &&
      Math.abs(finalOrigin.lat - finalDest.lat) < 0.001 &&
      Math.abs(finalOrigin.lng - finalDest.lng) < 0.001;

    if (sameCoords) {
      alert("Origin and destination are the same. Please choose different locations.");
      return;
    }

    onOptimize({
      origin: {
        address: finalOrigin.name,
        lat: finalOrigin.lat ?? null,
        lng: finalOrigin.lng ?? null
      },
      destination: {
        address: finalDest.name,
        lat: finalDest.lat ?? null,
        lng: finalDest.lng ?? null
      },
      vehicle_type: vehicleId,
      load_tonnes: Number(load),
      priority: priority / 100.0
    });
  };

  return (
    <div className="ctrl-panel">
      <div className="ctrl-title">
        <Settings2 size={18} />
        <h2>Mission Parameters</h2>
      </div>

      <div className="ctrl-container">
        <div className="route-connector-box">
          <div className="path-line"></div>
          <LocationInput
            label="Origin"
            value={origin.name}
            onChange={v => setOrigin({ ...origin, name: v })}
            onSelect={setOrigin}
            placeholder="Starting address..."
            showCurrentLocation={true}
            onCurrentLocation={handleCurrentLoc}
            isLocating={isLocating}
          />
          <LocationInput
            label="Destination"
            value={destination.name}
            onChange={v => setDestination({ ...destination, name: v })}
            onSelect={setDestination}
            placeholder="Delivery destination..."
          />
        </div>

        <div className="fleet-row">
          <div className="input-group-field">
            <label>Vehicle Fleet</label>
            <select value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="input-group-field">
            <label>Cargo (T)</label>
            <input type="number" value={load} onChange={e => setLoad(Number(e.target.value))} />
          </div>
        </div>

        <div className="prio-card">
          <div className="prio-header">
            <span>Optimization Priority</span>
            <span className="prio-badge">{priority}% Green</span>
          </div>
          <input type="range" min="0" max="100" value={priority} onChange={e => setPriority(e.target.value)} />
          <div className="prio-labels">
            <span>Cost Efficient</span>
            <span>Eco Friendly</span>
          </div>
        </div>

        <button className="calculate-btn" onClick={handleGo} disabled={isOptimizing}>
          {isOptimizing ? <div className="spinner-medium" /> : "GENERATE GREEN ROUTE"}
        </button>
      </div>
    </div>
  );
};

export default Controls;
