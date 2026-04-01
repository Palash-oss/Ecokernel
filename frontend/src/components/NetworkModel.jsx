import React, { useState, useEffect } from 'react';
import { Database, Activity, Wifi, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './NetworkModel.css';

const NetworkModel = ({ network }) => {
  const [liveMetrics, setLiveMetrics] = useState({});

  // Simulate real-time pulsing load data for each hub
  useEffect(() => {
    if (!network?.nodes) return;
    
    const interval = setInterval(() => {
      setLiveMetrics(prev => {
        const next = { ...prev };
        network.nodes.forEach(n => {
          // Keep load relatively stable, bouncing slightly
          const currentLoad = prev[n.name] || (Math.random() * 40 + 30);
          const flux = (Math.random() - 0.5) * 15;
          next[n.name] = Math.max(10, Math.min(95, currentLoad + flux));
        });
        return next;
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, [network]);

  if (!network) return null;
  
  // Calculate total infrastructure scale
  const totalKm = network.edges.reduce((sum, e) => sum + e.distance_km, 0);
  
  // Pre-calculate edges per node for the UI
  const connectionsByHub = {};
  network.nodes.forEach(n => {
    connectionsByHub[n.name] = network.edges
      .filter(e => e.from_city === n.name || e.to_city === n.name)
      .map(e => ({
        dest: e.from_city === n.name ? e.to_city : e.from_city,
        dist: e.distance_km,
        rail: e.has_rail,
        speed: e.avg_speed_kmh || 45,
        disruption: e.disruption
      }))
      .sort((a, b) => {
        // Sort disrupted connections to the top
        if (a.disruption && !b.disruption) return -1;
        if (!a.disruption && b.disruption) return 1;
        return a.dist - b.dist;
      })
      .slice(0, 4); // Only show top 4 connections per module
  });

  return (
    <div className="network-model-container fade-in">
      <div className="network-header">
        <Database className="icon-blue pulse-icon" size={28} />
        <div className="title-group">
          <h2>Live Infrastructure Core</h2>
          <span className="live-badge"><span className="dot" /> ONLINE</span>
        </div>
      </div>

      <div className="kpi-banner panel">
        <div className="kpi-group border-right">
          <span className="kpi-val">{network.nodes.length}</span>
          <span className="kpi-lbl">Active Logistics Hubs</span>
        </div>
        <div className="kpi-group border-right">
          <span className="kpi-val text-blue">{network.edges.length}</span>
          <span className="kpi-lbl">Monitored Routes</span>
        </div>
        <div className="kpi-group">
          <span className="kpi-val text-emerald">{totalKm.toLocaleString(undefined, { maximumFractionDigits: 0 })} <small>km</small></span>
          <span className="kpi-lbl">Total Grid Footprint</span>
        </div>
      </div>

      <div className="hub-grid">
        <AnimatePresence>
          {network.nodes.map(node => {
            const load = liveMetrics[node.name] || 50;
            const isHighLoad = load > 80;
            
            return (
              <motion.div 
                key={node.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: Math.random() * 0.3 }}
                className={`hub-module panel ${isHighLoad ? 'high-load' : ''}`}
              >
                <div className="hub-module-header">
                  <div className="hub-title">
                    <MapPin size={16} className={isHighLoad ? 'text-amber' : 'text-blue'} />
                    <h3>{node.name}</h3>
                    <span className="region-tag">{node.region}</span>
                  </div>
                  <Wifi size={16} className={`signal-icon ${load < 40 ? 'green' : load < 75 ? 'amber' : 'red'}`} />
                </div>
                
                <div className="hub-capacity">
                  <div className="capacity-labels">
                    <span>Processing Load</span>
                    <span className={isHighLoad ? 'text-amber' : ''}>{load.toFixed(1)}%</span>
                  </div>
                  <div className="capacity-bar-bg">
                    <motion.div 
                      className={`capacity-bar-fill ${isHighLoad ? 'bg-amber' : load < 40 ? 'bg-green' : 'bg-blue'}`}
                      animate={{ width: `${load}%` }}
                      transition={{ type: "spring", stiffness: 50 }}
                    />
                  </div>
                </div>

                <div className="hub-connections">
                  <div className="conn-header">
                    <Activity size={12} className="text-muted" />
                    <span>Real-time Link Speeds</span>
                  </div>
                  <div className="conn-list">
                    {connectionsByHub[node.name].map(conn => (
                      <div className={`conn-item ${conn.disruption ? 'is-disrupted' : ''}`} key={conn.dest}>
                        <span className="conn-dest">{conn.dest}</span>
                        {conn.disruption && (
                          <span className="micro-tag alert pulse-bg" title="Road Blockage / Severe Weather" style={{fontSize: '0.6rem', padding: '1px 3px', borderRadius: '2px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid currentColor'}}>
                            ⚠ {conn.disruption.split(' ')[0]}
                          </span>
                        )}
                        <div className="conn-metrics">
                          {conn.rail && !conn.disruption && <span className="micro-tag rail" title="Rail Corridor Active">R</span>}
                          <span className={`conn-val ${conn.disruption ? 'text-red' : ''}`}>{Math.round(conn.speed)} km/h</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NetworkModel;
