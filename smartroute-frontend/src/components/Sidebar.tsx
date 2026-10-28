import React from 'react';
import {
  Activity, BarChart3, Cpu, Globe,
  Map, Radio, Shield, Siren,
  ChevronRight, Wifi, WifiOff, X
} from 'lucide-react';
import type { ActivePanel } from '../types';

interface NavItem {
  id: ActivePanel;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Activity size={18} />, description: 'System overview' },
  { id: 'map', label: 'Live Map', icon: <Map size={18} />, description: 'Real-time city view' },
  { id: 'dispatch', label: 'Dispatch', icon: <Radio size={18} />, description: 'Emergency management' },
  { id: 'benchmark', label: 'DSA Lab', icon: <Cpu size={18} />, description: 'Algorithm analysis' },
  { id: 'simulation', label: 'Simulation', icon: <BarChart3 size={18} />, description: 'Stress testing' },
];

interface SidebarProps {
  activePanel: ActivePanel;
  onPanelChange: (panel: ActivePanel) => void;
  connected: boolean;
  pendingCount: number;
  availableAmbulances: number;
  totalAmbulances: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePanel, onPanelChange, connected,
  pendingCount, availableAmbulances,
  isOpen = false, onClose
}) => {
  const handleItemClick = (id: ActivePanel) => {
    onPanelChange(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 h-screen flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        style={{ background: '#0a0d16', borderRight: '1px solid #1a2540' }}
      >
        {/* Logo & Close Button for mobile */}
        <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)' }}>
                <Siren size={18} className="text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">SmartRoute</h1>
              <p className="text-xs text-slate-500">Emergency Response AI</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white md:hidden"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Connection status */}
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg flex items-center gap-2"
          style={{
            background: connected ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${connected ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
          }}
        >
          {connected ? <Wifi size={13} className="text-emerald-400" /> : <WifiOff size={13} className="text-red-400" />}
          <span className="text-xs font-medium" style={{ color: connected ? '#10b981' : '#ef4444' }}>
            {connected ? 'Live Feed Connected' : 'Reconnecting...'}
          </span>
        </div>

        {/* Quick stats badges */}
        <div className="grid grid-cols-2 gap-2 mx-4 mt-3">
          <div className="rounded-lg p-2.5 text-center"
            style={{
              background: pendingCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(15,23,42,0.8)',
              border: `1px solid ${pendingCount > 0 ? 'rgba(239,68,68,0.3)' : '#1e293b'}`
            }}
          >
            <div className="text-lg font-bold" style={{ color: pendingCount > 0 ? '#f87171' : '#94a3b8' }}>
              {pendingCount}
            </div>
            <div className="text-xs text-slate-500">Pending Triage</div>
          </div>
          <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e293b' }}>
            <div className="text-lg font-bold text-emerald-400">{availableAmbulances}</div>
            <div className="text-xs text-slate-500">Fleet Units</div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 mt-4 space-y-1.5 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Navigation</p>
          {NAV_ITEMS.map((item) => {
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative"
                style={{
                  background: isActive ? 'rgba(59,130,246,0.14)' : 'transparent',
                  border: isActive ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                }}
              >
                <span style={{ color: isActive ? '#60a5fa' : '#64748b' }} className="group-hover:text-blue-400 transition-colors">
                  {item.icon}
                </span>
                <div className="text-left flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: isActive ? '#e2e8f0' : '#94a3b8' }}>
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{item.description}</div>
                </div>
                {isActive && <ChevronRight size={14} className="text-blue-400 shrink-0" />}
                {item.id === 'dispatch' && pendingCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold shrink-0">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3.5 border-t border-slate-800/60 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Shield size={12} className="text-blue-500" />
            <span>SmartRoute v1.0 • DSA Ready</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <Globe size={12} className="text-blue-500" />
            <span>Bhubaneswar Smart City Network</span>
          </div>
        </div>
      </aside>
    </>
  );
};
