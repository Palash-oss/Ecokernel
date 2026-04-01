import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import './WarpTransition.css';

const WarpTransition = ({ onComplete }) => {
  const [logs, setLogs] = useState([]);
  const fullLogs = [
    "Initializing Deep Logistics Engine...",
    "Syncing Regional Hub Data (Mumbai-Delhi)...",
    "Loading Vehicle Emission Coefficients...",
    "Building Neural Routing Matrix...",
    "Fetching Optimized Green Routes...",
    "EcoKernel Engine Online.",
    "ACCESS GRANTED."
  ];

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      if (current < fullLogs.length) {
        setLogs(prev => [...prev, fullLogs[current]]);
        current++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#69f6b8', '#046b43', '#ffffff']
          });
          setTimeout(onComplete, 1500);
        }, 800);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="warp-overlay">
      <div className="starfield">
        {[...Array(50)].map((_, i) => (
          <div key={i} className="star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`
          }}></div>
        ))}
      </div>
      
      <div className="warp-content">
        <motion.div 
          className="log-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {logs.map((log, i) => (
            <motion.div 
              key={i} 
              className="log-entry"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              <span className="prompt">&gt;</span> {log}
            </motion.div>
          ))}
        </motion.div>
        
        <div className="warp-tunnel">
          <div className="ring"></div>
          <div className="ring"></div>
          <div className="ring"></div>
        </div>
      </div>
    </div>
  );
};

export default WarpTransition;
