import React from 'react';
import { Zap, AlertTriangle } from 'lucide-react';
import './CarbonBadge.css';

const CarbonBadge = ({ gridIntensity }) => {
  if (!gridIntensity) return null;

  const getStatusColor = (val) => {
    if (val < 100) return 'green';
    if (val < 200) return 'amber';
    return 'red';
  };

  const status = getStatusColor(gridIntensity.intensity_gco2_kwh);
  const colorClass = `badge-${status}`;

  return (
    <div className={`carbon-badge glass-panel ${colorClass}`}>
      <div className="badge-icon">
        {status === 'red' ? <AlertTriangle size={20} /> : <Zap size={20} />}
      </div>
      <div className="badge-info">
        <span className="badge-label">Live Grid Carbon Intensity</span>
        <div className="badge-value">
          {gridIntensity.intensity_gco2_kwh} <span>gCO₂/kWh</span>
        </div>
      </div>
      <div className="badge-status">
        {gridIntensity.index.toUpperCase()}
      </div>
    </div>
  );
};

export default CarbonBadge;
