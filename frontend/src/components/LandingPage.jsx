import React from 'react';
import { ShaderGradientCanvas, ShaderGradient } from 'shadergradient';
import { Leaf } from 'lucide-react';
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
            cDistance={3.6}
            cPolarAngle={90}
            cameraZoom={1}
            color1="#10b981"
            color2="#097155ff"
            color3="#06624cff"
            destination="onCanvas"
            embedMode="off"
            envPreset="dawn"
            format="gif"
            fov={45}
            frameRate={10}
            gizmoHelper="hide"
            grain="off"
            lightType="3d"
            pixelDensity={1}
            positionX={-1.4}
            positionY={0}
            positionZ={0}
            range="disabled"
            rangeEnd={40}
            rangeStart={0}
            reflection={0.1}
            rotationX={0}
            rotationY={10}
            rotationZ={50}
            shader="defaults"
            type="waterPlane"
            uAmplitude={1}
            uDensity={1.3}
            uFrequency={5.5}
            uSpeed={0.4}
            uStrength={4}
            uTime={0}
            wireframe={false}
          />
        </ShaderGradientCanvas>
      </div>
      <div className="landing-overlay">
        <div className="landing-logo">
          <h1>Accelerating the<br/>power of Green Logistics.</h1>
          <p>Unlock your sustainable potential. Seamlessly generate, customize, and perfect your supply chain with cutting-edge AI technology.</p>
        </div>
        <div className="landing-actions">
           <button className="btn-primary start-button" onClick={onEnter}>
             Access Engine &rarr;
           </button>
           <button className="btn-text">
             Learn More
           </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
