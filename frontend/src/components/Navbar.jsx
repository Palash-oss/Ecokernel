import React, { useState, useEffect } from 'react';
import { Leaf, Navigation, UploadCloud } from 'lucide-react';
import NetworkImporter from './NetworkImporter';
import './Navbar.css';

const Navbar = ({ currentView = 'dashboard', onViewChange, onNetworkImported }) => {
  const [scrolled, setScrolled] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  useEffect(() => {
    const handleScroll = (e) => {
      const scrollTop = window.scrollY || (e.target.scrollTop || 0);
      setScrolled(scrollTop > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  return (
    <>
      <nav className={`navbar panel ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-brand">
          <div className="logo-icon">
            <Leaf size={24} color="#047857" />
          </div>
          <div className="logo-text">
            <h1>EcoKernel</h1>
            <span>Green Logistics Engine</span>
          </div>
        </div>
        <div className="navbar-links">
          <a href="#" className={currentView === 'dashboard' ? 'active' : ''} onClick={(e) => { e.preventDefault(); onViewChange?.('dashboard'); }}>Dashboard</a>
          <a href="#" className={currentView === 'weekly' ? 'active' : ''} onClick={(e) => { e.preventDefault(); onViewChange?.('weekly'); }}>Weekly AI Radar</a>
          <a href="#" className={currentView === 'emissions' ? 'active' : ''} onClick={(e) => { e.preventDefault(); onViewChange?.('emissions'); }}>Emissions Report</a>
          <a href="#" className={currentView === 'contracts' ? 'active' : ''} onClick={(e) => { e.preventDefault(); onViewChange?.('contracts'); }}>Fleet Contracts</a>
        </div>
        <div className="navbar-user flex items-center gap-3">
          <button 
            className="navbar-import-btn"
            onClick={() => setIsImporterOpen(true)}
            title="Import custom CSV / GeoJSON supply chain network"
          >
            <UploadCloud size={15} />
            <span>Import Network</span>
          </button>
          <div className="user-avatar">DM</div>
        </div>
      </nav>

      <NetworkImporter 
        isOpen={isImporterOpen} 
        onClose={() => setIsImporterOpen(false)} 
        onNetworkImported={onNetworkImported}
      />
    </>
  );
};

export default Navbar;

