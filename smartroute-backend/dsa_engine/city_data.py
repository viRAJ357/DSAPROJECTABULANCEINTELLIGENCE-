"""
City Data Seeder — Bhubaneswar Smart City Emergency Road Network
Models realistic road network of Bhubaneswar (Odisha) with premier hospitals,
ambulance stations, major squares, and arterial corridors.
"""

from .graph import CityGraph, Node, Edge
from .dispatch import Ambulance, Hospital, HospitalSpecialty, DispatchEngine


# Bhubaneswar Premier Hospitals
HOSPITALS = [
    {
        "id": "h1", "name": "AIIMS Bhubaneswar", "lat": 20.2315, "lng": 85.7725,
        "node": "n_aiims_bbsr", "capacity": 1200, "patients": 980,
        "specialties": [
            HospitalSpecialty.TRAUMA_CENTER, HospitalSpecialty.CARDIAC_CENTER,
            HospitalSpecialty.NEUROLOGY, HospitalSpecialty.TOXICOLOGY,
            HospitalSpecialty.PEDIATRIC, HospitalSpecialty.NEPHROLOGY
        ],
        "er_beds": 50, "trauma_team": True,
    },
    {
        "id": "h2", "name": "IMS & SUM Hospital (Kalinga Nagar)", "lat": 20.2798, "lng": 85.7656,
        "node": "n_sum_hosp", "capacity": 1500, "patients": 1150,
        "specialties": [
            HospitalSpecialty.TRAUMA_CENTER, HospitalSpecialty.BURNS_UNIT,
            HospitalSpecialty.CARDIAC_CENTER, HospitalSpecialty.OBSTETRIC,
            HospitalSpecialty.PEDIATRIC
        ],
        "er_beds": 40, "trauma_team": True,
    },
    {
        "id": "h3", "name": "Apollo Hospitals Bhubaneswar", "lat": 20.3088, "lng": 85.8340,
        "node": "n_apollo", "capacity": 350, "patients": 260,
        "specialties": [
            HospitalSpecialty.CARDIAC_CENTER, HospitalSpecialty.NEUROLOGY,
            HospitalSpecialty.NEPHROLOGY, HospitalSpecialty.OPHTHALMOLOGY
        ],
        "er_beds": 20, "trauma_team": True,
    },
    {
        "id": "h4", "name": "Kalinga Hospital (CSPur)", "lat": 20.3242, "lng": 85.8197,
        "node": "n_kalinga", "capacity": 450, "patients": 320,
        "specialties": [HospitalSpecialty.GENERAL, HospitalSpecialty.TRAUMA_CENTER, HospitalSpecialty.PEDIATRIC],
        "er_beds": 22, "trauma_team": True,
    },
    {
        "id": "h5", "name": "Capital Hospital (Unit-6)", "lat": 20.2638, "lng": 85.8267,
        "node": "n_capital_hosp", "capacity": 850, "patients": 710,
        "specialties": [
            HospitalSpecialty.GENERAL, HospitalSpecialty.TRAUMA_CENTER,
            HospitalSpecialty.BURNS_UNIT, HospitalSpecialty.OBSTETRIC,
            HospitalSpecialty.TOXICOLOGY
        ],
        "er_beds": 35, "trauma_team": True,
    },
    {
        "id": "h6", "name": "AMRI Hospitals (Khandagiri)", "lat": 20.2585, "lng": 85.7890,
        "node": "n_amri_khandagiri", "capacity": 400, "patients": 290,
        "specialties": [HospitalSpecialty.CARDIAC_CENTER, HospitalSpecialty.PEDIATRIC, HospitalSpecialty.NEUROLOGY],
        "er_beds": 18, "trauma_team": True,
    },
    {
        "id": "h7", "name": "District Headquarter Hospital (DHH Khurda)", "lat": 20.1820, "lng": 85.6230,
        "node": "n_khurda_dhh", "capacity": 320, "patients": 210,
        "specialties": [
            HospitalSpecialty.GENERAL, HospitalSpecialty.TRAUMA_CENTER,
            HospitalSpecialty.OBSTETRIC, HospitalSpecialty.TOXICOLOGY
        ],
        "er_beds": 16, "trauma_team": True,
    },
]

# Strategic Ambulance Deployment Stations in Bhubaneswar
AMBULANCE_STATIONS = [
    {"id": "a1", "name": "AMB-Unit1-Patia", "lat": 20.3541, "lng": 85.8192, "node": "n_patia_kiit"},
    {"id": "a2", "name": "AMB-Unit2-JaydevVihar", "lat": 20.3015, "lng": 85.8248, "node": "n_jaydev_vihar"},
    {"id": "a3", "name": "AMB-Unit3-MasterCanteen", "lat": 20.2678, "lng": 85.8436, "node": "n_master_canteen"},
    {"id": "a4", "name": "AMB-Unit4-Khandagiri", "lat": 20.2568, "lng": 85.7852, "node": "n_khandagiri"},
    {"id": "a5", "name": "AMB-Unit5-Rasulgarh", "lat": 20.2917, "lng": 85.8675, "node": "n_rasulgarh"},
    {"id": "a6", "name": "AMB-Unit6-AIIMS", "lat": 20.2315, "lng": 85.7725, "node": "n_aiims_bbsr"},
    {"id": "a7", "name": "AMB-Unit7-KhurdaJatni", "lat": 20.1740, "lng": 85.7060, "node": "n_jatni"},
]

# Key Bhubaneswar & Khurda/Jatni Traffic Nodes & Intersections
INTERSECTIONS = [
    {"id": "n_khurda_dhh", "name": "DHH Khurda / Khurda Town", "lat": 20.1820, "lng": 85.6230},
    {"id": "n_jatni", "name": "Jatni Gate / Khurda Road Jn", "lat": 20.1740, "lng": 85.7060},
    {"id": "n_janla", "name": "Janla NH16 Industrial Gate", "lat": 20.2030, "lng": 85.7320},
    {"id": "n_tamando", "name": "Tamando NH16 Junction", "lat": 20.2185, "lng": 85.7480},
    {"id": "n_aiims_bbsr", "name": "AIIMS Patrapada Junction", "lat": 20.2315, "lng": 85.7725},
    {"id": "n_patia_kiit", "name": "Patia / KIIT Square", "lat": 20.3541, "lng": 85.8192},
    {"id": "n_infocity", "name": "Infocity Square", "lat": 20.3592, "lng": 85.8105},
    {"id": "n_damana", "name": "Damana Square (CSPur)", "lat": 20.3298, "lng": 85.8210},
    {"id": "n_jaydev_vihar", "name": "Jaydev Vihar Square", "lat": 20.3015, "lng": 85.8248},
    {"id": "n_kalinga_stadium", "name": "Kalinga Stadium Junction", "lat": 20.3005, "lng": 85.8170},
    {"id": "n_acharya_vihar", "name": "Acharya Vihar Square", "lat": 20.2965, "lng": 85.8335},
    {"id": "n_vani_vihar", "name": "Vani Vihar Square", "lat": 20.2936, "lng": 85.8458},
    {"id": "n_rasulgarh", "name": "Rasulgarh Square (NH16)", "lat": 20.2917, "lng": 85.8675},
    {"id": "n_saheed_nagar", "name": "Saheed Nagar Junction", "lat": 20.2882, "lng": 85.8480},
    {"id": "n_master_canteen", "name": "Master Canteen (Station)", "lat": 20.2678, "lng": 85.8436},
    {"id": "n_kalpana", "name": "Kalpana Square (Old Town)", "lat": 20.2564, "lng": 85.8398},
    {"id": "n_ag_square", "name": "AG Square / Secretariat", "lat": 20.2730, "lng": 85.8315},
    {"id": "n_crpf", "name": "CRPF Square", "lat": 20.2863, "lng": 85.8122},
    {"id": "n_fire_station", "name": "Fire Station Square (Baramunda)", "lat": 20.2785, "lng": 85.7954},
    {"id": "n_khandagiri", "name": "Khandagiri Square", "lat": 20.2568, "lng": 85.7852},
    {"id": "n_kalinga_nagar", "name": "Kalinga Nagar Square", "lat": 20.2642, "lng": 85.7610},
    {"id": "n_sum_hosp", "name": "SUM Hospital Junction", "lat": 20.2798, "lng": 85.7656},
    {"id": "n_airport", "name": "Biju Patnaik Airport Junction", "lat": 20.2530, "lng": 85.8175},
    {"id": "n_apollo", "name": "Apollo Sainik School Junction", "lat": 20.3088, "lng": 85.8340},
    {"id": "n_kalinga", "name": "Kalinga Hospital Junction", "lat": 20.3242, "lng": 85.8197},
    {"id": "n_capital_hosp", "name": "Capital Hospital Junction", "lat": 20.2638, "lng": 85.8267},
    {"id": "n_amri_khandagiri", "name": "AMRI Khandagiri Junction", "lat": 20.2585, "lng": 85.7890},
]

# Real Bhubaneswar & Khurda/Jatni Road Connections [from, to, distance_km, speed_kmh]
ROADS = [
    ["n_khurda_dhh", "n_janla", 12.0, 60],
    ["n_jatni", "n_janla", 4.5, 45],
    ["n_jatni", "n_khurda_dhh", 10.5, 50],
    ["n_janla", "n_tamando", 2.8, 55],
    ["n_tamando", "n_aiims_bbsr", 2.5, 50],
    ["n_aiims_bbsr", "n_khandagiri", 3.8, 45],
    ["n_khandagiri", "n_amri_khandagiri", 0.8, 35],
    ["n_khandagiri", "n_kalinga_nagar", 2.9, 40],
    ["n_kalinga_nagar", "n_sum_hosp", 2.1, 35],
    ["n_sum_hosp", "n_fire_station", 3.2, 40],
    ["n_khandagiri", "n_fire_station", 2.4, 45],
    ["n_fire_station", "n_crpf", 2.1, 45],
    ["n_crpf", "n_jaydev_vihar", 2.3, 40],
    ["n_jaydev_vihar", "n_kalinga_stadium", 1.0, 35],
    ["n_kalinga_stadium", "n_crpf", 1.8, 35],
    ["n_jaydev_vihar", "n_acharya_vihar", 1.2, 40],
    ["n_acharya_vihar", "n_apollo", 1.4, 35],
    ["n_acharya_vihar", "n_vani_vihar", 1.4, 40],
    ["n_vani_vihar", "n_rasulgarh", 2.2, 50],
    ["n_vani_vihar", "n_saheed_nagar", 0.9, 35],
    ["n_saheed_nagar", "n_master_canteen", 2.4, 35],
    ["n_master_canteen", "n_kalpana", 1.5, 35],
    ["n_master_canteen", "n_ag_square", 1.6, 35],
    ["n_ag_square", "n_capital_hosp", 1.2, 30],
    ["n_capital_hosp", "n_airport", 1.5, 35],
    ["n_airport", "n_kalpana", 2.4, 35],
    ["n_airport", "n_khandagiri", 4.5, 40],
    ["n_ag_square", "n_crpf", 2.6, 35],
    ["n_jaydev_vihar", "n_damana", 3.5, 40],
    ["n_apollo", "n_damana", 2.8, 35],
    ["n_damana", "n_kalinga", 0.8, 30],
    ["n_damana", "n_patia_kiit", 2.8, 45],
    ["n_patia_kiit", "n_infocity", 1.3, 40],
    ["n_infocity", "n_damana", 3.2, 40],
    ["n_rasulgarh", "n_kalpana", 4.8, 45],
]


def build_city_graph() -> CityGraph:
    graph = CityGraph()

    for data in INTERSECTIONS:
        node = Node(
            id=data["id"],
            name=data["name"],
            lat=data["lat"],
            lng=data["lng"],
            node_type="intersection",
        )
        graph.add_node(node)

    for h in HOSPITALS:
        node = Node(id=h["node"], name=h["name"], lat=h["lat"], lng=h["lng"], node_type="hospital")
        if h["node"] not in graph.nodes:
            graph.add_node(node)
        else:
            graph.nodes[h["node"]].node_type = "hospital"

    for road in ROADS:
        edge = Edge(
            from_node=road[0],
            to_node=road[1],
            distance_km=road[2],
            base_speed_kmh=road[3],
        )
        graph.add_edge(edge, bidirectional=True)

    return graph


def build_dispatch_engine(graph: CityGraph) -> DispatchEngine:
    engine = DispatchEngine(graph)

    for h in HOSPITALS:
        hosp = Hospital(
            id=h["id"],
            name=h["name"],
            lat=h["lat"],
            lng=h["lng"],
            nearest_node_id=h["node"],
            capacity=h["capacity"],
            current_patients=h["patients"],
            specialties=h["specialties"],
            er_beds_available=h["er_beds"],
            trauma_team_available=h["trauma_team"],
        )
        engine.add_hospital(hosp)

    for station in AMBULANCE_STATIONS:
        amb = Ambulance(
            id=station["id"],
            name=station["name"],
            lat=station["lat"],
            lng=station["lng"],
            nearest_node_id=station["node"],
        )
        engine.add_ambulance(amb)

    return engine
