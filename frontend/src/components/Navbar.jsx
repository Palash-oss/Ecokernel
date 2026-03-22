import React, { useState, useEffect } from 'react';
import { Leaf, Navigation } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = (e) => {
      // Check window scroll or event target scroll
      const scrollTop = window.scrollY || (e.target.scrollTop || 0);
      setScrolled(scrollTop > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Also capture events from inner scrollable containers just in case
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  return (
    <nav className={`navbar panel ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-brand">
        <div className="logo-icon">
          <Leaf size={24} color="var(--accent-green)" />
        </div>
        <div className="logo-text">
          <h1>EcoKernel</h1>
          <span>Green Logistics Engine</span>
        </div>
      </div>
      <div className="navbar-links">
        <a href="#" className="active">Dashboard</a>
        <a href="#">Network Model</a>
        <a href="#">Emissions Report</a>
      </div>
      <div className="navbar-user">
        <div className="user-avatar">DM</div>
      </div>
    </nav>
  );
};

export default Navbar;
