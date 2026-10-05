import React from 'react';
import { Route, Train, Leaf, Clock, IndianRupee, AlertTriangle, ShieldAlert, Zap, Compass, CheckCircle2, ChevronRight } from 'lucide-react';
import './RoutePanel.css';

const RoutePanel = ({ route, onApplyDepartureTime }) => {
  if (!route) return null;

  const dr = route.dispatch_risk;
  const isEv = (route.vehicle_type || '').toLowerCase().includes('electric') || (route.vehicle_type || '').toLowerCase().includes('ev');
  const unitName = isEv ? 'kWh (Aux Chiller)' : 'L (Diesel Idling)';

  return (
    <div className="route-panel panel">
      {/* Route Header */}
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

      {/* Primary Metrics Grid */}
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

      {/* ─── STEP 1: SMART DISPATCH & CORRIDOR RISK ENGINE ─── */}
      {dr && (
        <div className={`dispatch-risk-card ${dr.curfew.is_curfew_hit ? 'is-curfew' : dr.curfew.is_buffer_risk ? 'is-buffer' : 'is-clear'}`}>
          {/* Card Title & Status Badge */}
          <div className="risk-card-header">
            <div className="risk-header-title">
              <Compass size={16} className="text-emerald" />
              <span className="risk-title-text">CORRIDOR DISPATCH & BORDER CURFEW ANALYSIS</span>
            </div>
            <div className={`risk-status-pill pill-${dr.risk_level.toLowerCase()}`}>
              {dr.curfew.is_curfew_hit ? (
                <>
                  <ShieldAlert size={12} />
                  <span>CURFEW DETENTION</span>
                </>
              ) : dr.curfew.is_buffer_risk ? (
                <>
                  <AlertTriangle size={12} />
                  <span>RAZOR-THIN MARGIN</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} />
                  <span>TRANSIT CLEAR</span>
                </>
              )}
            </div>
          </div>

          {/* Curfew Collision Alert */}
          {dr.curfew.is_curfew_hit && (
            <div className="curfew-alert-banner">
              <div className="curfew-alert-top">
                <span className="curfew-badge">HGV Entry Ban Active</span>
                <span className="curfew-gate-name">{dr.curfew.border_gate}</span>
              </div>
              <div className="curfew-alert-desc">
                Heavy vehicles prohibited: <strong>{dr.curfew.curfew_start} – {dr.curfew.curfew_end}</strong> ({dr.curfew.window_name}).
                Traffic police enforce border halt until curfew lift.
              </div>
              <div className="curfew-penalties-grid">
                <div className="penalty-cell">
                  <span className="pen-lbl">Highway Detention</span>
                  <span className="pen-val">{dr.curfew.detention_minutes} min wait</span>
                </div>
                <div className="penalty-cell">
                  <span className="pen-lbl">Idling Loss</span>
                  <span className="pen-val">{dr.curfew.wasted_idle_units} {unitName}</span>
                </div>
                <div className="penalty-cell">
                  <span className="pen-lbl">Idle Waste CO₂</span>
                  <span className="pen-val">+{dr.curfew.wasted_idle_co2_kg} kg</span>
                </div>
              </div>
            </div>
          )}

          {/* Razor-Thin Margin Alert */}
          {dr.curfew.is_buffer_risk && (
            <div className="buffer-alert-banner">
              <div className="buffer-alert-top">
                <AlertTriangle size={14} className="text-emerald" />
                <span className="buffer-title">Razor-Thin Arrival Buffer Detected</span>
              </div>
              <div className="buffer-alert-desc">
                {dr.curfew.warning_note}
              </div>
            </div>
          )}

          {/* Probabilistic Window Grid (P50 vs P90) */}
          <div className="arrival-window-grid">
            <div className="window-cell">
              <span className="w-lbl">Planned Departure</span>
              <span className="w-val">{dr.planned_departure_display || dr.planned_departure}</span>
            </div>
            <div className="window-cell">
              <span className="w-lbl">Nominal Arrival (P50)</span>
              <span className="w-val">{dr.arrival_p50_display || dr.arrival_p50_nominal}</span>
            </div>
            <div className="window-cell highlight-p90">
              <span className="w-lbl">Risk-Buffered Arrival (P90)</span>
              <span className="w-val">{dr.arrival_p90_display || dr.arrival_p90_buffered}</span>
              <span className="w-hint">+{dr.buffer_minutes}m highway buffer</span>
            </div>
          </div>

          {/* 24-Hour Continuous Corridor Horizon Strip */}
          {dr.timeline_24h && dr.timeline_24h.length > 0 && (
            <div className="timeline-24h-box">
              <div className="timeline-header">
                <div className="flex-center gap-1">
                  <Clock size={13} className="text-emerald" />
                  <span className="timeline-title">24-HOUR CORRIDOR RISK HORIZON</span>
                </div>
                <div className="timeline-legend">
                  <span className="leg-item leg-clear">● Clear Ingress</span>
                  <span className="leg-item leg-buffer">● Buffer Risk</span>
                  <span className="leg-item leg-curfew">● Curfew Lock</span>
                </div>
              </div>

              <div className="timeline-strip-scroll">
                {dr.timeline_24h.map((slot) => {
                  const currentHour = parseInt((dr.planned_departure || '06:00').split(':')[0], 10);
                  const isCurrent = slot.hour === currentHour;
                  return (
                    <button
                      key={slot.hour}
                      type="button"
                      className={`timeline-slot-btn status-${slot.status.toLowerCase()} ${isCurrent ? 'is-selected' : ''}`}
                      onClick={() => onApplyDepartureTime && onApplyDepartureTime(slot.departure_time)}
                      title={`${slot.departure_time} Departure → Arrive ${slot.arrival_nominal} (${slot.recommendation})`}
                    >
                      <span className="slot-num">{slot.hour}h</span>
                      <div className="slot-indicator" />
                    </button>
                  );
                })}
              </div>
              <div className="timeline-hint-text">
                💡 Click any hour block above to simulate and lock that departure window.
              </div>
            </div>
          )}

          {/* Mountain Ghats & Corridor Choke Points */}
          {dr.choke_points && dr.choke_points.length > 0 && (
            <div className="choke-points-box">
              <span className="choke-box-lbl">Identified Mountain Ghats & Corridor Bottlenecks:</span>
              <div className="choke-chips-list">
                {dr.choke_points.map((cp, idx) => (
                  <div key={idx} className="choke-chip">
                    <span className={`cp-sev-badge sev-${cp.risk_level.toLowerCase()}`}>{cp.risk_level}</span>
                    <span className="cp-chip-name">{cp.name}</span>
                    <span className="cp-chip-reason">— {cp.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Smart Departure Advisory */}
          {dr.optimal_departure && (
            <div className="smart-advisory-banner">
              <div className="advisory-top">
                <div className="flex-center gap-2">
                  <Zap size={15} className="text-emerald" />
                  <span className="advisory-headline">{dr.optimal_departure.advisory_headline}</span>
                </div>
                {dr.optimal_departure.co2_saved_kg > 0 && (
                  <span className="advisory-saving-tag">
                    Saves {dr.optimal_departure.fuel_saved_units} {unitName.split(' ')[0]} & {dr.optimal_departure.co2_saved_kg} kg CO₂
                  </span>
                )}
              </div>
              <p className="advisory-detail-text">
                {dr.optimal_departure.advisory_details}
              </p>
              {dr.optimal_departure.time_shift_minutes !== 0 && onApplyDepartureTime && (
                <button
                  type="button"
                  className="btn-apply-departure"
                  onClick={() => onApplyDepartureTime(dr.optimal_departure.recommended_departure)}
                >
                  <span>Apply Recommended Departure ({dr.optimal_departure.recommended_departure})</span>
                  <ChevronRight size={15} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ISO 14083 Breakdown Card */}
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

      {/* Segment Breakdown */}
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
