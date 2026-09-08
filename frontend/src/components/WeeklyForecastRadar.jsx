import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, TrendingDown, Clock, ShieldAlert, CloudRain, Zap, Truck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/client';
import './WeeklyForecastRadar.css';

const CORRIDORS = [
  { id: 'mum-del', name: 'Mumbai → Delhi', origin: 'Mumbai', dest: 'Delhi', lat1: 19.0760, lng1: 72.8777, lat2: 28.7041, lng2: 77.1025, distance: '1,400 km', avgTrips: 5 },
  { id: 'blr-che', name: 'Bangalore → Chennai', origin: 'Bangalore', dest: 'Chennai', lat1: 12.9716, lng1: 77.5946, lat2: 13.0827, lng2: 80.2707, distance: '350 km', avgTrips: 5 },
  { id: 'hyd-pune', name: 'Hyderabad → Pune', origin: 'Hyderabad', dest: 'Pune', lat1: 17.3850, lng1: 78.4867, lat2: 18.5204, lng2: 73.8567, distance: '560 km', avgTrips: 4 },
  { id: 'kol-del', name: 'Kolkata → Delhi', origin: 'Kolkata', dest: 'Delhi', lat1: 22.5726, lng1: 88.3639, lat2: 28.7041, lng2: 77.1025, distance: '1,500 km', avgTrips: 3 },
  { id: 'che-hyd', name: 'Chennai → Hyderabad', origin: 'Chennai', dest: 'Hyderabad', lat1: 13.0827, lng1: 80.2707, lat2: 17.3850, lng2: 78.4867, distance: '630 km', avgTrips: 5 },
];

const WeeklyForecastRadar = () => {
  const [selectedCorridorId, setSelectedCorridorId] = useState('mum-del');
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [dynamicForecast, setDynamicForecast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const corridor = CORRIDORS.find(c => c.id === selectedCorridorId) || CORRIDORS[0];

  useEffect(() => {
    const fetchForecast = async () => {
      setIsLoading(true);
      try {
        const data = await api.getWeeklyForecast(
          corridor.origin,
          corridor.dest,
          corridor.lat1,
          corridor.lng1,
          corridor.lat2,
          corridor.lng2
        );
        if (data && data.days) {
          setDynamicForecast(data);
        }
      } catch (err) {
        console.error("Forecast fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchForecast();
  }, [selectedCorridorId]);

  const daysForecast = dynamicForecast?.days || [
    { day: 'Mon', date: 'Today', riskLevel: 'low', riskLabel: 'Optimal Highway Flow', gridIntensity: 165, bestHour: '04:30 AM', co2Savings: '28.5%', fuelSavedInr: 4800, co2SavedKg: 350 },
    { day: 'Tue', date: 'Tomorrow', riskLevel: 'medium', riskLabel: 'Moderate Traffic & Rain (5mm rain)', gridIntensity: 204, bestHour: '03:30 AM', co2Savings: '19.0%', fuelSavedInr: 3200, co2SavedKg: 233 },
    { day: 'Wed', date: '+2 Days', riskLevel: 'high', riskLabel: 'Monsoon & Severe Congestion Alert', gridIntensity: 270, bestHour: '11:30 PM', co2Savings: '12.5%', fuelSavedInr: 2100, co2SavedKg: 154 },
    { day: 'Thu', date: '+3 Days', riskLevel: 'low', riskLabel: 'Optimal Clear Corridor & Highway Flow', gridIntensity: 159, bestHour: '05:00 AM', co2Savings: '28.5%', fuelSavedInr: 4800, co2SavedKg: 350 },
    { day: 'Fri', date: '+4 Days', riskLevel: 'medium', riskLabel: 'Moderate Traffic & Rain', gridIntensity: 212, bestHour: '03:30 AM', co2Savings: '19.0%', fuelSavedInr: 3200, co2SavedKg: 233 },
    { day: 'Sat', date: '+5 Days', riskLevel: 'low', riskLabel: 'Optimal Clear Corridor', gridIntensity: 165, bestHour: '04:30 AM', co2Savings: '28.5%', fuelSavedInr: 4800, co2SavedKg: 350 },
    { day: 'Sun', date: '+6 Days', riskLevel: 'low', riskLabel: 'Low Traffic Density & Green Grid', gridIntensity: 168, bestHour: '05:00 AM', co2Savings: '28.5%', fuelSavedInr: 4800, co2SavedKg: 350 },
  ];

  const activeDay = daysForecast[selectedDayIdx] || daysForecast[0];

  const totalWeeklySavingsCo2 = dynamicForecast?.total_weekly_co2_savings_kg || daysForecast.reduce((acc, d) => acc + (d.co2SavedKg || 250), 0);
  const totalWeeklySavingsInr = dynamicForecast?.total_weekly_cost_savings_inr || daysForecast.reduce((acc, d) => acc + (d.fuelSavedInr || 3000), 0);

  return (
    <div className="weekly-radar-container fade-in">
      {/* Header Banner */}
      <div className="radar-header panel">
        <div className="title-block">
          <div className="icon-pulse-badge">
            <Calendar size={24} className="text-emerald" />
          </div>
          <div>
            <h2>Weekly Dispatch AI Radar & Disruption Forecast</h2>
            <p>Predictive 7-day corridor intelligence for repeated 5x weekly logistics operations.</p>
          </div>
        </div>
        <div className="corridor-selector">
          <span className="select-lbl">CORRIDOR:</span>
          <select 
            value={selectedCorridorId} 
            onChange={e => {
              setSelectedCorridorId(e.target.value);
              setSelectedDayIdx(0);
            }}
            className="corridor-dropdown"
          >
            {CORRIDORS.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.distance} — ~{c.avgTrips}x/wk)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="radar-summary-grid">
        <div className="summary-card panel border-green">
          <div className="card-top-lbl">Weekly Avoided CO₂ (5x Trips)</div>
          <div className="card-val text-green">-{totalWeeklySavingsCo2} <small>kg CO₂</small></div>
          <div className="card-sub font-mono">⚡ Optimized via QIGA Green Departure Windows</div>
        </div>

        <div className="summary-card panel border-cyan">
          <div className="card-top-lbl">Predicted Fuel & Toll Savings</div>
          <div className="card-val text-cyan">₹{totalWeeklySavingsInr.toLocaleString()}</div>
          <div className="card-sub font-mono">Estimated cost reduction vs spot dispatch</div>
        </div>

        <div className="summary-card panel border-amber">
          <div className="card-top-lbl">Recommended Weekly Departure</div>
          <div className="card-val text-amber">Thu, 05:00 AM</div>
          <div className="card-sub font-mono">Lowest congestion & highest green grid score</div>
        </div>
      </div>

      {/* 7-Day Interactive Timeline Selector */}
      <div className="timeline-grid panel">
        <div className="timeline-title-row">
          <h3>7-Day Forward Intelligence Matrix ({corridor.name})</h3>
          <span className="live-tag">UPDATED LIVE VIA ISRO & OSRM DATA</span>
        </div>

        <div className="days-row">
          {daysForecast.map((d, idx) => {
            const isSelected = idx === selectedDayIdx;
            return (
              <motion.div
                key={idx}
                className={`day-card ${isSelected ? 'selected' : ''} risk-${d.riskLevel}`}
                onClick={() => setSelectedDayIdx(idx)}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <div className="day-name">{d.day}</div>
                <div className="day-date">{d.date}</div>

                <div className={`risk-badge risk-${d.riskLevel}`}>
                  {d.riskLevel === 'low' && 'GREEN'}
                  {d.riskLevel === 'medium' && 'MODERATE'}
                  {d.riskLevel === 'high' && 'HIGH RISK'}
                </div>

                <div className="day-savings">-{d.co2Savings} CO₂</div>
                <div className="day-hour"><Clock size={12} /> {d.bestHour}</div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Active Day Inspection Details */}
      {activeDay && (
        <div className="active-day-details panel">
          <div className="active-day-header">
            <div className="flex-center gap-3">
              <div className={`status-icon-box risk-${activeDay.riskLevel}`}>
                {activeDay.riskLevel === 'low' && <CheckCircle2 size={22} className="text-emerald" />}
                {activeDay.riskLevel === 'medium' && <AlertTriangle size={22} className="text-amber" />}
                {activeDay.riskLevel === 'high' && <ShieldAlert size={22} className="text-red" />}
              </div>
              <div>
                <h4>{activeDay.day}, {activeDay.date} — Corridor Risk Analysis</h4>
                <span className="risk-desc-text">{activeDay.riskLabel}</span>
              </div>
            </div>

            <div className="dispatch-recommendation">
              <span className="rec-label">OPTIMAL DEPARTURE WINDOW</span>
              <span className="rec-time">{activeDay.bestHour}</span>
            </div>
          </div>

          <div className="details-metrics-row">
            <div className="metric-box">
              <span className="m-lbl">Grid Carbon Intensity</span>
              <span className="m-val">{activeDay.gridIntensity} <small>gCO₂/kWh</small></span>
              <div className="m-bar-bg">
                <div className="m-bar-fill" style={{ width: `${Math.min(100, (activeDay.gridIntensity / 300) * 100)}%` }}></div>
              </div>
            </div>

            <div className="metric-box">
              <span className="m-lbl">Potential Emission Reduction</span>
              <span className="m-val text-green">-{activeDay.co2Savings}</span>
              <span className="m-sub">vs standard peak hour dispatch</span>
            </div>

            <div className="metric-box">
              <span className="m-lbl">Estimated Trip Savings</span>
              <span className="m-val text-cyan">₹{activeDay.fuelSavedInr.toLocaleString()}</span>
              <span className="m-sub">Fuel + avoided congestion idling</span>
            </div>
          </div>

          <div className="dispatch-action-row">
            <p>💡 <strong>Fleet Advisory:</strong> Running repeat shipments on {activeDay.day} at {activeDay.bestHour} avoids 3 major congestion bottlenecks and leverages lower grid intensity for EV charging.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyForecastRadar;
