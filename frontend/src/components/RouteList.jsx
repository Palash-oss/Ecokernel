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
          
          // Determine badge label based on strategy or position
          let badgeLabel = null;
          let badgeClass = '';
          if (route.strategy === 'greenest' || route.is_greenest) {
            badgeLabel = 'Lowest CO₂';
            badgeClass = 'badge-best-green';
          } else if (route.strategy === 'fastest') {
            badgeLabel = 'Fastest';
            badgeClass = 'badge-best-time';
          } else if (route.total_cost_inr === Math.min(...solutions.map(s => s.total_cost_inr))) {
            badgeLabel = 'Lowest Cost';
            badgeClass = 'badge-best-cost';
          }
          
          return (
            <div 
              key={route.id} 
              className={`route-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(route.id)}
            >
              <div className="route-item-main">
                <div className="route-item-title">
                  Option {idx + 1}
                  {badgeLabel && <span className={badgeClass}>{badgeLabel}</span>}
                </div>
                <div className="route-item-modes">
                  {route.modes_used.join(' + ')} · {Math.round(route.total_time_minutes)} min
                </div>
              </div>
              <div className="route-item-metrics">
                <div className="metric">
                  <Leaf size={14} className={isActive ? 'text-white' : 'text-emerald'} />
                  <span>{route.total_co2_kg} kg</span>
                </div>
                <div className="metric">
                  <IndianRupee size={14} className={isActive ? 'text-white' : 'text-amber'} />
                  <span>₹{route.total_cost_inr.toLocaleString()}</span>
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
