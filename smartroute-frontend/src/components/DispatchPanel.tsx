import React, { useState, useEffect } from 'react';
import {
  Activity, AlertCircle, CheckCircle2, ChevronRight,
  Filter, HeartPulse, Loader2, MapPin, Navigation,
  PlusCircle, Radio, ShieldAlert, Siren, Stethoscope,
  Truck, User, X, Zap
} from 'lucide-react';
import type { Emergency, Ambulance, Hospital, DispatchResult, HospitalRanking, PathDetail, EmergencyType } from '../types';
import {
  autoDispatch, dispatchAmbulance, resolveEmergency,
  recommendHospitals, createRandomEmergency, createEmergency
} from '../api';

const SEV_COLOR = ['', '#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444'];
const SEV_LABELS = ['', 'Level 1: Non-Urgent', 'Level 2: Semi-Urgent', 'Level 3: Urgent', 'Level 4: Emergent', 'Level 5: Immediate Resuscitation'];

export interface DiseaseInfo {
  id: EmergencyType;
  name: string;
  emoji: string;
  category: string;
  defaultSeverity: number;
  sampleDesc: string;
}

export const DISEASE_CATALOG: DiseaseInfo[] = [
  { id: 'cardiac', name: 'Cardiac Arrest / Heart Attack', emoji: '🫀', category: 'Cardiology', defaultSeverity: 5, sampleDesc: 'Crushing chest pain radiating to left jaw & arm, profuse sweating, difficulty breathing' },
  { id: 'stroke', name: 'Brain Stroke / Paralysis', emoji: '🧠', category: 'Neurology', defaultSeverity: 5, sampleDesc: 'Sudden facial droop, right-side hemiplegia, slurred speech, acute confusion' },
  { id: 'respiratory', name: 'Acute Respiratory Distress', emoji: '🫁', category: 'Pulmonology', defaultSeverity: 5, sampleDesc: 'Severe asthma exacerbation, SpO2 below 80%, stridor, inability to speak words' },
  { id: 'snakebite', name: 'Venomous Snake Bite', emoji: '🐍', category: 'Toxicology', defaultSeverity: 5, sampleDesc: 'Suspected Russell Viper / Cobra bite on lower leg, spreading neurotoxic swelling & bleeding' },
  { id: 'trauma', name: 'High-Impact Polytrauma', emoji: '🩸', category: 'Trauma', defaultSeverity: 4, sampleDesc: 'High-speed NH-16 vehicle collision, multiple lacerations, severe arterial hemorrhage' },
  { id: 'obstetric', name: 'Obstetric Emergency / Labor', emoji: '🤰', category: 'Maternity', defaultSeverity: 4, sampleDesc: 'Full term active labor, eclampsia with severe hypertension and imminent delivery' },
  { id: 'pediatric', name: 'Pediatric Seizures / Convulsions', emoji: '👶', category: 'Pediatrics', defaultSeverity: 4, sampleDesc: '2-year-old toddler continuous generalized tonic-clonic convulsions, 104°F fever' },
  { id: 'sepsis', name: 'Septic Shock / High Fever', emoji: '🦠', category: 'Critical Care', defaultSeverity: 4, sampleDesc: 'Severe bacteremic sepsis, tachycardia, systolic BP < 75 mmHg, cold clammy extremities' },
  { id: 'burns', name: 'Severe Flame / LPG Burns', emoji: '🔥', category: 'Burns', defaultSeverity: 4, sampleDesc: 'Grade 3 flame burns over thorax and upper limbs (>35% TBSA), smoke inhalation' },
  { id: 'overdose', name: 'Poisoning / Toxic Ingestion', emoji: '💊', category: 'Toxicology', defaultSeverity: 4, sampleDesc: 'Accidental organophosphate pesticide ingestion, pin-point pupils, hyper-salivation' },
  { id: 'diabetic', name: 'Diabetic Coma / Ketoacidosis', emoji: '💉', category: 'Endocrine', defaultSeverity: 3, sampleDesc: 'Severe metabolic ketoacidosis with Kussmaul breathing, unmeasurable blood glucose' },
  { id: 'renal', name: 'Acute Kidney Failure / Renal Colic', emoji: '🫘', category: 'Nephrology', defaultSeverity: 3, sampleDesc: 'Intractable acute flank colic, complete anuria for 24h, emergency dialysis needed' },
  { id: 'fracture', name: 'Compound Open Fracture', emoji: '🦴', category: 'Orthopedic', defaultSeverity: 2, sampleDesc: 'Open compound fracture of femur bone with active bleeding following fall' },
  { id: 'ocular', name: 'Eye Chemical Splash / Trauma', emoji: '👁️', category: 'Ophthalmology', defaultSeverity: 2, sampleDesc: 'Industrial corrosive acid splash directly to eyes, acute photophobia & corneal opacity' },
  { id: 'other', name: 'Acute Medical Crisis', emoji: '🚑', category: 'General', defaultSeverity: 2, sampleDesc: 'Elderly patient sudden syncope, hypotension, severe localized abdominal tenderness' },
];

const TYPE_EMOJI: Record<string, string> = Object.fromEntries(DISEASE_CATALOG.map(d => [d.id, d.emoji]));

const LOCATION_PRESETS = [
  { name: 'Jatni Gate / Khurda Road Jn', lat: 20.1740, lng: 85.7060, tag: 'Jatni' },
  { name: 'DHH Khurda / Khurda Town', lat: 20.1820, lng: 85.6230, tag: 'Khurda' },
  { name: 'Janla NH-16 Gate', lat: 20.2030, lng: 85.7320, tag: 'NH-16' },
  { name: 'Patia / KIIT Square', lat: 20.3541, lng: 85.8192, tag: 'Patia' },
  { name: 'Infocity Square', lat: 20.3592, lng: 85.8105, tag: 'Patia' },
  { name: 'Jaydev Vihar Square', lat: 20.3015, lng: 85.8248, tag: 'Central' },
  { name: 'Master Canteen Railway Station', lat: 20.2678, lng: 85.8436, tag: 'Station' },
  { name: 'Khandagiri Square', lat: 20.2568, lng: 85.7852, tag: 'Khandagiri' },
  { name: 'Esplanade One Mall (Rasulgarh)', lat: 20.2917, lng: 85.8675, tag: 'Rasulgarh' },
  { name: 'Biju Patnaik Airport', lat: 20.2530, lng: 85.8175, tag: 'Airport' },
  { name: 'Damana Square (CSPur)', lat: 20.3298, lng: 85.8210, tag: 'CSPur' },
  { name: 'AIIMS Patrapada Gate', lat: 20.2315, lng: 85.7725, tag: 'AIIMS' },
];

interface DispatchPanelProps {
  emergencies: Emergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  onDispatch: (result: DispatchResult, route: { toScene: PathDetail[]; toHospital: PathDetail[] }) => void;
  onRefresh: () => void;
}

export const DispatchPanel: React.FC<DispatchPanelProps> = ({
  emergencies, ambulances, hospitals, onDispatch, onRefresh
}) => {
  const [selected, setSelected] = useState<Emergency | null>(null);
  const [selectedAmb, setSelectedAmb] = useState('');
  const [selectedHosp, setSelectedHosp] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [rankings, setRankings] = useState<HospitalRanking[]>([]);
  const [lastResult, setLastResult] = useState<DispatchResult | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);

  // Manual Form State
  const [formLocation, setFormLocation] = useState('Jatni Gate / Khurda Road Jn');
  const [formLat, setFormLat] = useState(20.1740);
  const [formLng, setFormLng] = useState(85.7060);
  const [formDisease, setFormDisease] = useState<EmergencyType>('cardiac');
  const [formSeverity, setFormSeverity] = useState(5);
  const [formCaller, setFormCaller] = useState('Debasish Mohanty');
  const [formDesc, setFormDesc] = useState(DISEASE_CATALOG[0].sampleDesc);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const pending = emergencies.filter(e => e.status === 'pending');
  const active = emergencies.filter(e => ['dispatched', 'en_route', 'at_scene'].includes(e.status));
  const availableAmbs = ambulances.filter(a => a.status === 'available');

  useEffect(() => {
    if (selected?.nearestNodeId) {
      recommendHospitals(selected.lat, selected.lng, selected.emergencyType, selected.nearestNodeId)
        .then(r => { setRankings(r); if (r[0]) setSelectedHosp(r[0].hospitalId); })
        .catch(() => {});
    }
  }, [selected]);

  const handleDiseaseChange = (diseaseId: EmergencyType) => {
    setFormDisease(diseaseId);
    const d = DISEASE_CATALOG.find(x => x.id === diseaseId);
    if (d) {
      setFormSeverity(d.defaultSeverity);
      setFormDesc(d.sampleDesc);
    }
  };

  const handlePresetSelect = (preset: typeof LOCATION_PRESETS[0]) => {
    setFormLocation(preset.name);
    setFormLat(preset.lat);
    setFormLng(preset.lng);
  };

  const handleAutoDispatch = async (emId: string) => {
    setLoading(emId);
    try {
      const result = await autoDispatch(emId);
      setLastResult(result);
      onDispatch(result, {
        toScene: result.routeToScene?.pathDetails ?? [],
        toHospital: result.routeToHospital?.pathDetails ?? [],
      });
      onRefresh();
      setSelected(null);
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Auto-dispatch failed');
    } finally {
      setLoading(null);
    }
  };

  const handleManualDispatch = async () => {
    if (!selected || !selectedAmb || !selectedHosp) return;
    setLoading('manual');
    try {
      const result = await dispatchAmbulance(selected.id, selectedAmb, selectedHosp);
      setLastResult(result);
      onDispatch(result, {
        toScene: result.routeToScene?.pathDetails ?? [],
        toHospital: result.routeToHospital?.pathDetails ?? [],
      });
      onRefresh();
      setSelected(null);
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Dispatch failed');
    } finally {
      setLoading(null);
    }
  };

  const handleResolve = async (emId: string) => {
    setLoading(emId + '_resolve');
    try {
      await resolveEmergency(emId);
      onRefresh();
    } catch {}
    setLoading(null);
  };

  const handleCreateRandom = async () => {
    setLoading('random');
    try {
      await createRandomEmergency();
      onRefresh();
    } catch {}
    setLoading(null);
  };

  const handleCreateManualEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('create');
    try {
      await createEmergency({
        location_name: formLocation,
        lat: Number(formLat),
        lng: Number(formLng),
        emergency_type: formDisease,
        severity: Number(formSeverity),
        caller_name: formCaller,
        description: formDesc,
      });
      onRefresh();
      setShowManualModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Emergency creation failed');
    } finally {
      setLoading(null);
    }
  };

  const categories = ['All', ...Array.from(new Set(DISEASE_CATALOG.map(d => d.category)))];
  const filteredDiseases = selectedCategory === 'All'
    ? DISEASE_CATALOG
    : DISEASE_CATALOG.filter(d => d.category === selectedCategory);

  return (
    <div className="h-full flex flex-col lg:flex-row gap-0 overflow-hidden relative">
      {/* Left: Emergency Priority Queue */}
      <div className="w-full lg:w-84 shrink-0 max-h-[40vh] lg:max-h-full lg:h-full overflow-y-auto flex flex-col" style={{ borderRight: '1px solid #1a2540', borderBottom: '1px solid #1a2540' }}>
        <div className="p-4 shrink-0" style={{ borderBottom: '1px solid #1a2540' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Siren size={16} className="text-red-400" />
              <span>Priority Max-Heap Queue</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: pending.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(30,41,59,0.5)',
                color: pending.length > 0 ? '#f87171' : '#64748b'
              }}>
              {pending.length} Pending
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowManualModal(true)}
              className="flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff' }}
            >
              <PlusCircle size={14} />
              Manual Emergency Entry
            </button>
            <button
              onClick={handleCreateRandom}
              disabled={loading === 'random'}
              className="py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all"
              style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}
            >
              {loading === 'random' ? <Loader2 size={13} className="spin" /> : <Zap size={13} />}
              Simulate
            </button>
          </div>
        </div>

        {/* Pending Emergency List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {pending.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <CheckCircle2 size={32} className="text-emerald-500 mb-2 opacity-80" />
              <span className="text-sm font-medium">All emergencies resolved</span>
              <span className="text-xs text-slate-600 mt-1">Click "Manual Emergency Entry" above</span>
            </div>
          )}

          {[...pending].sort((a, b) => b.priorityScore - a.priorityScore).map(em => (
            <button
              key={em.id}
              onClick={() => setSelected(em)}
              className="w-full text-left p-3 rounded-xl transition-all"
              style={{
                background: selected?.id === em.id ? 'rgba(59,130,246,0.14)' : '#111827',
                border: `1px solid ${selected?.id === em.id ? 'rgba(59,130,246,0.4)' : '#1e293b'}`,
              }}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xl shrink-0 p-1 rounded-lg" style={{ background: '#0a0d16' }}>
                  {TYPE_EMOJI[em.emergencyType] || '🆘'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: SEV_COLOR[em.severity] }}>
                      {em.emergencyType}
                    </span>
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                      P{em.priorityScore.toFixed(0)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 font-medium truncate mt-0.5">{em.locationName}</div>
                  <div className="flex items-center gap-3 mt-1 text-slate-500 text-xs">
                    <span style={{ color: SEV_COLOR[em.severity] }}>Sev {em.severity}/5</span>
                    <span>⏱ {em.waitTimeMin.toFixed(1)}m</span>
                    <span className="font-mono">#{em.id}</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 w-full h-1 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                <div className="h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (em.priorityScore / 130) * 100)}%`,
                    background: SEV_COLOR[em.severity]
                  }} />
              </div>
            </button>
          ))}

          {/* Active Dispatches */}
          {active.length > 0 && (
            <div className="pt-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                Active En-Route Corridors ({active.length})
              </div>
              {active.map(em => (
                <div key={em.id} className="p-3 rounded-xl mb-2" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <span>{TYPE_EMOJI[em.emergencyType] || '🚑'}</span>
                      <span className="uppercase">{em.emergencyType}</span>
                    </span>
                    <button
                      onClick={() => handleResolve(em.id)}
                      disabled={!!loading}
                      className="text-xs px-2.5 py-1 rounded-md font-semibold transition-all hover:brightness-125"
                      style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}
                    >
                      {loading === em.id + '_resolve' ? '...' : 'Mark Resolved'}
                    </button>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 truncate">{em.locationName}</div>
                  {em.assignedAmbulanceId && (
                    <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                      <Truck size={11} />
                      <span>AMB-{em.assignedAmbulanceId} assigned</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Dispatch Decision Engine */}
      <div className="flex-1 h-full overflow-y-auto p-6 space-y-5">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <Radio size={44} className="mb-3 text-slate-700 opacity-60" />
            <p className="text-base font-semibold text-slate-400">Select an Emergency Case from the Queue</p>
            <p className="text-xs text-slate-600 mt-1 max-w-sm text-center">
              Click any pending case on the left or click "Manual Emergency Entry" to simulate any medical crisis in Bhubaneswar / Khurda / Jatni.
            </p>
          </div>
        ) : (
          <>
            {/* Selected Case Clinical Card */}
            <div className="rounded-xl p-5" style={{ background: '#111827', border: `1px solid ${SEV_COLOR[selected.severity]}50` }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="text-4xl p-2 rounded-xl" style={{ background: '#0a0d16', border: '1px solid #1e293b' }}>
                    {TYPE_EMOJI[selected.emergencyType] || '🆘'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white capitalize">{selected.emergencyType} Emergency</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${SEV_COLOR[selected.severity]}25`, color: SEV_COLOR[selected.severity] }}>
                        Severity {selected.severity}/5
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin size={12} className="text-red-400" />
                      <span>{selected.locationName}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono text-blue-400">P{selected.priorityScore.toFixed(0)}</div>
                  <div className="text-xs text-slate-500">Max-Heap Dynamic Urgency</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4" style={{ borderTop: '1px solid #1e293b' }}>
                <div className="p-2.5 rounded-lg" style={{ background: '#0a0d16' }}>
                  <div className="text-xs text-slate-500">Caller Name</div>
                  <div className="text-sm font-semibold text-slate-200 mt-0.5">{selected.callerName}</div>
                </div>
                <div className="p-2.5 rounded-lg" style={{ background: '#0a0d16' }}>
                  <div className="text-xs text-slate-500">Wait Duration</div>
                  <div className="text-sm font-semibold text-slate-200 mt-0.5">{selected.waitTimeMin.toFixed(1)} mins</div>
                </div>
                <div className="p-2.5 rounded-lg" style={{ background: '#0a0d16' }}>
                  <div className="text-xs text-slate-500">Nearest Node</div>
                  <div className="text-sm font-semibold text-slate-200 mt-0.5 font-mono">{selected.nearestNodeId || 'Calculating...'}</div>
                </div>
                <div className="p-2.5 rounded-lg" style={{ background: '#0a0d16' }}>
                  <div className="text-xs text-slate-500">Incident ID</div>
                  <div className="text-sm font-semibold text-slate-200 mt-0.5 font-mono">#{selected.id}</div>
                </div>
              </div>

              <div className="mt-3 p-3 rounded-lg flex items-start gap-2" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
                <Stethoscope size={15} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-relaxed italic">{selected.description}</p>
              </div>
            </div>

            {/* AI Auto-Dispatch Action */}
            <button
              onClick={() => handleAutoDispatch(selected.id)}
              disabled={!!loading}
              className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2.5 transition-all shadow-lg hover:brightness-110 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
                boxShadow: '0 0 25px rgba(59,130,246,0.3)'
              }}
            >
              {loading === selected.id ? <Loader2 size={18} className="spin" /> : <Zap size={18} className="text-amber-300" />}
              <span>Auto-Dispatch AI Optimal Ambulance & Hospital</span>
            </button>

            {/* Manual Dispatch Selection Matrix */}
            <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
              <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Navigation size={16} className="text-blue-400" />
                <span>Manual Dispatch Override Console</span>
              </h4>

              <div className="space-y-4">
                {/* Ambulance Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                    1. Select Ambulance Unit ({availableAmbs.length} Available)
                  </label>
                  <select
                    value={selectedAmb}
                    onChange={e => setSelectedAmb(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-slate-200 outline-none transition-all"
                    style={{ background: '#0a0d16', border: '1px solid #1e293b' }}
                  >
                    <option value="">-- Choose Ambulance Unit --</option>
                    {availableAmbs.map(a => (
                      <option key={a.id} value={a.id}>
                        🚑 {a.name} (Crew: {a.crewCount}, Level {a.equipmentLevel} ALS)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ranked Hospital Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                    2. Select Destination Hospital (Ranked by Multi-Constraint Algorithm)
                  </label>

                  {rankings.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      {rankings.map((r, idx) => (
                        <button
                          key={r.hospitalId}
                          type="button"
                          onClick={() => setSelectedHosp(r.hospitalId)}
                          className="w-full text-left p-3 rounded-xl transition-all"
                          style={{
                            background: selectedHosp === r.hospitalId ? 'rgba(59,130,246,0.14)' : '#0a0d16',
                            border: `1px solid ${selectedHosp === r.hospitalId ? 'rgba(59,130,246,0.45)' : '#1e293b'}`,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                                style={{
                                  background: idx === 0 ? '#10b981' : '#1e293b',
                                  color: idx === 0 ? '#fff' : '#94a3b8'
                                }}>
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-200">{r.hospitalName}</span>
                              {r.specialtyMatch && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(168,85,247,0.18)', color: '#c084fc' }}>
                                  ✓ Clinical Specialty Match
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              {(r.score * 100).toFixed(0)} pts
                            </span>
                          </div>

                          <div className="flex gap-4 mt-2 text-xs text-slate-400 pl-7">
                            <span className="flex items-center gap-1 font-medium text-slate-300">
                              ⏱ ETA: {r.travelTimeMin.toFixed(1)} mins
                            </span>
                            <span>🛏 {r.availableBeds} beds available</span>
                            <span>📊 {r.occupancyPct}% occupancy</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 p-3 rounded-lg" style={{ background: '#0a0d16' }}>
                      Calculating Dijkstra shortest travel-times and bed capacity scores...
                    </div>
                  )}
                </div>

                {/* Dispatch Button */}
                <button
                  onClick={handleManualDispatch}
                  disabled={!selectedAmb || !selectedHosp || loading === 'manual'}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  style={{ background: 'rgba(16,185,129,0.18)', color: '#34d399', border: '1px solid rgba(16,185,129,0.35)' }}
                >
                  {loading === 'manual' ? <Loader2 size={16} className="spin" /> : <Navigation size={16} />}
                  <span>Execute Selected Corridor Dispatch</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Last Dispatch Result Receipt */}
        {lastResult && (
          <div className="rounded-xl p-4 animate-slide-up" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-sm font-bold text-emerald-400">Emergency Corridor Activated</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-3">
              <div className="p-2 rounded-lg" style={{ background: '#111827' }}>
                <span className="text-slate-500 block">Ambulance</span>
                <span className="font-bold text-slate-200 mt-0.5 block">{lastResult.ambulanceId}</span>
              </div>
              <div className="p-2 rounded-lg" style={{ background: '#111827' }}>
                <span className="text-slate-500 block">Hospital</span>
                <span className="font-bold text-slate-200 mt-0.5 block">{lastResult.hospitalId}</span>
              </div>
              <div className="p-2 rounded-lg" style={{ background: '#111827' }}>
                <span className="text-slate-500 block">Total Combined ETA</span>
                <span className="font-bold text-emerald-400 mt-0.5 block">{lastResult.totalEtaMin.toFixed(1)} mins</span>
              </div>
              <div className="p-2 rounded-lg" style={{ background: '#111827' }}>
                <span className="text-slate-500 block">Routing Algorithm</span>
                <span className="font-bold text-blue-400 mt-0.5 block">{lastResult.routeToScene?.algorithm || 'A*'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MANUAL EMERGENCY ENTRY MODAL ─── */}
      {showManualModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl animate-slide-up"
            style={{ background: '#0f172a', border: '1px solid #1e3a5f' }}>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ef4444, #7c3aed)' }}>
                  <ShieldAlert size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Manual Emergency Incident Intake</h3>
                  <p className="text-xs text-slate-400">Configure patient condition, location, and clinical severity</p>
                </div>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateManualEmergency} className="space-y-5 mt-5">
              {/* 1. Location Selection & Presets */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  1. Incident Location (Bhubaneswar / Khurda / Jatni)
                </label>
                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {LOCATION_PRESETS.map(p => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handlePresetSelect(p)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                      style={{
                        background: formLocation === p.name ? '#2563eb' : '#1e293b',
                        color: formLocation === p.name ? '#fff' : '#94a3b8',
                        border: `1px solid ${formLocation === p.name ? '#3b82f6' : '#334155'}`
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={formLocation}
                      onChange={e => setFormLocation(e.target.value)}
                      placeholder="Location Landmark / Square Name"
                      required
                      className="w-full px-3 py-2 rounded-lg text-xs text-slate-200 outline-none"
                      style={{ background: '#0a0d16', border: '1px solid #1e293b' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.0001"
                      value={formLat}
                      onChange={e => setFormLat(+e.target.value)}
                      placeholder="Latitude"
                      required
                      className="w-1/2 px-2.5 py-2 rounded-lg text-xs font-mono text-slate-200 outline-none"
                      style={{ background: '#0a0d16', border: '1px solid #1e293b' }}
                    />
                    <input
                      type="number"
                      step="0.0001"
                      value={formLng}
                      onChange={e => setFormLng(+e.target.value)}
                      placeholder="Longitude"
                      required
                      className="w-1/2 px-2.5 py-2 rounded-lg text-xs font-mono text-slate-200 outline-none"
                      style={{ background: '#0a0d16', border: '1px solid #1e293b' }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Disease / Medical Condition Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    2. Medical Disease / Clinical Condition (15 Types)
                  </label>
                  {/* Category Filter */}
                  <div className="flex gap-1 overflow-x-auto">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          background: selectedCategory === cat ? 'rgba(59,130,246,0.2)' : 'transparent',
                          color: selectedCategory === cat ? '#60a5fa' : '#64748b'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Disease Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredDiseases.map(d => {
                    const isSelected = formDisease === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleDiseaseChange(d.id)}
                        className="p-2.5 rounded-xl text-left transition-all flex items-start gap-2"
                        style={{
                          background: isSelected ? 'rgba(59,130,246,0.18)' : '#0a0d16',
                          border: `1px solid ${isSelected ? '#3b82f6' : '#1e293b'}`
                        }}
                      >
                        <span className="text-xl shrink-0">{d.emoji}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate" style={{ color: isSelected ? '#93c5fd' : '#cbd5e1' }}>
                            {d.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">{d.category}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Severity Level (1 - 5) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    3. Severity Level: <span style={{ color: SEV_COLOR[formSeverity] }}>{formSeverity} / 5</span>
                  </label>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${SEV_COLOR[formSeverity]}20`, color: SEV_COLOR[formSeverity] }}>
                    {SEV_LABELS[formSeverity]}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={formSeverity}
                  onChange={e => setFormSeverity(+e.target.value)}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1 (Minor / Green)</span>
                  <span>2 (Yellow)</span>
                  <span>3 (Urgent)</span>
                  <span>4 (Emergent)</span>
                  <span className="text-red-400 font-bold">5 (Resuscitation / Red)</span>
                </div>
              </div>

              {/* 4. Caller & Symptom Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Caller / Attendant Name
                  </label>
                  <input
                    type="text"
                    value={formCaller}
                    onChange={e => setFormCaller(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg text-xs text-slate-200 outline-none"
                    style={{ background: '#0a0d16', border: '1px solid #1e293b' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Clinical Symptoms / Description
                  </label>
                  <textarea
                    rows={2}
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg text-xs text-slate-200 outline-none resize-none"
                    style={{ background: '#0a0d16', border: '1px solid #1e293b' }}
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading === 'create'}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)' }}
                >
                  {loading === 'create' ? <Loader2 size={14} className="spin" /> : <PlusCircle size={14} />}
                  <span>Push to Priority Queue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
