"use client"

import { useState, useEffect } from "react"
import {
  Activity,
  MapPin,
  AlertTriangle,
  Phone,
  Building,
  ClipboardList,
  Home,
  Shield,
  Check,
  Route,
  X,
  Plus,
} from "lucide-react"

// --- Initial Mock Data ---
const initialMockAlerts = [
  { id: 1, type: "critical", title: "Flash Flood Warning", location: "Mandakini River", time: "2 min ago", acknowledged: false },
  { id: 2, type: "warning", title: "Rising Water Levels", location: "Gaurikund Station", time: "15 min ago", acknowledged: true },
  { id: 3, type: "info", title: "Evacuation Route Update", location: "Route B - East", time: "1 hour ago", acknowledged: true },
];

const initialEmergencyContacts = [
    { id: 1, name: "NDRF Command Center", role: "Disaster Response", contact: "108" },
    { id:2, name: "State Disaster Mgmt.", role: "Coordination", contact: "1070" },
    { id: 3, name: "District Control Room", role: "Local Operations", contact: "1077" },
];

// Other data sets remain the same
const waterStations = [
  { id: "station-a", name: "Mandakini River", location: "Near Temple Bridge", currentLevel: 8.5, status: "critical", capacity: 10.0, lastUpdated: "2 min ago" },
  { id: "station-b", name: "Gaurikund Station", location: "Entry Point", currentLevel: 6.2, status: "warning", capacity: 9.0, lastUpdated: "1 min ago" },
  { id: "station-c", name: "Kedarnath Base", location: "Downstream Checkpoint", currentLevel: 4.1, status: "normal", capacity: 8.5, lastUpdated: "3 min ago" },
];
const emergencyProtocols = {
  normal: ["Monitor water levels every 6 hours.", "Weekly check of communication systems."],
  warning: ["Increase monitoring frequency to every hour.", "Place emergency response teams on standby."],
  critical: ["Activate Emergency Operations Center (EOC).", "Issue immediate evacuation orders for high-risk zones."],
};
const nearbyResources = [
    { id: 1, name: "Govt. Primary School Shelter", location: "Rampur Village, 2km away", capacity: 150, status: "Open" },
    { id: 2, name: "Community Hall Shelter", location: "Sitapur, 3km away", capacity: 250, status: "Open" },
    { id: 3, name: "Old Temple Guesthouse", location: "Gaurikund, 1.5km away", capacity: 80, status: "Full" },
];


export default function FloodManagementApp() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isWorldWindLoaded, setIsWorldWindLoaded] = useState(false);

  // --- State for dynamic lists ---
  const [alerts, setAlerts] = useState(initialMockAlerts);
  const [contacts, setContacts] = useState(initialEmergencyContacts);

  // --- State for Modals ---
  const [isAddAlertModalOpen, setIsAddAlertModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  
  // --- State for Form Inputs ---
  const [newAlert, setNewAlert] = useState({ type: 'info', title: '', location: '' });
  const [newContact, setNewContact] = useState({ name: '', role: '', contact: '' });

  // --- Event Handlers for adding new items ---
  const handleAddAlert = (e) => {
    e.preventDefault();
    const newAlertObject = {
      id: Date.now(),
      ...newAlert,
      time: 'Just now',
      acknowledged: false,
    };
    setAlerts([newAlertObject, ...alerts]);
    setIsAddAlertModalOpen(false); // Close modal
    setNewAlert({ type: 'info', title: '', location: '' }); // Reset form
  };

  const handleAddContact = (e) => {
    e.preventDefault();
    const newContactObject = {
      id: Date.now(),
      ...newContact,
    };
    setContacts([...contacts, newContactObject]);
    setIsAddContactModalOpen(false); // Close modal
    setNewContact({ name: '', role: '', contact: '' }); // Reset form
  };
  
  // Other useEffects and functions remain the same...
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkWorldWind = () => {
        if (typeof window.WorldWind !== "undefined") { setIsWorldWindLoaded(true); } else {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/@nasaworldwind/worldwind@0.9.0/build/dist/worldwind.min.js";
          script.async = true;
          script.onload = () => setIsWorldWindLoaded(true);
          document.head.appendChild(script);
        }
      };
      checkWorldWind();
    }
  }, []);

  const initializeWorldWind = (canvasId) => {
    if (!isWorldWindLoaded) return;
    const canvas = document.getElementById(canvasId);
    if (!canvas || canvas.hasAttribute('data-initialized')) return;
    try {
      const wwd = new window.WorldWind.WorldWindow(canvasId);
      canvas.setAttribute('data-initialized', 'true');
      const layers = [ new window.WorldWind.BMNGOneImageLayer(), new window.WorldWind.BingAerialWithLabelsLayer(), new window.WorldWind.CompassLayer() ];
      layers.forEach(layer => wwd.addLayer(layer));
      wwd.goTo(new window.WorldWind.Position(30.735, 79.066, 15000));
    } catch (error) { console.error("WorldWind initialization failed:", error); }
  };
  
  useEffect(() => {
    if (activeTab === 'dashboard') { setTimeout(() => initializeWorldWind('worldwind-canvas'), 0); }
  }, [activeTab, isWorldWindLoaded]);

  const getStatusClass = (status) => {
    if (status === "critical") return "badge-destructive";
    if (status === "warning") return "badge-warning";
    return "badge-normal";
  };
  const getAlertIcon = (type) => {
    const iconClass = type === 'critical' ? 'icon-destructive' : (type === 'warning' ? 'icon-warning' : 'icon-info');
    return <AlertTriangle className={`icon ${iconClass}`} />;
  };

  return (
    <> {/* Use a Fragment to allow modals to be outside the main container */}
      <div className="container">
        {/* Header and Tabs remain the same... */}
        <div className="main-header">
          <h1>Kedarnath Flood Management</h1>
          <p>Real-time monitoring and emergency response dashboard</p>
        </div>
        <div className="tabs-list">
            <button className={`tab-trigger ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><MapPin /> Dashboard</button>
            <button className={`tab-trigger ${activeTab === 'water-levels' ? 'active' : ''}`} onClick={() => setActiveTab('water-levels')}><Activity /> Water Levels</button>
            <button className={`tab-trigger ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}><AlertTriangle /> Alerts</button>
            <button className={`tab-trigger ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}><Phone /> Contacts</button>
            <button className={`tab-trigger ${activeTab === 'protocols' ? 'active' : ''}`} onClick={() => setActiveTab('protocols')}><ClipboardList /> Protocols</button>
            <button className={`tab-trigger ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')}><Home /> Resources</button>
        </div>

        <main>
          {/* Dashboard Tab remains the same... */}
          {activeTab === 'dashboard' && (
            <div className="dashboard-grid animate-fadeInUp">
                <div className="overview-cards">
                    <div className="card"><div className="card-header"><h3 className="card-title">Active Alerts</h3><AlertTriangle className="icon icon-destructive" /></div><div className="card-content"><p className="card-value">{alerts.length}</p><p className="card-description">Updates in real-time</p></div></div>
                    <div className="card"><div className="card-header"><h3 className="card-title">Critical Stations</h3><Activity className="icon icon-destructive" /></div><div className="card-content"><p className="card-value">{waterStations.filter((s) => s.status === "critical").length}</p><p className="card-description">Mandakini River reading high</p></div></div>
                    <div className="card"><div className="card-header"><h3 className="card-title">Key Contacts</h3><Phone className="icon" /></div><div className="card-content"><p className="card-value">{contacts.length}</p><p className="card-description">NDRF on standby</p></div></div>
                    <div className="card"><div className="card-header"><h3 className="card-title">Open Shelters</h3><Home className="icon" /></div><div className="card-content"><p className="card-value">{nearbyResources.filter(r => r.status === "Open").length}</p><p className="card-description">{nearbyResources.reduce((acc, r) => r.status === "Open" ? acc + r.capacity : acc, 0)} total capacity</p></div></div>
                </div>
                <div className="card map-card">
                    <div className="card-header"><h3 className="card-title">Interactive Flood Risk Map</h3><p className="card-description">High-risk (red) and low-risk (green) zones.</p></div>
                    <div className="card-content map-container">
                        {isWorldWindLoaded ? (<canvas id="worldwind-canvas" style={{width: '100%', height: '100%'}} />) : (<div className="loading-overlay"><div className="spinner"></div><p>Loading 3D Map...</p></div>)}
                    </div>
                </div>
            </div>
          )}

          {/* Water Levels Tab remains the same... */}
          {activeTab === 'water-levels' && (
             <div className="grid-container grid-cols-3-responsive animate-fadeInUp">
                {waterStations.map(station => (<div key={station.id} className="card"><div className="card-header"><div className="flex-between"><h3 className="card-title">{station.name}</h3><span className={`badge ${getStatusClass(station.status)}`}>{station.status}</span></div><p className="card-description">{station.location}</p></div><div className="card-content"><div className="water-level-display"><span className="level-value">{station.currentLevel}m</span><span className="level-capacity">/ {station.capacity}m</span></div><div className="progress-bar-container"><div className={`progress-bar ${getStatusClass(station.status)}`} style={{width: `${(station.currentLevel / station.capacity) * 100}%`}}></div></div><p className="text-xs text-muted-foreground">Last updated: {station.lastUpdated}</p></div></div>))}
            </div>
          )}
          
          {/* ALERTS TAB with Add button */}
          {activeTab === 'alerts' && (
              <div className="animate-fadeInUp">
                  <div className="tab-header">
                      <h2>Manage Alerts</h2>
                      <button className="btn btn-primary" onClick={() => setIsAddAlertModalOpen(true)}>
                          <Plus size={16} /> Add New Alert
                      </button>
                  </div>
                  {alerts.map(alert => (
                      <div key={alert.id} className={`alert ${alert.type === 'critical' ? 'alert-critical' : 'alert-warning'}`}>
                          <div className="alert-header">
                              {getAlertIcon(alert.type)}
                              <h3 className="alert-title">{alert.title}</h3>
                          </div>
                          <p className="alert-description">{alert.location} • {alert.time}</p>
                          {!alert.acknowledged && (
                             <div className="alert-actions">
                                 <button className="btn btn-secondary">Acknowledge</button>
                             </div>
                          )}
                      </div>
                  ))}
              </div>
          )}

          {/* CONTACTS TAB with Add button */}
          {activeTab === 'contacts' && (
            <div className="animate-fadeInUp">
                <div className="tab-header">
                    <h2>Emergency Contacts</h2>
                    <button className="btn btn-primary" onClick={() => setIsAddContactModalOpen(true)}>
                        <Plus size={16} /> Add New Contact
                    </button>
                </div>
                <div className="grid-container grid-cols-4-responsive">
                  {contacts.map(contact => (
                    <div key={contact.id} className="card text-center">
                      <h3 className="card-title">{contact.name}</h3>
                      <p className="card-description">{contact.role}</p>
                      <p className="contact-number">{contact.contact}</p>
                      <button className="btn btn-primary" style={{width: '100%'}}>Call Now</button>
                    </div>
                  ))}
                </div>
            </div>
          )}

          {/* Protocols Tab remains the same... */}
          {activeTab === 'protocols' && (
            <div className="grid-container grid-cols-3-responsive animate-fadeInUp">
              <div className="card"><h3 className="card-title protocol-title normal">Normal Conditions</h3><ul className="protocol-list">{emergencyProtocols.normal.map((item, i) => <li key={i}><Check /> {item}</li>)}</ul></div>
              <div className="card"><h3 className="card-title protocol-title warning">Warning Level</h3><ul className="protocol-list">{emergencyProtocols.warning.map((item, i) => <li key={i}><AlertTriangle /> {item}</li>)}</ul></div>
              <div className="card"><h3 className="card-title protocol-title critical">Critical Level</h3><ul className="protocol-list">{emergencyProtocols.critical.map((item, i) => <li key={i}><Shield /> {item}</li>)}</ul></div>
            </div>
          )}

          {/* Resources Tab remains the same... */}
          {activeTab === 'resources' && (
            <div className="animate-fadeInUp">
              {nearbyResources.map(resource => (
                <div key={resource.id} className="card resource-card">
                  <div><h3 className="card-title">{resource.name}</h3><p className="card-description">{resource.location}</p></div>
                  <div className="resource-details"><p>Capacity: {resource.capacity}</p><span className={`badge ${resource.status === 'Open' ? 'badge-normal' : 'badge-destructive'}`}>{resource.status}</span><button className="btn btn-primary"><Route className="icon"/> View Path</button></div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* --- ADD ALERT MODAL --- */}
      {isAddAlertModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content animate-fadeInUp">
            <div className="modal-header">
              <h3>Add New Alert</h3>
              <button className="modal-close" onClick={() => setIsAddAlertModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddAlert}>
              <div className="form-group">
                <label htmlFor="alert-title">Alert Title</label>
                <input id="alert-title" type="text" value={newAlert.title} onChange={(e) => setNewAlert({...newAlert, title: e.target.value})} required />
              </div>
              <div className="form-group">
                <label htmlFor="alert-location">Location</label>
                <input id="alert-location" type="text" value={newAlert.location} onChange={(e) => setNewAlert({...newAlert, location: e.target.value})} required />
              </div>
              <div className="form-group">
                <label htmlFor="alert-type">Type</label>
                <select id="alert-type" value={newAlert.type} onChange={(e) => setNewAlert({...newAlert, type: e.target.value})}>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddAlertModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Alert</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD CONTACT MODAL --- */}
      {isAddContactModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content animate-fadeInUp">
            <div className="modal-header">
              <h3>Add New Contact</h3>
              <button className="modal-close" onClick={() => setIsAddContactModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddContact}>
              <div className="form-group">
                <label htmlFor="contact-name">Name</label>
                <input id="contact-name" type="text" value={newContact.name} onChange={(e) => setNewContact({...newContact, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label htmlFor="contact-role">Role / Department</label>
                <input id="contact-role" type="text" value={newContact.role} onChange={(e) => setNewContact({...newContact, role: e.target.value})} required />
              </div>
              <div className="form-group">
                <label htmlFor="contact-number">Contact Number</label>
                <input id="contact-number" type="text" value={newContact.contact} onChange={(e) => setNewContact({...newContact, contact: e.target.value})} required />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddContactModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Contact</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}