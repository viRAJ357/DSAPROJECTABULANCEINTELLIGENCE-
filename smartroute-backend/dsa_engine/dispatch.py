"""
Ambulance Dispatch Engine using Greedy + Optimization
- Nearest available ambulance selection
- Multi-ambulance constraint (no double-booking)
- Hospital recommendation with scoring
"""

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple
from .graph import CityGraph, Node


class AmbulanceStatus(str, Enum):
    AVAILABLE = "available"
    DISPATCHED = "dispatched"
    EN_ROUTE = "en_route"
    AT_SCENE = "at_scene"
    RETURNING = "returning"
    MAINTENANCE = "maintenance"


class HospitalSpecialty(str, Enum):
    TRAUMA_CENTER = "trauma_center"
    CARDIAC_CENTER = "cardiac_center"
    GENERAL = "general"
    BURNS_UNIT = "burns_unit"
    NEUROLOGY = "neurology"
    PEDIATRIC = "pediatric"
    TOXICOLOGY = "toxicology"
    OBSTETRIC = "obstetric"
    NEPHROLOGY = "nephrology"
    OPHTHALMOLOGY = "ophthalmology"


@dataclass
class Ambulance:
    id: str
    name: str
    lat: float
    lng: float
    status: AmbulanceStatus = AmbulanceStatus.AVAILABLE
    assigned_emergency_id: Optional[str] = None
    nearest_node_id: Optional[str] = None
    crew_count: int = 3
    equipment_level: int = 2  # 1=basic, 2=ALS, 3=critical care

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "lat": self.lat,
            "lng": self.lng,
            "status": self.status.value,
            "assignedEmergencyId": self.assigned_emergency_id,
            "nearestNodeId": self.nearest_node_id,
            "crewCount": self.crew_count,
            "equipmentLevel": self.equipment_level,
        }


@dataclass
class Hospital:
    id: str
    name: str
    lat: float
    lng: float
    nearest_node_id: str
    capacity: int
    current_patients: int
    specialties: List[HospitalSpecialty] = field(default_factory=list)
    er_beds_available: int = 10
    trauma_team_available: bool = True

    @property
    def occupancy_pct(self) -> float:
        return (self.current_patients / self.capacity) * 100 if self.capacity > 0 else 100

    @property
    def available_beds(self) -> int:
        return max(0, self.capacity - self.current_patients)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "lat": self.lat,
            "lng": self.lng,
            "nearestNodeId": self.nearest_node_id,
            "capacity": self.capacity,
            "currentPatients": self.current_patients,
            "availableBeds": self.available_beds,
            "occupancyPct": round(self.occupancy_pct, 1),
            "specialties": [s.value for s in self.specialties],
            "erBedsAvailable": self.er_beds_available,
            "traumaTeamAvailable": self.trauma_team_available,
        }


class DispatchEngine:
    """
    Greedy dispatch engine with constraint awareness.
    Selects optimal ambulance and hospital for each emergency.
    """

    def __init__(self, graph: CityGraph):
        self.graph = graph
        self.ambulances: Dict[str, Ambulance] = {}
        self.hospitals: Dict[str, Hospital] = {}

    def add_ambulance(self, ambulance: Ambulance):
        self.ambulances[ambulance.id] = ambulance

    def add_hospital(self, hospital: Hospital):
        self.hospitals[hospital.id] = hospital

    def find_nearest_node(self, lat: float, lng: float) -> Optional[str]:
        """Find the nearest graph node to a lat/lng coordinate"""
        min_dist = float("inf")
        nearest = None
        for node_id, node in self.graph.nodes.items():
            dist = math.sqrt((node.lat - lat) ** 2 + (node.lng - lng) ** 2)
            if dist < min_dist:
                min_dist = dist
                nearest = node_id
        return nearest

    def get_available_ambulances(self) -> List[Ambulance]:
        return [a for a in self.ambulances.values() if a.status == AmbulanceStatus.AVAILABLE]

    def rank_ambulances(self, emergency_lat: float, emergency_lng: float) -> List[Tuple[float, Ambulance]]:
        """
        Rank available ambulances by straight-line distance.
        Returns [(distance, ambulance)] sorted ascending.
        """
        available = self.get_available_ambulances()
        ranked = []
        for amb in available:
            dist = math.sqrt((amb.lat - emergency_lat) ** 2 + (amb.lng - emergency_lng) ** 2)
            ranked.append((dist, amb))
        ranked.sort(key=lambda x: x[0])
        return ranked

    def rank_hospitals(
        self,
        emergency_lat: float,
        emergency_lng: float,
        emergency_type: str,
        travel_times: Dict[str, float],
    ) -> List[dict]:
        """
        Score and rank hospitals using weighted formula:
        Score = 0.5 * (1/travel_time) + 0.3 * (available_beds/capacity) + 0.2 * specialty_match
        """
        SPECIALTY_MAP = {
            "cardiac": HospitalSpecialty.CARDIAC_CENTER,
            "stroke": HospitalSpecialty.NEUROLOGY,
            "trauma": HospitalSpecialty.TRAUMA_CENTER,
            "fracture": HospitalSpecialty.TRAUMA_CENTER,
            "burns": HospitalSpecialty.BURNS_UNIT,
            "pediatric": HospitalSpecialty.PEDIATRIC,
            "snakebite": HospitalSpecialty.TOXICOLOGY,
            "overdose": HospitalSpecialty.TOXICOLOGY,
            "obstetric": HospitalSpecialty.OBSTETRIC,
            "renal": HospitalSpecialty.NEPHROLOGY,
            "ocular": HospitalSpecialty.OPHTHALMOLOGY,
            "respiratory": HospitalSpecialty.TRAUMA_CENTER,
            "sepsis": HospitalSpecialty.GENERAL,
            "diabetic": HospitalSpecialty.GENERAL,
        }

        target_specialty = SPECIALTY_MAP.get(emergency_type)
        ranked = []

        for hosp_id, hosp in self.hospitals.items():
            if hosp.available_beds == 0:
                continue

            travel_time = travel_times.get(hosp_id, float("inf"))
            if travel_time == float("inf"):
                continue

            # Normalize travel time score (lower is better)
            time_score = 1.0 / (1 + travel_time / 10)

            # Capacity score
            capacity_score = hosp.available_beds / max(hosp.capacity, 1)

            # Specialty match
            specialty_score = 0.0
            if target_specialty and target_specialty in hosp.specialties:
                specialty_score = 1.0

            total_score = 0.5 * time_score + 0.3 * capacity_score + 0.2 * specialty_score

            ranked.append(
                {
                    "hospitalId": hosp_id,
                    "hospitalName": hosp.name,
                    "score": round(total_score, 3),
                    "travelTimeMin": round(travel_time, 1),
                    "availableBeds": hosp.available_beds,
                    "occupancyPct": round(hosp.occupancy_pct, 1),
                    "specialtyMatch": specialty_score > 0,
                    "lat": hosp.lat,
                    "lng": hosp.lng,
                    "nearestNodeId": hosp.nearest_node_id,
                }
            )

        ranked.sort(key=lambda x: -x["score"])
        return ranked

    def dispatch(self, ambulance_id: str, emergency_id: str):
        """Mark ambulance as dispatched"""
        if ambulance_id in self.ambulances:
            amb = self.ambulances[ambulance_id]
            amb.status = AmbulanceStatus.DISPATCHED
            amb.assigned_emergency_id = emergency_id

    def update_ambulance_position(self, ambulance_id: str, lat: float, lng: float, status: AmbulanceStatus):
        if ambulance_id in self.ambulances:
            self.ambulances[ambulance_id].lat = lat
            self.ambulances[ambulance_id].lng = lng
            self.ambulances[ambulance_id].status = status

    def release_ambulance(self, ambulance_id: str):
        if ambulance_id in self.ambulances:
            amb = self.ambulances[ambulance_id]
            amb.status = AmbulanceStatus.AVAILABLE
            amb.assigned_emergency_id = None
