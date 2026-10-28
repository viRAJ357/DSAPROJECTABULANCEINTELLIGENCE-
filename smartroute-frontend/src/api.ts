import axios from 'axios';
import type {
  CityGraph, Emergency, Ambulance, Hospital,
  PathResult, BenchmarkResult, HospitalRanking,
  DispatchResult, StressTestResult
} from './types';

const api = axios.create({ baseURL: '/api' });

// ── Graph ──────────────────────────────────────────────────────────────────
export const getGraph = () => api.get<CityGraph>('/graph').then(r => r.data);

export const calculateRoute = (fromNode: string, toNode: string, algorithm: 'dijkstra' | 'astar' | 'both' = 'both') =>
  api.post<BenchmarkResult | PathResult>('/route', { from_node: fromNode, to_node: toNode, algorithm }).then(r => r.data);

export const updateTraffic = (fromNode: string, toNode: string, multiplier: number) =>
  api.post('/traffic', { from_node: fromNode, to_node: toNode, multiplier }).then(r => r.data);

export const blockRoad = (fromNode: string, toNode: string, blocked: boolean) =>
  api.post('/road/block', { from_node: fromNode, to_node: toNode, blocked }).then(r => r.data);

// ── Emergencies ────────────────────────────────────────────────────────────
export const getEmergencies = () => api.get<Emergency[]>('/emergencies').then(r => r.data);
export const getPendingEmergencies = () => api.get<Emergency[]>('/emergencies/pending').then(r => r.data);
export const createRandomEmergency = () => api.post<Emergency>('/emergency/random').then(r => r.data);
export const createEmergency = (data: {
  lat: number; lng: number; location_name: string;
  emergency_type: string; severity: number; caller_name: string; description: string;
}) => api.post<Emergency>('/emergency', data).then(r => r.data);

// ── Ambulances ─────────────────────────────────────────────────────────────
export const getAmbulances = () => api.get<Ambulance[]>('/ambulances').then(r => r.data);
export const getAvailableAmbulances = () => api.get<Ambulance[]>('/ambulances/available').then(r => r.data);

// ── Hospitals ──────────────────────────────────────────────────────────────
export const getHospitals = () => api.get<Hospital[]>('/hospitals').then(r => r.data);
export const recommendHospitals = (lat: number, lng: number, type: string, fromNode?: string) =>
  api.post<HospitalRanking[]>('/hospitals/recommend', { lat, lng, type, from_node: fromNode }).then(r => r.data);

// ── Dispatch ───────────────────────────────────────────────────────────────
export const dispatchAmbulance = (emergencyId: string, ambulanceId: string, hospitalId: string) =>
  api.post<DispatchResult>('/dispatch', { emergency_id: emergencyId, ambulance_id: ambulanceId, hospital_id: hospitalId }).then(r => r.data);

export const autoDispatch = (emergencyId: string) =>
  api.post<DispatchResult>(`/auto-dispatch/${emergencyId}`).then(r => r.data);

export const resolveEmergency = (emergencyId: string) =>
  api.post(`/resolve/${emergencyId}`).then(r => r.data);

// ── Benchmark ──────────────────────────────────────────────────────────────
export const runBenchmark = (fromNode: string, toNode: string) =>
  api.post<BenchmarkResult>('/benchmark', { from_node: fromNode, to_node: toNode }).then(r => r.data);

export const runStressTest = (n: number) =>
  api.post<StressTestResult>('/stress-test', { n }).then(r => r.data);

export const getHealth = () => api.get('/health').then(r => r.data);

// ── WebSocket ──────────────────────────────────────────────────────────────
export const createWebSocket = (onMessage: (data: unknown) => void): WebSocket => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); } catch {}
  };
  // Keep-alive ping
  const ping = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    } else {
      clearInterval(ping);
    }
  }, 25000);
  return ws;
};
