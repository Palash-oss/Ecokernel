import React, { useState, useEffect } from 'react';
import { CloudRain, Leaf, TrendingDown, History, BarChart2, ShieldCheck, Download, X, Award, RefreshCw, Database } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ParetoChart from './ParetoChart';
import { API_BASE_URL } from '../api/client';
import './EmissionsReport.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

const API_BASE = API_BASE_URL;

// GLEC v3.2 / ISO 14083 emission factors (g CO2e per tonne-km by vehicle type)
const GLEC_FACTORS = {
  electric: 15.2,           // g CO2e/tkm — India grid mix
  euro6_diesel: 88.0,       // g CO2e/tkm
  cng: 72.5,                // g CO2e/tkm
  hydrogen: 8.0,            // g CO2e/tkm (green H2)
  default: 88.0,
};

// Derive baseline from vehicle type (standard non-optimized routing)
function computeBaseline(route) {
  const factor = GLEC_FACTORS[route.vehicle_type] || GLEC_FACTORS.default;
  const tkm = (route.total_distance_km || 0) * (route.load_tonnes || 10);
  return (factor * tkm) / 1000; // → kg CO2e
}

const EmissionsReport = ({ paretoFront, activeRouteId, refreshKey }) => {
  const [routes, setRoutes] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [certificateData, setCertificateData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch live data from backend DB every time refreshKey changes (and on mount)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [histRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/routes/history?limit=50`),
          fetch(`${API_BASE}/routes/emissions-stats`),
        ]);
        if (histRes.ok) {
          const histData = await histRes.json();
          setRoutes(histData.routes || []);
        }
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        console.warn('EmissionsReport: backend fetch failed, showing empty state.', err?.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  // Computed metrics from live routes
  const totalOptimizedCo2 = routes.reduce((acc, r) => acc + (r.total_co2_kg || 0), 0);
  const totalBaselineCo2 = routes.reduce((acc, r) => acc + computeBaseline(r), 0);
  const totalSavings = Math.max(0, totalBaselineCo2 - totalOptimizedCo2);
  const overallReductionPercent = totalBaselineCo2 > 0
    ? ((totalSavings / totalBaselineCo2) * 100).toFixed(1)
    : '0.0';
  const totalDistanceKm = routes.reduce((acc, r) => acc + (r.total_distance_km || 0), 0);

  const handleGenerateCertificate = async () => {
    setIsGenerating(true);
    try {
      const lastRun = routes[0] || null;
      const res = await fetch(`${API_BASE}/reports/certificate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: lastRun?.origin_address || 'Mumbai',
          destination: lastRun?.destination_address || 'Delhi',
          total_distance_km: lastRun?.total_distance_km || 1400,
          total_co2_kg: lastRun?.total_co2_kg || 180,
          total_cost_inr: lastRun?.total_cost_inr || 28000,
          vehicle_type: lastRun?.vehicle_type || 'electric',
          load_tonnes: lastRun?.load_tonnes || 10,
        }),
      });
      const data = await res.json();
      setCertificateData(data);
      setAuditModalOpen(true);
    } catch (err) {
      console.error('Failed to generate certificate:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Chart — last 10 routes (chronological order, oldest first)
  const chartRoutes = [...routes].reverse().slice(-10);
  const chartData = {
    labels: chartRoutes.map(r =>
      `${(r.origin_address || '').substring(0, 3)}→${(r.destination_address || '').substring(0, 3)}`
    ),
    datasets: [
      {
        label: 'Optimised CO₂ (kg)',
        data: chartRoutes.map(r => Number((r.total_co2_kg || 0).toFixed(1))),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderRadius: 4,
      },
      {
        label: 'Avoided CO₂ (kg)',
        data: chartRoutes.map(r => Number(Math.max(0, computeBaseline(r) - (r.total_co2_kg || 0)).toFixed(1))),
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
      y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
    },
    plugins: {
      legend: { labels: { color: '#fff', font: { size: 11 } } },
      tooltip: { backgroundColor: 'rgba(10, 14, 39, 0.9)', titleColor: '#00d97e', bodyColor: '#fff' },
    },
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
    } catch { return iso; }
  };

  return (
    <div className="emissions-report fade-in">
      {/* Header */}
      <div className="report-header mb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Leaf className="icon-emerald" size={28} />
          <h2>Global Emissions Impact Report</h2>
          <span className="route-context bg-emerald-glow">
            <Database size={12} style={{ display: 'inline', marginRight: 4 }} />
            {isLoading ? 'Loading…' : `${routes.length} Dispatched Routes · Live DB`}
          </span>
        </div>
        <button
          onClick={handleGenerateCertificate}
          disabled={isGenerating || routes.length === 0}
          className="audit-cert-btn"
          title={routes.length === 0 ? 'Dispatch a route first to generate audit' : ''}
        >
          <Award size={16} />
          <span>{isGenerating ? 'Generating…' : 'ISO 14083 / GLEC Audit Certificate'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="insight-cards">
        <div className="insight-card panel border-emerald">
          <div className="insight-icon bg-emerald-dim"><History size={24} className="text-emerald" /></div>
          <div className="insight-data">
            <span className="lbl">Baseline CO₂ (GLEC v3.2)</span>
            <span className="val">{totalBaselineCo2.toFixed(1)} <small>kg CO₂e</small></span>
            <span className="sub">Standard routing without optimisation</span>
          </div>
        </div>
        <div className="insight-card panel border-emerald">
          <div className="insight-icon bg-emerald-dim"><Leaf size={24} className="text-emerald" /></div>
          <div className="insight-data">
            <span className="lbl">Total Prevented CO₂</span>
            <span className="val text-emerald">{totalSavings.toFixed(1)} <small>kg CO₂e</small></span>
            <span className="sub">via EcoKernel green dispatch engine</span>
          </div>
        </div>
        <div className="insight-card panel border-emerald">
          <div className="insight-data full-width">
            <span className="lbl">Fleet-Wide Emission Reduction</span>
            <div className="flex-center gap-2 mt-1">
              <TrendingDown size={32} className="text-emerald" />
              <span className="val text-emerald">{overallReductionPercent}%</span>
            </div>
            <span className="sub">ISO 14083 Scope 1 + 3 Verified · {totalDistanceKm.toFixed(0)} km total</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="emissions-empty panel mt-4">
          <RefreshCw size={36} className="text-emerald mb-3" style={{ animation: 'spin 1s linear infinite' }} />
          <h2>Fetching Operation Ledger…</h2>
          <p className="text-muted">Querying dispatch database for verified emissions data.</p>
        </div>
      ) : routes.length > 0 ? (
        <div className="history-grid mt-4">
          <div className="panel chart-panel">
            <h3><BarChart2 size={18} /> Optimisation Timeline (Last 10 Dispatches)</h3>
            <div className="history-chart-wrapper">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="panel table-panel list-panel">
            <h3>
              <ShieldCheck size={16} style={{ display: 'inline', marginRight: 6, color: 'var(--emerald)' }} />
              Verified Dispatch Ledger
            </h3>
            <div className="table-scroll px-0">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Route</th>
                    <th>Vehicle</th>
                    <th>Payload</th>
                    <th>CO₂ (kg)</th>
                    <th>Avoided</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map(run => {
                    const baseline = computeBaseline(run);
                    const avoided = Math.max(0, baseline - (run.total_co2_kg || 0));
                    return (
                      <tr key={run.id}>
                        <td className="text-muted">{formatDate(run.created_at)}</td>
                        <td className="fw-500">{run.origin_address} → {run.destination_address}</td>
                        <td style={{ fontSize: '0.72rem', opacity: 0.8 }}>{run.vehicle_type}</td>
                        <td>{(run.load_tonnes || 0).toFixed(1)}T</td>
                        <td>{(run.total_co2_kg || 0).toFixed(1)}</td>
                        <td className="text-green fw-600">-{avoided.toFixed(1)} kg</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="emissions-empty panel mt-4">
          <CloudRain size={48} className="text-muted mb-4" />
          <h2>No Dispatches Recorded Yet</h2>
          <p className="text-muted">
            Go to the <strong>Dashboard</strong>, plan a route, and click <em>Optimize Route</em>.<br />
            Every optimized dispatch is automatically saved here for ISO 14083 carbon accounting.
          </p>
        </div>
      )}

      {paretoFront && routes.length > 0 && (
        <div className="pareto-section mt-4">
          <h3 className="section-title mb-3">
            Latest Run Pareto Frontier ({paretoFront.origin} ↔ {paretoFront.destination})
          </h3>
          <ParetoChart paretoFront={paretoFront} activeRouteId={activeRouteId} onSelectRoute={() => {}} />
        </div>
      )}

      {/* Audit Certificate Modal */}
      {auditModalOpen && certificateData && (
        <div className="audit-modal-backdrop" onClick={() => setAuditModalOpen(false)}>
          <div className="audit-modal-container" onClick={e => e.stopPropagation()}>
            <div className="audit-modal-header">
              <div className="audit-header-title">
                <Award className="text-emerald-400" size={24} />
                <div>
                  <h3 className="audit-cert-title">CARBON AUDIT COMPLIANCE CERTIFICATE</h3>
                  <span className="audit-cert-subtitle">{certificateData.standard_compliance}</span>
                </div>
              </div>
              <button onClick={() => setAuditModalOpen(false)} className="audit-close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="audit-modal-body">
              <div className="audit-id-banner">
                <div>
                  <div className="audit-label">CERTIFICATE ID</div>
                  <div className="audit-id-val">{certificateData.certificate_id}</div>
                </div>
                <div className="text-right">
                  <div className="audit-label">VERIFICATION HASH</div>
                  <div className="audit-hash-val">{certificateData.verification_hash?.substring(0, 16)}…</div>
                </div>
              </div>

              <div className="audit-grid-2">
                <div className="audit-card">
                  <div className="audit-card-lbl">Scope 1 &amp; 2 Emissions</div>
                  <div className="audit-card-val text-emerald">{certificateData.emissions_breakdown?.total_wtw_co2_kg} kg CO₂e</div>
                  <div className="audit-card-sub">Intensity: {certificateData.emissions_breakdown?.glec_intensity_g_tkm} g/tkm</div>
                </div>
                <div className="audit-card">
                  <div className="audit-card-lbl">EU CBAM Tax Savings</div>
                  <div className="audit-card-val text-emerald">€{certificateData.cbam_tariff_analysis?.cbam_tax_savings_eur} Saved</div>
                  <div className="audit-card-sub">Avoided CBAM Penalty</div>
                </div>
              </div>

              <div className="audit-breakdown-card">
                <div className="audit-breakdown-title">GHG PROTOCOL / ISO 14083 BREAKDOWN</div>
                <div className="audit-grid-3">
                  <div className="audit-substat">
                    <span className="substat-lbl">Scope 1 (Direct)</span>
                    <span className="substat-val">{certificateData.emissions_breakdown?.scope_1_direct_co2_kg} kg</span>
                  </div>
                  <div className="audit-substat">
                    <span className="substat-lbl">Scope 2 (Grid)</span>
                    <span className="substat-val text-emerald">{certificateData.emissions_breakdown?.scope_2_grid_co2_kg} kg</span>
                  </div>
                  <div className="audit-substat">
                    <span className="substat-lbl">Scope 3 (Upstream)</span>
                    <span className="substat-val text-emerald">{certificateData.emissions_breakdown?.scope_3_upstream_co2_kg} kg</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="audit-modal-footer">
              <span className="audit-footer-text">Cryptographically Signed · EcoKernel Engine v1.0 · {routes.length} routes audited</span>
              <button onClick={() => window.print()} className="audit-print-btn">
                <Download size={14} /> Print Audit Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmissionsReport;
