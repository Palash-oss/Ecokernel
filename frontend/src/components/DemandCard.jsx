import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { TrendingUp, Activity } from 'lucide-react';
import './DemandCard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const DemandCard = ({ forecastData, destination }) => {
  if (!forecastData || forecastData.length === 0) return null;

  const data = {
    labels: forecastData.map(d => d.date.split('-').slice(1).join('/')),
    datasets: [
      {
        label: 'Demand (Tonnes)',
        data: forecastData.map(d => d.predicted_tonnes),
        backgroundColor: (context) => {
          const index = context.dataIndex;
          const maxIdx = context.dataset.data.indexOf(Math.max(...context.dataset.data));
          return index === maxIdx ? 'rgba(247, 201, 72, 0.8)' : 'rgba(0, 217, 126, 0.4)';
        },
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(10, 14, 39, 0.9)',
        bodyColor: '#fff',
        titleColor: '#00d97e',
        displayColors: false,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      },
      y: {
        display: false, // Hide Y axis to keep it clean
        beginAtZero: true
      }
    }
  };

  const avgDemand = forecastData.reduce((acc, curr) => acc + curr.predicted_tonnes, 0) / forecastData.length;

  return (
    <div className="demand-card glass-panel">
      <div className="demand-header">
        <div className="title-area">
          <Activity size={16} className="icon-emerald" />
          <h3>AI Demand Forecast</h3>
        </div>
        <div className="trend-badge">
          <TrendingUp size={12} />
          <span>{destination} Region</span>
        </div>
      </div>
      
      <div className="demand-metric">
        <span className="value">{Math.round(avgDemand)}</span>
        <span className="unit">Tonnes / day (7-day avg)</span>
      </div>

      <div className="demand-chart">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default DemandCard;
