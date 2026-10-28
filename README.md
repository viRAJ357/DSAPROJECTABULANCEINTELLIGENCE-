# 🚑 SmartRoute — Intelligent Emergency Response System

> **A real-world DSA-driven emergency corridor and dispatch optimization platform** built for placement interviews, resumes, and high-impact portfolio showcases.

---

## 🌟 Overview

In emergency medical situations, every second counts. **SmartRoute** models city road networks as dynamic weighted graphs and uses classical Data Structures & Algorithms (Dijkstra, A*, Max-Heaps, Priority Queues, Greedy Optimization) to solve:
1. **Dynamic Shortest Route Calculation** under traffic and road closures.
2. **Prioritized Emergency Dispatch** balancing severity, wait times, and emergency types.
3. **Multi-Constraint Hospital Recommendation** considering bed occupancy, trauma capability, and travel time.
4. **Live Algorithm Benchmarking** comparing Dijkstra vs. A* time/space complexity and visited node count.

---

## 🧠 Core Data Structures & Algorithms (Interview Ready)

| DSA Concept | Real-World Application in SmartRoute | Time Complexity | Space Complexity |
|---|---|---|---|
| **Graph (Adjacency List)** | Road network topology (Intersections, Hospitals, Stations) | Lookups: $O(1)$ | $O(V + E)$ |
| **Dijkstra's Algorithm** | Guaranteed optimal shortest-time route across non-negative road weights | $O((V + E) \log V)$ | $O(V)$ |
| **A\* Search Algorithm** | Heuristic-guided route finding using Haversine distance as admissible heuristic | $O(E \log V)$ avg | $O(V)$ |
| **Priority Queue (Max-Heap)** | Dynamic urgency ranking: $\text{Score} = \text{Base} + (\text{Sev} \times 10) + (\text{Wait} \times 2)$ | Push/Pop: $O(\log N)$ | $O(N)$ |
| **Greedy Dispatch** | Assigns nearest available non-blocked ambulance to highest priority emergency | $O(K \log K)$ | $O(K)$ |
| **Multi-Factor Scoring** | Hospital recommendation weighted by travel time, bed capacity, and specialty | $O(H)$ | $O(H)$ |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   React + TypeScript UI                     │
│  - Interactive Leaflet Map (Dark Cyberpunk Theme)           │
│  - Real-time WebSockets & Toast Alerts                      │
│  - Recharts Performance Graphs & Heatmaps                   │
│  - Multi-tab Console: Dashboard, Map, Dispatch, DSA Lab     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / WebSocket (:8000)
┌──────────────────────────────▼──────────────────────────────┐
│                    Python Backend Server                    │
│  - REST API Endpoints (/api/route, /api/dispatch, etc.)     │
│  - Real-Time Event Broadcaster (WebSockets)                 │
│  - Simulation & Stress-Test Engine                          │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      DSA Engine Core                        │
│  ├── graph.py            (CityGraph, Node, Weighted Edges)  │
│  ├── algorithms.py       (Dijkstra, A*, Path Benchmarking)  │
│  ├── emergency_queue.py  (Max-Heap Priority Queue)          │
│  ├── dispatch.py         (Greedy Selection & Scoring)       │
│  ├── city_data.py        (Bhubaneswar Smart City Topology)  │
│  └── simulation.py       (Stress Testing Engine)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Run the Project

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### 1. Start the Backend
Open a terminal in the project directory:
```powershell
cd smartroute-backend
.\venv\Scripts\python main.py
```
> Backend runs at `http://localhost:8000`

### 2. Start the Frontend
Open a second terminal:
```powershell
cd smartroute-frontend
npm run dev
```
> Frontend dev server runs at `http://localhost:5173`

---

## 🎯 Key Application Modules

1. **📊 Operations Dashboard**
   - Real-time stat cards: Pending emergencies, Available ambulances, Hospital occupancy.
   - Interactive bar charts for severity distribution and case type categorization.
   - Live fleet health indicator.

2. **🗺️ Live Emergency Map**
   - Interactive OpenStreetMap with dark aesthetic.
   - Custom markers for ambulances, hospitals, and emergency hotspots.
   - City road graph overlay showing road connection weights.
   - Live visual route tracing: Ambulance $\rightarrow$ Emergency Scene $\rightarrow$ Assigned Hospital.

3. **📡 Dispatch Console**
   - Live Max-Heap emergency queue with priority ranking.
   - **One-Click Auto Dispatch**: Evaluates nearest vehicle + optimal hospital.
   - Manual override with multi-factor hospital recommendation table.
   - Create custom emergencies or generate random incidents on demand.

4. **⚗️ DSA Performance Lab**
   - Side-by-side execution of Dijkstra vs. A* between any two nodes.
   - Real metrics: Execution time ($\mu s$), Nodes visited, Cost, Route comparison.
   - Interactive charts showing A* efficiency gains (typically 30–50% fewer nodes visited).
   - In-depth theoretical complexity cheat sheet for interviewers.

5. **🎲 Simulation Engine**
   - Run stress tests with 5 to 50 concurrent emergencies.
   - Evaluates system scalability, queue stability, and algorithmic performance at scale.
   - Per-test scatter and line graphs of computation time vs. graph density.

---

## 💼 Resume Description (Copy-Paste Ready)

> **SmartRoute — Intelligent Emergency Response System** | *Python, React, TypeScript, DSA, WebSockets*
> - Engineered an emergency routing & dispatch engine modeling city roads as dynamic directed graphs with live traffic and roadblock weight adjustments.
> - Implemented **Dijkstra's** and **A\*** search algorithms with Haversine distance heuristics, achieving a **~40% reduction in nodes visited** during pathfinding benchmark tests.
> - Developed a **Max-Heap Priority Queue** for triage prioritization balancing clinical severity, emergency type, and waiting time penalties.
> - Built a real-time reactive dashboard with Leaflet maps, WebSockets, and interactive performance analytics for multi-vehicle corridor tracking.

---

## 🎤 Top Interview Talking Points

1. **Why A\* over Dijkstra for emergency dispatch?**
   - *Answer:* Dijkstra explores outwards uniformly in all directions ($O((V+E)\log V)$). A* incorporates an admissible Euclidean/Haversine heuristic $h(n)$ guiding the search directly toward the target destination, resulting in significantly fewer node expansions while guaranteeing the optimal route.

2. **How does the Priority Queue avoid starvation for lower-severity emergencies?**
   - *Answer:* Urgency isn't static. The formula includes a wait-time multiplier: $\text{Priority} = \text{Base} + (\text{Severity} \times 10) + (\text{WaitMinutes} \times 2)$. Over time, an older minor case increases in score and gets serviced, preventing starvation.

3. **How are dynamic road conditions handled?**
   - *Answer:* Graph edges maintain variable weights: $\text{Weight} = \left(\frac{\text{Distance}}{\text{Speed}}\right) \times \text{TrafficMultiplier}$. When traffic spikes or a road is blocked, edge weights update dynamically in $O(1)$ and trigger route recalculation.
