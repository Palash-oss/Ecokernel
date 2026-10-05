import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, Clock, ShieldAlert, CheckCircle2, Navigation, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import './WeeklyForecastRadar.css';

// Fallback preset corridors — shown only when no route has been optimized yet
const PRESET_CORRIDORS = [
  { id: 'mum-del', name: 'Mumbai → Delhi', origin: 'Mumbai', dest: 'Delhi', lat1: 19.0760, lng1: 72.8777, lat2: 28.7041, lng2: 77.1025, distance: '1,400 km', avgTrips: 5 },
  { id: 'blr-che', name: 'Bangalore → Chennai', origin: 'Bangalore', dest: 'Chennai', lat1: 12.9716, lng1: 77.5946, lat2: 13.0827, lng2: 80.2707, distance: '350 km', avgTrips: 5 },
  { id: 'hyd-pune', name: 'Hyderabad → Pune', origin: 'Hyderabad', dest: 'Pune', lat1: 17.3850, lng1: 78.4867, lat2: 18.5204, lng2: 73.8567, distance: '560 km', avgTrips: 4 },
  { id: 'kol-del', name: 'Kolkata → Delhi', origin: 'Kolkata', dest: 'Delhi', lat1: 22.5726, lng1: 88.3639, lat2: 28.7041, lng2: 77.1025, distance: '1,500 km', avgTrips: 3 },
  { id: 'che-hyd', name: 'Chennai → Hyderabad', origin: 'Chennai', dest: 'Hyderabad', lat1: 13.0827, lng1: 80.2707, lat2: 17.3850, lng2: 78.4867, distance: '630 km', avgTrips: 5 },
];

const WeeklyForecastRadar = ({ activeCorridor }) => {
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [dynamicForecast, setDynamicForecast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // If user has not dispatched a route yet, allow them to pick from presets
  const [presetId, setPresetId] = useState('mum-del');
  const hasActiveCorridor = activeCorridor && activeCorridor.origin && activeCorridor.dest;

  // The corridor to actually query: user's route takes priority, else preset
  const corridor = hasActiveCorridor
    ? activeCorridor
    : PRESET_CORRIDORS.find(c => c.id === presetId);

  useEffect(() => {
    if (!corridor) return;
    const fetchForecast = async () => {
      setIsLoading(true);
      setDynamicForecast(null);
      setSelectedDayIdx(0);
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
        console.error('Forecast fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchForecast();
  // Stringify to avoid reference equality issues
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corridor?.origin, corridor?.dest, corridor?.lat1, corridor?.lat2, presetId]);

  const daysForecast = dynamicForecast?.days || [];
  const activeDay = daysForecast[selectedDayIdx];

  const totalWeeklyCo2 = dynamicForecast?.total_weekly_co2_savings_kg ?? null;
  const totalWeeklyInr = dynamicForecast?.total_weekly_cost_savings_inr ?? null;

  // Best day = day with lowest risk + most savings
  const bestDay = daysForecast.length > 0
    ? daysForecast.reduce((best, d) =>
        (d.riskLevel === 'low' && d.co2SavedKg > (best?.co2SavedKg || 0)) ? d : best,
      daysForecast[0])
    : null;

  return (
    <div className="weekly-radar-container fade-in">

      {/* Header */}
      <div className="radar-header panel">
        <div className="title-block">
          <div className="icon-pulse-badge">
            <Calendar size={24} className="text-emerald" />
          </div>
          <div>
            <h2>Weekly Dispatch AI Radar &amp; Disruption Forecast</h2>
            <p>
              {hasActiveCorridor
                ? '7-day predictive intelligence for your active optimized corridor.'
                : 'No route dispatched yet — select a preset corridor to explore the forecast.'}
            </p>
          </div>
        </div>

        <div className="corridor-selector">
          {hasActiveCorridor ? (
            // Show locked active corridor badge
            <div className="active-corridor-badge">
              <Navigation size={14} />
              <span><strong>{corridor.origin}</strong> → <strong>{corridor.dest}</strong></span>
              <span className="live-tag" style={{ marginLeft: 8 }}>ACTIVE ROUTE</span>
            </div>
          ) : (
            // Show preset picker
            <>
              <span className="select-lbl">EXPLORE CORRIDOR:</span>
              <select
                value={presetId}
                onChange={e => { setPresetId(e.target.value); }}
                className="corridor-dropdown"
              >
                {PRESET_CORRIDORS.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.distance} — ~{c.avgTrips}x/wk)
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Info banner when using presets */}
      {!hasActiveCorridor && (
        <div className="preset-info-banner panel" style={{
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 10,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 0,
          fontSize: '0.82rem',
          color: '#94a3b8',
        }}>
          <Info size={15} style={{ color: '#10b981', flexShrink: 0 }} />
          <span>
            Forecast is currently showing a <strong style={{ color: '#e2e8f0' }}>sample corridor</strong>.&nbsp;
            Go to the <strong style={{ color: '#10b981' }}>Dashboard</strong>, dispatch a real route, and the
            weekly forecast will automatically update to reflect that exact corridor.
          </span>
        </div>
      )}

      {/* Overview KPI Cards */}
      {isLoading ? (
        <div className="radar-summary-grid" style={{ opacity: 0.5 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="summary-card panel" style={{ height: 80, background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : dynamicForecast ? (
        <div className="radar-summary-grid">
          <div className="summary-card panel border-green">
            <div className="card-top-lbl">Weekly Avoided CO₂ (per trip × 5)</div>
            <div className="card-val text-green">
              {totalWeeklyCo2 !== null ? `-${totalWeeklyCo2} kg CO₂` : '—'}
            </div>
            <div className="card-sub font-mono">⚡ Optimized green departure windows</div>
          </div>
          <div className="summary-card panel border-emerald">
            <div className="card-top-lbl">Predicted Fuel &amp; Toll Savings</div>
            <div className="card-val text-emerald">
              {totalWeeklyInr !== null ? `₹${totalWeeklyInr.toLocaleString()}` : '—'}
            </div>
            <div className="card-sub font-mono">Estimated cost reduction vs peak dispatch</div>
          </div>
          <div className="summary-card panel border-emerald">
            <div className="card-top-lbl">Best Departure Window This Week</div>
            <div className="card-val text-emerald">
              {bestDay ? `${bestDay.day}, ${bestDay.bestHour}` : '—'}
            </div>
            <div className="card-sub font-mono">Lowest congestion + highest green grid score</div>
          </div>
        </div>
      ) : null}

      {/* 7-Day Timeline */}
      {isLoading ? (
        <div className="timeline-grid panel">
          <div className="timeline-title-row">
            <h3>Loading 7-Day Intelligence Matrix…</h3>
          </div>
          <div className="days-row" style={{ gap: 8 }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} className="day-card" style={{ opacity: 0.25, pointerEvents: 'none', height: 100 }} />
            ))}
          </div>
        </div>
      ) : daysForecast.length > 0 ? (
        <div className="timeline-grid panel">
          <div className="timeline-title-row">
            <h3>7-Day Forward Intelligence Matrix ({corridor?.origin} → {corridor?.dest})</h3>
            <span className="live-tag">LIVE · Open-Meteo Weather + OSRM Traffic</span>
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
      ) : null}

      {/* Active Day Drill-Down */}
      <AnimatePresence mode="wait">
        {activeDay && (
          <motion.div
            key={selectedDayIdx}
            className="active-day-details panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
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
                  <div
                    className="m-bar-fill"
                    style={{ width: `${Math.min(100, (activeDay.gridIntensity / 300) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="metric-box">
                <span className="m-lbl">Potential Emission Reduction</span>
                <span className="m-val text-green">-{activeDay.co2Savings}</span>
                <span className="m-sub">vs standard peak-hour dispatch</span>
              </div>
              <div className="metric-box">
                <span className="m-lbl">Estimated Trip Savings</span>
                <span className="m-val text-emerald">₹{(activeDay.fuelSavedInr || 0).toLocaleString()}</span>
                <span className="m-sub">Fuel + avoided congestion idling cost</span>
              </div>
            </div>

            <div className="dispatch-action-row">
              <p>
                💡 <strong>Fleet Advisory:</strong> Dispatching on{' '}
                <strong>{activeDay.day} at {activeDay.bestHour}</strong> avoids peak congestion and
                leverages lower grid intensity —
                saving <strong>{activeDay.co2SavedKg} kg CO₂</strong> versus a standard peak departure.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state — no forecast data at all */}
      {!isLoading && daysForecast.length === 0 && (
        <div className="active-day-details panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3 style={{ opacity: 0.5 }}>No forecast data available</h3>
          <p className="text-muted">The backend weather service may be temporarily unavailable.</p>
        </div>
      )}
    </div>
  );
};

export default WeeklyForecastRadar;
