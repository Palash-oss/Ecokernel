import sqlite3
import datetime
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "contracts.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Contracts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            origin TEXT NOT NULL,
            destination TEXT NOT NULL,
            vehicle_type TEXT NOT NULL,
            fixed_cost_inr REAL NOT NULL,
            expiry_date TEXT NOT NULL,
            contract_type TEXT NOT NULL,
            is_demo INTEGER NOT NULL DEFAULT 0
        )
    ''')
    
    # Routes history table for storing calculated emissions and optimizations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS routes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            origin_address TEXT NOT NULL,
            destination_address TEXT NOT NULL,
            origin_lat REAL,
            origin_lng REAL,
            dest_lat REAL,
            dest_lng REAL,
            vehicle_type TEXT NOT NULL,
            load_tonnes REAL NOT NULL,
            total_distance_km REAL NOT NULL,
            total_time_minutes REAL NOT NULL,
            total_cost_inr REAL NOT NULL,
            total_co2_kg REAL NOT NULL,
            green_score REAL NOT NULL,
            strategy TEXT,
            route_geometry TEXT,
            segments_json TEXT
        )
    ''')

    # Migrate older databases that do not yet have the demo flag.
    cursor.execute("PRAGMA table_info(contracts)")
    existing_columns = {row[1] for row in cursor.fetchall()}
    if "is_demo" not in existing_columns:
        cursor.execute("ALTER TABLE contracts ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0")
    
    # Pre-seed some dummy contracts if empty
    cursor.execute("SELECT COUNT(*) FROM contracts")
    if cursor.fetchone()[0] == 0:
        seed_data = [
            ("Mumbai", "Delhi", "ashok_leyland_euro6", 35000.0, "2028-12-31", "Annual Line-haul"),
            ("Delhi", "Mumbai", "ashok_leyland_euro6", 35000.0, "2028-12-31", "Annual Line-haul"),
            ("Bangalore", "Chennai", "ashok_leyland_euro6", 12000.0, "2028-12-31", "Volume SLA"),
            ("Chennai", "Bangalore", "ashok_leyland_euro6", 12000.0, "2028-12-31", "Volume SLA"),
            ("Mumbai", "Pune", "tata_signa_cng", 5000.0, "2028-12-31", "Dedicated Fleet"),
        ]
        cursor.executemany(
            "INSERT INTO contracts (origin, destination, vehicle_type, fixed_cost_inr, expiry_date, contract_type, is_demo) VALUES (?, ?, ?, ?, ?, ?, 1)",
            seed_data
        )
        conn.commit()
    else:
        # If the database already exists, mark the built-in sample contracts as demo only.
        demo_rows = [
            ("Mumbai", "Delhi", "ashok_leyland_euro6", 35000.0, "2028-12-31", "Annual Line-haul"),
            ("Delhi", "Mumbai", "ashok_leyland_euro6", 35000.0, "2028-12-31", "Annual Line-haul"),
            ("Bangalore", "Chennai", "ashok_leyland_euro6", 12000.0, "2028-12-31", "Volume SLA"),
            ("Chennai", "Bangalore", "ashok_leyland_euro6", 12000.0, "2028-12-31", "Volume SLA"),
            ("Mumbai", "Pune", "tata_signa_cng", 5000.0, "2028-12-31", "Dedicated Fleet"),
        ]
        cursor.executemany(
            """
            UPDATE contracts
            SET is_demo = 1
            WHERE origin = ? AND destination = ? AND vehicle_type = ?
              AND fixed_cost_inr = ? AND expiry_date = ? AND contract_type = ?
            """,
            demo_rows,
        )
        conn.commit()
    conn.close()

def get_all_contracts():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM contracts ORDER BY expiry_date DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_active_contracts_dict():
    """Returns a dictionary formatted for O(1) solver access: {(origin.lower(), destination.lower(), vehicle_type): cost}"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    today = datetime.date.today().isoformat()
    # Pull active contracts that haven't expired
    cursor.execute('''
        SELECT origin, destination, vehicle_type, fixed_cost_inr 
        FROM contracts
        WHERE expiry_date >= ?
    ''', (today,))
    
    contracts = {}
    for origin, dest, veh, cost in cursor.fetchall():
        # Taking lowest cost if multiple valid ones exist
        key = (origin.strip().lower(), dest.strip().lower(), veh.strip())
        if key not in contracts or cost < contracts[key]:
            contracts[key] = cost
            
    conn.close()
    return contracts

def add_contract(origin, destination, vehicle_type, fixed_cost_inr, expiry_date, contract_type):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO contracts (origin, destination, vehicle_type, fixed_cost_inr, expiry_date, contract_type)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (origin, destination, vehicle_type, fixed_cost_inr, expiry_date, contract_type))
    contract_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return contract_id

def delete_contract(contract_id: int):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM contracts WHERE id = ?", (contract_id,))
    conn.commit()
    conn.close()


def save_route(
    origin_address: str,
    destination_address: str,
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    vehicle_type: str,
    load_tonnes: float,
    total_distance_km: float,
    total_time_minutes: float,
    total_cost_inr: float,
    total_co2_kg: float,
    green_score: float,
    strategy: str = None,
    route_geometry=None,
    segments_json: str = None,
):
    """
    Save a calculated route to the database.
    
    Args:
        origin_address: Origin address string
        destination_address: Destination address string
        origin_lat/lng: Origin coordinates
        dest_lat/lng: Destination coordinates
        vehicle_type: Vehicle ID/type
        load_tonnes: Cargo load
        total_distance_km: Total route distance
        total_time_minutes: Total travel time
        total_cost_inr: Total estimated cost
        total_co2_kg: Total CO2 emissions
        green_score: Green score 0-100
        strategy: Route strategy (fastest/greenest/balanced)
        route_geometry: Geometry coordinates (GeoJSON format)
        segments_json: JSON string of route segments
    
    Returns:
        Route ID if saved, None on error
    """
    import json
    from datetime import datetime
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Convert geometry to JSON if needed
        if isinstance(route_geometry, list):
            route_geometry = json.dumps(route_geometry)
        
        cursor.execute('''
            INSERT INTO routes (
                created_at, origin_address, destination_address,
                origin_lat, origin_lng, dest_lat, dest_lng,
                vehicle_type, load_tonnes,
                total_distance_km, total_time_minutes, total_cost_inr,
                total_co2_kg, green_score, strategy, route_geometry, segments_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            datetime.now().isoformat(),
            origin_address,
            destination_address,
            origin_lat,
            origin_lng,
            dest_lat,
            dest_lng,
            vehicle_type,
            load_tonnes,
            total_distance_km,
            total_time_minutes,
            total_cost_inr,
            total_co2_kg,
            green_score,
            strategy,
            route_geometry,
            segments_json,
        ))
        
        route_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return route_id
    except Exception as e:
        print(f"Error saving route: {e}")
        return None


def get_route_history(limit: int = 100, offset: int = 0):
    """Retrieve recent calculated routes."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM routes 
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ''', (limit, offset))
        
        rows = cursor.fetchall()
        conn.close()
        
        # Convert JSON strings back to objects
        import json
        results = []
        for r in rows:
            row_dict = dict(r)
            try:
                if row_dict.get('route_geometry'):
                    row_dict['route_geometry'] = json.loads(row_dict['route_geometry'])
                if row_dict.get('segments_json'):
                    row_dict['segments_json'] = json.loads(row_dict['segments_json'])
            except:
                pass  # Keep as strings if parsing fails
            results.append(row_dict)
        
        return results
    except Exception as e:
        print(f"Error retrieving route history: {e}")
        return []


def get_route_emission_stats():
    """Get statistics on emissions from saved routes."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                COUNT(*) as total_routes,
                SUM(total_co2_kg) as total_co2,
                AVG(total_co2_kg) as avg_co2,
                MIN(total_co2_kg) as min_co2,
                MAX(total_co2_kg) as max_co2,
                SUM(total_distance_km) as total_distance,
                SUM(total_cost_inr) as total_cost
            FROM routes
        ''')
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {
                'total_routes': result[0],
                'total_co2_kg': result[1],
                'avg_co2_kg': result[2],
                'min_co2_kg': result[3],
                'max_co2_kg': result[4],
                'total_distance_km': result[5],
                'total_cost_inr': result[6],
            }
        return {}
    except Exception as e:
        print(f"Error getting emission stats: {e}")
        return {}

# Initialize DB on load
init_db()
