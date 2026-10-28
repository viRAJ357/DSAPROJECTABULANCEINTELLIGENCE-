import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock, TrendingUp, Truck, Users, Zap } from 'lucide-react';
import type { Ambulance, Emergency, Hospital } from '../types';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface DashboardProps {
  emergencies: Emergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
}

const SEVERITY_COLOR = ['', '#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444'];
const TYPE_ICONS: Record<string, string> = {
  cardiac: '🫀', stroke: '🧠', respiratory: '🫁', snakebite: '🐍',
  trauma: '🩸', obstetric: '🤰', pediatric: '👶', sepsis: '🦠',
  burns: '🔥', overdose: '💊', diabetic: '💉', renal: '🫘',
  fracture: '🦴', ocular: '👁️', other: '🚑'
};

const StatCard: React.FC<{ label: string; value: string | number; sub?: string; color?: string; icon: React.ReactNode; pulse?: boolean }> = ({ label, value, sub, color = '#3b82f6', icon, pulse }) => (
  <div className="rounded-xl p-4 flex items-start gap-4 animate-slide-up" style={{ background: '#111827', border: '1px solid #1e293b' }}>
    <div className="rounded-lg p-2.5 shrink-0 relative" style={{ background: `${color}18` }}>
      <span style={{ color }}>{icon}</span>
      {pulse && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-ping" style={{ background: color, opacity: 0.7 }} />}
    </div>
    <div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm font-medium text-slate-400">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ emergencies, ambulances, hospitals }) => {
  const pending = emergencies.filter(e => e.status === 'pending');
  const dispatched = emergencies.filter(e => e.status === 'dispatched');
  const resolved = emergencies.filter(e => e.status === 'resolved');
  const available = ambulances.filter(a => a.status === 'available');

  // Build type distribution chart data
  const typeCounts: Record<string, number> = {};
  emergencies.forEach(e => { typeCounts[e.emergencyType] = (typeCounts[e.emergencyType] || 0) + 1; });
  const typeData = Object.entries(typeCounts).map(([type, count]) => ({ type: TYPE_ICONS[type] + ' ' + type, count }));

  // Severity distribution
  const sevCounts = [0, 0, 0, 0, 0, 0];
  emergencies.forEach(e => { if (e.severity >= 1 && e.severity <= 5) sevCounts[e.severity]++; });
  const sevData = [1, 2, 3, 4, 5].map(s => ({ severity: `Sev ${s}`, count: sevCounts[s], color: SEVERITY_COLOR[s] }));

  // Priority scores for top emergencies
  const topPending = [...pending].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 5);

  const totalCapacity = hospitals.reduce((s, h) => s + h.capacity, 0);
  const totalPatients = hospitals.reduce((s, h) => s + h.currentPatients, 0);
  const avgOccupancy = totalCapacity > 0 ? ((totalPatients / totalCapacity) * 100).toFixed(0) : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="rounded-lg px-3 py-2" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="text-sm font-bold text-white">{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Operations Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">Bhubaneswar Smart City Emergency Network — Real-time</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs text-emerald-400 font-medium">LIVE</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Emergencies" value={pending.length} sub="Awaiting dispatch" color="#ef4444" icon={<AlertCircle size={18} />} pulse={pending.length > 0} />
        <StatCard label="Ambulances Available" value={available.length} sub={`of ${ambulances.length} total`} color="#10b981" icon={<Truck size={18} />} />
        <StatCard label="Active Dispatches" value={dispatched.length} sub="En route" color="#3b82f6" icon={<Zap size={18} />} />
        <StatCard label="Avg Hospital Occupancy" value={`${avgOccupancy}%`} sub={`${hospitals.length} facilities`} color="#f59e0b" icon={<Activity size={18} />} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Emergency type distribution */}
        <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1e293b' }}>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Emergency Type Distribution</h3>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={typeData} margin={{ left: -20, right: 8 }}>
                <XAxis dataKey="type" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={['#3b82f6', '#ef4444', '#a855f7', '#06b6d4', '#f97316', '#10b981', '#f59e0b', '#8b5cf6'][i % 8]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-600 text-sm">No emergencies yet</div>
          )}
        </div>

        {/* Severity chart */}
        <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1e293b' }}>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Severity Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sevData} margin={{ left: -20, right: 8 }}>
              <XAxis dataKey="severity" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {sevData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hospitals + top emergencies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hospital status */}
        <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1e293b' }}>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Hospital Capacity</h3>
          <div className="space-y-3">
            {hospitals.slice(0, 5).map(h => (
              <div key={h.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400 truncate max-w-[160px]">{h.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{h.erBedsAvailable} ER beds</span>
                    <span className="text-xs font-medium" style={{ color: h.occupancyPct > 90 ? '#ef4444' : h.occupancyPct > 70 ? '#f59e0b' : '#10b981' }}>
                      {h.occupancyPct}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: '#1e293b' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${h.occupancyPct}%`,
                      background: h.occupancyPct > 90 ? '#ef4444' : h.occupancyPct > 70 ? '#f59e0b' : '#10b981'
                    }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top priority emergencies */}
        <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1e293b' }}>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Top Priority Queue</h3>
          {topPending.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
              <CheckCircle2 size={16} className="mr-2 text-emerald-500" /> No pending emergencies
            </div>
          ) : (
            <div className="space-y-2">
              {topPending.map((em, idx) => (
                <div key={em.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
                  <span className="text-base">{TYPE_ICONS[em.emergencyType]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-300 truncate">{em.locationName}</div>
                    <div className="text-xs text-slate-600">{em.waitTimeMin.toFixed(1)}m wait</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold" style={{ color: SEVERITY_COLOR[em.severity] }}>
                      P{em.priorityScore.toFixed(0)}
                    </div>
                    <div className="text-xs text-slate-600">Sev {em.severity}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ambulance fleet status */}
      <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1e293b' }}>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Fleet Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ambulances.map(amb => {
            const statusColor = { available: '#10b981', dispatched: '#f59e0b', en_route: '#3b82f6', at_scene: '#a855f7', returning: '#06b6d4', maintenance: '#6b7280' }[amb.status] || '#6b7280';
            return (
              <div key={amb.id} className="rounded-lg p-3 text-center" style={{ background: '#0f172a', border: `1px solid ${statusColor}30` }}>
                <div className="text-xl mb-1">🚑</div>
                <div className="text-xs font-medium text-slate-300 truncate">{amb.name.replace('AMB-', '')}</div>
                <div className="mt-1.5 px-1.5 py-0.5 rounded-full text-xs font-medium inline-block" style={{ background: `${statusColor}20`, color: statusColor }}>
                  {amb.status}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
