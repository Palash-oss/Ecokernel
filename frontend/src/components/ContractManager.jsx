import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, UploadCloud, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/client';
import './ContractManager.css';

const ContractManager = ({ vehicles }) => {
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [vehicleType, setVehicleType] = useState(vehicles[0]?.id || 'ashok_leyland_euro6');
  const [cost, setCost] = useState('');
  const [expiry, setExpiry] = useState('');
  const [contractType, setContractType] = useState('Annual Line-haul');

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setIsLoading(true);
      const res = await api.getContracts();
      setContracts(res.contracts || []);
    } catch (err) {
      console.error("Failed to fetch contracts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContract = async (e) => {
    e.preventDefault();
    if (!cost || !expiry) return alert("Please fill all required fields");
    
    try {
      await api.addContract({
        origin,
        destination,
        vehicle_type: vehicleType,
        fixed_cost_inr: parseFloat(cost),
        expiry_date: expiry,
        contract_type: contractType
      });
      // Reset
      setCost('');
      setExpiry('');
      fetchContracts();
    } catch (err) {
      alert("Failed to add contract. Check connection.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteContract(id);
      fetchContracts();
    } catch (err) {
      alert("Failed to delete.");
    }
  };

  // Mock CSV upload interaction
  const handleCSVUpload = () => {
    alert("Enterprise Feature: This would parse a CSV of bulk lanes and push to the DB in production.");
  };

  return (
    <div className="contract-manager">
      <div className="cm-header">
        <div className="title-area">
          <FileText size={28} className="icon-blue" />
          <div>
            <h2>Fleet Contracts & SLAs</h2>
            <p>Upload and manage pre-negotiated lane pricing for the route engine.</p>
          </div>
        </div>
        <button className="btn-secondary" onClick={handleCSVUpload}>
          <UploadCloud size={16} /> Bulk Upload (CSV)
        </button>
      </div>

      <div className="cm-grid">
        {/* Left Side: Add Contract Form */}
        <div className="panel form-panel">
          <h3><Plus size={16} /> Add New Contract</h3>
          <form onSubmit={handleAddContract}>
            <div className="form-group row">
              <div className="col">
                <label>Origin Address / Lane Start</label>
                <input className="form-control" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="e.g. pickup address" />
              </div>
              <div className="col">
                <label>Destination Address / Lane End</label>
                <input className="form-control" value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g. drop address" />
              </div>
            </div>

            <div className="form-group">
              <label>Fleet Assignment (Vehicle Class)</label>
              <select className="form-control" value={vehicleType} onChange={e => setVehicleType(e.target.value)}>
                {vehicles && vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group row">
              <div className="col">
                <label>Agreed Flat Rate (INR)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="e.g. 35000"
                  value={cost} 
                  onChange={e => setCost(e.target.value)} 
                />
              </div>
              <div className="col">
                <label>Expiration Date</label>
                <input 
                  type="date" 
                  className="form-control"
                  value={expiry} 
                  onChange={e => setExpiry(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group">
              <label>SLA Type</label>
              <select className="form-control" value={contractType} onChange={e => setContractType(e.target.value)}>
                <option>Annual Line-haul</option>
                <option>Volume SLA</option>
                <option>Dedicated Fleet</option>
                <option>Spot Bulk Allocation</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" style={{marginTop: '20px'}}>
              Save Contract
            </button>
          </form>

          <div className="ai-notice">
            <AlertCircle size={14} />
            <p>The routing engine will override Spot Pricing and strictly enforce these flat rates if a matching corridor is evaluated before expiration.</p>
          </div>
        </div>

        {/* Right Side: Active Contracts Ledger */}
        <div className="panel ledger-panel">
          <div className="ledger-header">
            <h3>Active Corridor Agreements</h3>
            <span className="badge">{contracts.length} Loaded</span>
          </div>
          
          <div className="contracts-grid">
            {isLoading ? (
              <div className="loading-state">Syncing Ledger...</div>
            ) : contracts.length === 0 ? (
              <div className="empty-state">No active SLAs on this node.</div>
            ) : (
              contracts.map(c => {
                const isExpired = new Date(c.expiry_date) < new Date();
                return (
                  <motion.div 
                    key={c.id} 
                    className={`contract-card ${isExpired ? 'expired' : ''}`}
                    whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="card-top">
                      <div className="corridor">
                        <span className="route">{c.origin} → {c.destination}</span>
                        <span className="sla-type">{c.contract_type}</span>
                      </div>
                      <button className="del-icon" onClick={() => handleDelete(c.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="card-details">
                      <div className="detail">
                        <span className="label">Vehicle Class</span>
                        <span className="val">{c.vehicle_type}</span>
                      </div>
                      <div className="detail">
                        <span className="label">Agreed Rate</span>
                        <span className="val cost">₹{c.fixed_cost_inr.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="card-footer">
                      <div className="expiry">Expires: {c.expiry_date}</div>
                      <span className={`status-pill ${isExpired ? 'exp' : 'act'}`}>
                        {isExpired ? 'Expired' : 'Active SLA'}
                      </span>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractManager;
