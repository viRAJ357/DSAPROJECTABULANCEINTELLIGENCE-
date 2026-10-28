"""
Simulation Engine — generates realistic emergency scenarios
and runs stress tests to compare dispatch strategies.
"""

import asyncio
import math
import random
import time
import uuid
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Callable
from .emergency_queue import Emergency, EmergencyType, EmergencyStatus, EmergencyPriorityQueue
from .algorithms import dijkstra, astar
from .dispatch import DispatchEngine


EMERGENCY_SCENARIOS = [
    {"type": EmergencyType.CARDIAC, "severity": 5, "desc": "Acute Myocardial Infarction / Severe chest pain radiating to left arm"},
    {"type": EmergencyType.STROKE, "severity": 5, "desc": "Cerebrovascular Accident / Sudden facial drooping & slurred speech"},
    {"type": EmergencyType.RESPIRATORY, "severity": 5, "desc": "Acute Respiratory Distress / Severe bronchospasm & hypoxia"},
    {"type": EmergencyType.SNAKEBITE, "severity": 5, "desc": "Venomous Snake Bite (Russell's Viper/Cobra) / Neurotoxic swelling"},
    {"type": EmergencyType.TRAUMA, "severity": 4, "desc": "NH-16 High-speed road collision / Multiple trauma & severe bleeding"},
    {"type": EmergencyType.OBSTETRIC, "severity": 4, "desc": "Active Labor Emergency / Eclampsia with high BP complications"},
    {"type": EmergencyType.PEDIATRIC, "severity": 4, "desc": "Infant High Febrile Seizures & unresponsiveness"},
    {"type": EmergencyType.SEPSIS, "severity": 4, "desc": "Septic Shock / Extremely high fever and dangerously low blood pressure"},
    {"type": EmergencyType.BURNS, "severity": 4, "desc": "Electrical / LPG Cylinder Fire burn injuries (Grade 3)"},
    {"type": EmergencyType.OVERDOSE, "severity": 4, "desc": "Accidental chemical poisoning / Pesticide ingestion"},
    {"type": EmergencyType.DIABETIC, "severity": 3, "desc": "Diabetic Ketoacidosis / Severe hypoglycemia & delirium"},
    {"type": EmergencyType.RENAL, "severity": 3, "desc": "Acute Renal Failure / Fluid overload & severe flank colic"},
    {"type": EmergencyType.FRACTURE, "severity": 2, "desc": "Open compound femur fracture from construction site fall"},
    {"type": EmergencyType.OCULAR, "severity": 2, "desc": "Industrial acid chemical burn to eyes"},
    {"type": EmergencyType.OTHER, "severity": 2, "desc": "Elderly patient syncopal episode / Acute abdominal pain"},
]

CALLER_NAMES = [
    "Ravi Sharma", "Priya Patel", "Amit Singh", "Sunita Kumar",
    "Rajesh Gupta", "Meera Nair", "Vikram Choudhary", "Anita Joshi",
    "Suresh Yadav", "Kavita Verma", "Rohit Malhotra", "Deepa Iyer",
]

# Bhubaneswar emergency hotspots
EMERGENCY_LOCATIONS = [
    {"name": "KIIT University Campus 6 (Patia)", "lat": 20.3541, "lng": 85.8192, "node": "n_patia_kiit"},
    {"name": "Jaydev Vihar Square", "lat": 20.3015, "lng": 85.8248, "node": "n_jaydev_vihar"},
    {"name": "Master Canteen Railway Station", "lat": 20.2678, "lng": 85.8436, "node": "n_master_canteen"},
    {"name": "Esplanade One Mall (Rasulgarh)", "lat": 20.2917, "lng": 85.8675, "node": "n_rasulgarh"},
    {"name": "BMC Bhawani Mall (Saheed Nagar)", "lat": 20.2882, "lng": 85.8480, "node": "n_saheed_nagar"},
    {"name": "Khandagiri Caves Road", "lat": 20.2568, "lng": 85.7852, "node": "n_khandagiri"},
    {"name": "Biju Patnaik International Airport", "lat": 20.2530, "lng": 85.8175, "node": "n_airport"},
    {"name": "Damana Square (Chandrasekharpur)", "lat": 20.3298, "lng": 85.8210, "node": "n_damana"},
    {"name": "DN Regalia Mall (Patrapada)", "lat": 20.2315, "lng": 85.7725, "node": "n_aiims_bbsr"},
    {"name": "Baramunda Bus Terminal", "lat": 20.2785, "lng": 85.7954, "node": "n_fire_station"},
]


def generate_random_emergency() -> Emergency:
    scenario = random.choice(EMERGENCY_SCENARIOS)
    location = random.choice(EMERGENCY_LOCATIONS)
    return Emergency(
        id=str(uuid.uuid4())[:8],
        lat=location["lat"] + random.uniform(-0.005, 0.005),
        lng=location["lng"] + random.uniform(-0.005, 0.005),
        location_name=location["name"],
        emergency_type=scenario["type"],
        severity=scenario["severity"],
        caller_name=random.choice(CALLER_NAMES),
        description=scenario["desc"],
        nearest_node_id=location["node"],
    )


@dataclass
class SimulationResult:
    total_emergencies: int
    dispatched: int
    avg_response_time_min: float
    avg_travel_time_min: float
    algorithm_used: str
    total_time_sec: float
    unserved: int
    benchmark_data: List[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "totalEmergencies": self.total_emergencies,
            "dispatched": self.dispatched,
            "avgResponseTimeMin": round(self.avg_response_time_min, 2),
            "avgTravelTimeMin": round(self.avg_travel_time_min, 2),
            "algorithmUsed": self.algorithm_used,
            "totalTimeSec": round(self.total_time_sec, 3),
            "unserved": self.unserved,
            "benchmarkData": self.benchmark_data,
        }


def run_stress_test(graph, dispatch_engine: DispatchEngine, n_emergencies: int = 20) -> dict:
    """
    Run stress test comparing Dijkstra vs A* performance
    across N random emergencies.
    """
    results = []
    queue = EmergencyPriorityQueue()

    for _ in range(n_emergencies):
        em = generate_random_emergency()
        queue.push(em)

    dijkstra_times = []
    astar_times = []
    dijkstra_nodes = []
    astar_nodes = []
    route_costs = []

    # Process each emergency
    for em in queue.get_pending():
        start_node = em.nearest_node_id
        if not start_node or start_node not in graph.nodes:
            continue

        # Run both algorithms to all hospitals
        from .city_data import HOSPITALS
        for h in HOSPITALS[:3]:  # Compare on first 3 hospitals
            target_node = h["node"]
            if target_node not in graph.nodes:
                continue

            d = dijkstra(graph, start_node, target_node)
            a = astar(graph, start_node, target_node)

            if d:
                dijkstra_times.append(d.computation_time_ms)
                dijkstra_nodes.append(d.nodes_visited)
            if a:
                astar_times.append(a.computation_time_ms)
                astar_nodes.append(a.nodes_visited)
            if d:
                route_costs.append(d.total_cost)

            results.append({
                "emergency": em.id,
                "hospital": h["id"],
                "dijkstra_ms": round(d.computation_time_ms, 3) if d else None,
                "astar_ms": round(a.computation_time_ms, 3) if a else None,
                "dijkstra_nodes": d.nodes_visited if d else None,
                "astar_nodes": a.nodes_visited if a else None,
                "dijkstra_cost": round(d.total_cost, 2) if d else None,
                "astar_cost": round(a.total_cost, 2) if a else None,
            })

    return {
        "summary": {
            "totalTests": len(results),
            "dijkstra": {
                "avgTimeMs": round(sum(dijkstra_times) / len(dijkstra_times), 3) if dijkstra_times else 0,
                "avgNodesVisited": round(sum(dijkstra_nodes) / len(dijkstra_nodes), 1) if dijkstra_nodes else 0,
                "totalTimeMs": round(sum(dijkstra_times), 3),
            },
            "astar": {
                "avgTimeMs": round(sum(astar_times) / len(astar_times), 3) if astar_times else 0,
                "avgNodesVisited": round(sum(astar_nodes) / len(astar_nodes), 1) if astar_nodes else 0,
                "totalTimeMs": round(sum(astar_times), 3),
            },
            "astarEfficiencyGainPct": (
                round((1 - sum(astar_nodes) / sum(dijkstra_nodes)) * 100, 1)
                if dijkstra_nodes and astar_nodes and sum(dijkstra_nodes) > 0
                else 0
            ),
        },
        "perTestResults": results,
    }
