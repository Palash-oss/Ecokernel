import React from 'react';
import { Leaf, Navigation } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar glass-panel">
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
