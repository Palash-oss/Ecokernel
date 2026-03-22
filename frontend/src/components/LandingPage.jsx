import React from 'react';
import { ShaderGradientCanvas, ShaderGradient } from 'shadergradient';
import { Leaf, Truck, Globe, Zap, Train, ArrowRight, Map } from 'lucide-react';
import { motion } from 'framer-motion';
import './LandingPage.css';

const LandingPage = ({ onEnter }) => {
  return (
    <div className="landing-page">
      <div className="background-scene">
        <ShaderGradientCanvas
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <ShaderGradient
            animate="on"
            axesHelper="off"
            brightness={1.2}
            cAzimuthAngle={180}
            cDistance={2.8}
            cPolarAngle={80}
            cameraZoom={1}
            color1="#057759"
            color2="#10b981"
            color3="#a7f3d0"
            destination="onCanvas"
            embedMode="off"
            envPreset="dawn"
            format="gif"
            fov={50}
            frameRate={10}
            gizmoHelper="hide"
            grain="off"
            lightType="3d"
            pixelDensity={1.5}
            positionX={0}
            positionY={0}
            positionZ={0}
            range="disabled"
            rangeEnd={40}
            rangeStart={0}
            reflection={0.2}
            rotationX={0}
            rotationY={0}
            rotationZ={0}
            shader="defaults"
            type="waterPlane"
            uAmplitude={1.8}
            uDensity={1.2}
            uFrequency={4.5}
            uSpeed={0.6}
            uStrength={2.5}
            uTime={0}
            wireframe={false}
          />
        </ShaderGradientCanvas>
      </div>

      <motion.div 
        className="main-app-container"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        {/* Navbar */}
        <nav className="app-nav">
          <div className="nav-brand">
            <Leaf className="brand-icon" />
            <span className="brand-name">EcoKernel</span>
          </div>
          <div className="nav-links">
            <a href="#platform">Platform</a>
            <a href="#optimizer">Optimizer</a>
            <a href="#impact">Impact</a>
            <a href="#enterprise">Enterprise</a>
          </div>
          <div className="nav-auth">
            <button className="btn-login">Log In</button>
            <button className="btn-join" onClick={onEnter}>Access Engine</button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="hero-section">
          <div className="hero-left">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Unlock the Greenest Routes You Thought Were Impossible –<br/>
              Now Just One Click Away!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Seamlessly balance SLAs and Carbon Neutrality. Generate, customize, and perfect your supply chain with our deep AI multi-objective optimizer.
            </motion.p>
            <motion.div 
              className="hero-cta"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <button className="btn-start" onClick={onEnter}>
                Start Optimization <ArrowRight size={18} className="cta-icon"/>
              </button>
            </motion.div>
          </div>

          <div className="hero-right">
            <div className="radar-wrapper">
              <div className="radar-ring ring-1"></div>
              <div className="radar-ring ring-2"></div>
              <div className="radar-ring ring-3"></div>

              <div className="radar-core">
                <h2>11%</h2>
                <p>Logistics<br/>Emissions</p>
              </div>

              {/* Floating Orbiting Icons */}
              <motion.div className="float-icon float-1" animate={{ y: [-8, 8, -8] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}>
                <Truck size={24} />
              </motion.div>
              <motion.div className="float-icon float-2" animate={{ y: [6, -6, 6] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}>
                <Leaf size={24} />
              </motion.div>
              <motion.div className="float-icon float-3" animate={{ y: [-10, 10, -10] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}>
                <Globe size={24} />
              </motion.div>
              <motion.div className="float-icon float-4" animate={{ y: [5, -5, 5] }} transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}>
                <Zap size={24} />
              </motion.div>
              <motion.div className="float-icon float-5" animate={{ y: [-7, 7, -7] }} transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut" }}>
                <Train size={24} />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom Logo Strip */}
        <div className="hero-bottom">
           <div className="partner-logo"><span>API</span> Integrations</div>
           <div className="partner-logo">Google Maps Engine</div>
           <div className="partner-logo">Carbon.io</div>
           <div className="partner-logo">FastAPI Backend</div>
           <div className="partner-logo">DEAP Evolution</div>
        </div>
      </motion.div>
    </div>
  );
};

export default LandingPage;
