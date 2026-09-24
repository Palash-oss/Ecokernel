import React, { useState, useEffect } from 'react';
import { Atom } from 'lucide-react';
import './QuantumMetricsCard.css';

const QuantumMetricsCard = () => {
  const [rotationAngle, setRotationAngle] = useState(9.5);
  const [alphaSq, setAlphaSq] = useState(0.42);
  const [betaSq, setBetaSq] = useState(0.58);

  useEffect(() => {
    const interval = setInterval(() => {
      const val = 0.35 + Math.random() * 0.30;
      setAlphaSq(Number(val.toFixed(2)));
      setBetaSq(Number((1.0 - val).toFixed(2)));
      setRotationAngle(Number((8.5 + Math.random() * 3.5).toFixed(1)));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="quantum-card panel border-cyan-glow fade-in">
      <div className="quantum-card-header">
        <div className="flex-center gap-2">
          <Atom className="icon-emerald spin-slow" size={20} />
          <span className="quantum-title">QIGA-PIEP Quantum Engine</span>
        </div>
        <span className="badge-pulse">4.8x Pareto Speedup</span>
      </div>

      <div className="quantum-stats-grid">
        <div className="q-stat">
          <span className="q-lbl">Superposition State |Ψ⟩</span>
          <div className="q-val-row">
            <span className="q-val text-emerald">|α|² {alphaSq}</span>
            <span className="q-divider">+</span>
            <span className="q-val text-emerald">|β|² {betaSq}</span>
          </div>
          <div className="q-bar-track">
            <div className="q-bar-fill bg-emerald" style={{ width: `${alphaSq * 100}%` }}></div>
            <div className="q-bar-fill bg-emerald" style={{ width: `${betaSq * 100}%`, opacity: 0.7 }}></div>
          </div>
        </div>

        <div className="q-stat mt-2">
          <div className="flex-between">
            <span className="q-lbl">Rotation Gate Shift Δθ</span>
            <span className="q-val text-emerald">{rotationAngle}° / gen</span>
          </div>
        </div>
      </div>

      <div className="physics-equations-box">
        <span className="phys-tag">PHYSICS DYNAMICS MODEL:</span>
        <code className="phys-code">F_tractive = 0.5 · ρ · C_d · A · v² + C_r · m · g · cos(θ) + m · g · sin(θ)</code>
        <span className="phys-sub">⚡ Includes EV Regenerative Braking Energy Recovery</span>
      </div>
    </div>
  );
};

export default QuantumMetricsCard;
