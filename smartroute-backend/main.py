"""
SmartRoute Flask Backend — Pure Python, works on Python 3.14
REST API + WebSocket via flask-sock
"""

import json
import threading
import time
import uuid
from typing import Set

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sock import Sock

from dsa_engine import (
    build_city_graph, build_dispatch_engine,
    dijkstra, astar, benchmark_algorithms,
    Emergency, EmergencyType, EmergencyStatus,
    EmergencyPriorityQueue,
    run_stress_test, generate_random_emergency,
)
from dsa_engine.dispatch import AmbulanceStatus

# ─── App Setup ────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)
sock = Sock(app)

# ─── Global State ─────────────────────────────────────────────────────────────
graph = build_city_graph()
dispatch_engine = build_dispatch_engine(graph)
emergency_queue = EmergencyPriorityQueue()
ws_clients: Set = set()
ws_lock = threading.Lock()

# Seed demo emergencies
for _ in range(3):
    _em = generate_random_emergency()
    emergency_queue.push(_em)


# ─── WebSocket broadcast ──────────────────────────────────────────────────────
def broadcast(message: dict):
    data = json.dumps(message)
    dead = set()
    with ws_lock:
        clients = set(ws_clients)
    for ws in clients:
        try:
            ws.send(data)
        except Exception:
            dead.add(ws)
    with ws_lock:
        ws_clients.difference_update(dead)


# ─── WebSocket ────────────────────────────────────────────────────────────────
@sock.route('/ws')
def ws_endpoint(ws):
    with ws_lock:
        ws_clients.add(ws)
    try:
        ws.send(json.dumps({
            "event": "initial_state",
            "emergencies": [e.to_dict() for e in emergency_queue.get_all()],
            "ambulances": [a.to_dict() for a in dispatch_engine.ambulances.values()],
            "hospitals": [h.to_dict() for h in dispatch_engine.hospitals.values()],
        }))
        while True:
            data = ws.receive(timeout=30)
            if data is None:
                break
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    ws.send(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except Exception:
        pass
    finally:
        with ws_lock:
            ws_clients.discard(ws)


# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "graph_nodes": len(graph.nodes),
        "graph_edges": sum(len(e) for e in graph.edges.values()),
        "pending_emergencies": emergency_queue.size,
        "available_ambulances": len(dispatch_engine.get_available_ambulances()),
        "hospitals": len(dispatch_engine.hospitals),
    })


# ─── Graph ────────────────────────────────────────────────────────────────────
@app.get("/api/graph")
def get_graph():
    return jsonify(graph.to_dict())


@app.post("/api/route")
def calculate_route():
    body = request.get_json()
    from_node = body.get("from_node", "")
    to_node = body.get("to_node", "")
    algorithm = body.get("algorithm", "both")

    if from_node not in graph.nodes:
        return jsonify({"error": f"Node '{from_node}' not found"}), 404
    if to_node not in graph.nodes:
        return jsonify({"error": f"Node '{to_node}' not found"}), 404

    if algorithm == "dijkstra":
        r = dijkstra(graph, from_node, to_node)
        return jsonify(r.to_dict() if r else {"error": "No path found"})
    elif algorithm == "astar":
        r = astar(graph, from_node, to_node)
        return jsonify(r.to_dict() if r else {"error": "No path found"})
    else:
        return jsonify(benchmark_algorithms(graph, from_node, to_node))


@app.post("/api/traffic")
def update_traffic():
    body = request.get_json()
    from_n = body.get("from_node")
    to_n = body.get("to_node")
    mult = float(body.get("multiplier", 1.0))
    graph.update_traffic(from_n, to_n, mult)
    broadcast({"event": "traffic_update", "fromNode": from_n, "toNode": to_n, "multiplier": mult})
    return jsonify({"status": "updated", "from": from_n, "to": to_n, "multiplier": mult})


@app.post("/api/road/block")
def block_road():
    body = request.get_json()
    from_n = body.get("from_node")
    to_n = body.get("to_node")
    blocked = bool(body.get("blocked", True))
    graph.block_road(from_n, to_n, blocked)
    broadcast({"event": "road_block", "fromNode": from_n, "toNode": to_n, "blocked": blocked})
    return jsonify({"status": "updated", "blocked": blocked})


# ─── Emergencies ──────────────────────────────────────────────────────────────
@app.post("/api/emergency")
def create_emergency():
    body = request.get_json()
    try:
        em_type = EmergencyType(body.get("emergency_type", "other"))
    except ValueError:
        return jsonify({"error": "Invalid emergency type"}), 400

    nearest_node = dispatch_engine.find_nearest_node(body["lat"], body["lng"])
    em = Emergency(
        id=str(uuid.uuid4())[:8],
        lat=body["lat"], lng=body["lng"],
        location_name=body.get("location_name", "Unknown"),
        emergency_type=em_type,
        severity=int(body.get("severity", 3)),
        caller_name=body.get("caller_name", "Unknown"),
        description=body.get("description", ""),
        nearest_node_id=nearest_node,
    )
    emergency_queue.push(em)
    threading.Thread(target=broadcast, args=({"event": "new_emergency", "emergency": em.to_dict()},)).start()
    return jsonify(em.to_dict())


@app.post("/api/emergency/random")
def create_random_emergency():
    em = generate_random_emergency()
    emergency_queue.push(em)
    threading.Thread(target=broadcast, args=({"event": "new_emergency", "emergency": em.to_dict()},)).start()
    return jsonify(em.to_dict())


@app.get("/api/emergencies")
def list_emergencies():
    return jsonify([e.to_dict() for e in emergency_queue.get_all()])


@app.get("/api/emergencies/pending")
def list_pending():
    return jsonify([e.to_dict() for e in emergency_queue.get_pending()])


@app.get("/api/emergency/<emergency_id>")
def get_emergency(emergency_id):
    em = emergency_queue.get_by_id(emergency_id)
    if not em:
        return jsonify({"error": "Not found"}), 404
    return jsonify(em.to_dict())


# ─── Ambulances ───────────────────────────────────────────────────────────────
@app.get("/api/ambulances")
def list_ambulances():
    return jsonify([a.to_dict() for a in dispatch_engine.ambulances.values()])


@app.get("/api/ambulances/available")
def available_ambulances():
    return jsonify([a.to_dict() for a in dispatch_engine.get_available_ambulances()])


# ─── Hospitals ────────────────────────────────────────────────────────────────
@app.get("/api/hospitals")
def list_hospitals():
    return jsonify([h.to_dict() for h in dispatch_engine.hospitals.values()])


@app.post("/api/hospitals/recommend")
def recommend_hospitals():
    body = request.get_json()
    lat = float(body.get("lat", 20.3015))
    lng = float(body.get("lng", 85.8248))
    em_type = body.get("type", "general")
    from_node = body.get("from_node")

    travel_times = {}
    for hosp_id, hosp in dispatch_engine.hospitals.items():
        if from_node and from_node in graph.nodes:
            r = dijkstra(graph, from_node, hosp.nearest_node_id)
            travel_times[hosp_id] = r.total_cost if r else float("inf")
        else:
            travel_times[hosp_id] = 15.0

    return jsonify(dispatch_engine.rank_hospitals(lat, lng, em_type, travel_times))


# ─── Dispatch ─────────────────────────────────────────────────────────────────
def _do_dispatch(emergency_id, ambulance_id, hospital_id):
    em = emergency_queue.get_by_id(emergency_id)
    if not em:
        return {"error": "Emergency not found"}, 404
    amb = dispatch_engine.ambulances.get(ambulance_id)
    if not amb:
        return {"error": "Ambulance not found"}, 404
    if amb.status != AmbulanceStatus.AVAILABLE:
        return {"error": f"Ambulance {ambulance_id} not available (status: {amb.status})"}, 400
    hosp = dispatch_engine.hospitals.get(hospital_id)
    if not hosp:
        return {"error": "Hospital not found"}, 404

    amb_node = amb.nearest_node_id or dispatch_engine.find_nearest_node(amb.lat, amb.lng)
    em_node = em.nearest_node_id
    hosp_node = hosp.nearest_node_id

    route_to_scene = astar(graph, amb_node, em_node) if (amb_node and em_node) else None
    route_to_hospital = astar(graph, em_node, hosp_node) if (em_node and hosp_node) else None

    dispatch_engine.dispatch(ambulance_id, emergency_id)
    em.status = EmergencyStatus.DISPATCHED
    em.assigned_ambulance_id = ambulance_id
    em.assigned_hospital_id = hospital_id

    result = {
        "emergencyId": emergency_id,
        "ambulanceId": ambulance_id,
        "hospitalId": hospital_id,
        "routeToScene": route_to_scene.to_dict() if route_to_scene else None,
        "routeToHospital": route_to_hospital.to_dict() if route_to_hospital else None,
        "totalEtaMin": (
            (route_to_scene.total_cost if route_to_scene else 0) +
            (route_to_hospital.total_cost if route_to_hospital else 0)
        ),
        "dispatchedAt": time.time(),
    }
    threading.Thread(target=broadcast, args=({"event": "dispatch", **result},)).start()
    return result, 200


@app.post("/api/dispatch")
def dispatch_ambulance():
    body = request.get_json()
    result, code = _do_dispatch(
        body.get("emergency_id"), body.get("ambulance_id"), body.get("hospital_id")
    )
    return jsonify(result), code


@app.post("/api/auto-dispatch/<emergency_id>")
def auto_dispatch(emergency_id):
    em = emergency_queue.get_by_id(emergency_id)
    if not em:
        return jsonify({"error": "Emergency not found"}), 404
    if em.status != EmergencyStatus.PENDING:
        return jsonify({"error": f"Emergency already {em.status}"}), 400

    ranked_amb = dispatch_engine.rank_ambulances(em.lat, em.lng)
    if not ranked_amb:
        return jsonify({"error": "No ambulances available"}), 503

    best_amb = ranked_amb[0][1]
    em_node = em.nearest_node_id
    travel_times = {}
    for hosp_id, hosp in dispatch_engine.hospitals.items():
        if em_node and em_node in graph.nodes:
            r = dijkstra(graph, em_node, hosp.nearest_node_id)
            travel_times[hosp_id] = r.total_cost if r else float("inf")
        else:
            travel_times[hosp_id] = 15.0

    ranked_hosp = dispatch_engine.rank_hospitals(em.lat, em.lng, em.emergency_type.value, travel_times)
    if not ranked_hosp:
        return jsonify({"error": "No hospitals available"}), 503

    result, code = _do_dispatch(emergency_id, best_amb.id, ranked_hosp[0]["hospitalId"])
    return jsonify(result), code


@app.post("/api/resolve/<emergency_id>")
def resolve_emergency(emergency_id):
    em = emergency_queue.get_by_id(emergency_id)
    if not em:
        return jsonify({"error": "Not found"}), 404
    em.status = EmergencyStatus.RESOLVED
    em.resolved_at = time.time()
    if em.assigned_ambulance_id:
        dispatch_engine.release_ambulance(em.assigned_ambulance_id)
    threading.Thread(target=broadcast, args=({"event": "resolved", "emergencyId": emergency_id},)).start()
    return jsonify({"status": "resolved", "emergencyId": emergency_id})


# ─── Benchmark / Simulation ───────────────────────────────────────────────────
@app.post("/api/benchmark")
def run_benchmark():
    body = request.get_json()
    from_node = body.get("from_node", "n_jaydev_vihar")
    to_node = body.get("to_node", "n_aiims_bbsr")
    return jsonify(benchmark_algorithms(graph, from_node, to_node))


@app.post("/api/stress-test")
def stress_test():
    body = request.get_json()
    n = min(int(body.get("n", 10)), 50)
# ─── Production SPA Static Serving ───────────────────────────────────────────
import os
from flask import send_from_directory

FRONTEND_DIST = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "smartroute-frontend", "dist")
)
if not os.path.exists(FRONTEND_DIST):
    FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "dist"))


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_spa(path):
    if path.startswith("api/") or path.startswith("ws"):
        return jsonify({"error": "Endpoint not found"}), 404
    if os.path.exists(os.path.join(FRONTEND_DIST, path)) and path != "":
        return send_from_directory(FRONTEND_DIST, path)
    if os.path.exists(os.path.join(FRONTEND_DIST, "index.html")):
        return send_from_directory(FRONTEND_DIST, "index.html")
    return jsonify({
        "status": "SmartRoute Backend Active",
        "hint": "Run 'npm run build' in smartroute-frontend to serve UI on this port directly."
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
