"use client"

import { useState, useEffect } from "react"
import dynamic from 'next/dynamic'
import {
  Activity,
  MapPin,
  AlertTriangle,
  Phone,
  ClipboardList,
  Home,
  Shield,
  Check,
  Route,
  X,
  Plus,
  Droplets,
  Waves,
  CheckCircle2,
  Circle,
  Filter,
  Navigation,
  Info
} from "lucide-react"

// Dynamically import the map to prevent server-side errors
const KedarnathLeafletMap = dynamic(
  () => import("./KedarnathLeafletMap"),
  { 
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-500">Loading Map...</div>
  }
)

// --- AI PREDICTION COMPONENT ---
const FloodAlertPanel = () => {
  const [riverLevel, setRiverLevel] = useState('');
  const [rainfall, setRainfall] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    if (!riverLevel || !rainfall) return alert("Please enter values.");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ river_level: riverLevel, rainfall: rainfall }),
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        setResult(data);
      } else {
        alert(data.message || "Prediction failed");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to connect to SatarkMitra AI Server. Ensure app.py is running on port 8000.");
    }
    setLoading(false);
  };

  return (
    <div className="card animate-fadeInUp max-w-2xl mx-auto mt-6">
      <div className="card-header">
        <h3 className="card-title flex items-center gap-2">
          <Activity className="icon text-blue-500" /> AI Prediction Core
        </h3>
        <p className="card-description">Kedarnath Specific Model (GRU + TCN + XGBoost)</p>
      </div>

      <div className="card-content">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="form-group">
            <label className="block text-sm font-medium mb-1">River Level (sq km)</label>
            <div className="flex items-center border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800">
              <Waves size={18} className="text-blue-500 mr-2" />
              <input
                type="number"
                className="w-full bg-transparent outline-none"
                placeholder="e.g. 1.5"
                value={riverLevel}
                onChange={(e) => setRiverLevel(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium mb-1">Rainfall (mm)</label>
            <div className="flex items-center border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800">
              <Droplets size={18} className="text-blue-500 mr-2" />
              <input
                type="number"
                className="w-full bg-transparent outline-none"
                placeholder="e.g. 12.0"
                value={rainfall}
                onChange={(e) => setRainfall(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handlePredict}
          disabled={loading}
          className="btn btn-primary w-full py-3 flex justify-center items-center gap-2 font-bold"
        >
          {loading ? "Analyzing Real-time Data..." : "Run Risk Analysis"}
        </button>

        {result && (
          <div className={`mt-6 p-4 rounded-lg border-l-4 shadow-sm ${result.alert_level === 'HIGH' ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'}`}>
            <div className="flex items-start gap-3">
              {result.alert_level === 'HIGH' ? <AlertTriangle className="text-red-600 h-8 w-8" /> : <Check className="text-green-600 h-8 w-8" />}
              <div>
                <h4 className={`font-bold text-lg ${result.alert_level === 'HIGH' ? 'text-red-800' : 'text-green-800'}`}>
                  {result.alert_level} RISK DETECTED
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  Location: <strong>{result.location}</strong>
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Analysis based on hybrid deep learning architecture.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- REST OF THE DASHBOARD COMPONENTS ---

// Mock data
const initialMockAlerts = [
  { id: 1, type: "critical", title: "Flash Flood Warning", location: "Mandakini River", time: "2 min ago", acknowledged: false },
  { id: 2, type: "warning", title: "Rising Water Levels", location: "Gaurikund Station", time: "15 min ago", acknowledged: true },
  { id: 3, type: "info", title: "Evacuation Route Update", location: "Route B - East", time: "1 hour ago", acknowledged: true },
];

const initialEmergencyContacts = [
  { id: 1, name: "NDRF Command Center", role: "Disaster Response", contact: "108" },
  { id: 2, name: "State Disaster Mgmt.", role: "Coordination", contact: "1070" },
  { id: 3, name: "District Control Room", role: "Local Operations", contact: "1077" },
];

const waterStations = [
  { id: "station-a", name: "Mandakini River", location: "Near Temple Bridge", currentLevel: 8.5, status: "critical", capacity: 10.0, lastUpdated: "2 min ago" },
  { id: "station-b", name: "Gaurikund Station", location: "Entry Point", currentLevel: 6.2, status: "warning", capacity: 9.0, lastUpdated: "1 min ago" },
  { id: "station-c", name: "Kedarnath Base", location: "Downstream Checkpoint", currentLevel: 4.1, status: "normal", capacity: 8.5, lastUpdated: "3 min ago" },
];

const initialProtocolsData = {
  normal: [
    { id: 'n1', text: "Monitor water levels every 6 hours.", completed: false },
    { id: 'n2', text: "Weekly check of communication systems.", completed: false },
    { id: 'n3', text: "Verify sensor battery levels.", completed: false }
  ],
  warning: [
    { id: 'w1', text: "Increase monitoring frequency to every hour.", completed: false },
    { id: 'w2', text: "Place emergency response teams on standby.", completed: false },
    { id: 'w3', text: "Broadcast SMS alert to registered locals.", completed: false }
  ],
  critical: [
    { id: 'c1', text: "Activate Emergency Operations Center (EOC).", completed: false },
    { id: 'c2', text: "Issue immediate evacuation orders.", completed: false },
    { id: 'c3', text: "Deploy NDRF teams to low-lying areas.", completed: false }
  ],
};

const nearbyResources = [
  { id: 1, name: "Govt. Primary School Shelter", location: "Rampur Village", dist: "2km", capacity: 150, current_occupancy: 45, status: "Open" },
  { id: 2, name: "Community Hall Shelter", location: "Sitapur", dist: "3km", capacity: 250, current_occupancy: 200, status: "Open" },
  { id: 3, name: "Old Temple Guesthouse", location: "Gaurikund", dist: "1.5km", capacity: 80, current_occupancy: 80, status: "Full" },
];

export default function FloodManagementApp() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentTime, setCurrentTime] = useState(null);
  const [kedarnathRisk, setKedarnathRisk] = useState(null) 

  const [alerts, setAlerts] = useState(initialMockAlerts);
  const [contacts, setContacts] = useState(initialEmergencyContacts);
  const [protocols, setProtocols] = useState(initialProtocolsData);

  // New States for Interactivity
  const [alertFilter, setAlertFilter] = useState('all'); // all, critical, warning, info
  const [calculatingRoute, setCalculatingRoute] = useState(null); // ID of resource

  const [isAddAlertModalOpen, setIsAddAlertModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);

  const [newAlert, setNewAlert] = useState({ type: 'info', title: '', location: '' });
  const [newContact, setNewContact] = useState({ name: '', role: '', contact: '' });

  const handleAddAlert = (e) => {
    e.preventDefault();
    const newAlertObject = { id: Date.now(), ...newAlert, time: 'Just now', acknowledged: false };
    setAlerts([newAlertObject, ...alerts]);
    setIsAddAlertModalOpen(false);
    setNewAlert({ type: 'info', title: '', location: '' });
  };

  const handleAddContact = (e) => {
    e.preventDefault();
    const newContactObject = { id: Date.now(), ...newContact };
    setContacts([...contacts, newContactObject]);
    setIsAddContactModalOpen(false);
    setNewContact({ name: '', role: '', contact: '' });
  };

  const toggleProtocol = (category, id) => {
    setProtocols(prev => ({
      ...prev,
      [category]: prev[category].map(p => 
        p.id === id ? { ...p, completed: !p.completed } : p
      )
    }));
  };

  const acknowledgeAlert = (id) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  const simulateRouteCalculation = (id) => {
    setCalculatingRoute(id);
    setTimeout(() => {
      setCalculatingRoute(null);
      alert("Route calculated! Directions sent to map.");
    }, 2000);
  };

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getStatusClass = (status) => {
    if (status === "critical") return "badge-destructive";
    if (status === "warning") return "badge-warning";
    return "badge-normal";
  };

  const getAlertIcon = (type) => {
    const iconClass = type === 'critical' ? 'icon-destructive' : (type === 'warning' ? 'icon-warning' : 'icon-info');
    return <AlertTriangle className={`icon ${iconClass}`} />;
  };

  const filteredAlerts = alerts.filter(a => alertFilter === 'all' || a.type === alertFilter);

  return (
    <>
      <div className="container">
        <div className="main-header">
          <h1>Kedarnath Flood Management</h1>
          <p>Real-time monitoring and emergency response dashboard</p>
          {currentTime && (
             <p className="text-sm text-gray-500 mt-1">
               {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
             </p>
          )}
        </div>

        <div className="tabs-list">
          <button className={`tab-trigger ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><MapPin /> Dashboard</button>
          <button className={`tab-trigger ${activeTab === 'water-levels' ? 'active' : ''}`} onClick={() => setActiveTab('water-levels')}><Activity /> Water Levels</button>
          <button className={`tab-trigger ${activeTab === 'prediction' ? 'active' : ''}`} onClick={() => setActiveTab('prediction')}><Shield /> AI Prediction</button>
          <button className={`tab-trigger ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}><AlertTriangle /> Alerts</button>
          <button className={`tab-trigger ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}><Phone /> Contacts</button>
          <button className={`tab-trigger ${activeTab === 'protocols' ? 'active' : ''}`} onClick={() => setActiveTab('protocols')}><ClipboardList /> Protocols</button>
          <button className={`tab-trigger ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')}><Home /> Resources</button>
        </div>

        <main>
          {activeTab === 'dashboard' && (
            <div className="dashboard-grid animate-fadeInUp">
              <div className="overview-cards">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Active Alerts</h3>
                    <AlertTriangle className="icon icon-destructive" />
                  </div>
                  <div className="card-content">
                    <p className="card-value">{alerts.length}</p>
                    <p className="card-description">Updates in real-time</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Critical Stations</h3>
                    <Activity className="icon icon-destructive" />
                  </div>
                  <div className="card-content">
                    <p className="card-value">{waterStations.filter((s) => s.status === "critical").length}</p>
                    <p className="card-description">Mandakini River reading high</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Key Contacts</h3>
                    <Phone className="icon" />
                  </div>
                  <div className="card-content">
                    <p className="card-value">{contacts.length}</p>
                    <p className="card-description">NDRF on standby</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Open Shelters</h3>
                    <Home className="icon" />
                  </div>
                  <div className="card-content">
                    <p className="card-value">{nearbyResources.filter(r => r.status === "Open").length}</p>
                    <p className="card-description">{nearbyResources.reduce((acc, r) => r.status === "Open" ? acc + r.capacity : acc, 0)} total capacity</p>
                  </div>
                </div>
              </div>
              <div className="card map-card">
                <div className="card-header">
                  <h3 className="card-title">Kedarnath Flood Risk Map</h3>
                  <p className="card-description">
                    Real‑time AI‑assessed flood risk visualization
                  </p>
                </div>

                <div className="card-content" style={{ height: "400px" }}>
                  <KedarnathLeafletMap riskData={kedarnathRisk} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'water-levels' && (
            <div className="grid-container grid-cols-3-responsive animate-fadeInUp">
              {waterStations.map(station => (
                <div key={station.id} className="card">
                  <div className="card-header">
                    <div className="flex-between">
                      <h3 className="card-title">{station.name}</h3>
                      <span className={`badge ${getStatusClass(station.status)}`}>{station.status}</span>
                    </div>
                    <p className="card-description">{station.location}</p>
                  </div>
                  <div className="card-content">
                    <div className="water-level-display">
                      <span className="level-value">{station.currentLevel}m</span>
                      <span className="level-capacity">/ {station.capacity}m</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className={`progress-bar ${getStatusClass(station.status)}`} style={{ width: `${(station.currentLevel / station.capacity) * 100}%` }}></div>
                    </div>
                    <p className="text-xs text-muted-foreground">Last updated: {station.lastUpdated}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'prediction' && (
            <div className="animate-fadeInUp">
              <div className="tab-header text-center mb-6">
                <h2>Live Flood Prediction</h2>
                <p className="text-gray-500">Real-time analysis using Hybrid Deep Learning Models</p>
              </div>
              <FloodAlertPanel />
            </div>
          )}

          {/* --- UPDATED INTERACTIVE ALERTS TAB --- */}
          {activeTab === 'alerts' && (
            <div className="animate-fadeInUp">
              <div className="tab-header flex justify-between items-center mb-4">
                <div>
                   <h2>Alert Center</h2>
                   <p className="text-gray-500">Real-time emergency broadcasts</p>
                </div>
                <div className="flex gap-2">
                   {['all', 'critical', 'warning', 'info'].map(filter => (
                      <button 
                        key={filter} 
                        onClick={() => setAlertFilter(filter)}
                        className={`px-3 py-1 rounded-full text-sm capitalize ${alertFilter === filter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                         {filter}
                      </button>
                   ))}
                </div>
                <button className="btn btn-primary ml-4" onClick={() => setIsAddAlertModalOpen(true)}>
                  <Plus size={16} /> Broadcast Alert
                </button>
              </div>

              <div className="space-y-3">
                {filteredAlerts.length === 0 && (
                   <div className="text-center py-12 text-gray-400">
                      <CheckCircle2 className="mx-auto h-12 w-12 mb-2 opacity-50" />
                      <p>No active alerts in this category.</p>
                   </div>
                )}
                {filteredAlerts.map(alert => (
                  <div key={alert.id} className={`alert ${alert.type === 'critical' ? 'alert-critical' : (alert.type === 'warning' ? 'alert-warning' : 'bg-blue-50 border-l-4 border-blue-500 text-blue-900')} shadow-sm transition-all hover:shadow-md`}>
                    <div className="flex items-start justify-between w-full">
                       <div className="flex gap-3">
                          <div className="mt-1">{getAlertIcon(alert.type)}</div>
                          <div>
                             <h3 className="font-bold text-lg">{alert.title}</h3>
                             <p className="text-sm opacity-90 flex items-center gap-2 mt-1">
                                <MapPin size={14} /> {alert.location}
                                <span className="opacity-50">•</span> 
                                {alert.time}
                             </p>
                          </div>
                       </div>
                       
                       <div className="alert-actions">
                        {alert.acknowledged ? (
                           <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider opacity-70 border px-2 py-1 rounded">
                              <Check size={12} /> Acknowledged
                           </span>
                        ) : (
                          <button onClick={() => acknowledgeAlert(alert.id)} className="btn btn-sm bg-white/80 hover:bg-white text-black text-xs px-3 py-1">
                             Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    <button className="btn btn-primary" style={{ width: '100%' }}>Call Now</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'protocols' && (
            <div className="animate-fadeInUp">
               <div className="tab-header text-center mb-8">
                  <h2>Operational Protocols</h2>
                  <p className="text-gray-500">Click on tasks to mark them as complete.</p>
               </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Normal Card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-green-200 overflow-hidden">
                   <div className="bg-green-50 dark:bg-green-900/20 p-4 border-b border-green-100 dark:border-green-800">
                      <div className="flex items-center justify-between">
                         <h3 className="font-bold text-green-800 dark:text-green-400 flex items-center gap-2">
                            <CheckCircle2 size={20} /> Normal Level
                         </h3>
                         <span className="text-xs font-semibold bg-white text-green-700 px-2 py-1 rounded-full shadow-sm">
                           {protocols.normal.filter(p => p.completed).length}/{protocols.normal.length} Done
                         </span>
                      </div>
                   </div>
                   <div className="p-4 space-y-3">
                      {protocols.normal.map((item) => (
                         <div 
                           key={item.id} 
                           onClick={() => toggleProtocol('normal', item.id)}
                           className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${item.completed ? 'bg-green-50 opacity-70' : 'hover:bg-gray-50 bg-gray-50/50'}`}
                         >
                            <div className={`mt-0.5 ${item.completed ? 'text-green-600' : 'text-gray-300'}`}>
                               {item.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                            </div>
                            <span className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                               {item.text}
                            </span>
                         </div>
                      ))}
                      <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-green-500 transition-all duration-500" 
                           style={{ width: `${(protocols.normal.filter(p => p.completed).length / protocols.normal.length) * 100}%` }}
                         ></div>
                      </div>
                   </div>
                </div>
                {/* Warning Card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-yellow-200 overflow-hidden">
                   <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 border-b border-yellow-100 dark:border-yellow-800">
                      <div className="flex items-center justify-between">
                         <h3 className="font-bold text-yellow-800 dark:text-yellow-400 flex items-center gap-2">
                            <AlertTriangle size={20} /> Warning Level
                         </h3>
                         <span className="text-xs font-semibold bg-white text-yellow-700 px-2 py-1 rounded-full shadow-sm">
                           {protocols.warning.filter(p => p.completed).length}/{protocols.warning.length} Done
                         </span>
                      </div>
                   </div>
                   <div className="p-4 space-y-3">
                      {protocols.warning.map((item) => (
                         <div 
                           key={item.id} 
                           onClick={() => toggleProtocol('warning', item.id)}
                           className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${item.completed ? 'bg-yellow-50 opacity-70' : 'hover:bg-gray-50 bg-gray-50/50'}`}
                         >
                            <div className={`mt-0.5 ${item.completed ? 'text-yellow-600' : 'text-gray-300'}`}>
                               {item.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                            </div>
                            <span className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                               {item.text}
                            </span>
                         </div>
                      ))}
                       <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-yellow-500 transition-all duration-500" 
                           style={{ width: `${(protocols.warning.filter(p => p.completed).length / protocols.warning.length) * 100}%` }}
                         ></div>
                      </div>
                   </div>
                </div>
                {/* Critical Card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-red-200 overflow-hidden">
                   <div className="bg-red-50 dark:bg-red-900/20 p-4 border-b border-red-100 dark:border-red-800">
                      <div className="flex items-center justify-between">
                         <h3 className="font-bold text-red-800 dark:text-red-400 flex items-center gap-2">
                            <Shield size={20} /> Critical Level
                         </h3>
                         <span className="text-xs font-semibold bg-white text-red-700 px-2 py-1 rounded-full shadow-sm">
                           {protocols.critical.filter(p => p.completed).length}/{protocols.critical.length} Done
                         </span>
                      </div>
                   </div>
                   <div className="p-4 space-y-3">
                      {protocols.critical.map((item) => (
                         <div 
                           key={item.id} 
                           onClick={() => toggleProtocol('critical', item.id)}
                           className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${item.completed ? 'bg-red-50 opacity-70' : 'hover:bg-gray-50 bg-gray-50/50'}`}
                         >
                            <div className={`mt-0.5 ${item.completed ? 'text-red-600' : 'text-gray-300'}`}>
                               {item.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                            </div>
                            <span className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                               {item.text}
                            </span>
                         </div>
                      ))}
                       <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-red-500 transition-all duration-500" 
                           style={{ width: `${(protocols.critical.filter(p => p.completed).length / protocols.critical.length) * 100}%` }}
                         ></div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* --- UPDATED INTERACTIVE RESOURCES TAB --- */}
          {activeTab === 'resources' && (
            <div className="animate-fadeInUp">
               <div className="tab-header text-center mb-8">
                  <h2>Safe Shelters & Resources</h2>
                  <p className="text-gray-500">Find nearest relief camps and check occupancy.</p>
               </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {nearbyResources.map(resource => {
                   const occupancyPct = (resource.current_occupancy / resource.capacity) * 100;
                   const isFull = resource.status === 'Full';
                   
                   return (
                    <div key={resource.id} className="card resource-card flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                           <h3 className="card-title text-lg">{resource.name}</h3>
                           <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded flex items-center gap-1">
                              <Navigation size={10} /> {resource.dist}
                           </span>
                        </div>
                        <p className="card-description flex items-center gap-1 mb-4">
                           <MapPin size={14} /> {resource.location}
                        </p>
                        
                        <div className="mb-4">
                           <div className="flex justify-between text-xs mb-1 text-gray-500">
                              <span>Occupancy</span>
                              <span>{resource.current_occupancy} / {resource.capacity}</span>
                           </div>
                           <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                 className={`h-full ${isFull ? 'bg-red-500' : (occupancyPct > 80 ? 'bg-yellow-500' : 'bg-green-500')}`} 
                                 style={{ width: `${occupancyPct}%` }}
                              ></div>
                           </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2 pt-4 border-t">
                        <span className={`badge ${isFull ? 'badge-destructive' : 'badge-normal'}`}>
                           {resource.status}
                        </span>
                        <button 
                           className="btn btn-primary btn-sm flex items-center gap-2"
                           onClick={() => simulateRouteCalculation(resource.id)}
                           disabled={calculatingRoute === resource.id}
                        >
                           {calculatingRoute === resource.id ? (
                              <span className="animate-pulse">Finding Path...</span>
                           ) : (
                              <> <Route size={14} /> View Path </>
                           )}
                        </button>
                      </div>
                    </div>
                   );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

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
                <input id="alert-title" type="text" value={newAlert.title} onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="alert-location">Location</label>
                <input id="alert-location" type="text" value={newAlert.location} onChange={(e) => setNewAlert({ ...newAlert, location: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="alert-type">Type</label>
                <select id="alert-type" value={newAlert.type} onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value })}>
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
                <input id="contact-name" type="text" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="contact-role">Role / Department</label>
                <input id="contact-role" type="text" value={newContact.role} onChange={(e) => setNewContact({ ...newContact, role: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="contact-number">Contact Number</label>
                <input id="contact-number" type="text" value={newContact.contact} onChange={(e) => setNewContact({ ...newContact, contact: e.target.value })} required />
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