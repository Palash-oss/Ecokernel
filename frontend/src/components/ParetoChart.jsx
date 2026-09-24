import React from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import './ParetoChart.css';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

const ParetoChart = ({ paretoFront, activeRouteId, onSelectRoute }) => {
  if (!paretoFront || !paretoFront.solutions || paretoFront.solutions.length === 0) {
    return (
      <div className="pareto-chart glass-panel empty-state">
        <p>Run optimisation to generate Pareto front</p>
      </div>
    );
  }

  const solutions = paretoFront.solutions;
  
  const data = {
    datasets: [
      {
        label: 'Optimal Routes',
        data: solutions.map(s => ({
          x: s.total_cost_inr,
          y: s.total_co2_kg,
          id: s.id,
          score: s.green_score
        })),
        backgroundColor: (context) => {
          const id = context.raw?.id;
          if (id === activeRouteId) return '#fff'; // White for selected
          
          // Color based on Green Score
          const score = context.raw?.score || 0;
          if (score > 80) return '#00e599'; // Bright emerald
          if (score > 50) return '#10b981'; // Mint emerald
          if (score > 20) return '#059669'; // Deep emerald
          return '#047857'; // Forest emerald
        },
        borderColor: (context) => {
          const id = context.raw?.id;
          return id === activeRouteId ? '#00d97e' : 'transparent';
        },
        borderWidth: (context) => {
          const id = context.raw?.id;
          return id === activeRouteId ? 3 : 0;
        },
        pointRadius: (context) => {
          const id = context.raw?.id;
          return id === activeRouteId ? 8 : 6;
        },
        pointHoverRadius: 10,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const solutionId = data.datasets[0].data[index].id;
        onSelectRoute(solutionId);
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `Route ${context.raw.id} | Cost: ₹${context.raw.x.toLocaleString()} | CO₂: ${context.raw.y.toFixed(1)}kg | Score: ${context.raw.score.toFixed(1)}`;
          }
        },
        backgroundColor: 'rgba(10, 14, 39, 0.9)',
        titleColor: '#00d97e',
        bodyColor: '#fff',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Total Cost (INR)', color: '#94a3b8' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' }
      },
      y: {
        title: { display: true, text: 'Carbon Emissions (kg CO₂)', color: '#94a3b8' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' }
      },
    },
  };

  return (
    <div className="pareto-chart glass-panel">
      <div className="chart-header">
        <h3>Pareto Optimal Front</h3>
        <span className="subtitle">Cost vs Carbon Trade-off</span>
      </div>
      <div className="chart-container">
        <Scatter options={options} data={data} />
      </div>
      <div className="chart-footer">
        Click a point to view route details.
      </div>
    </div>
  );
};

export default ParetoChart;
