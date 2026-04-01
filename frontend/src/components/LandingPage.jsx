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
      const time = state.clock.elapsedTime;
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

  return (
    <div className="landing-screen-wrapper">
       <div className="landing-inner-container">
          {/* Dynamic Background Glow */}
          <LiquidBackgroundCanvas />

          <nav className="nav-container">
            <div className="nav-brand">
               <span className="brand-logo"><Leaf size={24} color="#69f6b8"/></span>
               <span>EcoKernel</span>
            </div>
            <div className="nav-links">
              <a href="#" className="roll-link"><span className="roll-text" data-text="Platform">Platform</span></a>
              <a href="#" className="roll-link"><span className="roll-text" data-text="Optimizer">Optimizer</span></a>
              <a href="#" className="roll-link"><span className="roll-text" data-text="Impact">Impact</span></a>
              <a href="#" className="roll-link"><span className="roll-text" data-text="Enterprise">Enterprise</span></a>
            </div>
            <div className="nav-actions">
              <a href="#" className="login-link roll-link"><span className="roll-text" data-text="Log In">Log In</span></a>
              <button className="access-btn" onClick={onEnter}>
                Access Engine
              </button>
            </div>
          </nav>

          <main className="landing-content">
            <div className="text-section">
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                Unlock the Greenest<br/>Routes You Thought<br/>Were Impossible –<br/>Now Just One Click<br/>Away!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Seamlessly balance SLAs and Carbon Neutrality. Generate,<br/>customize, and perfect your supply chain with our deep AI multi-<br/>objective optimizer.
              </motion.p>
              
              <motion.button 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="start-opt-btn"
                onClick={onEnter}
              >
                Start Optimization <ArrowRight size={20} />
              </motion.button>
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
                    <span className="core-percent">11%</span>
                    <span className="core-text">LOGISTICS<br/>EMISSIONS</span>
                 </motion.div>

                 {/* Orbiting Icons */}
                 <div className="orbiting-nodes">
                    {/* Inner Track */}
                    <div className="node-wrapper nw5">
                       <div className="node-position p5">
                          <div className="node-icon"><Truck size={18} strokeWidth={2.5} /></div>
                       </div>
                    </div>
                    {/* Middle Track */}
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
                    {/* Outer Track */}
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
       </div>
    </div>
  );
};

export default LandingPage;
