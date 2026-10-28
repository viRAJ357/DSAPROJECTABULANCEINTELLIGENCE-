// API Types matching backend models

export interface GraphNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'intersection' | 'hospital' | 'ambulance_station' | 'emergency';
}

export interface GraphEdge {
  from: string;
  to: string;
  distance: number;
  travel_time: number;
  traffic: number;
  blocked: boolean;
}

export interface CityGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type EmergencyType =
  | 'cardiac' | 'stroke' | 'respiratory' | 'snakebite' | 'trauma'
  | 'obstetric' | 'pediatric' | 'sepsis' | 'burns' | 'overdose'
  | 'diabetic' | 'renal' | 'fracture' | 'ocular' | 'other';

export type EmergencyStatus =
  | 'pending' | 'dispatched' | 'en_route' | 'arrived' | 'resolved' | 'cancelled';

export interface Emergency {
  id: string;
  lat: number;
  lng: number;
  locationName: string;
  emergencyType: EmergencyType;
  severity: number;
  callerName: string;
  description: string;
  createdAt: number;
  status: EmergencyStatus;
  assignedAmbulanceId: string | null;
  assignedHospitalId: string | null;
  nearestNodeId: string | null;
  waitTimeMin: number;
  priorityScore: number;
}

export type AmbulanceStatus =
  | 'available' | 'dispatched' | 'en_route' | 'at_scene' | 'returning' | 'maintenance';

export interface Ambulance {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: AmbulanceStatus;
  assignedEmergencyId: string | null;
  nearestNodeId: string | null;
  crewCount: number;
  equipmentLevel: number;
}

export interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  nearestNodeId: string;
  capacity: number;
  currentPatients: number;
  availableBeds: number;
  occupancyPct: number;
  specialties: string[];
  erBedsAvailable: number;
  traumaTeamAvailable: boolean;
}

export interface PathDetail {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  cumulative_time: number;
}

export interface PathResult {
  path: string[];
  totalCost: number;
  totalDistance: number;
  nodesVisited: number;
  computationTimeMs: number;
  algorithm: string;
  pathDetails: PathDetail[];
}

export interface BenchmarkResult {
  dijkstra: PathResult | null;
  astar: PathResult | null;
  comparison: {
    dijkstra_nodes: number;
    astar_nodes: number;
    nodes_saved: number;
    efficiency_gain_pct: number;
    dijkstra_time_ms: number;
    astar_time_ms: number;
    same_optimal_path: boolean;
  };
}

export interface HospitalRanking {
  hospitalId: string;
  hospitalName: string;
  score: number;
  travelTimeMin: number;
  availableBeds: number;
  occupancyPct: number;
  specialtyMatch: boolean;
  lat: number;
  lng: number;
  nearestNodeId: string;
}

export interface DispatchResult {
  emergencyId: string;
  ambulanceId: string;
  hospitalId: string;
  routeToScene: PathResult | null;
  routeToHospital: PathResult | null;
  totalEtaMin: number;
  dispatchedAt: number;
}

export interface StressTestResult {
  summary: {
    totalTests: number;
    dijkstra: { avgTimeMs: number; avgNodesVisited: number; totalTimeMs: number };
    astar: { avgTimeMs: number; avgNodesVisited: number; totalTimeMs: number };
    astarEfficiencyGainPct: number;
  };
  perTestResults: Array<{
    emergency: string;
    hospital: string;
    dijkstra_ms: number | null;
    astar_ms: number | null;
    dijkstra_nodes: number | null;
    astar_nodes: number | null;
    dijkstra_cost: number | null;
    astar_cost: number | null;
  }>;
}

export interface WSMessage {
  event: string;
  [key: string]: unknown;
}

export type ActivePanel = 'dashboard' | 'map' | 'dispatch' | 'benchmark' | 'simulation';
