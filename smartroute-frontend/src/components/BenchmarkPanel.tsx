import React, { useState } from 'react';
import { BarChart2, Cpu, Loader2, Play, TrendingDown, Zap } from 'lucide-react';
import type { BenchmarkResult, CityGraph } from '../types';
import { runBenchmark } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell
} from 'recharts';

interface BenchmarkPanelProps {
  cityGraph: CityGraph | null;
}

const NODE_OPTIONS = [
  { id: 'n_khurda_dhh', name: 'DHH Khurda / Khurda Town' },
  { id: 'n_jatni', name: 'Jatni Gate / Khurda Road Jn' },
  { id: 'n_janla', name: 'Janla NH16 Gate' },
  { id: 'n_patia_kiit', name: 'Patia / KIIT Square' },
  { id: 'n_infocity', name: 'Infocity Square' },
  { id: 'n_damana', name: 'Damana Square (CSPur)' },
  { id: 'n_jaydev_vihar', name: 'Jaydev Vihar Square' },
  { id: 'n_kalinga_stadium', name: 'Kalinga Stadium' },
  { id: 'n_acharya_vihar', name: 'Acharya Vihar Square' },
  { id: 'n_vani_vihar', name: 'Vani Vihar Square' },
  { id: 'n_rasulgarh', name: 'Rasulgarh Square (NH16)' },
  { id: 'n_saheed_nagar', name: 'Saheed Nagar' },
  { id: 'n_master_canteen', name: 'Master Canteen (Station)' },
  { id: 'n_kalpana', name: 'Kalpana Square (Old Town)' },
  { id: 'n_ag_square', name: 'AG Square / Secretariat' },
  { id: 'n_crpf', name: 'CRPF Square' },
  { id: 'n_fire_station', name: 'Fire Station (Baramunda)' },
  { id: 'n_khandagiri', name: 'Khandagiri Square' },
  { id: 'n_kalinga_nagar', name: 'Kalinga Nagar Square' },
  { id: 'n_sum_hosp', name: 'SUM Hospital Junction' },
  { id: 'n_aiims_bbsr', name: 'AIIMS Bhubaneswar' },
  { id: 'n_tamando', name: 'Tamando NH16 Junction' },
  { id: 'n_airport', name: 'Biju Patnaik Airport' },
  { id: 'n_apollo', name: 'Apollo Hospitals' },
  { id: 'n_kalinga', name: 'Kalinga Hospital' },
  { id: 'n_capital_hosp', name: 'Capital Hospital (Unit-6)' },
  { id: 'n_amri_khandagiri', name: 'AMRI Khandagiri' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg px-3 py-2" style={{ background: '#1e293b', border: '1px solid #334155' }}>
        <p className="text-xs text-slate-400">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="text-sm font-bold" style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

const MetricCard: React.FC<{ label: string; dijkstra: string | number; astar: string | number; unit?: string; higherIsBetter?: boolean }> = ({ label, dijkstra, astar, unit = '', higherIsBetter = false }) => {
  const dNum = typeof dijkstra === 'number' ? dijkstra : parseFloat(String(dijkstra));
  const aNum = typeof astar === 'number' ? astar : parseFloat(String(astar));
  const astarWins = higherIsBetter ? aNum > dNum : aNum < dNum;
  return (
    <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1e293b' }}>
      <div className="text-xs text-slate-500 mb-3">{label}</div>
      <div className="flex gap-3">
        <div className="flex-1 p-2.5 rounded-lg text-center" style={{ background: !astarWins ? 'rgba(59,130,246,0.1)' : '#0f172a', border: `1px solid ${!astarWins ? 'rgba(59,130,246,0.3)' : '#1e293b'}` }}>
          <div className="text-xs text-slate-500 mb-1">Dijkstra</div>
          <div className="text-lg font-bold" style={{ color: !astarWins ? '#60a5fa' : '#64748b' }}>{dijkstra}{unit}</div>
          {!astarWins && <div className="text-xs text-blue-400 mt-0.5">WINNER</div>}
        </div>
        <div className="flex-1 p-2.5 rounded-lg text-center" style={{ background: astarWins ? 'rgba(16,185,129,0.1)' : '#0f172a', border: `1px solid ${astarWins ? 'rgba(16,185,129,0.3)' : '#1e293b'}` }}>
          <div className="text-xs text-slate-500 mb-1">A*</div>
          <div className="text-lg font-bold" style={{ color: astarWins ? '#34d399' : '#64748b' }}>{astar}{unit}</div>
          {astarWins && <div className="text-xs text-emerald-400 mt-0.5">WINNER</div>}
        </div>
      </div>
    </div>
  );
};

export const BenchmarkPanel: React.FC<BenchmarkPanelProps> = ({ cityGraph }) => {
  const [fromNode, setFromNode] = useState('n_patia_kiit');
  const [toNode, setToNode] = useState('n_aiims_bbsr');
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      const r = await runBenchmark(fromNode, toNode) as BenchmarkResult;
      setResult(r);
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Benchmark failed');
    } finally {
      setLoading(false);
    }
  };

  const chartData = result ? [
    { metric: 'Nodes Visited', dijkstra: result.comparison.dijkstra_nodes, astar: result.comparison.astar_nodes },
    { metric: 'Comp. Time (μs)', dijkstra: Math.round(result.comparison.dijkstra_time_ms * 1000), astar: Math.round(result.comparison.astar_time_ms * 1000) },
  ] : [];

  const pathChartData = result?.dijkstra && result?.astar ? [
    { name: 'Dijkstra', cost: result.dijkstra.totalCost, dist: result.dijkstra.totalDistance, nodes: result.dijkstra.nodesVisited, time: result.dijkstra.computationTimeMs },
    { name: 'A*', cost: result.astar.totalCost, dist: result.astar.totalDistance, nodes: result.astar.nodesVisited, time: result.astar.computationTimeMs },
  ] : [];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Cpu size={20} className="text-blue-400" /> DSA Performance Lab</h2>
        <p className="text-sm text-slate-500 mt-1">Compare Dijkstra's Algorithm vs A* — nodes visited, computation time, route quality</p>
      </div>

      {/* Config panel */}
      <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Configure Benchmark</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Start Node</label>
            <select value={fromNode} onChange={e => setFromNode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-200 outline-none"
              style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
              {NODE_OPTIONS.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">End Node</label>
            <select value={toNode} onChange={e => setToNode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-200 outline-none"
              style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
              {NODE_OPTIONS.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleRun} disabled={loading || fromNode === toNode}
          className="mt-4 px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', color: '#fff' }}>
          {loading ? <Loader2 size={15} className="spin" /> : <Play size={15} />}
          {loading ? 'Running...' : 'Run Benchmark'}
        </button>
      </div>

      {result && (
        <>
          {/* Winner banner */}
          <div className="rounded-xl p-4 flex items-center gap-4"
            style={{
              background: result.comparison.efficiency_gain_pct > 0 ? 'rgba(16,185,129,0.08)' : 'rgba(59,130,246,0.08)',
              border: `1px solid ${result.comparison.efficiency_gain_pct > 0 ? 'rgba(16,185,129,0.25)' : 'rgba(59,130,246,0.25)'}`,
            }}>
            <div className="text-3xl">{result.comparison.efficiency_gain_pct > 0 ? '🏆' : '⚖️'}</div>
            <div>
              <div className="font-bold text-white">
                {result.comparison.efficiency_gain_pct > 0
                  ? `A* wins — ${result.comparison.efficiency_gain_pct}% fewer nodes explored`
                  : 'Both algorithms found the same optimal path'}
              </div>
              <div className="text-sm text-slate-400 mt-0.5">
                Same optimal path: {result.comparison.same_optimal_path ? '✅ Yes' : '❌ No'} —
                Nodes saved: {result.comparison.nodes_saved} —
                A* heuristic: Haversine distance
              </div>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Nodes Visited" dijkstra={result.comparison.dijkstra_nodes} astar={result.comparison.astar_nodes} />
            <MetricCard label="Computation Time" dijkstra={result.comparison.dijkstra_time_ms.toFixed(3)} astar={result.comparison.astar_time_ms.toFixed(3)} unit=" ms" />
            <MetricCard label="Total Route Cost" dijkstra={result.dijkstra?.totalCost.toFixed(2) ?? '—'} astar={result.astar?.totalCost.toFixed(2) ?? '—'} unit=" min" />
            <MetricCard label="Distance" dijkstra={result.dijkstra?.totalDistance.toFixed(2) ?? '—'} astar={result.astar?.totalDistance.toFixed(2) ?? '—'} unit=" km" />
          </div>

          {/* Bar chart comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1e293b' }}>
              <h4 className="text-sm font-semibold text-slate-300 mb-4">Nodes Visited & Computation Time</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ left: -20, right: 8 }}>
                  <XAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="dijkstra" name="Dijkstra" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="astar" name="A*" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Path details side by side */}
            <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1e293b' }}>
              <h4 className="text-sm font-semibold text-slate-300 mb-4">Path Comparison</h4>
              <div className="grid grid-cols-2 gap-3">
                {(['dijkstra', 'astar'] as const).map(algo => {
                  const r = result[algo];
                  if (!r) return null;
                  return (
                    <div key={algo} className="rounded-lg p-3" style={{ background: '#0f172a', border: `1px solid ${algo === 'astar' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)'}` }}>
                      <div className="text-xs font-bold mb-2" style={{ color: algo === 'astar' ? '#34d399' : '#60a5fa' }}>
                        {algo === 'astar' ? 'A* Algorithm' : "Dijkstra's"}
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-400">
                        <div>Path length: <span className="text-slate-200 font-medium">{r.path.length} nodes</span></div>
                        <div>Travel time: <span className="text-slate-200 font-medium">{r.totalCost.toFixed(2)} min</span></div>
                        <div>Distance: <span className="text-slate-200 font-medium">{r.totalDistance.toFixed(2)} km</span></div>
                        <div>Comp. time: <span className="text-slate-200 font-medium">{r.computationTimeMs.toFixed(3)} ms</span></div>
                      </div>
                      <div className="mt-3">
                        <div className="text-xs text-slate-500 mb-1">Route:</div>
                        <div className="flex flex-wrap gap-1">
                          {r.pathDetails.map((p, i) => (
                            <span key={p.id} className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#1e293b', color: '#94a3b8' }}>
                              {p.name.split(' ').slice(0, 2).join(' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Complexity info */}
          <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
            <h4 className="text-sm font-semibold text-slate-300 mb-4">📚 Time & Space Complexity</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  name: "Dijkstra's Algorithm", color: '#3b82f6',
                  time: 'O((V + E) log V)', space: 'O(V)',
                  desc: 'Explores all nodes within reach. Guaranteed optimal for non-negative weights.',
                  pros: ['Always finds shortest path', 'Works for all graphs', 'Simple implementation'],
                  cons: ['Explores too many nodes', 'No directional guidance', 'Slower on large graphs']
                },
                {
                  name: 'A* Algorithm', color: '#10b981',
                  time: 'O(E log V) avg', space: 'O(V)',
                  desc: 'Uses heuristic h(n) to guide search toward goal. Optimal with admissible heuristic.',
                  pros: ['Fewer nodes explored', 'Faster in practice', 'Same optimal result'],
                  cons: ['Needs good heuristic', 'Complex implementation', 'Memory intensive']
                }
              ].map(algo => (
                <div key={algo.name} className="p-4 rounded-lg" style={{ background: '#0f172a', border: `1px solid ${algo.color}30` }}>
                  <div className="font-bold text-sm mb-2" style={{ color: algo.color }}>{algo.name}</div>
                  <div className="text-xs text-slate-400 mb-3">{algo.desc}</div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="p-2 rounded" style={{ background: '#111827' }}>
                      <div className="text-xs text-slate-500">Time</div>
                      <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">{algo.time}</div>
                    </div>
                    <div className="p-2 rounded" style={{ background: '#111827' }}>
                      <div className="text-xs text-slate-500">Space</div>
                      <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">{algo.space}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-emerald-400 mb-1">✅ Pros</div>
                    {algo.pros.map(p => <div key={p} className="text-xs text-slate-400">• {p}</div>)}
                  </div>
                  <div className="mt-2">
                    <div className="text-xs text-red-400 mb-1">⚠️ Cons</div>
                    {algo.cons.map(c => <div key={c} className="text-xs text-slate-400">• {c}</div>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
          <BarChart2 size={48} className="mb-3 text-slate-700" />
          <p className="text-base font-medium">Configure and run a benchmark</p>
          <p className="text-sm mt-1">Compare Dijkstra vs A* on any two nodes in the city graph</p>
        </div>
      )}
    </div>
  );
};
