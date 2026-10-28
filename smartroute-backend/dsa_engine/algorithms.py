"""
DSA Algorithms Engine
- Dijkstra's Algorithm: O((V+E) log V) using min-heap
- A* Algorithm: Heuristic-guided shortest path
- Both return path, cost, visited nodes count for benchmarking
"""

import heapq
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from .graph import CityGraph


@dataclass
class PathResult:
    path: List[str]
    total_cost: float  # minutes
    total_distance: float  # km
    nodes_visited: int
    computation_time_ms: float
    algorithm: str
    path_details: List[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "path": self.path,
            "totalCost": round(self.total_cost, 2),
            "totalDistance": round(self.total_distance, 2),
            "nodesVisited": self.nodes_visited,
            "computationTimeMs": round(self.computation_time_ms, 3),
            "algorithm": self.algorithm,
            "pathDetails": self.path_details,
        }


def dijkstra(graph: CityGraph, start: str, end: str) -> Optional[PathResult]:
    """
    Dijkstra's Algorithm using min-heap (priority queue).
    Time: O((V + E) log V)
    Space: O(V)
    """
    start_time = time.perf_counter()

    # Min-heap: (cost, node_id)
    heap = [(0.0, start)]
    dist: Dict[str, float] = {start: 0.0}
    prev: Dict[str, Optional[str]] = {start: None}
    visited = set()
    nodes_visited = 0

    while heap:
        current_cost, current = heapq.heappop(heap)

        if current in visited:
            continue
        visited.add(current)
        nodes_visited += 1

        if current == end:
            break

        for edge in graph.get_neighbors(current):
            if edge.is_blocked:
                continue
            neighbor = edge.to_node
            new_cost = current_cost + edge.weight

            if neighbor not in dist or new_cost < dist[neighbor]:
                dist[neighbor] = new_cost
                prev[neighbor] = current
                heapq.heappush(heap, (new_cost, neighbor))

    computation_time = (time.perf_counter() - start_time) * 1000

    if end not in dist:
        return None  # No path found

    # Reconstruct path
    path = []
    cur = end
    while cur is not None:
        path.append(cur)
        cur = prev.get(cur)
    path.reverse()

    # Calculate total distance
    total_dist = sum(
        e.distance_km
        for i in range(len(path) - 1)
        for e in graph.get_neighbors(path[i])
        if e.to_node == path[i + 1]
    )

    # Build path details for visualization
    path_details = []
    for i, node_id in enumerate(path):
        node = graph.nodes.get(node_id)
        if node:
            path_details.append(
                {
                    "id": node_id,
                    "name": node.name,
                    "lat": node.lat,
                    "lng": node.lng,
                    "type": node.node_type,
                    "cumulative_time": round(dist.get(node_id, 0), 2),
                }
            )

    return PathResult(
        path=path,
        total_cost=dist[end],
        total_distance=total_dist,
        nodes_visited=nodes_visited,
        computation_time_ms=computation_time,
        algorithm="Dijkstra",
        path_details=path_details,
    )


def astar(graph: CityGraph, start: str, end: str) -> Optional[PathResult]:
    """
    A* Algorithm with Haversine heuristic.
    Time: O(E log V) in practice (with good heuristic)
    Space: O(V)
    f(n) = g(n) + h(n)
    g(n) = actual cost from start to n
    h(n) = heuristic (estimated cost from n to end)
    """
    start_time = time.perf_counter()

    h_start = graph.heuristic(start, end)
    # Heap: (f_score, g_score, node_id)
    heap = [(h_start, 0.0, start)]
    g_score: Dict[str, float] = {start: 0.0}
    prev: Dict[str, Optional[str]] = {start: None}
    visited = set()
    nodes_visited = 0

    while heap:
        f, g, current = heapq.heappop(heap)

        if current in visited:
            continue
        visited.add(current)
        nodes_visited += 1

        if current == end:
            break

        for edge in graph.get_neighbors(current):
            if edge.is_blocked:
                continue
            neighbor = edge.to_node
            new_g = g + edge.weight

            if neighbor not in g_score or new_g < g_score[neighbor]:
                g_score[neighbor] = new_g
                prev[neighbor] = current
                h = graph.heuristic(neighbor, end)
                f_score = new_g + h
                heapq.heappush(heap, (f_score, new_g, neighbor))

    computation_time = (time.perf_counter() - start_time) * 1000

    if end not in g_score:
        return None

    # Reconstruct path
    path = []
    cur = end
    while cur is not None:
        path.append(cur)
        cur = prev.get(cur)
    path.reverse()

    total_dist = sum(
        e.distance_km
        for i in range(len(path) - 1)
        for e in graph.get_neighbors(path[i])
        if e.to_node == path[i + 1]
    )

    path_details = []
    for node_id in path:
        node = graph.nodes.get(node_id)
        if node:
            path_details.append(
                {
                    "id": node_id,
                    "name": node.name,
                    "lat": node.lat,
                    "lng": node.lng,
                    "type": node.node_type,
                    "cumulative_time": round(g_score.get(node_id, 0), 2),
                }
            )

    return PathResult(
        path=path,
        total_cost=g_score[end],
        total_distance=total_dist,
        nodes_visited=nodes_visited,
        computation_time_ms=computation_time,
        algorithm="A*",
        path_details=path_details,
    )


def benchmark_algorithms(graph: CityGraph, start: str, end: str) -> dict:
    """Run both algorithms and compare performance"""
    d_result = dijkstra(graph, start, end)
    a_result = astar(graph, start, end)

    return {
        "dijkstra": d_result.to_dict() if d_result else None,
        "astar": a_result.to_dict() if a_result else None,
        "comparison": {
            "dijkstra_nodes": d_result.nodes_visited if d_result else 0,
            "astar_nodes": a_result.nodes_visited if a_result else 0,
            "nodes_saved": (d_result.nodes_visited - a_result.nodes_visited) if d_result and a_result else 0,
            "efficiency_gain_pct": (
                round((1 - a_result.nodes_visited / d_result.nodes_visited) * 100, 1)
                if d_result and a_result and d_result.nodes_visited > 0
                else 0
            ),
            "dijkstra_time_ms": d_result.computation_time_ms if d_result else 0,
            "astar_time_ms": a_result.computation_time_ms if a_result else 0,
            "same_optimal_path": (
                d_result.total_cost == a_result.total_cost if d_result and a_result else False
            ),
        },
    }
