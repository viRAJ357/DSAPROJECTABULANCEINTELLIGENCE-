import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { MapView } from './components/MapView';
import { DispatchPanel } from './components/DispatchPanel';
import { BenchmarkPanel } from './components/BenchmarkPanel';
import { SimulationPanel } from './components/SimulationPanel';
import { useWebSocket } from './hooks/useWebSocket';
import type { Emergency, Ambulance, Hospital, CityGraph, DispatchResult, PathDetail, WSMessage, ActivePanel } from './types';
import { getEmergencies, getAmbulances, getHospitals, getGraph } from './api';
import { Bell, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface Notification { id: string; msg: string; type: 'emergency' | 'dispatch' | 'resolve'; time: Date }

function App() {
  const [activePanel, setActivePanel] = useState<ActivePanel>('dashboard');
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [cityGraph, setCityGraph] = useState<CityGraph | null>(null);
  const [activeRoute, setActiveRoute] = useState<{ toScene: PathDetail[]; toHospital: PathDetail[] } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((msg: string, type: Notification['type']) => {
    const n: Notification = { id: Date.now().toString(), msg, type, time: new Date() };
    setNotifications(prev => [n, ...prev.slice(0, 4)]);
    setTimeout(() => setNotifications(prev => prev.filter(x => x.id !== n.id)), 5000);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [ems, ambs, hosps] = await Promise.all([getEmergencies(), getAmbulances(), getHospitals()]);
      setEmergencies(ems);
      setAmbulances(ambs);
      setHospitals(hosps);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAll();
    getGraph().then(setCityGraph).catch(() => {});
  }, [fetchAll]);

  const handleWsMessage = useCallback((msg: WSMessage) => {
    if (msg.event === 'initial_state') {
      if (Array.isArray(msg.emergencies)) setEmergencies(msg.emergencies as Emergency[]);
      if (Array.isArray(msg.ambulances)) setAmbulances(msg.ambulances as Ambulance[]);
      if (Array.isArray(msg.hospitals)) setHospitals(msg.hospitals as Hospital[]);
    } else if (msg.event === 'new_emergency') {
      const em = msg.emergency as Emergency;
      setEmergencies(prev => {
        const idx = prev.findIndex(e => e.id === em.id);
        return idx >= 0 ? prev.map((e, i) => i === idx ? em : e) : [...prev, em];
      });
      addNotification(`🆘 New ${em.emergencyType} emergency at ${em.locationName}`, 'emergency');
    } else if (msg.event === 'dispatch') {
      addNotification(`🚑 Dispatched AMB-${msg.ambulanceId} to emergency #${msg.emergencyId}`, 'dispatch');
      fetchAll();
    } else if (msg.event === 'resolved') {
      addNotification(`✅ Emergency #${msg.emergencyId} resolved`, 'resolve');
      fetchAll();
    } else if (msg.event === 'traffic_update' || msg.event === 'road_block') {
      // Refresh graph
      getGraph().then(setCityGraph).catch(() => {});
    }
  }, [fetchAll, addNotification]);

  const { connected } = useWebSocket({ onMessage: handleWsMessage });

  const pending = emergencies.filter(e => e.status === 'pending');
  const available = ambulances.filter(a => a.status === 'available');

  const handleDispatch = (result: DispatchResult, route: { toScene: PathDetail[]; toHospital: PathDetail[] }) => {
    setActiveRoute(route);
    setActivePanel('map');
    fetchAll();
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden grid-lines" style={{ background: '#0a0e1a' }}>
      <Sidebar
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        connected={connected}
        pendingCount={pending.length}
        availableAmbulances={available.length}
        totalAmbulances={ambulances.length}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 h-full overflow-hidden flex flex-col relative min-w-0">
        {/* Top bar */}
        <header className="h-12 shrink-0 flex items-center justify-between px-3 sm:px-5" style={{ background: '#0a0d16', borderBottom: '1px solid #1a2540' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden shrink-0"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
              {activePanel === 'dashboard' && '📊 Operations Dashboard'}
              {activePanel === 'map' && '🗺️ Live Emergency Map'}
              {activePanel === 'dispatch' && '📡 Dispatch Console'}
              {activePanel === 'benchmark' && '⚗️ DSA Performance Lab'}
              {activePanel === 'simulation' && '🎲 Simulation Engine'}
            </span>
            {activePanel === 'map' && activeRoute && (
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
                Active Route
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={fetchAll} className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-800">
              ↺ Refresh
            </button>
            <Bell size={15} className="text-slate-500" />
          </div>
        </header>

        {/* Panel content with Framer Motion transitions */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel}
              initial={{ opacity: 0, y: 10, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="h-full w-full overflow-hidden"
            >
              {activePanel === 'dashboard' && (
                <Dashboard emergencies={emergencies} ambulances={ambulances} hospitals={hospitals} />
              )}
              {activePanel === 'map' && (
                <MapView
                  emergencies={emergencies}
                  ambulances={ambulances}
                  hospitals={hospitals}
                  cityGraph={cityGraph}
                  activeRoute={activeRoute}
                  onEmergencyDispatch={fetchAll}
                />
              )}
              {activePanel === 'dispatch' && (
                <DispatchPanel
                  emergencies={emergencies}
                  ambulances={ambulances}
                  hospitals={hospitals}
                  onDispatch={handleDispatch}
                  onRefresh={fetchAll}
                />
              )}
              {activePanel === 'benchmark' && (
                <BenchmarkPanel cityGraph={cityGraph} />
              )}
              {activePanel === 'simulation' && (
                <SimulationPanel />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Notification toasts */}
      <div className="fixed bottom-4 right-4 z-[9999] space-y-2 w-80">
        {notifications.map(n => (
          <div key={n.id} className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl animate-slide-right"
            style={{
              background: n.type === 'emergency' ? 'rgba(239,68,68,0.1)' : n.type === 'dispatch' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
              border: `1px solid ${n.type === 'emergency' ? 'rgba(239,68,68,0.3)' : n.type === 'dispatch' ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)'}`,
              backdropFilter: 'blur(8px)',
            }}>
            <div className="flex-1 text-xs text-slate-200 leading-relaxed">{n.msg}</div>
            <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}>
              <X size={12} className="text-slate-500 hover:text-slate-300" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
