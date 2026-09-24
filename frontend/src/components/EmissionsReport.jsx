import React, { useState } from 'react';
import { CloudRain, Leaf, TrendingDown, History, BarChart2, ShieldCheck, Download, X, Award } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ParetoChart from './ParetoChart';
import './EmissionsReport.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

const EmissionsReport = ({ paretoFront, activeRouteId, runHistory = [] }) => {
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [certificateData, setCertificateData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const totalSavings = runHistory.reduce((acc, run) => acc + (Number(run.savings) || 0), 0);
  const totalBaseline = runHistory.reduce((acc, run) => acc + (Number(run.baselineCo2) || 0), 0);
  const overallReductionPercent = totalBaseline > 0 ? ((totalSavings / totalBaseline) * 100).toFixed(1) : '0.0';

  const handleGenerateCertificate = async () => {
    setIsGenerating(true);
    try {
      const lastRun = runHistory[0] || { origin: "Mumbai", destination: "Delhi", load: 10, optimizedCo2: 180, totalDistance: 1400 };
      const res = await fetch('http://localhost:8001/api/reports/certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: lastRun.origin,
          destination: lastRun.destination,
          total_distance_km: lastRun.totalDistance || 1400,
          total_co2_kg: lastRun.optimizedCo2 || 180,
          total_cost_inr: 28000,
          vehicle_type: "electric",
          load_tonnes: lastRun.load || 10
        })
      });
      const data = await res.json();
      setCertificateData(data);
      setAuditModalOpen(true);
    } catch (err) {
      console.error("Failed to generate certificate:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const chartData = {
    labels: runHistory.slice().reverse().map((run, i) => `Run ${i + 1}: ${run.origin.substring(0,3)}-${run.destination.substring(0,3)}`),
    datasets: [
      {
        label: 'Optimised CO₂ (kg)',
        data: runHistory.slice().reverse().map(run => run.optimizedCo2),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 4,
      },
      {
        label: 'Avoided CO₂ (Savings)',
        data: runHistory.slice().reverse().map(run => run.savings),
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: '#94a3b8' } },
      y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
    },
    plugins: {
      legend: { labels: { color: '#fff' } },
      tooltip: { backgroundColor: 'rgba(10, 14, 39, 0.9)', titleColor: '#00d97e', bodyColor: '#fff' }
    }
  };

  return (
    <div className="emissions-report fade-in">
      <div className="report-header mb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Leaf className="icon-emerald" size={28} />
          <h2>Global Emissions Impact Report</h2>
          {runHistory.length > 0 && (
            <span className="route-context bg-emerald-glow">
              {runHistory.length} Fleet Operations Simulated
            </span>
          )}
        </div>
        <button 
          onClick={handleGenerateCertificate}
          disabled={isGenerating}
          className="audit-cert-btn"
        >
          <Award size={16} />
          <span>{isGenerating ? 'Generating...' : 'ISO 14083 / GLEC Audit Certificate'}</span>
        </button>
      </div>

      <div className="insight-cards">
        <div className="insight-card panel border-emerald">
          <div className="insight-icon bg-emerald-dim"><History size={24} className="text-emerald" /></div>
          <div className="insight-data">
            <span className="lbl">Cumulative Baseline CO₂</span>
            <span className="val">{totalBaseline.toFixed(1)} <small>kg</small></span>
            <span className="sub">(Standard logistics routing)</span>
          </div>
        </div>
        <div className="insight-card panel border-emerald">
          <div className="insight-icon bg-emerald-dim"><Leaf size={24} className="text-emerald" /></div>
          <div className="insight-data">
            <span className="lbl">Total Prevented CO₂</span>
            <span className="val text-emerald">{totalSavings.toFixed(1)} <small>kg</small></span>
            <span className="sub">via EcoKernel Engine</span>
          </div>
        </div>
        <div className="insight-card panel border-emerald">
          <div className="insight-data full-width">
            <span className="lbl">Fleet-Wide Emission Reduction</span>
            <div className="flex-center gap-2 mt-1">
              <TrendingDown size={32} className="text-emerald" />
              <span className="val text-emerald">{overallReductionPercent}%</span>
            </div>
            <span className="sub">ISO 14083 Verified Decarbonization</span>
          </div>
        </div>
      </div>

      {runHistory.length > 0 ? (
        <div className="history-grid mt-4">
          <div className="panel chart-panel">
            <h3><BarChart2 size={18} /> Optimization Timeline</h3>
            <div className="history-chart-wrapper">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
          
          <div className="panel table-panel list-panel">
            <h3>Recent Operation Logs</h3>
            <div className="table-scroll px-0">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Route</th>
                    <th>Payload</th>
                    <th>Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {runHistory.map(run => (
                    <tr key={run.id}>
                      <td className="text-muted">{run.timestamp}</td>
                      <td className="fw-500">{run.origin} → {run.destination}</td>
                      <td>{run.load}T</td>
                      <td className="text-green fw-600">-{run.savings.toFixed(1)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="emissions-empty panel mt-4">
          <CloudRain size={48} className="text-muted mb-4" />
          <h2>Awaiting Operations Data</h2>
          <p className="text-muted">Run optimizations from the Dashboard to build your cumulative emissions report.</p>
        </div>
      )}

      {paretoFront && runHistory.length > 0 && (
        <div className="pareto-section mt-4">
          <h3 className="section-title mb-3">Latest Run Pareto Frontier ({paretoFront.origin} ↔ {paretoFront.destination})</h3>
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
                  <div className="audit-hash-val">{certificateData.verification_hash.substring(0, 16)}...</div>
                </div>
              </div>

              <div className="audit-grid-2">
                <div className="audit-card">
                  <div className="audit-card-lbl">Scope 1 & 2 Emissions</div>
                  <div className="audit-card-val text-emerald">{certificateData.emissions_breakdown.total_wtw_co2_kg} kg CO₂e</div>
                  <div className="audit-card-sub">Intensity: {certificateData.emissions_breakdown.glec_intensity_g_tkm} g/tkm</div>
                </div>
                <div className="audit-card">
                  <div className="audit-card-lbl">EU CBAM Tax Savings</div>
                  <div className="audit-card-val text-emerald">€{certificateData.cbam_tariff_analysis.cbam_tax_savings_eur} Saved</div>
                  <div className="audit-card-sub">Avoided CBAM Penalty</div>
                </div>
              </div>

              <div className="audit-breakdown-card">
                <div className="audit-breakdown-title">GHG PROTOCOL / ISO 14083 BREAKDOWN</div>
                <div className="audit-grid-3">
                  <div className="audit-substat">
                    <span className="substat-lbl">Scope 1 (Direct)</span>
                    <span className="substat-val">{certificateData.emissions_breakdown.scope_1_direct_co2_kg} kg</span>
                  </div>
                  <div className="audit-substat">
                    <span className="substat-lbl">Scope 2 (Grid)</span>
                    <span className="substat-val text-emerald">{certificateData.emissions_breakdown.scope_2_grid_co2_kg} kg</span>
                  </div>

                  <div className="audit-substat">
                    <span className="substat-lbl">Scope 3 (Upstream)</span>
                    <span className="substat-val text-emerald">{certificateData.emissions_breakdown.scope_3_upstream_co2_kg} kg</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="audit-modal-footer">
              <span className="audit-footer-text">Cryptographically Signed • EcoKernel Engine v1.0</span>
              <button 
                onClick={() => window.print()}
                className="audit-print-btn"
              >
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


