import React from 'react';
import { CloudRain, Leaf, TrendingDown, History, BarChart2 } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ParetoChart from './ParetoChart';
import './EmissionsReport.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

const EmissionsReport = ({ paretoFront, activeRouteId, runHistory = [] }) => {
  const totalSavings = runHistory.reduce((acc, run) => acc + run.savings, 0);
  const totalBaseline = runHistory.reduce((acc, run) => acc + run.baselineCo2, 0);
  const overallReductionPercent = totalBaseline > 0 ? ((totalSavings / totalBaseline) * 100).toFixed(1) : 0;

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
      <div className="report-header mb-4">
        <Leaf className="icon-emerald" size={28} />
        <h2>Global Emissions Impact Report</h2>
        {runHistory.length > 0 && (
          <span className="route-context bg-emerald-glow">
            {runHistory.length} Fleet Operations Simulated
          </span>
        )}
      </div>

      <div className="insight-cards">
        <div className="insight-card panel border-blue">
          <div className="insight-icon bg-blue-dim"><History size={24} className="text-blue" /></div>
          <div className="insight-data">
            <span className="lbl">Cumulative Baseline CO₂</span>
            <span className="val">{totalBaseline.toFixed(1)} <small>kg</small></span>
            <span className="sub">(Standard logistics routing)</span>
          </div>
        </div>
        <div className="insight-card panel border-green">
          <div className="insight-icon bg-green-dim"><Leaf size={24} className="text-green" /></div>
          <div className="insight-data">
            <span className="lbl">Total Prevented CO₂</span>
            <span className="val text-green">{totalSavings.toFixed(1)} <small>kg</small></span>
            <span className="sub">via EcoKernel Engine</span>
          </div>
        </div>
        <div className="insight-card panel border-amber">
          <div className="insight-data full-width">
            <span className="lbl">Fleet-Wide Emission Reduction</span>
            <div className="flex-center gap-2 mt-1">
              <TrendingDown size={32} className="text-amber" />
              <span className="val text-amber">{overallReductionPercent}%</span>
            </div>
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
    </div>
  );
};

export default EmissionsReport;
