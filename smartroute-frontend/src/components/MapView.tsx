import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Ambulance, Emergency, Hospital, CityGraph, DispatchResult, PathDetail } from '../types';
import { autoDispatch, calculateRoute, updateTraffic, blockRoad } from '../api';
import { AlertCircle, Loader2, Navigation, Zap } from 'lucide-react';

// Fix Leaflet default icon issue in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const makeIcon = (emoji: string, color: string, size = 32) => {
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;background:${color};
      border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      border:2px solid rgba(255,255,255,0.3);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 10px ${color}80;
    ">
      <span style="transform:rotate(45deg);font-size:${size * 0.45}px;">${emoji}</span>
    </div>`,
    className: '',
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

const AMBULANCE_ICON = (status: string) => {
  const color = { available: '#10b981', dispatched: '#f59e0b', en_route: '#3b82f6', at_scene: '#a855f7', returning: '#06b6d4', maintenance: '#6b7280' }[status] || '#6b7280';
  return makeIcon('🚑', color, 36);
};

const HOSPITAL_ICON = (occupancy: number) => {
  const color = occupancy > 90 ? '#ef4444' : occupancy > 70 ? '#f59e0b' : '#10b981';
  return makeIcon('🏥', color, 36);
};

const EMERGENCY_ICON = (severity: number) => {
  const colors = ['', '#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444'];
  return makeIcon('🆘', colors[severity] || '#ef4444', 40);
};

const SEVERITY_COLOR = ['', '#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444'];
const TYPE_EMOJI: Record<string, string> = {
  cardiac: '🫀', stroke: '🧠', respiratory: '🫁', snakebite: '🐍',
  trauma: '🩸', obstetric: '🤰', pediatric: '👶', sepsis: '🦠',
  burns: '🔥', overdose: '💊', diabetic: '💉', renal: '🫘',
  fracture: '🦴', ocular: '👁️', other: '🚑'
};

interface MapViewProps {
  emergencies: Emergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  cityGraph: CityGraph | null;
  activeRoute: { toScene: PathDetail[]; toHospital: PathDetail[] } | null;
  onEmergencyDispatch: () => void;
}

export const MapView: React.FC<MapViewProps> = ({
  emergencies, ambulances, hospitals, cityGraph, activeRoute, onEmergencyDispatch
}) => {
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAutoDispatch = async (emergencyId: string) => {
    setDispatching(emergencyId);
    try {
      const result = await autoDispatch(emergencyId);
      onEmergencyDispatch();
      showToast(`✅ Dispatched! ETA: ${result.totalEtaMin.toFixed(1)} min`);
    } catch (e: any) {
      showToast(`❌ ${e?.response?.data?.detail || 'Dispatch failed'}`);
    } finally {
      setDispatching(null);
    }
  };

  const pending = emergencies.filter(e => e.status === 'pending');
  const active = emergencies.filter(e => !['resolved', 'cancelled'].includes(e.status));

  // Build graph edge polylines
  const graphEdges = cityGraph?.edges.slice(0, 60) ?? [];

  return (
    <div className="h-full flex flex-col relative">
      {/* Map toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 shrink-0" style={{ background: '#0a0d16', borderBottom: '1px solid #1a2540' }}>
        <span className="text-xs font-semibold text-slate-400 mr-1">MAP LAYERS</span>
        {[
          { label: 'Road Graph', active: showGraph, toggle: () => setShowGraph(v => !v) },
          { label: 'Routes', active: showRoute, toggle: () => setShowRoute(v => !v) },
        ].map(btn => (
          <button key={btn.label} onClick={btn.toggle}
            className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
            style={{ background: btn.active ? 'rgba(59,130,246,0.15)' : 'rgba(30,41,59,0.5)', color: btn.active ? '#60a5fa' : '#64748b', border: `1px solid ${btn.active ? 'rgba(59,130,246,0.3)' : '#1e293b'}` }}>
            {btn.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Available</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Dispatched</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Emergency</span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-lg text-sm font-medium shadow-xl animate-slide-up"
          style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}>
          {toast}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[20.2961, 85.8245]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />

          {/* City road graph overlay */}
          {showGraph && cityGraph && graphEdges.map((edge, i) => {
            const fromNode = cityGraph.nodes.find(n => n.id === edge.from);
            const toNode = cityGraph.nodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;
            const color = edge.blocked ? '#ef4444' : edge.traffic > 1.5 ? '#f59e0b' : '#1e40af';
            return (
              <Polyline key={i}
                positions={[[fromNode.lat, fromNode.lng], [toNode.lat, toNode.lng]]}
                pathOptions={{ color, weight: edge.blocked ? 3 : 1.5, opacity: edge.blocked ? 0.9 : 0.4, dashArray: edge.blocked ? '6,4' : undefined }}
              />
            );
          })}

          {/* Graph nodes */}
          {showGraph && cityGraph?.nodes.filter(n => n.type === 'intersection').map(node => (
            <CircleMarker key={node.id}
              center={[node.lat, node.lng]}
              radius={3}
              pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.8, weight: 1 }}>
              <Popup className="leaflet-popup-dark">
                <div style={{ background: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: '8px 12px', minWidth: 140 }}>
                  <div className="font-semibold text-sm">{node.name}</div>
                  <div className="text-xs text-slate-400 mt-1">{node.id}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Active dispatch route */}
          {showRoute && activeRoute?.toScene && activeRoute.toScene.length > 1 && (
            <Polyline
              positions={activeRoute.toScene.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: '#10b981', weight: 4, opacity: 0.9, dashArray: '12,6' }}
            />
          )}
          {showRoute && activeRoute?.toHospital && activeRoute.toHospital.length > 1 && (
            <Polyline
              positions={activeRoute.toHospital.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.9, dashArray: '12,6' }}
            />
          )}

          {/* Hospitals */}
          {hospitals.map(h => (
            <Marker key={h.id} position={[h.lat, h.lng]} icon={HOSPITAL_ICON(h.occupancyPct)}>
              <Popup>
                <div style={{ background: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: '10px 14px', minWidth: 200 }}>
                  <div className="font-bold text-sm text-emerald-400">🏥 {h.name}</div>
                  <div className="mt-2 space-y-1 text-xs text-slate-300">
                    <div>ER Beds: <span className="text-white font-medium">{h.erBedsAvailable}</span></div>
                    <div>Occupancy: <span className="font-medium" style={{ color: h.occupancyPct > 85 ? '#ef4444' : '#10b981' }}>{h.occupancyPct}%</span></div>
                    <div>Specialties: <span className="text-slate-400">{h.specialties.join(', ') || 'General'}</span></div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Ambulances */}
          {ambulances.map(amb => (
            <Marker key={amb.id} position={[amb.lat, amb.lng]} icon={AMBULANCE_ICON(amb.status)}>
              <Popup>
                <div style={{ background: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: '10px 14px', minWidth: 180 }}>
                  <div className="font-bold text-sm text-blue-400">🚑 {amb.name}</div>
                  <div className="mt-1.5 text-xs space-y-1 text-slate-300">
                    <div>Status: <span className="font-medium capitalize">{amb.status}</span></div>
                    <div>Equipment: <span className="font-medium">Level {amb.equipmentLevel}</span></div>
                    <div>Crew: <span className="font-medium">{amb.crewCount} members</span></div>
                    {amb.assignedEmergencyId && <div className="text-amber-400">→ Case #{amb.assignedEmergencyId}</div>}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Emergencies */}
          {active.map(em => (
            <Marker key={em.id} position={[em.lat, em.lng]} icon={EMERGENCY_ICON(em.severity)}>
              <Popup>
                <div style={{ background: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: '10px 14px', minWidth: 220 }}>
                  <div className="font-bold text-sm" style={{ color: SEVERITY_COLOR[em.severity] }}>
                    {TYPE_EMOJI[em.emergencyType]} {em.emergencyType.toUpperCase()}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{em.locationName}</div>
                  <div className="mt-2 space-y-1 text-xs text-slate-300">
                    <div>Severity: <span className="font-bold" style={{ color: SEVERITY_COLOR[em.severity] }}>{em.severity}/5</span></div>
                    <div>Caller: {em.callerName}</div>
                    <div>Wait: {em.waitTimeMin.toFixed(1)} min</div>
                    <div>Priority Score: <span className="text-blue-400 font-bold">{em.priorityScore.toFixed(0)}</span></div>
                    <div>Status: <span className="capitalize">{em.status}</span></div>
                  </div>
                  {em.status === 'pending' && (
                    <button
                      onClick={() => handleAutoDispatch(em.id)}
                      disabled={dispatching === em.id}
                      className="mt-3 w-full py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5"
                      style={{ background: '#1d4ed8', color: '#fff' }}
                    >
                      {dispatching === em.id ? <Loader2 size={12} className="spin" /> : <Zap size={12} />}
                      Auto Dispatch
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Map legend */}
        <div className="absolute bottom-4 right-4 z-[9998] rounded-xl p-3 space-y-2" style={{ background: 'rgba(10,13,22,0.9)', border: '1px solid #1a2540', backdropFilter: 'blur(8px)' }}>
          <div className="text-xs font-semibold text-slate-400 mb-2">LEGEND</div>
          {[
            { color: '#10b981', label: 'Route to Scene' },
            { color: '#3b82f6', label: 'Route to Hospital', dashed: true },
            { color: '#1e40af', label: 'City Roads', light: true },
            { color: '#f59e0b', label: 'Heavy Traffic' },
            { color: '#ef4444', label: 'Road Blocked', dashed: true },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-6 h-0.5 rounded" style={{ opacity: item.light ? 0.5 : 1, borderTop: item.dashed ? `2px dashed ${item.color}` : undefined, background: item.dashed ? 'transparent' : item.color }} />
              <span className="text-xs text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
