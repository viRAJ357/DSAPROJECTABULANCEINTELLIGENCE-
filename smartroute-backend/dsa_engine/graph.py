"""
SmartRoute DSA Engine - Graph Representation
City roads modeled as weighted directed graph.
Nodes = intersections/locations, Edges = roads with travel time weights
"""

import math
import random
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class Node:
    id: str
    name: str
    lat: float
    lng: float
    node_type: str = "intersection"  # intersection, hospital, ambulance_station, emergency

    def distance_to(self, other: "Node") -> float:
        """Haversine distance in km"""
        R = 6371
        lat1, lng1 = math.radians(self.lat), math.radians(self.lng)
        lat2, lng2 = math.radians(other.lat), math.radians(other.lng)
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
        c = 2 * math.asin(math.sqrt(a))
        return R * c


@dataclass
class Edge:
    from_node: str
    to_node: str
    distance_km: float
    base_speed_kmh: float = 40.0
    traffic_multiplier: float = 1.0  # 1.0 = normal, 2.0 = double travel time
    is_blocked: bool = False

    @property
    def travel_time_min(self) -> float:
        if self.is_blocked:
            return float("inf")
        return (self.distance_km / self.base_speed_kmh) * 60 * self.traffic_multiplier

    @property
    def weight(self) -> float:
        return self.travel_time_min


class CityGraph:
    """
    Weighted directed graph representing city road network.
    Uses adjacency list for O(1) neighbor lookup.
    """

    def __init__(self):
        self.nodes: Dict[str, Node] = {}
        self.edges: Dict[str, List[Edge]] = {}  # adjacency list
        self._edge_map: Dict[Tuple[str, str], Edge] = {}  # for O(1) edge update

    def add_node(self, node: Node):
        self.nodes[node.id] = node
        if node.id not in self.edges:
            self.edges[node.id] = []

    def add_edge(self, edge: Edge, bidirectional: bool = True):
        self.edges.setdefault(edge.from_node, []).append(edge)
        self._edge_map[(edge.from_node, edge.to_node)] = edge
        if bidirectional:
            rev = Edge(
                from_node=edge.to_node,
                to_node=edge.from_node,
                distance_km=edge.distance_km,
                base_speed_kmh=edge.base_speed_kmh,
                traffic_multiplier=edge.traffic_multiplier,
                is_blocked=edge.is_blocked,
            )
            self.edges.setdefault(edge.to_node, []).append(rev)
            self._edge_map[(edge.to_node, edge.from_node)] = rev

    def get_neighbors(self, node_id: str) -> List[Edge]:
        return self.edges.get(node_id, [])

    def update_traffic(self, from_id: str, to_id: str, multiplier: float):
        """Dynamically update edge weight — simulates traffic change"""
        for key in [(from_id, to_id), (to_id, from_id)]:
            if key in self._edge_map:
                self._edge_map[key].traffic_multiplier = multiplier

    def block_road(self, from_id: str, to_id: str, blocked: bool = True):
        for key in [(from_id, to_id), (to_id, from_id)]:
            if key in self._edge_map:
                self._edge_map[key].is_blocked = blocked

    def get_nodes_by_type(self, node_type: str) -> List[Node]:
        return [n for n in self.nodes.values() if n.node_type == node_type]

    def heuristic(self, node_id: str, goal_id: str) -> float:
        """Euclidean heuristic for A* — uses Haversine distance converted to minutes"""
        n = self.nodes.get(node_id)
        g = self.nodes.get(goal_id)
        if not n or not g:
            return 0
        dist_km = n.distance_to(g)
        # Assume max speed 60 km/h for heuristic (admissible since actual is ≤60)
        return (dist_km / 60) * 60  # minutes

    def to_dict(self) -> dict:
        return {
            "nodes": [
                {
                    "id": n.id,
                    "name": n.name,
                    "lat": n.lat,
                    "lng": n.lng,
                    "type": n.node_type,
                }
                for n in self.nodes.values()
            ],
            "edges": [
                {
                    "from": e.from_node,
                    "to": e.to_node,
                    "distance": e.distance_km,
                    "travel_time": e.travel_time_min,
                    "traffic": e.traffic_multiplier,
                    "blocked": e.is_blocked,
                }
                for edges in self.edges.values()
                for e in edges
            ],
        }
