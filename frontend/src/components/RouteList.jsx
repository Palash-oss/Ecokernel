import React from 'react';
import { Route, Map as MapIcon, Leaf, IndianRupee } from 'lucide-react';
import './RouteList.css';

const RouteList = ({ solutions, activeId, onSelect }) => {
  if (!solutions || solutions.length === 0) return null;

  return (
    <div className="route-list panel">
      <div className="list-header">
        <MapIcon size={18} className="icon-emerald" />
        <h2>Alternative Routes</h2>
      </div>
      <div className="list-scroll">
        {solutions.map((route, idx) => {
          const isActive = route.id === activeId;
          return (
            <div 
              key={route.id} 
              className={`route-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(route.id)}
            >
              <div className="route-item-main">
                <div className="route-item-title">
                  Option {idx + 1}
                  {idx === 0 && <span className="badge-best-green">Lowest CO₂</span>}
                  {idx === solutions.length - 1 && idx !== 0 && <span className="badge-best-cost">Lowest Cost</span>}
                </div>
                <div className="route-item-modes">
                  {route.modes_used.join(' + ')}
                </div>
              </div>
              <div className="route-item-metrics">
                <div className="metric">
                  <Leaf size={14} className={isActive ? 'text-white' : 'text-emerald'} />
                  <span>{route.total_co2_kg} kg</span>
                </div>
                <div className="metric">
                  <IndianRupee size={14} className={isActive ? 'text-white' : 'text-amber'} />
                  <span>{route.total_cost_inr.toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RouteList;
