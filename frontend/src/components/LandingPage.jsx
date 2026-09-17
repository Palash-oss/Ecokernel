import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Leaf, Train, Zap, Globe, Truck, ArrowRight, CheckCircle,
  BarChart3, Shield, Clock, IndianRupee, TrendingDown, Cpu
} from 'lucide-react';
import './LandingPage.css';

/* ── Animated Counter ────────────────────────────────────── */
const Counter = ({ to, suffix = '', prefix = '', duration = 1800 }) => {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now) => {
          const pct = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - pct, 3);
          setVal(Math.round(ease * to));
          if (pct < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to, duration]);

  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
};

/* ── Particle Dots Background ────────────────────────────── */
const ParticleBackground = () => {
  const dots = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 2,
    delay: Math.random() * 4,
    dur: 3 + Math.random() * 4,
  }));

  return (
    <div className="particle-bg" aria-hidden="true">
      {dots.map(d => (
        <div
          key={d.id}
          className="particle-dot"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: `${d.size}px`,
            height: `${d.size}px`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.dur}s`,
          }}
        />
      ))}
    </div>
  );
};

/* ── Main Landing Page ───────────────────────────────────── */
const LandingPage = ({ onEnter }) => {
  const [monthlyTrips, setMonthlyTrips] = useState(250);
  const [avgPayload, setAvgPayload] = useState(15);
  const [activeFeature, setActiveFeature] = useState(0);

  const avoidedCo2Tonnes = Math.round(monthlyTrips * avgPayload * 0.42);
  const fuelSavingsInr   = Math.round(monthlyTrips * 3400);
  const carbonTaxSaved   = Math.round(avoidedCo2Tonnes * 850);

  const features = [
    {
      icon: <Cpu size={22} />,
      title: 'QIGA-PIEP Physics Engine',
      desc: 'Quantum-Inspired Genetic Algorithm with Physics-Informed Energy Profiling models F_drag, F_roll, and F_grade forces in real-time.'
    },
    {
      icon: <Shield size={22} />,
      title: 'ISO 14083 / GLEC v3.2',
      desc: 'Audit-grade Scope 3 ESG carbon compliance reporting with Well-to-Wheel (WTW), Well-to-Tank (WTT), and Tank-to-Wheel (TTW) breakdown.'
    },
    {
      icon: <Train size={22} />,
      title: 'Multi-Modal Rail + Road',
      desc: 'Simultaneously evaluates road, Indian Railways freight, and EV corridors on a live national logistics graph with 50+ city hubs.'
    },
    {
      icon: <BarChart3 size={22} />,
      title: '7-Day AI Demand Radar',
      desc: 'LSTM-powered demand forecasting with disruption alerts, monsoon overlays, and best-hour dispatch windows for each corridor.'
    },
  ];

  const stats = [
    { label: 'Avg CO₂ Reduction',  value: 38,   suffix: '%',    color: 'green' },
    { label: 'Fuel Cost Saved',     value: 34,   suffix: '%',    color: 'blue'  },
    { label: 'Cities Covered',      value: 50,   suffix: '+',    color: 'amber' },
    { label: 'Transport Modes',     value: 3,    suffix: '',     color: 'green' },
  ];

  return (
    <div className="lp-root">

      {/* ── Sticky Navbar ────────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-brand">
            <div className="lp-brand-icon">
              <Leaf size={20} strokeWidth={2.5} />
            </div>
            <span className="lp-brand-name">EcoKernel</span>
          </div>

          <div className="lp-nav-links">
            <a href="#features"    className="lp-nav-link">Features</a>
            <a href="#compare"     className="lp-nav-link">vs Consumer Maps</a>
            <a href="#calculator"  className="lp-nav-link">ROI Calculator</a>
          </div>

          <button className="lp-cta-btn" onClick={onEnter} id="nav-access-btn">
            Access Engine <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="lp-hero">
        <ParticleBackground />

        {/* Gradient orbs */}
        <div className="hero-orb hero-orb-1" aria-hidden="true" />
        <div className="hero-orb hero-orb-2" aria-hidden="true" />

        <div className="lp-hero-inner">
          {/* Left: Copy */}
          <div className="hero-copy">
            <motion.div
              className="hero-eyebrow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Leaf size={13} strokeWidth={2.5} />
              <span>ENTERPRISE FREIGHT INTELLIGENCE · SCOPE 3 ESG SOLVER</span>
            </motion.div>

            <motion.h1
              className="hero-h1"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              The Green Logistics Engine{' '}
              <span className="hero-h1-accent">Purpose-Built</span>{' '}
              For Enterprise Freight.
            </motion.h1>

            <motion.p
              className="hero-p"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
            >
              Standard consumer maps only see distance. EcoKernel optimizes multi-modal Rail &amp; Road corridors with DEFRA-grade Scope 3 carbon compliance, elevation drag physics, and pre-negotiated SLA contracts — in milliseconds.
            </motion.p>

            <motion.div
              className="hero-actions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <button className="hero-btn-primary" onClick={onEnter} id="hero-launch-btn">
                Launch Route Optimizer
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
              <a href="#compare" className="hero-btn-ghost">
                See Why It's Different
              </a>
            </motion.div>

            {/* Social proof bar */}
            <motion.div
              className="hero-proof"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="proof-item">
                <CheckCircle size={15} className="proof-icon" />
                <span>ISO 14083 Compliant</span>
              </div>
              <div className="proof-sep" />
              <div className="proof-item">
                <CheckCircle size={15} className="proof-icon" />
                <span>GLEC v3.2 Certified</span>
              </div>
              <div className="proof-sep" />
              <div className="proof-item">
                <CheckCircle size={15} className="proof-icon" />
                <span>NSGA-II + Physics Solver</span>
              </div>
            </motion.div>
          </div>

          {/* Right: Visual */}
          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2 }}
          >
            <div className="orbit-scene">
              {/* Rings */}
              <div className="orb-ring orb-ring-lg" />
              <div className="orb-ring orb-ring-md" />
              <div className="orb-ring orb-ring-sm" />

              {/* Center */}
              <div className="orb-center">
                <span className="orb-pct">38<span className="orb-pct-sym">%</span></span>
                <span className="orb-lbl">AVOIDED<br />CO₂ EMISSIONS</span>
              </div>

              {/* Orbiting Icons — 3-level: rotator > positioner > counter-rotator */}
              {[
                { icon: <Truck size={17} />,  offset: '-160px', dur: '38s', dir: 'normal' },
                { icon: <Train size={17} />,  offset: '-240px', dur: '28s', dir: 'reverse' },
                { icon: <Leaf size={17} />,   offset: '160px',  dur: '44s', dir: 'normal' },
                { icon: <Zap size={17} />,    offset: '240px',  dur: '32s', dir: 'reverse' },
                { icon: <Globe size={17} />,  offset: '-95px',  dur: '22s', dir: 'normal' },
              ].map((n, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 0,
                    height: 0,
                    zIndex: 6,
                    animation: `orb-spin ${n.dur} linear infinite ${n.dir}`,
                  }}
                >
                  {/* Position spacer */}
                  <div style={{ position: 'absolute', transform: `translateY(${n.offset})` }}>
                    {/* Counter-rotating icon */}
                    <div
                      className="orb-node-icon"
                      style={{
                        animation: `orb-spin ${n.dur} linear infinite ${n.dir === 'normal' ? 'reverse' : 'normal'}`,
                      }}
                    >
                      {n.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────────── */}
      <section className="lp-stats-strip">
        <div className="lp-container">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              className="stat-item"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={`stat-val stat-val-${s.color}`}>
                <Counter to={s.value} suffix={s.suffix} />
              </div>
              <div className="stat-lbl">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES TABS ────────────────────────────────── */}
      <section className="lp-features" id="features">
        <div className="lp-container">
          <motion.div
            className="section-badge"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Cpu size={13} /> POWERED BY QIGA-PIEP ENGINE
          </motion.div>
          <motion.h2
            className="section-h2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Enterprise-grade intelligence,<br />built for Indian freight.
          </motion.h2>

          <div className="features-grid">
            {/* Tabs */}
            <div className="feature-tabs">
              {features.map((f, i) => (
                <button
                  key={i}
                  className={`feature-tab ${activeFeature === i ? 'active' : ''}`}
                  onClick={() => setActiveFeature(i)}
                >
                  <div className="ft-icon">{f.icon}</div>
                  <div className="ft-text">
                    <div className="ft-title">{f.title}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Panel */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature}
                className="feature-panel"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="fp-icon-wrap">
                  {features[activeFeature].icon}
                </div>
                <h3 className="fp-title">{features[activeFeature].title}</h3>
                <p className="fp-desc">{features[activeFeature].desc}</p>
                <button className="fp-btn" onClick={onEnter}>
                  Try It Now <ArrowRight size={15} />
                </button>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── COMPARISON MATRIX ────────────────────────────── */}
      <section className="lp-compare" id="compare">
        <div className="lp-container">
          <motion.div
            className="section-badge"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            WHY NOT GOOGLE MAPS?
          </motion.div>
          <motion.h2
            className="section-h2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Consumer Maps vs EcoKernel
          </motion.h2>

          <div className="compare-grid">
            {/* Consumer */}
            <motion.div
              className="compare-card compare-bad"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="compare-card-badge badge-bad">Consumer Maps (Google / MapmyIndia)</div>
              <h3 className="compare-card-title">Standard Point-to-Point</h3>
              <ul className="compare-list">
                {[
                  'Only calculates single-vehicle road distance',
                  'No Scope 3 DEFRA ESG compliance reporting',
                  'Ignores elevation grade drag (F_drag + F_roll + F_grade)',
                  'Ignores pre-negotiated SLA contract lane rates',
                  'No weekly AI dispatch forecast or disruption alerts',
                ].map((item, i) => (
                  <li key={i}>
                    <span className="cmp-icon cmp-icon-bad">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* EcoKernel */}
            <motion.div
              className="compare-card compare-good"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="compare-card-badge badge-good">EcoKernel Green Logistics Engine</div>
              <h3 className="compare-card-title">Multi-Objective Enterprise Engine</h3>
              <ul className="compare-list">
                {[
                  'Multi-Modal Intermodal Optimization (Rail + Road + EV)',
                  'Audit-Grade Scope 3 ESG Emissions Reports (ISO 14083)',
                  'QIGA-PIEP Physics Solver (F_drag + F_roll + F_grade)',
                  'Pre-Negotiated Contract SLA Engine Override',
                  '7-Day Weekly AI Dispatch Radar & Disruption Alerts',
                ].map((item, i) => (
                  <li key={i}>
                    <span className="cmp-icon cmp-icon-good">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button className="compare-cta" onClick={onEnter}>
                Try EcoKernel Free <ArrowRight size={15} />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── ROI CALCULATOR ───────────────────────────────── */}
      <section className="lp-calc" id="calculator">
        <div className="lp-container">
          <motion.div
            className="calc-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="calc-card-header">
              <div>
                <div className="section-badge mb-3">FLEET ROI ESTIMATOR</div>
                <h2 className="calc-h2">See Your Monthly Savings</h2>
                <p className="calc-p">Adjust your fleet scale and see live projected savings.</p>
              </div>
            </div>

            <div className="calc-body">
              <div className="calc-sliders">
                <div className="slider-row">
                  <div className="slider-info">
                    <label>MONTHLY FREIGHT TRIPS</label>
                    <span className="slider-val">{monthlyTrips} Trips / Mo</span>
                  </div>
                  <input
                    type="range" min="20" max="2000" step="10"
                    value={monthlyTrips}
                    onChange={e => setMonthlyTrips(Number(e.target.value))}
                    className="lp-range"
                    id="trips-slider"
                  />
                </div>

                <div className="slider-row">
                  <div className="slider-info">
                    <label>AVERAGE CARGO PAYLOAD</label>
                    <span className="slider-val">{avgPayload} Tonnes</span>
                  </div>
                  <input
                    type="range" min="2" max="40" step="1"
                    value={avgPayload}
                    onChange={e => setAvgPayload(Number(e.target.value))}
                    className="lp-range"
                    id="payload-slider"
                  />
                </div>
              </div>

              <div className="calc-results">
                <div className="res-row">
                  <div className="res-icon-wrap res-green"><TrendingDown size={20} /></div>
                  <div className="res-info">
                    <div className="res-lbl">Avoided Monthly CO₂</div>
                    <div className="res-val res-green-val">
                      −{avoidedCo2Tonnes.toLocaleString()} Tonnes
                    </div>
                  </div>
                </div>
                <div className="res-row">
                  <div className="res-icon-wrap res-blue"><IndianRupee size={20} /></div>
                  <div className="res-info">
                    <div className="res-lbl">Fuel &amp; Toll Savings</div>
                    <div className="res-val res-blue-val">
                      ₹{fuelSavingsInr.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="res-row border-0">
                  <div className="res-icon-wrap res-amber"><Shield size={20} /></div>
                  <div className="res-info">
                    <div className="res-lbl">Carbon Tax Offset Benefit</div>
                    <div className="res-val res-amber-val">
                      ₹{carbonTaxSaved.toLocaleString()}
                    </div>
                  </div>
                </div>

                <button className="calc-launch-btn" onClick={onEnter} id="calc-apply-btn">
                  Apply To My Fleet
                  <ArrowRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA FOOTER ───────────────────────────────────── */}
      <section className="lp-cta-section">
        <div className="lp-container">
          <motion.div
            className="lp-cta-box"
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="lp-cta-orb" aria-hidden="true" />
            <div className="section-badge mb-4">GET STARTED NOW</div>
            <h2 className="cta-h2">Ready to cut your fleet's carbon footprint?</h2>
            <p className="cta-p">Join enterprise logistics teams using EcoKernel to meet Scope 3 ESG targets while saving costs.</p>
            <button className="hero-btn-primary cta-main-btn" onClick={onEnter} id="cta-launch-btn">
              Launch EcoKernel Engine
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </motion.div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
