import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';
import Lenis from 'lenis';
import {
  Leaf, Train, Zap, Globe, Truck, ArrowRight, CheckCircle,
  BarChart3, Shield, Clock, IndianRupee, TrendingDown, Cpu,
  Activity, Navigation, Layers, Wind, Sparkles, ChevronRight,
  Gauge, Radio, FileText, Check, AlertCircle, Compass,
  RefreshCw, ChevronDown, Award, Server
} from 'lucide-react';
import './LandingPage.css';

gsap.registerPlugin(ScrollTrigger, TextPlugin);

/* ─── Animated Counter with Easing ────────────────────────── */
const Counter = ({ to, suffix = '', prefix = '', decimals = 0, duration = 2000 }) => {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min((now - t0) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 4);
          setVal(parseFloat((ease * to).toFixed(decimals)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });

    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration, decimals]);

  return <span ref={ref}>{prefix}{decimals > 0 ? val.toFixed(decimals) : val.toLocaleString()}{suffix}</span>;
};

/* ─── Quantum Particle Field Canvas ───────────────────────── */
const ParticleCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;
    const N = 65;

    const particles = Array.from({ length: N }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: 0.9 + Math.random() * 1.6,
      alpha: 0.15 + Math.random() * 0.45,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      particles.forEach(p => {
        p.x = (p.x + p.vx + W()) % W();
        p.y = (p.y + p.vy + H()) % H();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 153, ${p.alpha})`;
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 229, 153, ${0.12 * (1 - d / 110)})`;
            ctx.lineWidth = 0.65;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="lp-canvas" />;
};

/* ─── Spotlight Card (Mouse Tracking Glow) ───────────────── */
const SpotlightCard = ({ children, className = '', style = {}, onClick }) => {
  const cardRef = useRef(null);

  const handlePointerMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      className={`spotlight-card ${className}`}
      style={style}
      onPointerMove={handlePointerMove}
      onClick={onClick}
    >
      <div className="spotlight-glass" />
      {children}
    </div>
  );
};

/* ─── Magnetic Button ─────────────────────────────────────── */
const MagneticBtn = ({ children, onClick, className = '', id, style = {} }) => {
  const ref = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const btn = ref.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(btn, { x: x * 0.2, y: y * 0.2, duration: 0.3, ease: 'power2.out' });
  }, []);

  const handleMouseLeave = useCallback(() => {
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
  }, []);

  return (
    <button
      ref={ref}
      className={`magnetic-btn ${className}`}
      onClick={onClick}
      id={id}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </button>
  );
};

/* ─── Interactive Multi-Modal Corridor Visualizer ─────────── */
const CORRIDORS = [
  {
    id: 'wdfc',
    name: 'Western DFC (Delhi ↔ Mumbai)',
    tag: 'ELECTRIC RAILWAY INTERMODAL',
    distance: '1,411 km',
    mode: 'WAG-12B Electric Locomotive + EV DFM',
    co2Cut: '−68.4%',
    fuelSaved: '₹48,200',
    energyDraw: '3,840 kWh',
    dragGrade: 'F_drag: 1.8 kN · F_grade: +0.4%',
    points: [
      { x: 90, y: 310, label: 'MUM' },
      { x: 175, y: 250, label: 'BRC' },
      { x: 245, y: 200, label: 'ADI' },
      { x: 345, y: 140, label: 'JP' },
      { x: 450, y: 70, label: 'DEL' }
    ],
    pathD: 'M 90 310 Q 175 250 245 200 T 345 140 T 450 70',
    compliance: 'ISO 14083 Scope 3 Certified'
  },
  {
    id: 'sgc',
    name: 'Southern EV (Bangalore ↔ Chennai)',
    tag: 'HEAVY EV FAST-CHARGING',
    distance: '346 km',
    mode: '55-Tonne Class EV Prime Mover',
    co2Cut: '−45.2%',
    fuelSaved: '₹14,800',
    energyDraw: '740 kWh',
    dragGrade: 'F_drag: 2.2 kN · F_grade: −0.2%',
    points: [
      { x: 90, y: 250, label: 'BLR' },
      { x: 200, y: 215, label: 'HSR' },
      { x: 325, y: 170, label: 'VLR' },
      { x: 450, y: 130, label: 'CHE' }
    ],
    pathD: 'M 90 250 Q 200 215 325 170 T 450 130',
    compliance: 'GLEC v3.2 WTW Validated'
  },
  {
    id: 'edfc',
    name: 'Eastern Heavy Rail (Delhi ↔ Kolkata)',
    tag: 'DEDICATED FREIGHT CORRIDOR',
    distance: '1,530 km',
    mode: 'Double-Stack Container Intermodal',
    co2Cut: '−73.1%',
    fuelSaved: '₹56,400',
    energyDraw: '4,450 kWh',
    dragGrade: 'F_drag: 1.6 kN · F_grade: +0.1%',
    points: [
      { x: 80, y: 85, label: 'DEL' },
      { x: 175, y: 140, label: 'CNB' },
      { x: 265, y: 180, label: 'PRYJ' },
      { x: 360, y: 220, label: 'DHN' },
      { x: 460, y: 265, label: 'CCU' }
    ],
    pathD: 'M 80 85 Q 175 140 265 180 T 360 220 T 460 265',
    compliance: 'DEFRA 2024 Energy Profile'
  }
];

const InteractiveCorridorViz = () => {
  const [activeCorridorId, setActiveCorridorId] = useState('wdfc');
  const activeCorridor = CORRIDORS.find(c => c.id === activeCorridorId) || CORRIDORS[0];

  return (
    <div className="corridor-viz-wrapper">
      <div className="corridor-pills">
        {CORRIDORS.map(c => (
          <button
            key={c.id}
            className={`corridor-pill-btn ${activeCorridorId === c.id ? 'active' : ''}`}
            onClick={() => setActiveCorridorId(c.id)}
          >
            <span className="corridor-pill-dot" />
            <span className="corridor-pill-text">{c.name}</span>
          </button>
        ))}
      </div>

      <div className="corridor-stage">
        <svg viewBox="0 0 540 370" className="corridor-svg">
          <defs>
            <filter id="emerald-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="corridor-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00e599" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="inactive-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Tactical Radar Grid Lines */}
          <line x1="40" y1="90" x2="500" y2="90" stroke="rgba(4, 120, 87, 0.08)" strokeDasharray="4 4" />
          <line x1="40" y1="180" x2="500" y2="180" stroke="rgba(4, 120, 87, 0.08)" strokeDasharray="4 4" />
          <line x1="40" y1="270" x2="500" y2="270" stroke="rgba(4, 120, 87, 0.08)" strokeDasharray="4 4" />
          <line x1="160" y1="35" x2="160" y2="340" stroke="rgba(4, 120, 87, 0.08)" strokeDasharray="4 4" />
          <line x1="280" y1="35" x2="280" y2="340" stroke="rgba(4, 120, 87, 0.08)" strokeDasharray="4 4" />
          <line x1="400" y1="35" x2="400" y2="340" stroke="rgba(4, 120, 87, 0.08)" strokeDasharray="4 4" />

          {/* Header Indicators inside SVG */}
          <text x="45" y="32" fill="#047857" fontSize="10" fontWeight="700" fontFamily="JetBrains Mono, monospace">
            INDIA FREIGHT CORRIDOR RADAR · TOPOGRAPHY GRADE
          </text>
          <text x="495" y="32" textAnchor="end" fill="#64748b" fontSize="9" fontWeight="600" fontFamily="JetBrains Mono, monospace">
            GLEC v3.2 AUDITED
          </text>

          {/* Background national grid mesh */}
          {CORRIDORS.map(c => (
            <path
              key={`bg-${c.id}`}
              d={c.pathD}
              fill="none"
              stroke={c.id === activeCorridorId ? 'url(#corridor-gradient)' : 'url(#inactive-gradient)'}
              strokeWidth={c.id === activeCorridorId ? '3.5' : '1.5'}
              strokeDasharray={c.id === activeCorridorId ? 'none' : '4 4'}
              filter={c.id === activeCorridorId ? 'url(#emerald-glow)' : 'none'}
              className="corridor-path"
            />
          ))}

          {/* Active moving energy pulse along the bezier curve */}
          <path
            d={activeCorridor.pathD}
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeDasharray="20 180"
            className="corridor-pulse-traveler"
          />

          {/* City Nodes */}
          {activeCorridor.points.map((pt, idx) => (
            <g key={idx} className="corridor-node-group">
              <circle
                cx={pt.x}
                cy={pt.y}
                r="18"
                fill="rgba(0, 229, 153, 0.08)"
                stroke="rgba(0, 229, 153, 0.25)"
                strokeWidth="1"
                className="node-ring-pulse"
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r="6"
                fill="#00e599"
                filter="url(#emerald-glow)"
              />
              <text
                x={pt.x}
                y={pt.y + 26}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11"
                fontWeight="700"
                fontFamily="JetBrains Mono, monospace"
                className="node-label"
              >
                {pt.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Live Corridor Telemetry HUD */}
        <div className="corridor-hud">
          <div className="corridor-hud-header">
            <span className="hud-badge-live">
              <span className="hud-live-dot" /> LIVE SOLVER DISPATCH
            </span>
            <span className="hud-compliance">{activeCorridor.compliance}</span>
          </div>

          <div className="corridor-hud-grid">
            <div className="hud-stat">
              <div className="hud-stat-lbl">OPTIMAL MODE</div>
              <div className="hud-stat-val text-emerald">{activeCorridor.mode}</div>
            </div>
            <div className="hud-stat">
              <div className="hud-stat-lbl">DISTANCE</div>
              <div className="hud-stat-val">{activeCorridor.distance}</div>
            </div>
            <div className="hud-stat">
              <div className="hud-stat-lbl">CO₂ REDUCTION</div>
              <div className="hud-stat-val text-glow-emerald">{activeCorridor.co2Cut}</div>
            </div>
            <div className="hud-stat">
              <div className="hud-stat-lbl">NET FUEL SAVING</div>
              <div className="hud-stat-val text-white">{activeCorridor.fuelSaved}</div>
            </div>
          </div>

          <div className="corridor-hud-footer">
            <Cpu size={12} className="text-emerald" />
            <span>Physics Forces: {activeCorridor.dragGrade} · Total Draw: {activeCorridor.energyDraw}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Live OBD-II IoT Telemetry Marquee ───────────────────── */
const TelemetryTicker = () => {
  const telemetryItems = [
    { corridor: 'WDFC #4092', speed: '82 km/h', soc: '88%', mode: 'WAG-12B Rail', co2: '0.024 kg/t-km', status: 'ISO 14083 VERIFIED' },
    { corridor: 'NH-48 #104', speed: '66 km/h', soc: '79%', mode: 'EV Class 55t', co2: '0.048 kg/t-km', status: 'REGEN BRAKING ON' },
    { corridor: 'EDFC #9103', speed: '84 km/h', soc: '94%', mode: 'Heavy Freight', co2: '0.021 kg/t-km', status: 'GLEC v3.2 AUDITED' },
    { corridor: 'GQ-S #2218', speed: '72 km/h', soc: '68%', mode: 'Intermodal EV', co2: '0.038 kg/t-km', status: 'GRID: 520 g/kWh' },
    { corridor: 'WDFC #4188', speed: '80 km/h', soc: '91%', mode: 'WAG-12B Rail', co2: '0.023 kg/t-km', status: 'GRADE OPTIMIZED' },
  ];

  return (
    <div className="telemetry-ribbon">
      <div className="telemetry-ribbon-tag">
        <Radio size={12} className="pulse-icon text-emerald" />
        <span>LIVE CAN-BUS OBD-II TELEMETRY</span>
      </div>
      <div className="telemetry-track">
        <div className="telemetry-inner">
          {[...telemetryItems, ...telemetryItems].map((item, idx) => (
            <div key={idx} className="telemetry-chip">
              <span className="chip-corridor">{item.corridor}</span>
              <span className="chip-bullet">·</span>
              <span className="chip-mode">{item.mode}</span>
              <span className="chip-bullet">·</span>
              <span className="chip-speed">{item.speed}</span>
              <span className="chip-bullet">·</span>
              <span className="chip-co2">{item.co2}</span>
              <span className="chip-status">{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Fixed-Frame Typewriter Component ────────────────────── */
const TYPEWRITER_WORDS = ['Decarbonize', 'Optimize', 'Accelerate', 'Transform'];

const TypewriterWord = () => {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('Decarbonize');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = TYPEWRITER_WORDS[idx];
    let timer;

    if (!deleting && text.length < word.length) {
      timer = setTimeout(() => setText(word.slice(0, text.length + 1)), 85);
    } else if (!deleting && text.length === word.length) {
      timer = setTimeout(() => setDeleting(true), 2100);
    } else if (deleting && text.length > 0) {
      timer = setTimeout(() => setText(text.slice(0, -1)), 45);
    } else if (deleting && text.length === 0) {
      setDeleting(false);
      setIdx((prev) => (prev + 1) % TYPEWRITER_WORDS.length);
    }

    return () => clearTimeout(timer);
  }, [text, deleting, idx]);

  return (
    <div className="typewriter-container">
      <span className="typewriter-word text-emerald-gradient">
        {text}
      </span>
      <span className="typewriter-cursor">|</span>
    </div>
  );
};

/* ─── Main Landing Page Component ─────────────────────────── */
const LandingPage = ({ onEnter }) => {
  const lenisRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  // ROI Calculator state
  const [monthlyTrips, setMonthlyTrips] = useState(300);
  const [avgPayload, setAvgPayload] = useState(16);
  const [intermodalPercent, setIntermodalPercent] = useState(65);

  // Dynamic calculations based on real carbon factors
  const avoidedCo2 = Math.round(monthlyTrips * avgPayload * 0.46 * (intermodalPercent / 100));
  const fuelSaved = Math.round(monthlyTrips * 3950 * (intermodalPercent / 100));
  const taxSaved = Math.round(avoidedCo2 * 920);

  // Interactive FAQ state
  const [openFaq, setOpenFaq] = useState(null);

  // Interactive physics slider demo state
  const [demoSpeed, setDemoSpeed] = useState(70);
  const demoDragForce = ((0.5 * 1.225 * 0.7 * 8.5 * Math.pow(demoSpeed / 3.6, 2)) / 1000).toFixed(2);
  const demoPower = (parseFloat(demoDragForce) * (demoSpeed / 3.6)).toFixed(1);

  /* ── Smooth Scrolling & GSAP Integration ──────────────── */
  useLayoutEffect(() => {
    // 1. Initialize Lenis Buttery Smooth Inertia Scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1.35,
    });
    lenisRef.current = lenis;

    // Connect Lenis with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);
    const tickerCallback = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    const handleScroll = () => {
      setScrolled(window.scrollY > 45);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 2. GSAP ScrollTrigger Reveal Animations
    const ctx = gsap.context(() => {
      // Hero elements entrance
      gsap.fromTo('.hero-eyebrow',
        { y: 25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: 'power4.out', delay: 0.15 }
      );
      gsap.fromTo('.hero-h1',
        { y: 55, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.05, ease: 'power4.out', delay: 0.3 }
      );
      gsap.fromTo('.hero-p',
        { y: 35, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.45 }
      );
      gsap.fromTo('.hero-actions',
        { y: 25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, ease: 'power3.out', delay: 0.6 }
      );
      gsap.fromTo('.hero-proof',
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.75 }
      );
      gsap.fromTo('.hero-visual-container',
        { scale: 0.92, opacity: 0, y: 30 },
        { scale: 1, opacity: 1, y: 0, duration: 1.2, ease: 'power4.out', delay: 0.4 }
      );

      // Parallax drifting ambient beams
      gsap.to('.beam-1', { x: 70, y: 50, duration: 14, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.to('.beam-2', { x: -60, y: -40, duration: 11, ease: 'sine.inOut', yoyo: true, repeat: -1 });

      // Stats Belt Counters
      gsap.fromTo('.belt-stat',
        { y: 35, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.12,
          scrollTrigger: { trigger: '.lp-stats-belt', start: 'top 85%' }
        }
      );

      // Section Headings & Chips
      gsap.utils.toArray('.section-chip, .section-h2, .section-sub').forEach(el => {
        gsap.fromTo(el,
          { y: 35, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%' }
          }
        );
      });

      // Bento Cards Staggered Reveal
      gsap.fromTo('.bento-item',
        { y: 45, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.85, ease: 'power3.out', stagger: 0.12,
          scrollTrigger: { trigger: '.bento-grid', start: 'top 82%' }
        }
      );

      // Comparison Cards
      gsap.fromTo('.compare-card-bad',
        { x: -40, opacity: 0 },
        {
          x: 0, opacity: 1, duration: 0.9, ease: 'power4.out',
          scrollTrigger: { trigger: '.compare-grid', start: 'top 82%' }
        }
      );
      gsap.fromTo('.compare-card-good',
        { x: 40, opacity: 0 },
        {
          x: 0, opacity: 1, duration: 0.9, ease: 'power4.out',
          scrollTrigger: { trigger: '.compare-grid', start: 'top 82%' }
        }
      );

      // ROI Calculator Reveal
      gsap.fromTo('.calc-card',
        { y: 50, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 1, ease: 'power4.out',
          scrollTrigger: { trigger: '.calc-card', start: 'top 84%' }
        }
      );

      // CTA Banner Reveal
      gsap.fromTo('.final-cta-inner',
        { y: 40, opacity: 0, scale: 0.96 },
        {
          y: 0, opacity: 1, scale: 1, duration: 0.95, ease: 'power4.out',
          scrollTrigger: { trigger: '.lp-final-cta', start: 'top 82%' }
        }
      );
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
      lenisRef.current = null;
      ctx.revert();
    };
  }, []);

  const scrollToAnchor = (selector) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(selector, { offset: -70, duration: 1.1 });
    } else {
      const el = document.querySelector(selector);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqItems = [
    {
      q: 'How does QIGA-PIEP calculate carbon emissions compared to basic distance estimators?',
      a: 'Standard mapping APIs multiply gross route distance by a static average factor. QIGA-PIEP implements real-time Newton-Euler vehicle mechanics: calculating aerodynamic drag (F_drag), rolling resistance (F_roll), and gravitational slope forces (F_grade) using actual Open-Elevation terrain gradients and live ambient temperature/wind resistance. This yields ISO 14083 and GLEC v3.2 audit-grade accuracy.'
    },
    {
      q: 'Can EcoKernel integrate with our existing ERP or Fleet Management Systems (FMS)?',
      a: 'Yes. EcoKernel supports zero-code CSV multi-modal network ingestion, REST API endpoints, and real-time WebSocket OBD-II / CAN-Bus IoT streams. You can import thousands of shipment legs and generate instantaneous Pareto-optimized dispatch schedules.'
    },
    {
      q: 'What is the role of Indian Railways freight in the Multi-Modal optimizer?',
      a: 'Indian Railways electric locomotives (like the WAG-12B) operate at over 80% lower carbon intensity per tonne-km compared to diesel heavy trucks. EcoKernel automatically identifies intermodal transshipment yards along Dedicated Freight Corridors (DFCs) to construct rail-haul plus electric first/last-mile drayage routes.'
    },
    {
      q: 'Are the carbon reduction reports valid for international ESG and Scope 3 reporting?',
      a: 'Every optimized route generates a cryptographically signed Carbon Audit Certificate with a unique SHA-256 validation hash, separating Well-to-Wheel (WTW), Well-to-Tank (WTT), and Tank-to-Wheel (TTW) emissions according to the ISO 14083 and GLEC Framework standards.'
    }
  ];

  return (
    <div className="lp-root">
      {/* ── LANDING PAGE NAVBAR ────────────────────────────── */}
      <nav className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <div className="lp-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="lp-brand-icon">
              <Leaf size={20} strokeWidth={2.5} />
            </div>
            <div className="lp-brand-info">
              <span className="lp-brand-name">EcoKernel</span>
              <span className="lp-brand-tag">Green Logistics Engine</span>
            </div>
          </div>

          <div className="lp-nav-links">
            <a href="#features" className="lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToAnchor('#features'); }}>Engine</a>
            <a href="#compare" className="lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToAnchor('#compare'); }}>vs Maps</a>
            <a href="#calculator" className="lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToAnchor('#calculator'); }}>ROI Estimator</a>
            <a href="#faq" className="lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToAnchor('#faq'); }}>FAQ</a>
          </div>

          <MagneticBtn className="lp-cta-btn" onClick={onEnter} id="nav-access-btn">
            <span>Enter Route Optimizer</span>
            <ArrowRight size={15} strokeWidth={2.5} />
          </MagneticBtn>
        </div>
      </nav>

      {/* ── HERO SECTION ───────────────────────────────────── */}
      <section className="lp-hero">
        <ParticleCanvas />
        <div className="beam beam-1" />
        <div className="beam beam-2" />
        <div className="hero-grid-overlay" />

        <div className="lp-hero-inner">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span className="eyebrow-dot" />
              <Activity size={12} className="text-emerald" />
              <span>QIGA-PIEP QUANTUM ENGINE · ISO 14083 / GLEC v3.2</span>
            </div>

            <h1 className="hero-h1">
              <TypewriterWord />
              <span className="hero-h1-line2">Indian Freight.</span>
              <span className="hero-h1-sub">Zero-Carbon Physics.</span>
            </h1>

            <p className="hero-p">
              Consumer maps see distance. EcoKernel solves{' '}
              <strong className="text-white">aerodynamic drag & terrain grade physics</strong>, evaluates{' '}
              <strong className="text-emerald">Dedicated Freight Corridor rail + EV intermodals</strong>, and certifies{' '}
              <strong className="text-white">audit-grade Scope 3 ESG reductions</strong> in sub-seconds.
            </p>

            <div className="hero-actions">
              <MagneticBtn className="hero-btn-primary" onClick={onEnter} id="hero-launch-btn">
                <Zap size={16} />
                <span>Open Route Optimizer</span>
                <ArrowRight size={16} strokeWidth={2.5} />
              </MagneticBtn>
              <button
                className="hero-btn-ghost"
                onClick={() => scrollToAnchor('#compare')}
              >
                <span>Why Not Google Maps?</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="hero-proof">
              <div className="proof-pill">
                <CheckCircle size={13} className="text-emerald" />
                <span>ISO 14083 Certified</span>
              </div>
              <div className="proof-pill">
                <CheckCircle size={13} className="text-emerald" />
                <span>GLEC Framework v3.2</span>
              </div>
              <div className="proof-pill">
                <CheckCircle size={13} className="text-emerald" />
                <span>DEFRA 2024 Energy Physics</span>
              </div>
              <div className="proof-pill">
                <CheckCircle size={13} className="text-emerald" />
                <span>Open Source Core</span>
              </div>
            </div>
          </div>

          <div className="hero-visual-container">
            <InteractiveCorridorViz />
          </div>
        </div>

        <div className="scroll-indicator" onClick={() => scrollToAnchor('#stats')}>
          <div className="scroll-mouse">
            <div className="scroll-wheel" />
          </div>
          <span>Scroll to explore</span>
        </div>
      </section>

      {/* ── LIVE TELEMETRY MARQUEE ─────────────────────────── */}
      <TelemetryTicker />

      {/* ── STATS BELT ─────────────────────────────────────── */}
      <section className="lp-stats-belt" id="stats">
        <div className="stats-belt-grid">
          {[
            { value: 41.8, suffix: '%', label: 'Average Scope 3 CO₂ Avoided', decimals: 1 },
            { value: 34.5, suffix: '%', label: 'Total Diesel & Toll Cost Saved', decimals: 1 },
            { value: 24, suffix: ' Hubs', label: 'National Rail + Road Corridors' },
            { value: 4.8, suffix: '×', label: 'Faster Pareto Convergence', decimals: 1 },
          ].map((stat, i) => (
            <div key={i} className="belt-stat">
              <div className="belt-val text-glow-emerald">
                <Counter to={stat.value} suffix={stat.suffix} decimals={stat.decimals || 0} />
              </div>
              <div className="belt-lbl">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ENTERPRISE BENTO GRID: 4 SUPERPOWERS ────────────── */}
      <section className="lp-bento-section" id="features">
        <div className="lp-container">
          <div className="section-header-center">
            <div className="section-chip">
              <Cpu size={12} className="text-emerald" />
              <span>THE ECOKERNEL CORE ARCHITECTURE</span>
            </div>
            <h2 className="section-h2">
              Next-generation freight physics.<br />
              <span className="text-emerald-gradient">Zero guesswork. Auditable precision.</span>
            </h2>
            <p className="section-sub">
              Engineered from the ground up for Indian national logistics, heavy payloads, and rigorous global ESG mandates.
            </p>
          </div>

          <div className="bento-grid">
            {/* Bento Card 1: Physics Engine with Interactive Slider */}
            <SpotlightCard className="bento-item bento-wide">
              <div className="bento-card-header">
                <div className="bento-icon-box">
                  <Gauge size={22} className="text-emerald" />
                </div>
                <div className="bento-tag">PHYSICS ENGINE</div>
              </div>
              <h3 className="bento-title">QIGA-PIEP Real-Time Dynamics</h3>
              <p className="bento-desc">
                Quantum-Inspired Genetic Algorithm with Physics-Informed Energy Profiling. Calculates aerodynamic drag (F_drag), rolling resistance (F_roll), and gravitational slope forces (F_grade) across dynamic elevation gradients.
              </p>

              {/* Interactive Mini Physics Gauge */}
              <div className="physics-interactive-demo">
                <div className="physics-demo-header">
                  <span>Interactive Speed vs Drag Curve</span>
                  <span className="text-emerald font-mono">{demoSpeed} km/h</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="110"
                  value={demoSpeed}
                  onChange={(e) => setDemoSpeed(Number(e.target.value))}
                  className="lp-range"
                />
                <div className="physics-metrics-row">
                  <div className="physics-metric">
                    <span className="phys-lbl">Aerodynamic Drag Force</span>
                    <span className="phys-val text-white">{demoDragForce} kN</span>
                  </div>
                  <div className="physics-metric">
                    <span className="phys-lbl">Instant Aerodynamic Power</span>
                    <span className="phys-val text-emerald">{demoPower} kW</span>
                  </div>
                  <div className="physics-metric">
                    <span className="phys-lbl">Pareto Evaluation</span>
                    <span className="phys-val text-white">&lt;0.8 ms</span>
                  </div>
                </div>
              </div>
            </SpotlightCard>

            {/* Bento Card 2: ESG Compliance & Cryptographic Certificate */}
            <SpotlightCard className="bento-item">
              <div className="bento-card-header">
                <div className="bento-icon-box">
                  <Shield size={22} className="text-emerald" />
                </div>
                <div className="bento-tag">ESG AUDIT GRADE</div>
              </div>
              <h3 className="bento-title">ISO 14083 / GLEC v3.2</h3>
              <p className="bento-desc">
                Audit-ready Scope 3 greenhouse gas disclosures. Instant cryptographic SHA-256 certificate generation with WTW, WTT, and TTW breakdowns.
              </p>
              <div className="cert-preview-pill">
                <Award size={15} className="text-emerald" />
                <span className="font-mono text-xs">SHA256: 8f4e2b...9a1c</span>
                <span className="cert-verified-stamp">VERIFIED</span>
              </div>
            </SpotlightCard>

            {/* Bento Card 3: Multi-Modal Rail + Road + EV */}
            <SpotlightCard className="bento-item">
              <div className="bento-card-header">
                <div className="bento-icon-box">
                  <Train size={22} className="text-emerald" />
                </div>
                <div className="bento-tag">INTERMODAL GRAPH</div>
              </div>
              <h3 className="bento-title">Indian Railways + EV Corridors</h3>
              <p className="bento-desc">
                Optimizes freight transshipment yards across 24 Indian hubs. Evaluates 12,000 HP electric locomotives (WAG-12B) combined with last-mile electric drayage.
              </p>
              <div className="graph-pulse-indicator">
                <div className="graph-dot active" />
                <div className="graph-line" />
                <div className="graph-dot active" />
                <div className="graph-line" />
                <div className="graph-dot" />
              </div>
            </SpotlightCard>

            {/* Bento Card 4: 7-Day AI Dispatch Radar */}
            <SpotlightCard className="bento-item bento-wide">
              <div className="bento-card-header">
                <div className="bento-icon-box">
                  <BarChart3 size={22} className="text-emerald" />
                </div>
                <div className="bento-tag">PREDICTIVE DISPATCH</div>
              </div>
              <h3 className="bento-title">7-Day AI Dispatch Radar with Weather Disruption</h3>
              <p className="bento-desc">
                Predictive corridor scoring combining monsoon precipitation forecasts, ambient temperature density effects, highway congestion bottlenecks, and regional grid carbon intensity windows.
              </p>
              <div className="radar-preview-bar">
                <div className="radar-col">
                  <span className="radar-day">MON</span>
                  <div className="radar-meter"><div className="radar-fill" style={{ height: '40%' }} /></div>
                  <span className="radar-score">Good</span>
                </div>
                <div className="radar-col">
                  <span className="radar-day">TUE</span>
                  <div className="radar-meter"><div className="radar-fill optimal" style={{ height: '88%' }} /></div>
                  <span className="radar-score text-emerald">Optimal</span>
                </div>
                <div className="radar-col">
                  <span className="radar-day">WED</span>
                  <div className="radar-meter"><div className="radar-fill" style={{ height: '55%' }} /></div>
                  <span className="radar-score">Fair</span>
                </div>
                <div className="radar-col">
                  <span className="radar-day">THU</span>
                  <div className="radar-meter"><div className="radar-fill caution" style={{ height: '30%' }} /></div>
                  <span className="radar-score text-white">Rain Risk</span>
                </div>
                <div className="radar-col">
                  <span className="radar-day">FRI</span>
                  <div className="radar-meter"><div className="radar-fill optimal" style={{ height: '82%' }} /></div>
                  <span className="radar-score text-emerald">Optimal</span>
                </div>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* ── COMPARISON: CONSUMER MAPS VS ECOKERNEL ─────────── */}
      <section className="lp-compare-section" id="compare">
        <div className="lp-container">
          <div className="section-header-center">
            <div className="section-chip">COMPETITIVE ARCHITECTURE</div>
            <h2 className="section-h2">Consumer Maps vs EcoKernel Quantum Engine</h2>
            <p className="section-sub">
              Why enterprise supply chains and sustainability teams cannot rely on passenger car navigation tools.
            </p>
          </div>

          <div className="compare-grid">
            {/* Legacy Maps Card */}
            <div className="compare-card compare-card-bad">
              <div className="compare-header">
                <div className="compare-badge bad">✕ CONSUMER MAPS</div>
                <span className="compare-subtitle">Google Maps / MapmyIndia / Here</span>
              </div>
              <ul className="compare-features-list">
                <li>
                  <span className="cmp-icon-cross">✕</span>
                  <div>
                    <strong>Distance-Only Minimization:</strong> Ignores vehicle mass, payload tonnage, and rolling resistance.
                  </div>
                </li>
                <li>
                  <span className="cmp-icon-cross">✕</span>
                  <div>
                    <strong>Zero Scope 3 Compliance:</strong> No WTW / WTT greenhouse gas accounting or GLEC v3.2 auditing.
                  </div>
                </li>
                <li>
                  <span className="cmp-icon-cross">✕</span>
                  <div>
                    <strong>Ignores Rail Intermodal:</strong> Routes exclusively via toll roads; cannot evaluate Indian Railways freight.
                  </div>
                </li>
                <li>
                  <span className="cmp-icon-cross">✕</span>
                  <div>
                    <strong>No Physics Modeling:</strong> Overlooks elevation grade resistance, aerodynamic drag, and ambient temperature.
                  </div>
                </li>
                <li>
                  <span className="cmp-icon-cross">✕</span>
                  <div>
                    <strong>Zero SLA Contract Overrides:</strong> Cannot enforce pre-negotiated freight lane agreements or carrier contracts.
                  </div>
                </li>
              </ul>
            </div>

            {/* EcoKernel Engine Card */}
            <div className="compare-card compare-card-good">
              <div className="compare-header">
                <div className="compare-badge good">✓ ECOKERNEL GREEN ENGINE</div>
                <span className="compare-subtitle">Enterprise Supply Chain Decarbonization Platform</span>
              </div>
              <ul className="compare-features-list">
                <li>
                  <span className="cmp-icon-check">✓</span>
                  <div>
                    <strong>Quantum-Inspired Multi-Objective Optimization:</strong> Solves cost, time, and carbon simultaneously on Pareto frontier.
                  </div>
                </li>
                <li>
                  <span className="cmp-icon-check">✓</span>
                  <div>
                    <strong>ISO 14083 / GLEC v3.2 Certified:</strong> Generates tamper-proof SHA-256 audit certificates for ESG reporting.
                  </div>
                </li>
                <li>
                  <span className="cmp-icon-check">✓</span>
                  <div>
                    <strong>Multi-Modal Dedicated Freight Corridors:</strong> Seamless Western/Eastern DFC rail haulage with EV first/last mile.
                  </div>
                </li>
                <li>
                  <span className="cmp-icon-check">✓</span>
                  <div>
                    <strong>Real Physics Mechanics (QIGA-PIEP):</strong> Integrates Open-Elevation topographical gradients and live drag aerodynamics.
                  </div>
                </li>
                <li>
                  <span className="cmp-icon-check">✓</span>
                  <div>
                    <strong>Automated Scope 3 CSV Ingestion & IoT:</strong> Live OBD-II WebSocket telemetry streams and bulk TMS spreadsheet imports.
                  </div>
                </li>
              </ul>
              <div className="compare-cta-box">
                <MagneticBtn className="compare-cta-btn" onClick={onEnter}>
                  <span>Experience The Difference</span>
                  <ArrowRight size={15} />
                </MagneticBtn>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FLEET ROI CALCULATOR ───────────────────────────── */}
      <section className="lp-calc-section" id="calculator">
        <div className="lp-container">
          <div className="calc-card">
            <div className="calc-glow" />
            <div className="calc-inner">
              <div className="calc-controls">
                <div className="section-chip">FLEET ROI & ESG IMPACT</div>
                <h2 className="calc-h2">Simulate Your Monthly Decarbonization Savings</h2>
                <p className="calc-p">
                  Adjust your fleet parameters to see instant verified Scope 3 CO₂ avoidance and net rupee savings.
                </p>

                <div className="calc-slider-group">
                  <div className="slider-header">
                    <label>Monthly Freight Trips</label>
                    <span className="slider-val text-white">{monthlyTrips.toLocaleString()} shipments</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="3000"
                    step="10"
                    value={monthlyTrips}
                    onChange={(e) => setMonthlyTrips(Number(e.target.value))}
                    className="lp-range"
                  />
                </div>

                <div className="calc-slider-group">
                  <div className="slider-header">
                    <label>Average Cargo Payload (Tonnes)</label>
                    <span className="slider-val text-white">{avgPayload} t / trip</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="45"
                    step="1"
                    value={avgPayload}
                    onChange={(e) => setAvgPayload(Number(e.target.value))}
                    className="lp-range"
                  />
                </div>

                <div className="calc-slider-group">
                  <div className="slider-header">
                    <label>Intermodal Rail + EV Adoption Target</label>
                    <span className="slider-val text-emerald">{intermodalPercent}% Modal Shift</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={intermodalPercent}
                    onChange={(e) => setIntermodalPercent(Number(e.target.value))}
                    className="lp-range"
                  />
                </div>
              </div>

              <div className="calc-results">
                <div className="calc-result-box">
                  <div className="calc-result-icon">
                    <TrendingDown size={20} className="text-emerald" />
                  </div>
                  <div>
                    <div className="calc-result-lbl">Avoided Monthly Scope 3 CO₂</div>
                    <div className="calc-result-val text-glow-emerald">
                      −{avoidedCo2.toLocaleString()} tonnes
                    </div>
                  </div>
                </div>

                <div className="calc-result-box">
                  <div className="calc-result-icon">
                    <IndianRupee size={20} className="text-emerald" />
                  </div>
                  <div>
                    <div className="calc-result-lbl">Projected Fuel & Toll Savings</div>
                    <div className="calc-result-val text-white">
                      ₹{fuelSaved.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="calc-result-box">
                  <div className="calc-result-icon">
                    <Shield size={20} className="text-emerald" />
                  </div>
                  <div>
                    <div className="calc-result-lbl">Carbon Tax Arbitrage Offset</div>
                    <div className="calc-result-val text-white">
                      ₹{taxSaved.toLocaleString()}
                    </div>
                  </div>
                </div>

                <MagneticBtn className="calc-apply-btn" onClick={onEnter} id="calc-apply-btn">
                  <span>Calculate Custom Fleet In App</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </MagneticBtn>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE FAQ ACCORDION ─────────────────────── */}
      <section className="lp-faq-section" id="faq">
        <div className="lp-container">
          <div className="section-header-center">
            <div className="section-chip">TECHNICAL FAQ</div>
            <h2 className="section-h2">Frequently Answered Questions</h2>
            <p className="section-sub">
              Key engineering details about our quantum-inspired genetic algorithm, physics models, and ESG compliance.
            </p>
          </div>

          <div className="faq-accordion-list">
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                className={`faq-item ${openFaq === idx ? 'open' : ''}`}
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <div className="faq-question-row">
                  <span className="faq-question-text">{item.q}</span>
                  <div className="faq-chevron">
                    <ChevronDown size={18} />
                  </div>
                </div>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      className="faq-answer-row"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: 'easeInOut' }}
                    >
                      <p>{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CALL TO ACTION ───────────────────────────── */}
      <section className="lp-final-cta">
        <ParticleCanvas />
        <div className="beam beam-cta-1" />
        <div className="beam beam-cta-2" />

        <div className="final-cta-inner">
          <div className="final-cta-chip">
            <Sparkles size={13} className="text-emerald" />
            <span>ENTERPRISE GREEN LOGISTICS SUITE</span>
          </div>

          <h2 className="final-cta-h2">
            Ready to decarbonize your<br />
            <span className="text-emerald-gradient">commercial freight operations?</span>
          </h2>

          <p className="final-cta-p">
            Join logistics directors and sustainability leaders slashing fuel expenses while achieving audit-grade ISO 14083 ESG compliance.
          </p>

          <MagneticBtn className="final-cta-btn" onClick={onEnter} id="cta-launch-btn">
            <Zap size={18} />
            <span>Start Route Optimization</span>
            <ArrowRight size={18} strokeWidth={2.5} />
          </MagneticBtn>

          <div className="final-proof-bar">
            <span>✓ No Setup or Credit Card Required</span>
            <span>✓ Real Open-Elevation Topography</span>
            <span>✓ Instant GLEC v3.2 Certificate</span>
            <span>✓ Open Source Codebase</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="footer-brand">
            <div className="lp-brand-icon">
              <Leaf size={16} strokeWidth={2.5} />
            </div>
            <span className="footer-name">EcoKernel</span>
            <span className="footer-copy">© 2026 EcoKernel. Built for Indian Freight Decarbonization.</span>
          </div>
          <div className="footer-links">
            <span className="footer-tag">ISO 14083</span>
            <span className="footer-tag">GLEC v3.2</span>
            <span className="footer-tag">DEFRA 2024</span>
            <span className="footer-tag">WAG-12B Electric</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
