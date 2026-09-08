import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, UploadCloud, AlertCircle, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/client';
import './ContractManager.css';

const CITY_PRESETS = [
  "Mumbai", "Delhi", "Bangalore", "Chennai", 
  "Hyderabad", "Kolkata", "Pune", "Ahmedabad"
];

const ContractManager = ({ vehicles = [] }) => {
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  
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

  useEffect(() => {
    if (vehicles && vehicles.length > 0 && !vehicleType) {
      setVehicleType(vehicles[0].id);
    }
  }, [vehicles]);

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

  const getVehicleLabel = (vehId) => {
    const v = vehicles?.find(item => item.id === vehId);
    if (v) return v.name;
    if (!vehId) return 'Standard Heavy Truck';
    return vehId.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  };

  const handleAddContract = async (e) => {
    e.preventDefault();
    if (!origin || !destination || !cost || !expiry) {
      alert("Please complete all contract fields (Origin, Destination, Rate, and Expiration Date)");
      return;
    }
    
    try {
      await api.addContract({
        origin: origin.trim(),
        destination: destination.trim(),
        vehicle_type: vehicleType,
        fixed_cost_inr: parseFloat(cost),
        expiry_date: expiry,
        contract_type: contractType
      });

      setNotification("Contract saved successfully! Route engine will now prioritize this SLA.");
      setTimeout(() => setNotification(null), 4000);

      // Reset Form
      setOrigin('');
      setDestination('');
      setCost('');
      setExpiry('');
      fetchContracts();
    } catch (err) {
      alert("Failed to add contract. Please check connection.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteContract(id);
      fetchContracts();
    } catch (err) {
      alert("Failed to delete contract.");
    }
  };

  const handleCSVUpload = () => {
    alert("Bulk CSV Import Ready: Select a valid enterprise SLA CSV file to import multiple corridors simultaneously.");
  };

  return (
    <div className="contract-manager fade-in">
      <div className="cm-header">
        <div className="title-area">
          <div className="icon-badge">
            <FileText size={24} className="text-neon" />
          </div>
          <div>
            <h2>Fleet Contracts & SLAs</h2>
            <p>Upload and manage pre-negotiated corridor pricing to bypass standard spot rates.</p>
          </div>
        </div>
        <button className="btn-csv-upload" onClick={handleCSVUpload}>
          <UploadCloud size={16} /> Bulk Upload (CSV)
        </button>
      </div>

      {notification && (
        <motion.div 
          className="notification-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CheckCircle size={18} className="text-emerald" />
          <span>{notification}</span>
        </motion.div>
      )}

      <div className="cm-grid">
        {/* Left Side: Add Contract Form */}
        <div className="panel form-panel">
          <div className="panel-title-row">
            <Plus size={18} className="text-emerald" />
            <h3>Add New Contract SLA</h3>
          </div>

          <form onSubmit={handleAddContract} className="cm-form">
            <div className="form-row">
              <div className="form-col">
                <label className="cm-label">Origin Hub / Lane Start</label>

                <input 
                  type="text" 
                  className="cm-input" 
                  value={origin} 
                  onChange={e => setOrigin(e.target.value)} 
                  placeholder="e.g. Mumbai, Delhi..."
                  list="origin-city-list"
                />
                <datalist id="origin-city-list">
                  {CITY_PRESETS.map((c, i) => <option key={i} value={c} />)}
                </datalist>
              </div>

              <div className="form-col">
                <label className="cm-label">Destination Hub / Lane End</label>

                <input 
                  type="text" 
                  className="cm-input" 
                  value={destination} 
                  onChange={e => setDestination(e.target.value)} 
                  placeholder="e.g. Bangalore, Pune..."
                  list="dest-city-list"
                />
                <datalist id="dest-city-list">
                  {CITY_PRESETS.map((c, i) => <option key={i} value={c} />)}
                </datalist>
              </div>
            </div>

            <div className="form-col full-width">
              <label className="cm-label">Fleet Assignment (Vehicle Class)</label>
              <select className="cm-select" value={vehicleType} onChange={e => setVehicleType(e.target.value)}>
                {vehicles && vehicles.length > 0 ? (
                  vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.fuel_type.toUpperCase()})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="ashok_leyland_euro6">Ashok Leyland Euro 6 HGV (EURO6_DIESEL)</option>
                    <option value="tata_signa_cng">Tata Signa CNG Heavy Truck (CNG)</option>
                    <option value="volvo_fh_electric">Volvo FH Electric Intercity (ELECTRIC)</option>
                    <option value="mahindra_treo_ev">Mahindra Treo Electric Express (ELECTRIC)</option>
                  </>
                )}
              </select>
            </div>

            <div className="form-row">
              <div className="form-col">
                <label className="cm-label">Agreed Flat Rate (₹ INR)</label>
                <div className="currency-input-wrapper">
                  <span className="currency-prefix">₹</span>
                  <input 
                    type="number" 
                    className="cm-input input-with-prefix" 
                    placeholder="35000"
                    value={cost} 
                    onChange={e => setCost(e.target.value)} 
                    min="100"
                  />
                </div>
              </div>

              <div className="form-col">
                <label className="cm-label">Expiration Date</label>
                <input 
                  type="date" 
                  className="cm-input date-input"
                  value={expiry} 
                  onChange={e => setExpiry(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-col full-width">
              <label className="cm-label">Contract SLA Agreement Type</label>
              <select className="cm-select" value={contractType} onChange={e => setContractType(e.target.value)}>
                <option>Annual Line-haul</option>
                <option>Volume SLA</option>
                <option>Dedicated Fleet</option>
                <option>Spot Bulk Allocation</option>
              </select>
            </div>

            <button type="submit" className="btn-cyber-submit">
              <span>SAVE CONTRACT SLA</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="ai-notice-box">
            <AlertCircle size={16} className="text-amber" />
            <p>Active non-demo contracts automatically override live spot market estimates for matched corridors.</p>
          </div>
        </div>

        {/* Right Side: Active Contracts Ledger */}
        <div className="panel ledger-panel">
          <div className="ledger-header">
            <div>
              <h3>Active Corridor Agreements</h3>
              <p className="sub-text">Pre-negotiated SLAs loaded into EcoKernel optimization matrix</p>
            </div>
            <span className="count-badge">{contracts.length} SLAs Active</span>
          </div>
          
          <div className="contracts-grid">
            {isLoading ? (
              <div className="loading-state">
                <div className="spinner-tiny" />
                <span>Syncing Ledger Database...</span>
              </div>
            ) : contracts.length === 0 ? (
              <div className="empty-state">
                <ShieldCheck size={36} className="text-muted mb-2" />
                <p>No active contract SLAs found. Create one using the form.</p>
              </div>
            ) : (
              contracts.map(c => {
                const isExpired = new Date(c.expiry_date) < new Date();
                const vehicleName = getVehicleLabel(c.vehicle_type);

                return (
                  <motion.div 
                    key={c.id} 
                    className={`contract-card ${isExpired ? 'expired' : ''}`}
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="card-top">
                      <div className="corridor-info">
                        <span className="route-title">{c.origin} → {c.destination}</span>
                        <span className="sla-tag">{c.contract_type}</span>
                      </div>
                      <button className="btn-del" onClick={() => handleDelete(c.id)} title="Delete SLA">
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="card-body-specs">
                      <div className="spec-row">
                        <span className="spec-label">Assigned Vehicle</span>
                        <span className="spec-val vehicle-name">{vehicleName}</span>
                      </div>
                      <div className="spec-row">
                        <span className="spec-label">Contract Flat Rate</span>
                        <span className="spec-val cost-tag">₹{Number(c.fixed_cost_inr).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="card-footer-bar">
                      <span className="expiry-text">Valid until {c.expiry_date}</span>
                      <span className={`status-pill ${isExpired ? 'status-expired' : 'status-active'}`}>
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
