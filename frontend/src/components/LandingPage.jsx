import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';
import LocomotiveScroll from 'locomotive-scroll';
import 'locomotive-scroll/dist/locomotive-scroll.css';
import {
  Leaf, Train, Zap, Globe, Truck, ArrowRight, CheckCircle,
  BarChart3, Shield, Clock, IndianRupee, TrendingDown, Cpu,
  Activity, Navigation, Layers, Wind, Sparkles
} from 'lucide-react';
import './LandingPage.css';

gsap.registerPlugin(ScrollTrigger, TextPlugin);

/* ─── Animated Counter (IntersectionObserver) ──────────── */
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
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration, decimals]);
  return <span ref={ref}>{prefix}{decimals > 0 ? val.toFixed(decimals) : val.toLocaleString()}{suffix}</span>;
};

/* ─── Live Canvas Particle Field ───────────────────────── */
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
    const N = 80;
    const particles = Array.from({ length: N }, () => ({
      x: Math.random() * W(), y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: 0.8 + Math.random() * 1.8, alpha: 0.15 + Math.random() * 0.45,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      particles.forEach(p => {
        p.x = (p.x + p.vx + W()) % W();
        p.y = (p.y + p.vy + H()) % H();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52,211,153,${p.alpha})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(52,211,153,${0.1 * (1 - d / 100)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="lp-canvas" />;
};

/* ─── Typewriter ────────────────────────────────────────── */
const words = ['Decarbonize', 'Optimize', 'Transform', 'Accelerate'];
const TypewriterWord = () => {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const word = words[idx];
    let t;
    if (!deleting && text.length < word.length) t = setTimeout(() => setText(word.slice(0, text.length + 1)), 85);
    else if (!deleting && text.length === word.length) t = setTimeout(() => setDeleting(true), 1800);
    else if (deleting && text.length > 0) t = setTimeout(() => setText(text.slice(0, -1)), 48);
    else { setDeleting(false); setIdx(i => (i + 1) % words.length); }
    return () => clearTimeout(t);
  }, [text, deleting, idx]);
  return <span className="typewriter-word">{text}<span className="typewriter-cursor">|</span></span>;
};

/* ─── Animated Route SVG ────────────────────────────────── */
const AnimatedRouteViz = () => {
  const cities = [
    { x: 80, y: 280, name: 'MUM', color: '#34d399' },
    { x: 200, y: 150, name: 'DEL', color: '#60a5fa' },
    { x: 340, y: 310, name: 'BLR', color: '#a78bfa' },
    { x: 260, y: 70, name: 'CHD', color: '#f59e0b' },
    { x: 420, y: 185, name: 'KOL', color: '#f43f5e' },
  ];
  const edges = [
    [0, 1, '#34d399'], [1, 3, '#60a5fa'], [1, 4, '#a78bfa'],
    [0, 2, '#f59e0b'], [2, 4, '#f43f5e'], [3, 4, '#34d399'],
  ];
  return (
    <div className="route-viz-wrap" data-scroll data-scroll-speed="-0.5">
      <svg viewBox="0 0 500 380" className="route-viz-svg">
        <defs>
          <filter id="glow2"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          {edges.map(([a, b], i) => (
            <linearGradient key={i} id={`eg${i}`} gradientUnits="userSpaceOnUse"
              x1={cities[a].x} y1={cities[a].y} x2={cities[b].x} y2={cities[b].y}>
              <stop offset="0%" stopColor={cities[a].color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={cities[b].color} stopOpacity="0.8" />
            </linearGradient>
          ))}
        </defs>
        {edges.map(([a, b], i) => (
          <line key={i} x1={cities[a].x} y1={cities[a].y} x2={cities[b].x} y2={cities[b].y}
            stroke={`url(#eg${i})`} strokeWidth="1.5" strokeDasharray="6 4" filter="url(#glow2)"
            className="viz-edge" style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
        {edges.map(([a, b], i) => (
          <circle key={`p${i}`} r="4.5" fill={cities[a].color} filter="url(#glow2)"
            className="viz-particle" style={{ animationDelay: `${i * 0.7}s`, animationDuration: `${2.8 + i * 0.4}s`,
              '--x1': cities[a].x, '--y1': cities[a].y, '--x2': cities[b].x, '--y2': cities[b].y }} />
        ))}
        {cities.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="22" fill={`${c.color}14`} stroke={c.color} strokeWidth="1" className="viz-ring" style={{ animationDelay: `${i * 0.3}s` }} />
            <circle cx={c.x} cy={c.y} r="9" fill={c.color} filter="url(#glow2)" />
            <text x={c.x} y={c.y + 36} textAnchor="middle" fill={c.color} fontSize="10" fontWeight="700" fontFamily="JetBrains Mono, monospace" opacity="0.9">{c.name}</text>
          </g>
        ))}
      </svg>
      <div className="viz-hud viz-hud-tl"><span className="viz-hud-dot"/><span>QIGA ENGINE LIVE</span></div>
      <div className="viz-hud viz-hud-br"><span>4.8× PARETO</span><Zap size={10}/></div>
    </div>
  );
};

/* ─── Magnetic Button ────────────────────────────────────── */
const MagneticBtn = ({ children, onClick, className, id }) => {
  const ref = useRef(null);
  const handleMouseMove = useCallback((e) => {
    const btn = ref.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(btn, { x: x * 0.22, y: y * 0.22, duration: 0.3, ease: 'power2.out' });
  }, []);
  const handleMouseLeave = useCallback(() => {
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
  }, []);
  return (
    <button ref={ref} className={className} onClick={onClick} id={id}
      onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {children}
    </button>
  );
};

/* ─── Main Landing Page ──────────────────────────────────── */
const LandingPage = ({ onEnter }) => {
  const scrollRef = useRef(null);
  const locoRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [monthlyTrips, setMonthlyTrips] = useState(250);
  const [avgPayload, setAvgPayload] = useState(15);
  const [activeFeature, setActiveFeature] = useState(0);

  const avoidedCo2 = Math.round(monthlyTrips * avgPayload * 0.42);
  const fuelSaved = Math.round(monthlyTrips * 3400);
  const taxSaved = Math.round(avoidedCo2 * 850);

  // Auto-cycle features
  useEffect(() => {
    const t = setInterval(() => setActiveFeature(i => (i + 1) % 4), 4500);
    return () => clearInterval(t);
  }, []);

  /* ── Locomotive Scroll + GSAP ScrollTrigger init ───────── */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const loco = new LocomotiveScroll({
      el,
      smooth: true,
      smoothMobile: false,
      multiplier: 0.85,
      lerp: 0.07,
      smartphone: { smooth: false },
      tablet: { smooth: false },
    });
    locoRef.current = loco;

    // Bridge Locomotive ↔ GSAP ScrollTrigger
    loco.on('scroll', ScrollTrigger.update);
    ScrollTrigger.scrollerProxy(el, {
      scrollTop(v) {
        return arguments.length ? loco.scrollTo(v, { duration: 0, disableLerp: true }) : loco.scroll.instance.scroll.y;
      },
      getBoundingClientRect() {
        return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
      },
      pinType: el.style.transform ? 'transform' : 'fixed',
    });

    // Navbar scroll detection
    loco.on('scroll', ({ scroll }) => setScrolled(scroll.y > 50));

    /* ── GSAP Animations ─────────────────────────────────── */

    // Hero elements stagger
    gsap.fromTo('.hero-eyebrow',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power4.out', delay: 0.3 }
    );
    gsap.fromTo('.hero-h1',
      { y: 60, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.1, ease: 'power4.out', delay: 0.5 }
    );
    gsap.fromTo('.hero-p',
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.75 }
    );
    gsap.fromTo('.hero-actions',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.95 }
    );
    gsap.fromTo('.hero-proof',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out', delay: 1.15 }
    );
    gsap.fromTo('.hero-visual',
      { x: 80, opacity: 0 },
      { x: 0, opacity: 1, duration: 1.3, ease: 'power4.out', delay: 0.4 }
    );
    gsap.fromTo('.float-card',
      { y: 40, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: 'back.out(1.5)', stagger: 0.18, delay: 1 }
    );

    // Beams slow drift
    gsap.to('.beam-1', { x: 60, y: 40, duration: 12, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to('.beam-2', { x: -40, y: -30, duration: 9, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to('.beam-3', { x: 30, y: 50, duration: 15, ease: 'sine.inOut', yoyo: true, repeat: -1 });

    // Stats belt — stagger slide up on scroll
    gsap.fromTo('.belt-stat',
      { y: 50, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: '.lp-stats-belt', scroller: el, start: 'top 85%' }
      }
    );

    // Section headings — slide up
    gsap.utils.toArray('.section-chip, .section-h2').forEach(el2 => {
      gsap.fromTo(el2,
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: el2, scroller: el, start: 'top 88%' }
        }
      );
    });

    // Feature tabs — slide in from left
    gsap.fromTo('.feature-tab',
      { x: -40, opacity: 0 },
      {
        x: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: '.features-layout', scroller: el, start: 'top 80%' }
      }
    );

    // Feature panel — slide in from right
    gsap.fromTo('.feature-panel',
      { x: 50, opacity: 0, scale: 0.96 },
      {
        x: 0, opacity: 1, scale: 1, duration: 0.9, ease: 'power4.out',
        scrollTrigger: { trigger: '.features-layout', scroller: el, start: 'top 80%', delay: 0.2 }
      }
    );

    // Comparison cards — flip in from sides
    gsap.fromTo('.compare-bad',
      { x: -60, opacity: 0, rotateY: 8 },
      {
        x: 0, opacity: 1, rotateY: 0, duration: 0.9, ease: 'power4.out',
        scrollTrigger: { trigger: '.compare-grid', scroller: el, start: 'top 82%' }
      }
    );
    gsap.fromTo('.compare-good',
      { x: 60, opacity: 0, rotateY: -8 },
      {
        x: 0, opacity: 1, rotateY: 0, duration: 0.9, ease: 'power4.out', delay: 0.1,
        scrollTrigger: { trigger: '.compare-grid', scroller: el, start: 'top 82%' }
      }
    );

    // Compare list items — stagger
    gsap.fromTo('.compare-list li',
      { x: -20, opacity: 0 },
      {
        x: 0, opacity: 1, duration: 0.5, ease: 'power2.out', stagger: 0.06,
        scrollTrigger: { trigger: '.compare-grid', scroller: el, start: 'top 75%' }
      }
    );

    // Calc card — float up with scale
    gsap.fromTo('.calc-card',
      { y: 80, opacity: 0, scale: 0.95 },
      {
        y: 0, opacity: 1, scale: 1, duration: 1.1, ease: 'power4.out',
        scrollTrigger: { trigger: '.calc-card', scroller: el, start: 'top 85%' }
      }
    );

    // Calc metrics — stagger in
    gsap.fromTo('.calc-metric',
      { x: 40, opacity: 0 },
      {
        x: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: '.calc-right', scroller: el, start: 'top 80%' }
      }
    );

    // Final CTA — scale pop
    gsap.fromTo('.final-cta-inner',
      { y: 60, opacity: 0, scale: 0.93 },
      {
        y: 0, opacity: 1, scale: 1, duration: 1.1, ease: 'power4.out',
        scrollTrigger: { trigger: '.lp-final-cta', scroller: el, start: 'top 80%' }
      }
    );

    // Final proof items stagger
    gsap.fromTo('.final-proof-item',
      { y: 20, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out',
        scrollTrigger: { trigger: '.final-proof', scroller: el, start: 'top 88%' }
      }
    );

    // Parallax on beams via scroll
    ScrollTrigger.create({
      trigger: el,
      scroller: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        gsap.set('.hero-grid-overlay', { y: self.progress * 80 });
      }
    });

    ScrollTrigger.addEventListener('refresh', () => loco.update());
    ScrollTrigger.refresh();

    return () => {
      loco.destroy();
      locoRef.current = null;
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  const features = [
    { icon: <Cpu size={20}/>, title: 'QIGA-PIEP Physics Engine', tag: 'QUANTUM-INSPIRED', color: '#34d399',
      desc: 'Quantum-Inspired Genetic Algorithm with Physics-Informed Energy Profiling. Models F_drag, F_roll, and F_grade forces in real-time for accurate energy and CO₂ computation. 4.8× faster Pareto convergence.' },
    { icon: <Shield size={20}/>, title: 'ISO 14083 / GLEC v3.2', tag: 'ESG COMPLIANCE', color: '#60a5fa',
      desc: 'Audit-grade Scope 3 carbon reporting. Well-to-Wheel (WTW), Well-to-Tank (WTT), and Tank-to-Wheel (TTW) breakdown. Board-ready ESG disclosures generated instantly.' },
    { icon: <Train size={20}/>, title: 'Multi-Modal Rail + Road', tag: 'INTERMODAL', color: '#a78bfa',
      desc: 'Simultaneously evaluates road, Indian Railways freight, and EV corridors on a 24-city national logistics graph with live weather disruption overlays and monsoon alerts.' },
    { icon: <BarChart3 size={20}/>, title: '7-Day AI Dispatch Radar', tag: 'PREDICTIVE AI', color: '#f59e0b',
      desc: 'LSTM-powered demand forecasting with real precipitation data, congestion risk scoring, grid carbon intensity windows, and optimal departure time recommendations for each corridor.' },
  ];

  return (
    <div className="lp-root" data-scroll-container ref={scrollRef}>

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <div className="lp-brand">
            <div className="lp-brand-icon"><Leaf size={17} strokeWidth={2.5}/></div>
            <span className="lp-brand-name">EcoKernel</span>
            <span className="lp-brand-tag">v2.0</span>
          </div>
          <div className="lp-nav-links">
            <a href="#features" className="lp-nav-link" onClick={e => { e.preventDefault(); locoRef.current?.scrollTo('#features'); }}>Engine</a>
            <a href="#compare" className="lp-nav-link" onClick={e => { e.preventDefault(); locoRef.current?.scrollTo('#compare'); }}>vs Maps</a>
            <a href="#calculator" className="lp-nav-link" onClick={e => { e.preventDefault(); locoRef.current?.scrollTo('#calculator'); }}>ROI</a>
          </div>
          <MagneticBtn className="lp-cta-btn" onClick={onEnter} id="nav-access-btn">
            <span>Launch App</span>
            <ArrowRight size={14} strokeWidth={2.5}/>
          </MagneticBtn>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="lp-hero" data-scroll-section>
        <ParticleCanvas/>
        <div className="beam beam-1"/>
        <div className="beam beam-2"/>
        <div className="beam beam-3"/>
        <div className="hero-grid-overlay"/>

        <div className="lp-hero-inner">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span className="eyebrow-dot"/>
              <Activity size={11}/>
              <span>QIGA-PIEP ENGINE ACTIVE · NSGA-II MULTI-START</span>
            </div>

            <h1 className="hero-h1">
              <TypewriterWord/>
              <span className="hero-h1-line2">Indian Freight.</span>
            </h1>

            <p className="hero-p">
              Consumer maps see distance. EcoKernel sees{' '}
              <span className="hero-p-highlight">carbon physics</span>,{' '}
              <span className="hero-p-highlight">Rail+Road intermodal corridors</span>, and{' '}
              <span className="hero-p-highlight">Scope 3 ESG compliance</span> — optimized in milliseconds.
            </p>

            <div className="hero-actions">
              <MagneticBtn className="hero-btn-primary" onClick={onEnter} id="hero-launch-btn">
                <Zap size={16}/>
                Launch Route Optimizer
                <ArrowRight size={16} strokeWidth={2.5}/>
              </MagneticBtn>
              <a href="#compare" className="hero-btn-ghost"
                onClick={e => { e.preventDefault(); locoRef.current?.scrollTo('#compare'); }}>
                Why not Google Maps? →
              </a>
            </div>

            <div className="hero-proof">
              {['ISO 14083', 'GLEC v3.2', 'DEFRA 2024', 'Open Source'].map((t, i) => (
                <div key={i} className="proof-item">
                  <CheckCircle size={12} className="proof-icon"/>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual">
            <AnimatedRouteViz/>
            <div className="float-card">
              <div className="float-card-icon" style={{ background: '#34d39918' }}><TrendingDown size={15} style={{ color: '#34d399' }}/></div>
              <div><div className="float-card-val">−38%</div><div className="float-card-lbl">CO₂ Reduction</div></div>
            </div>
            <div className="float-card">
              <div className="float-card-icon" style={{ background: '#60a5fa18' }}><IndianRupee size={15} style={{ color: '#60a5fa' }}/></div>
              <div><div className="float-card-val">₹3.4K</div><div className="float-card-lbl">Avg Fuel Saved/trip</div></div>
            </div>
          </div>
        </div>

        <div className="scroll-cue" data-scroll data-scroll-speed="2">
          <div className="scroll-cue-line"/>
          <span>Scroll</span>
        </div>
      </section>

      {/* ── STATS BELT ─────────────────────────────────────── */}
      <section className="lp-stats-belt" data-scroll-section>
        {[
          { value: 38, suffix: '%', label: 'Avg CO₂ Reduction', color: '#34d399' },
          { value: 34, suffix: '%', label: 'Fuel Cost Savings', color: '#60a5fa' },
          { value: 24, suffix: ' hubs', label: 'Indian Cities', color: '#a78bfa' },
          { value: 4.8, suffix: '×', label: 'Pareto Speedup', color: '#f59e0b', decimals: 1 },
        ].map((s, i) => (
          <div key={i} className="belt-stat">
            <div className="belt-val" style={{ color: s.color }}>
              <Counter to={s.value} suffix={s.suffix} decimals={s.decimals || 0}/>
            </div>
            <div className="belt-lbl">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section className="lp-features" id="features" data-scroll-section>
        <div className="lp-container">
          <div className="section-chip"><Cpu size={11}/> POWERED BY QIGA-PIEP ENGINE</div>
          <h2 className="section-h2">
            Enterprise-grade intelligence,<br/>
            <span className="section-h2-accent">purpose-built for India.</span>
          </h2>

          <div className="features-layout">
            <div className="feature-tabs">
              {features.map((f, i) => (
                <button key={i} className={`feature-tab ${activeFeature === i ? 'active' : ''}`}
                  onClick={() => setActiveFeature(i)} style={{ '--ft-color': f.color }}>
                  <div className="ft-icon-wrap">{f.icon}</div>
                  <div className="ft-meta">
                    <span className="ft-tag">{f.tag}</span>
                    <span className="ft-title">{f.title}</span>
                  </div>
                  <div className="ft-progress-bar">
                    {activeFeature === i && (
                      <div key={`pb-${i}-${activeFeature}`} className="ft-progress-fill"
                        style={{ background: f.color, animation: 'progress-sweep 4.5s linear forwards' }}/>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activeFeature} className="feature-panel"
                style={{ '--fp-color': features[activeFeature].color }}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.97 }}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}>
                <div className="fp-glow"/>
                <div className="fp-header">
                  <div className="fp-icon-wrap" style={{ background: `${features[activeFeature].color}18`, border: `1.5px solid ${features[activeFeature].color}35` }}>
                    <span style={{ color: features[activeFeature].color }}>{features[activeFeature].icon}</span>
                  </div>
                  <span className="fp-tag" style={{ color: features[activeFeature].color, background: `${features[activeFeature].color}12` }}>
                    {features[activeFeature].tag}
                  </span>
                </div>
                <h3 className="fp-title">{features[activeFeature].title}</h3>
                <p className="fp-desc">{features[activeFeature].desc}</p>
                <div className="fp-metrics">
                  {[['4.8×','Pareto Speedup'],['38%','CO₂ Reduction'],['<1s','Solve Time']].map(([v,l], i) => (
                    <div key={i} className="fp-metric">
                      <span className="fp-m-val" style={{ color: features[activeFeature].color }}>{v}</span>
                      <span className="fp-m-lbl">{l}</span>
                    </div>
                  ))}
                </div>
                <MagneticBtn className="fp-cta" onClick={onEnter} style={{ '--fp-color': features[activeFeature].color }}>
                  Try It Live <ArrowRight size={14}/>
                </MagneticBtn>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── COMPARISON ─────────────────────────────────────── */}
      <section className="lp-compare" id="compare" data-scroll-section>
        <div className="lp-container">
          <div className="section-chip">WHY NOT GOOGLE MAPS?</div>
          <h2 className="section-h2">Consumer Maps vs EcoKernel</h2>
          <div className="compare-grid">
            <div className="compare-card compare-bad">
              <div className="compare-header">
                <span className="compare-label label-bad">❌ Consumer Maps</span>
                <span className="compare-subtitle">Google / MapmyIndia</span>
              </div>
              <ul className="compare-list">
                {['Single-vehicle road distance only','Zero Scope 3 / DEFRA ESG compliance',
                  'Ignores F_drag + F_roll + F_grade physics','No SLA contract lane rate integration',
                  'No weekly dispatch AI or disruption alerts'].map((t, i) => (
                  <li key={i}><span className="cmp-x">✕</span>{t}</li>
                ))}
              </ul>
            </div>
            <div className="compare-card compare-good">
              <div className="compare-header">
                <span className="compare-label label-good">⚡ EcoKernel</span>
                <span className="compare-subtitle">Green Logistics Engine</span>
              </div>
              <ul className="compare-list">
                {['Multi-Modal Rail + Road + EV Intermodal','ISO 14083 / GLEC v3.2 Audit-Grade ESG',
                  'QIGA-PIEP Physics Solver (F_drag + F_roll)','Pre-Negotiated SLA Contract Engine Override',
                  '7-Day AI Dispatch Radar + Monsoon Alerts'].map((t, i) => (
                  <li key={i}><span className="cmp-check">✓</span>{t}</li>
                ))}
              </ul>
              <MagneticBtn className="compare-cta" onClick={onEnter}>
                Try EcoKernel Free <ArrowRight size={14}/>
              </MagneticBtn>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROI CALCULATOR ─────────────────────────────────── */}
      <section className="lp-calc" id="calculator" data-scroll-section>
        <div className="lp-container">
          <div className="calc-card">
            <div className="calc-glow"/>
            <div className="calc-inner">
              <div className="calc-left">
                <div className="section-chip">FLEET ROI ESTIMATOR</div>
                <h2 className="calc-h2">See Your Monthly Savings</h2>
                <p className="calc-p">Move the sliders — live projected impact updates instantly.</p>
                {[
                  { label: 'Monthly Freight Trips', val: monthlyTrips, setVal: setMonthlyTrips, min: 20, max: 2000, step: 10, fmt: v => `${v.toLocaleString()} trips` },
                  { label: 'Average Cargo Payload', val: avgPayload, setVal: setAvgPayload, min: 2, max: 40, step: 1, fmt: v => `${v} tonnes` },
                ].map((s, i) => (
                  <div className="slider-block" key={i}>
                    <div className="slider-header">
                      <label>{s.label}</label>
                      <span className="slider-val">{s.fmt(s.val)}</span>
                    </div>
                    <input type="range" min={s.min} max={s.max} step={s.step} value={s.val}
                      onChange={e => s.setVal(+e.target.value)} className="lp-range"/>
                  </div>
                ))}
              </div>
              <div className="calc-right">
                {[
                  { icon: <TrendingDown size={19}/>, color: '#34d399', lbl: 'Avoided Monthly CO₂', val: `−${avoidedCo2.toLocaleString()} t` },
                  { icon: <IndianRupee size={19}/>, color: '#60a5fa', lbl: 'Fuel & Toll Savings', val: `₹${fuelSaved.toLocaleString()}` },
                  { icon: <Shield size={19}/>, color: '#f59e0b', lbl: 'Carbon Tax Offset', val: `₹${taxSaved.toLocaleString()}` },
                ].map((m, i) => (
                  <div className="calc-metric" key={i}>
                    <div className="calc-metric-icon" style={{ background: `${m.color}18`, border: `1.5px solid ${m.color}35` }}>
                      <span style={{ color: m.color }}>{m.icon}</span>
                    </div>
                    <div>
                      <div className="calc-metric-lbl">{m.lbl}</div>
                      <motion.div className="calc-metric-val" key={m.val}
                        initial={{ scale: 1.12, color: m.color }} animate={{ scale: 1, color: m.color }}
                        transition={{ duration: 0.25 }} style={{ color: m.color }}>
                        {m.val}
                      </motion.div>
                    </div>
                  </div>
                ))}
                <MagneticBtn className="calc-cta" onClick={onEnter} id="calc-apply-btn">
                  Apply To My Fleet <ArrowRight size={15} strokeWidth={2.5}/>
                </MagneticBtn>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────── */}
      <section className="lp-final-cta" data-scroll-section>
        <ParticleCanvas/>
        <div className="beam beam-cta-1"/>
        <div className="beam beam-cta-2"/>
        <div className="final-cta-inner">
          <div className="final-cta-chip"><Sparkles size={11}/> ZERO SETUP — RUNS IN BROWSER</div>
          <h2 className="final-cta-h2">
            Ready to cut your fleet's<br/>
            <span className="final-cta-accent">carbon footprint?</span>
          </h2>
          <p className="final-cta-p">Join enterprise logistics teams meeting Scope 3 ESG targets while slashing fuel costs.</p>
          <MagneticBtn className="final-cta-btn" onClick={onEnter} id="cta-launch-btn">
            <Zap size={17}/>
            Launch EcoKernel Engine
            <ArrowRight size={17} strokeWidth={2.5}/>
          </MagneticBtn>
          <div className="final-proof">
            {['No signup required','DEFRA 2024 data','ISO 14083 reports','Open source'].map((t, i) => (
              <span key={i} className="final-proof-item"><CheckCircle size={11}/> {t}</span>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
