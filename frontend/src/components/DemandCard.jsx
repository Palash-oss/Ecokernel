import React, { useMemo } from 'react';
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
  // Filter forecasts for the destination city
  const cityForecasts = useMemo(() => {
    if (!forecastData || forecastData.length === 0) return [];
    return forecastData
      .filter(d => d.city === destination)
      .sort((a, b) => a.day - b.day);
  }, [forecastData, destination]);

  if (cityForecasts.length === 0) return null;

  const data = {
    labels: cityForecasts.map(d => {
      if (d.day < 0) return `T${d.day}`;
      if (d.day === 0) return `Today`;
      return `T+${d.day}`;
    }),
    datasets: [
      {
        label: 'Tonnage Volume',
        data: cityForecasts.map(d => d.predicted_demand),
        backgroundColor: (context) => {
          const index = context.dataIndex;
          const dayVal = cityForecasts[index]?.day;
          
          if (dayVal < 0) {
            // Historical volume
            return 'rgba(16, 185, 129, 0.35)'; // Soft emerald for the past
          } else {
            // Future AI prediction
            const values = context.dataset.data;
            const maxIdx = values.indexOf(Math.max(...values));
            if (index === maxIdx) return 'rgba(4, 120, 87, 0.95)'; // Deep emerald summit
            return 'rgba(5, 150, 105, 0.6)'; // Vivid emerald green for expected future
          }
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
        backgroundColor: '#064e3b',
        bodyColor: '#ecfdf5',
        titleColor: '#34d399',
        displayColors: false,
        callbacks: {
          title: (context) => {
            const item = cityForecasts[context[0].dataIndex];
            return item.day < 0 ? 'Past Operations' : 'AI Forecast';
          },
          label: (context) => {
            return `Volume: ${Math.round(context.raw)} tonnes`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 9 }, maxRotation: 45, minRotation: 45 }
      },
      y: {
        display: false,
        beginAtZero: true
      }
    }
  };

  const avgDemand = cityForecasts.reduce((acc, curr) => acc + curr.predicted_demand, 0) / cityForecasts.length;
  const region = cityForecasts[0]?.region || 'Unknown';
  
  // Check if there is an active Live Event (e.g. Festival Spike)
  const activeEvent = cityForecasts.find(d => d.live_event)?.live_event;

  return (
    <div className={`demand-card panel ${activeEvent ? 'event-active' : ''}`}>
      <div className="demand-header" style={{ marginBottom: '10px' }}>
        <div className="title-area">
          <Activity size={16} className="icon-emerald" />
          <h3 style={{ fontSize: '14px' }}>Fleet Mapping: Hist+Future</h3>
        </div>
        <div className="trend-badge">
          <TrendingUp size={12} />
          <span>{destination}</span>
        </div>
      </div>
      
      {activeEvent ? (
        <div className="live-event-banner pulse-bg border-emerald" style={{ padding: '8px 12px', marginBottom: '10px' }}>
          <span className="event-label text-emerald" style={{fontWeight: 'bold', fontSize: '0.75rem', display: 'block', marginBottom: '2px'}}>⚡ LIVE EVENT SURGE</span>
          <h4 className="m-0 text-emerald" style={{ fontSize: '14px', fontWeight: 600 }}>{activeEvent}</h4>
        </div>
      ) : (
        <div className="demand-metric" style={{ marginBottom: '5px' }}>
          <span className="value" style={{ fontSize: '20px' }}>{Math.round(avgDemand)}</span>
          <span className="unit">t / Day (14d Map)</span>
        </div>
      )}

      <div className="demand-chart">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default DemandCard;
