import React from 'react';
import { ShaderGradientCanvas, ShaderGradient } from 'shadergradient';
import { Leaf } from 'lucide-react';
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
        className="landing-overlay"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <div className="landing-logo">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Accelerating the<br/>power of Green Logistics.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Unlock your sustainable potential. Seamlessly generate, customize, and perfect your supply chain with cutting-edge AI technology.
          </motion.p>
        </div>
        <motion.div 
          className="landing-actions"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
           <button className="btn-primary start-button" onClick={onEnter}>
             Access Engine &rarr;
           </button>
           <button className="btn-text">
             Learn More
           </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LandingPage;
