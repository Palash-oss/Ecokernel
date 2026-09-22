import React, { useState } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertCircle, RefreshCw, Download, Database, MapPin, Route } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './NetworkImporter.css';

const SAMPLE_CSV = `type,name_from,lat_to,lng,region,capacity_tons,has_rail
node,Mumbai Central,19.076,72.877,West,500,
node,Delhi NCR Logistics,28.613,77.209,North,800,
node,Bengaluru Hub,12.971,77.594,South,450,
edge,Mumbai Central,Delhi NCR Logistics,,,1,
edge,Mumbai Central,Bengaluru Hub,,,1,
edge,Delhi NCR Logistics,Bengaluru Hub,,,0,`;

const NetworkImporter = ({ isOpen, onClose, onNetworkImported }) => {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'editor'
  const [rawContent, setRawContent] = useState(SAMPLE_CSV);
  const [parsedNodes, setParsedNodes] = useState([]);
  const [parsedEdges, setParsedEdges] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const parseCsvText = (text) => {
    try {
      const lines = text.trim().split('\n');
      if (lines.length < 2) return;

      const nodes = [];
      const edges = [];

      // Check header
      const header = lines[0].toLowerCase();
      
      if (header.includes('type')) {
        // Combined format
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          if (cols.length < 2) continue;
          
          const rowType = cols[0].toLowerCase();
          if (rowType === 'node') {
            nodes.push({
              name: cols[1],
              lat: cols[2] ? parseFloat(cols[2]) : null,
              lng: cols[3] ? parseFloat(cols[3]) : null,
              region: cols[4] || 'custom',
              capacity_tons: cols[5] ? parseFloat(cols[5]) : 100
            });
          } else if (rowType === 'edge') {
            edges.push({
              from_city: cols[1],
              to_city: cols[2],
              has_rail: cols[6] === '1' || cols[6]?.toLowerCase() === 'true'
            });
          }
        }
      } else {
        // Fallback simple node list parser
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          if (cols.length >= 3) {
            nodes.push({
              name: cols[0],
              lat: parseFloat(cols[1]),
              lng: parseFloat(cols[2]),
              region: cols[3] || 'custom'
            });
          }
        }
      }

      setParsedNodes(nodes);
      setParsedEdges(edges);
      setStatusMessage({ type: 'success', text: `Parsed ${nodes.length} hubs and ${edges.length} logistics routes.` });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'CSV parsing error. Check header formatting.' });
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setRawContent(content);
      parseCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleDeployNetwork = async () => {
    if (parsedNodes.length === 0) {
      parseCsvText(rawContent);
    }
    
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('http://localhost:8001/api/network/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: parsedNodes,
          edges: parsedEdges,
          reset_existing: true
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: data.message });
        if (onNetworkImported) onNetworkImported();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'Import failed' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Server connection error during network import.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetNetwork = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8001/api/network/reset', { method: 'POST' });
      const data = await res.json();
      setStatusMessage({ type: 'success', text: data.message });
      if (onNetworkImported) onNetworkImported();
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Reset failed' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="importer-modal-backdrop" onClick={onClose}>
        <motion.div 
          className="importer-modal-container" 
          onClick={e => e.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <div className="importer-header">
            <div className="importer-title-group">
              <Database size={20} color="#00e599" />
              <span className="importer-title-text">Dynamic Supply Chain Importer</span>
            </div>
            <button className="importer-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="importer-tabs">
            <button 
              className={`importer-tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={14} /> File Drag & Drop
            </button>
            <button 
              className={`importer-tab ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <FileText size={14} /> Live Schema Editor
            </button>
          </div>

          <div className="importer-body">
            {activeTab === 'upload' ? (
              <div className="importer-dropzone">
                <input type="file" accept=".csv,.json" onChange={handleFileUpload} id="csv-input" hidden />
                <label htmlFor="csv-input" className="dropzone-label">
                  <Upload className="dropzone-icon" size={36} color="#00e599" />
                  <span className="dropzone-main-text">Click or drag CSV / JSON supply chain dataset</span>
                  <span className="dropzone-sub-text">Supports custom hubs, coordinates, capacity & rail routes</span>
                </label>
              </div>
            ) : (
              <div className="importer-editor-wrap">
                <textarea 
                  className="importer-textarea" 
                  value={rawContent}
                  onChange={(e) => {
                    setRawContent(e.target.value);
                    parseCsvText(e.target.value);
                  }}
                  rows={8}
                />
              </div>
            )}

            {statusMessage && (
              <div className={`importer-status-banner ${statusMessage.type}`}>
                {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {parsedNodes.length > 0 && (
              <div className="importer-preview-section">
                <div className="preview-meta-row">
                  <span><MapPin size={12} className="meta-icon" /> {parsedNodes.length} Hubs Parsed</span>
                  <span><Route size={12} className="meta-icon" /> {parsedEdges.length} Intermodal Routes</span>
                </div>
                <div className="importer-preview-table-wrap">
                  <table className="importer-table">
                    <thead>
                      <tr>
                        <th>Hub Name</th>
                        <th>Coordinates</th>
                        <th>Region</th>
                        <th>Capacity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedNodes.slice(0, 5).map((node, idx) => (
                        <tr key={idx}>
                          <td className="table-hub-name">{node.name}</td>
                          <td className="table-hub-coords">
                            {node.lat && node.lng ? `${node.lat.toFixed(2)}, ${node.lng.toFixed(2)}` : 'Auto-Geocode'}
                          </td>
                          <td><span className="importer-badge">{node.region}</span></td>
                          <td>{node.capacity_tons} T</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="importer-footer">
            <button className="importer-reset-btn" onClick={handleResetNetwork} disabled={isLoading}>
              <RefreshCw size={14} /> Reset to Default Network
            </button>
            <div className="importer-action-btns">
              <button className="importer-cancel-btn" onClick={onClose}>Cancel</button>
              <button className="importer-deploy-btn" onClick={handleDeployNetwork} disabled={isLoading}>
                {isLoading ? 'Deploying...' : 'Deploy to Active Solvers'}
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NetworkImporter;
