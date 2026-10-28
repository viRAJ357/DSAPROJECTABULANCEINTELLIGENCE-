"""
Emergency Priority Queue using Max-Heap
Manages emergency dispatch with priority scoring based on:
- Severity (1-5 scale)
- Wait time (time penalty increases urgency)
- Emergency type (cardiac > trauma > fracture, etc.)
"""

import heapq
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional


class EmergencyType(str, Enum):
    CARDIAC = "cardiac"
    STROKE = "stroke"
    RESPIRATORY = "respiratory"
    SNAKEBITE = "snakebite"
    TRAUMA = "trauma"
    OBSTETRIC = "obstetric"
    PEDIATRIC = "pediatric"
    SEPSIS = "sepsis"
    BURNS = "burns"
    OVERDOSE = "overdose"
    DIABETIC = "diabetic"
    RENAL = "renal"
    FRACTURE = "fracture"
    OCULAR = "ocular"
    OTHER = "other"


class EmergencyStatus(str, Enum):
    PENDING = "pending"
    DISPATCHED = "dispatched"
    EN_ROUTE = "en_route"
    ARRIVED = "arrived"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"


# Clinical triage base priority scores (1 to 100 scale)
TYPE_PRIORITY = {
    EmergencyType.CARDIAC: 95,
    EmergencyType.STROKE: 92,
    EmergencyType.RESPIRATORY: 90,
    EmergencyType.SNAKEBITE: 88,
    EmergencyType.TRAUMA: 85,
    EmergencyType.OBSTETRIC: 82,
    EmergencyType.PEDIATRIC: 80,
    EmergencyType.SEPSIS: 78,
    EmergencyType.OVERDOSE: 75,
    EmergencyType.BURNS: 72,
    EmergencyType.DIABETIC: 68,
    EmergencyType.RENAL: 65,
    EmergencyType.FRACTURE: 60,
    EmergencyType.OCULAR: 55,
    EmergencyType.OTHER: 50,
}


@dataclass
class Emergency:
    id: str
    lat: float
    lng: float
    location_name: str
    emergency_type: EmergencyType
    severity: int  # 1-5 (5 = most severe)
    caller_name: str
    description: str
    created_at: float = field(default_factory=time.time)
    status: EmergencyStatus = EmergencyStatus.PENDING
    assigned_ambulance_id: Optional[str] = None
    assigned_hospital_id: Optional[str] = None
    nearest_node_id: Optional[str] = None
    resolved_at: Optional[float] = None

    @property
    def wait_time_min(self) -> float:
        return (time.time() - self.created_at) / 60

    @property
    def priority_score(self) -> float:
        """
        Dynamic priority score — increases with wait time
        Score = base_type_priority + (severity * 10) + (wait_time_min * 2)
        """
        base = TYPE_PRIORITY.get(self.emergency_type, 50)
        severity_bonus = self.severity * 10
        wait_bonus = min(self.wait_time_min * 2, 50)  # cap at 50
        return base + severity_bonus + wait_bonus

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "lat": self.lat,
            "lng": self.lng,
            "locationName": self.location_name,
            "emergencyType": self.emergency_type.value,
            "severity": self.severity,
            "callerName": self.caller_name,
            "description": self.description,
            "createdAt": self.created_at,
            "status": self.status.value,
            "assignedAmbulanceId": self.assigned_ambulance_id,
            "assignedHospitalId": self.assigned_hospital_id,
            "nearestNodeId": self.nearest_node_id,
            "waitTimeMin": round(self.wait_time_min, 1),
            "priorityScore": round(self.priority_score, 1),
        }


class EmergencyPriorityQueue:
    """
    Max-heap priority queue for emergency dispatch.
    Uses negated priority score since Python's heapq is a min-heap.
    """

    def __init__(self):
        self._heap: List = []  # (-priority, created_at, id)
        self._registry: Dict[str, Emergency] = {}
        self._removed: set = set()

    def push(self, emergency: Emergency):
        self._registry[emergency.id] = emergency
        score = -emergency.priority_score
        heapq.heappush(self._heap, (score, emergency.created_at, emergency.id))

    def pop(self) -> Optional[Emergency]:
        """Return highest-priority pending emergency"""
        while self._heap:
            score, created_at, eid = heapq.heappop(self._heap)
            if eid not in self._removed:
                em = self._registry.get(eid)
                if em and em.status == EmergencyStatus.PENDING:
                    return em
        return None

    def peek(self) -> Optional[Emergency]:
        """Peek without removing"""
        temp = []
        result = None
        while self._heap:
            score, created_at, eid = heapq.heappop(self._heap)
            temp.append((score, created_at, eid))
            if eid not in self._removed:
                em = self._registry.get(eid)
                if em and em.status == EmergencyStatus.PENDING:
                    result = em
                    break
        for item in temp:
            heapq.heappush(self._heap, item)
        return result

    def remove(self, emergency_id: str):
        self._removed.add(emergency_id)

    def update_status(self, emergency_id: str, status: EmergencyStatus):
        if emergency_id in self._registry:
            self._registry[emergency_id].status = status

    def get_all(self) -> List[Emergency]:
        return list(self._registry.values())

    def get_pending(self) -> List[Emergency]:
        pending = [
            e for e in self._registry.values()
            if e.status == EmergencyStatus.PENDING
        ]
        return sorted(pending, key=lambda x: -x.priority_score)

    def get_by_id(self, emergency_id: str) -> Optional[Emergency]:
        return self._registry.get(emergency_id)

    @property
    def size(self) -> int:
        return len([e for e in self._registry.values() if e.status == EmergencyStatus.PENDING])
