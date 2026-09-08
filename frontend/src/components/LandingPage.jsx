import React, { useState, useEffect, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Leaf, Train, Zap, Globe, Truck, ArrowRight } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import './LandingPage.css';

// Stunning Crystal Clear River Ripple Shader
const FluidShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uMiceX: { value: new Float32Array(20) },
    uMiceY: { value: new Float32Array(20) },
    uMiceTimes: { value: new Float32Array(20) },
    uColor1: { value: new THREE.Color("#022014") },
    uColor2: { value: new THREE.Color("#0f5835") },
    uColor3: { value: new THREE.Color("#69f6b8") },
    uAspect: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      // Fullscreen plane
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uMiceX[20];
    uniform float uMiceY[20];
    uniform float uMiceTimes[20];
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform float uAspect;
    varying vec2 vUv;

    void main() {
      vec2 st = vUv;
      st.x *= uAspect;
      
      float totalRipple = 0.0;
      
      // Calculate very gentle, soft expanding ripples
      for(int i = 0; i < 20; i++) {
        float age = uTime - uMiceTimes[i];
        if(age > 0.0 && age < 2.5) {
          vec2 m = vec2(uMiceX[i], uMiceY[i]);
          m.x *= uAspect;
          float dist = length(st - m);
          
          // Fast expanding, broad wave
          float waveFront = age * 0.6; 
          float d = abs(dist - waveFront);
          
          // Soft decay so it creates a gentle wake
          float intensity = exp(-age * 2.0) * exp(-d * 10.0);
          
          // Low frequency (12.0) for broad, elegant waves instead of tight rings
          totalRipple += sin((dist - waveFront) * 12.0) * intensity;
        }
      }
      
      // Extremely subtle, light distortion
      vec2 warpedUv = vUv + totalRipple * 0.015;
      
      // Smooth gradient mixing, preventing harsh black spots
      float mixVal = clamp(warpedUv.y + warpedUv.x * 0.2, 0.0, 1.0);
      vec3 bg = mix(uColor1, uColor2, mixVal);
      
      // Gentle, soft highlights on the crest
      float crest = smoothstep(0.4, 1.2, warpedUv.x - warpedUv.y);
      bg += uColor3 * crest * 0.15;
      
      // Very light shimmer on the ripples to make it look crystal clear, not black/dark
      bg += uColor3 * (totalRipple * 0.05); 
      // Add a tiny pure light reflection
      bg += vec3(totalRipple * 0.02);
      
      gl_FragColor = vec4(bg, 1.0);
    }
  `
};

const RippleMesh = () => {
  const materialRef = useRef();
  
  // Create buffers to hold the last 20 mouse interaction points globally
  const idx = useRef(0);
  const mX = useRef(new Float32Array(20));
  const mY = useRef(new Float32Array(20));
  const mTimes = useRef(new Float32Array(20));
  const targetMouse = useRef({ x: -10, y: -10, active: false });
  const lastTime = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      targetMouse.current = {
        x: e.clientX / window.innerWidth,
        y: 1.0 - (e.clientY / window.innerHeight),
        active: true
      };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      const time = performance.now() * 0.001;
      materialRef.current.uniforms.uTime.value = time;
      materialRef.current.uniforms.uAspect.value = window.innerWidth / window.innerHeight;
      
      // Spawns a new ripple continuously when the mouse is moving active
      // Space them out slightly so it feels like liquid wakes
      if (targetMouse.current.active && (time - lastTime.current > 0.04)) {
        const i = idx.current;
        mX.current[i] = targetMouse.current.x;
        mY.current[i] = targetMouse.current.y;
        mTimes.current[i] = time;
        
        idx.current = (idx.current + 1) % 20;
        lastTime.current = time;
        targetMouse.current.active = false;
        
        materialRef.current.uniforms.uMiceX.value = mX.current;
        materialRef.current.uniforms.uMiceY.value = mY.current;
        materialRef.current.uniforms.uMiceTimes.value = mTimes.current;
      }
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial 
        ref={materialRef}
        args={[FluidShaderMaterial]}
        transparent={true}
      />
    </mesh>
  );
};

const LiquidBackgroundCanvas = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none rounded-[30px] overflow-hidden" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
      <Canvas orthographic camera={{ position: [0, 0, 1], zoom: 1 }}>
        <RippleMesh />
      </Canvas>
      <div className="bg-vignette"></div>
    </div>
  );
};

const LandingPage = ({ onEnter }) => {
  const [monthlyTrips, setMonthlyTrips] = useState(250);
  const [avgPayload, setAvgPayload] = useState(15);

  const avoidedCo2Tonnes = Math.round((monthlyTrips * avgPayload * 0.42));
  const fuelSavingsInr = Math.round((monthlyTrips * 3400));
  const carbonTaxSaved = Math.round(avoidedCo2Tonnes * 850);

  return (
    <div className="landing-screen-wrapper">
       <div className="landing-inner-container">
          {/* Dynamic Background Glow */}
          <LiquidBackgroundCanvas />

          <nav className="nav-container">
            <div className="nav-brand">
               <span className="brand-logo"><Leaf size={24} color="#00f5a0"/></span>
               <span>EcoKernel</span>
            </div>
            <div className="nav-links">
              <a href="#matrix" className="nav-pill-link">Vs Consumer Maps</a>
              <a href="#calculator" className="nav-pill-link">ROI Estimator</a>
              <a href="#" className="nav-pill-link" onClick={onEnter}>Weekly AI Radar</a>
            </div>
            <div className="nav-actions">
              <button className="access-btn" onClick={onEnter}>
                Access Engine <ArrowRight size={16} />
              </button>
            </div>
          </nav>

          <main className="landing-content">
            <div className="text-section">
              <div className="eyebrow-badge">
                <Leaf size={14} />
                <span>ENTERPRISE FREIGHT INTELLIGENCE • Scope 3 ESG Solver</span>
              </div>
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                The Green Logistics Engine<br/>Purpose-Built For<br/>Enterprise Freight.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Standard consumer maps only calculate distance. EcoKernel optimizes multi-modal rail & road corridors, Scope 3 DEFRA carbon compliance, elevation drag physics, and pre-negotiated SLA contracts.
              </motion.p>
              
              <div className="hero-actions">
                <motion.button 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="start-opt-btn"
                  onClick={onEnter}
                >
                  Launch Route Optimizer <ArrowRight size={20} />
                </motion.button>
              </div>
            </div>

             <div className="visual-section">
               {/* Orbital visual */}
               <motion.div 
                 className="orbit-container"
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ duration: 1, delay: 0.3 }}
               >
                 <div className="orbit-ring ring-bg"></div>
                 <div className="orbit-ring ring-mid"></div>
                 <div className="orbit-ring ring-sm"></div>

                 <motion.div 
                    className="center-core"
                 >
                    <span className="core-percent">38%</span>
                    <span className="core-text">AVOIDED<br/>CO₂ EMISSIONS</span>
                 </motion.div>

                 {/* Orbiting Icons */}
                 <div className="orbiting-nodes">
                    <div className="node-wrapper nw5">
                       <div className="node-position p5">
                          <div className="node-icon"><Truck size={18} strokeWidth={2.5} /></div>
                       </div>
                    </div>
                    <div className="node-wrapper nw1">
                       <div className="node-position p1">
                           <div className="node-icon"><Train size={18} strokeWidth={2.5} /></div>
                       </div>
                    </div>
                    <div className="node-wrapper nw3">
                       <div className="node-position p3">
                          <div className="node-icon"><Leaf size={18} strokeWidth={2.5} /></div>
                       </div>
                    </div>
                    <div className="node-wrapper nw2">
                       <div className="node-position p2">
                          <div className="node-icon"><Zap size={18} strokeWidth={2.5} /></div>
                       </div>
                    </div>
                    <div className="node-wrapper nw4">
                       <div className="node-position p4">
                          <div className="node-icon"><Globe size={18} strokeWidth={2.5} /></div>
                       </div>
                    </div>
                 </div>
               </motion.div>
            </div>
          </main>

          {/* SECTION: Why EcoKernel vs Google Maps */}
          <section id="matrix" className="matrix-section">
            <div className="section-header">
              <h2>Why Standard Consumer Maps Don't Work For Logistics</h2>
              <p>Google Maps and consumer navigation engines treat 16-tonne HGVs like passenger cars. Here is why enterprise logistics requires EcoKernel:</p>
            </div>

            <div className="matrix-grid">
              <div className="matrix-card consumer-card">
                <div className="m-card-badge text-muted">Consumer Maps (Google / MapmyIndia)</div>
                <h3>Standard Point-to-Point</h3>
                <ul className="matrix-list">
                  <li>❌ Only calculates single-vehicle road distance</li>
                  <li>❌ No Scope 3 DEFRA ESG compliance reporting</li>
                  <li>❌ Ignores elevation grade drag (F_drag + F_roll + F_grade)</li>
                  <li>❌ Ignores pre-negotiated SLA contract lane rates</li>
                  <li>❌ No 7-day repeated weekly dispatch forecast</li>
                </ul>
              </div>

              <div className="matrix-card ecokernel-card border-green">
                <div className="m-card-badge text-emerald">EcoKernel Green Logistics Engine</div>
                <h3>Multi-Objective Enterprise Engine</h3>
                <ul className="matrix-list text-light">
                  <li>✅ Multi-Modal Intermodal Optimization (Rail + Road + EV)</li>
                  <li>✅ Audit-Grade Scope 3 ESG Emissions Reports</li>
                  <li>✅ QIGA-PIEP Physics Solver (F_drag + F_roll + F_grade)</li>
                  <li>✅ Pre-Negotiated Contract SLA Engine Override</li>
                  <li>✅ 7-Day Weekly AI Dispatch Radar & Disruption Alerts</li>
                </ul>
              </div>
            </div>
          </section>

          {/* SECTION: Interactive Fleet ROI Estimator */}
          <section id="calculator" className="calc-section panel">
            <div className="calc-header">
              <h2>Interactive Fleet ROI & Carbon Savings Estimator</h2>
              <p>Adjust your operational scale to see instant projected monthly environmental and financial savings.</p>
            </div>

            <div className="calc-body-grid">
              <div className="calc-sliders">
                <div className="slider-group">
                  <div className="flex-between mb-2">
                    <label>MONTHLY FREIGHT TRIPS</label>
                    <span className="slider-val">{monthlyTrips} Trips / Mo</span>
                  </div>
                  <input 
                    type="range" 
                    min="20" 
                    max="2000" 
                    step="10" 
                    value={monthlyTrips} 
                    onChange={e => setMonthlyTrips(Number(e.target.value))} 
                    className="calc-range"
                  />
                </div>

                <div className="slider-group mt-4">
                  <div className="flex-between mb-2">
                    <label>AVERAGE CARGO PAYLOAD</label>
                    <span className="slider-val">{avgPayload} Tonnes</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="40" 
                    step="1" 
                    value={avgPayload} 
                    onChange={e => setAvgPayload(Number(e.target.value))} 
                    className="calc-range"
                  />
                </div>
              </div>

              <div className="calc-results-card">
                <div className="res-item">
                  <span className="res-lbl">Avoided Monthly CO₂</span>
                  <span className="res-val text-green">-{avoidedCo2Tonnes.toLocaleString()} Tonnes</span>
                </div>
                <div className="res-item">
                  <span className="res-lbl">Estimated Fuel & Toll Savings</span>
                  <span className="res-val text-cyan">₹{fuelSavingsInr.toLocaleString()}</span>
                </div>
                <div className="res-item">
                  <span className="res-lbl">Carbon Tax Offset Benefit</span>
                  <span className="res-val text-amber">₹{carbonTaxSaved.toLocaleString()}</span>
                </div>

                <button className="btn-calc-launch" onClick={onEnter}>
                  <span>APPLY TO MY FLEET</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </section>
       </div>
    </div>
  );
};

export default LandingPage;
