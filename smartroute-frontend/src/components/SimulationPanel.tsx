import React, { useState } from 'react';
import { Activity, BarChart2, Loader2, Play, Zap } from 'lucide-react';
import type { StressTestResult } from '../types';
import { runStressTest } from '../api';
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg px-3 py-2" style={{ background: '#1e293b', border: '1px solid #334155' }}>
        <p className="text-xs text-slate-400">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-bold" style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export const SimulationPanel: React.FC = () => {
  const [n, setN] = useState(15);
  const [result, setResult] = useState<StressTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      const r = await runStressTest(n);
      setResult(r);
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Stress test failed');
    } finally {
      setLoading(false);
    }
  };

  // Per-test chart data
  const perTestData = result?.perTestResults?.slice(0, 30).map((t, i) => ({
    test: i + 1,
    dijkstra_ms: t.dijkstra_ms ?? 0,
    astar_ms: t.astar_ms ?? 0,
    dijkstra_nodes: t.dijkstra_nodes ?? 0,
    astar_nodes: t.astar_nodes ?? 0,
    cost: t.dijkstra_cost ?? 0,
  })) ?? [];

  const summaryBar = result ? [
    { metric: 'Avg Time (ms)', dijkstra: result.summary.dijkstra.avgTimeMs, astar: result.summary.astar.avgTimeMs },
    { metric: 'Avg Nodes', dijkstra: result.summary.dijkstra.avgNodesVisited, astar: result.summary.astar.avgNodesVisited },
  ] : [];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity size={20} className="text-purple-400" /> Simulation Engine
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Stress-test the dispatch system with N random emergencies — benchmark Dijkstra vs A* at scale
        </p>
      </div>

      {/* Config */}
      <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Simulation Configuration</h3>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-2 block">
              Number of Emergencies: <span className="text-white font-bold">{n}</span>
            </label>
            <input type="range" min={5} max={50} value={n} onChange={e => setN(+e.target.value)}
              className="w-full accent-purple-500" />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>5 (fast)</span><span>25 (balanced)</span><span>50 (thorough)</span>
            </div>
          </div>
          <button onClick={handleRun} disabled={loading}
            className="px-8 py-3 rounded-lg font-bold text-sm flex items-center gap-2 shrink-0 transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', boxShadow: '0 0 20px rgba(168,85,247,0.3)' }}>
            {loading ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
            {loading ? 'Simulating...' : 'Run Simulation'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
          <Loader2 size={16} className="spin text-purple-400" />
          <span className="text-sm text-purple-300">Running {n} emergency simulations across Bhubaneswar Smart City graph...</span>
        </div>
      )}

      {result && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Tests', value: result.summary.totalTests, color: '#a855f7' },
              { label: 'A* Efficiency Gain', value: `${result.summary.astarEfficiencyGainPct}%`, color: '#10b981' },
              { label: 'Dijkstra Avg Nodes', value: result.summary.dijkstra.avgNodesVisited.toFixed(1), color: '#3b82f6' },
              { label: 'A* Avg Nodes', value: result.summary.astar.avgNodesVisited.toFixed(1), color: '#34d399' },
            ].map(card => (
              <div key={card.label} className="rounded-xl p-4" style={{ background: '#111827', border: `1px solid ${card.color}30` }}>
                <div className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</div>
                <div className="text-xs text-slate-500 mt-1">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Summary bar chart */}
          <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1e293b' }}>
            <h4 className="text-sm font-semibold text-slate-300 mb-4">Average Performance Comparison</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={summaryBar} margin={{ left: -20, right: 8 }}>
                <XAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="dijkstra" name="Dijkstra" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="astar" name="A*" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Per-test line chart */}
          <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1e293b' }}>
            <h4 className="text-sm font-semibold text-slate-300 mb-4">Per-Test: Nodes Visited Over Time</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={perTestData} margin={{ left: -20, right: 8 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3,3" />
                <XAxis dataKey="test" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'Test #', position: 'insideBottom', offset: -2, fill: '#475569', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="dijkstra_nodes" name="Dijkstra Nodes" stroke="#3b82f6" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="astar_nodes" name="A* Nodes" stroke="#10b981" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Computation time chart */}
          <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1e293b' }}>
            <h4 className="text-sm font-semibold text-slate-300 mb-4">Per-Test: Computation Time (ms)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={perTestData} margin={{ left: -20, right: 8 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3,3" />
                <XAxis dataKey="test" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="dijkstra_ms" name="Dijkstra ms" stroke="#3b82f6" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="astar_ms" name="A* ms" stroke="#10b981" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Route cost per test */}
          <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1e293b' }}>
            <h4 className="text-sm font-semibold text-slate-300 mb-4">Route Cost Distribution (min)</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={perTestData} margin={{ left: -20, right: 8 }}>
                <XAxis dataKey="test" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cost" name="Route Cost (min)" radius={[2, 2, 0, 0]}>
                  {perTestData.map((_, i) => <Cell key={i} fill={`hsl(${200 + i * 5}, 70%, 50%)`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Raw data table (first 10) */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e293b' }}>
            <div className="px-4 py-3" style={{ background: '#111827', borderBottom: '1px solid #1e293b' }}>
              <h4 className="text-sm font-semibold text-slate-300">Raw Test Results (first {Math.min(10, result.perTestResults.length)})</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    {['#', 'Emergency', 'Hospital', 'D. Time(ms)', 'A* Time(ms)', 'D. Nodes', 'A* Nodes', 'D. Cost', 'A* Cost'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-slate-500 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.perTestResults.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: '#1e293b' }}>
                      <td className="px-3 py-2 text-slate-600">{i + 1}</td>
                      <td className="px-3 py-2 text-slate-400 font-mono">{row.emergency}</td>
                      <td className="px-3 py-2 text-slate-400 font-mono">{row.hospital}</td>
                      <td className="px-3 py-2 text-blue-400">{row.dijkstra_ms?.toFixed(3) ?? '—'}</td>
                      <td className="px-3 py-2 text-emerald-400">{row.astar_ms?.toFixed(3) ?? '—'}</td>
                      <td className="px-3 py-2 text-blue-400">{row.dijkstra_nodes ?? '—'}</td>
                      <td className="px-3 py-2 text-emerald-400">{row.astar_nodes ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-300">{row.dijkstra_cost?.toFixed(2) ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-300">{row.astar_cost?.toFixed(2) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
          <BarChart2 size={48} className="mb-3 text-slate-700" />
          <p className="text-base font-medium">Run a simulation to see results</p>
          <p className="text-sm mt-1">Choose N emergencies and click Run Simulation</p>
        </div>
      )}
    </div>
  );
};
