import React, { useState, useEffect } from 'react';
import { Leaf, LayoutDashboard, Radar, BarChart3, FileCheck, UploadCloud, Radio } from 'lucide-react';
import NetworkImporter from './NetworkImporter';
import './Navbar.css';

const Navbar = ({ currentView = 'dashboard', onViewChange, onNetworkImported, onGoLanding }) => {
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
      <header className={`navbar-wrapper ${scrolled ? 'scrolled' : ''}`}>
        <nav className="navbar">
          <div 
            className="navbar-brand" 
            onClick={() => onGoLanding ? onGoLanding() : onViewChange?.('dashboard')} 
            style={{ cursor: 'pointer' }}
            title="Back to Landing Page"
          >
            <div className="logo-icon">
              <Leaf size={22} className="logo-leaf" />
            </div>
            <div className="logo-text">
              <div className="logo-title-row">
                <h1>EcoKernel</h1>
                <span className="logo-version-tag">v3.2</span>
              </div>
              <span>Green Logistics Engine</span>
            </div>
          </div>

          <div className="navbar-links">
            <button 
              type="button"
              className={`nav-pill ${currentView === 'dashboard' ? 'active' : ''}`} 
              onClick={() => onViewChange?.('dashboard')}
            >
              <LayoutDashboard size={15} />
              <span>Dashboard</span>
            </button>
            <button 
              type="button"
              className={`nav-pill ${currentView === 'weekly' ? 'active' : ''}`} 
              onClick={() => onViewChange?.('weekly')}
            >
              <Radar size={15} />
              <span>Weekly AI Radar</span>
            </button>
            <button 
              type="button"
              className={`nav-pill ${currentView === 'emissions' ? 'active' : ''}`} 
              onClick={() => onViewChange?.('emissions')}
            >
              <BarChart3 size={15} />
              <span>Emissions Report</span>
            </button>
            <button 
              type="button"
              className={`nav-pill ${currentView === 'contracts' ? 'active' : ''}`} 
              onClick={() => onViewChange?.('contracts')}
            >
              <FileCheck size={15} />
              <span>Fleet Contracts</span>
            </button>
          </div>

          <div className="navbar-user">
            <button 
              className="navbar-import-btn"
              onClick={() => setIsImporterOpen(true)}
              title="Import custom CSV / GeoJSON supply chain network"
            >
              <UploadCloud size={15} className="import-icon" />
              <span>Import Network</span>
            </button>
            <div className="user-profile-badge" title="Dispatch Officer Online">
              <div className="user-avatar">DM</div>
              <span className="user-status-dot" />
            </div>
          </div>
        </nav>
      </header>

      <NetworkImporter 
        isOpen={isImporterOpen} 
        onClose={() => setIsImporterOpen(false)} 
        onNetworkImported={onNetworkImported}
      />
    </>
  );
};

export default Navbar;

