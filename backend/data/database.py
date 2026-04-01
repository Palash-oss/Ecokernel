import sqlite3
import datetime
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "contracts.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            origin TEXT NOT NULL,
            destination TEXT NOT NULL,
            vehicle_type TEXT NOT NULL,
            fixed_cost_inr REAL NOT NULL,
            expiry_date TEXT NOT NULL,
            contract_type TEXT NOT NULL
        )
    ''')
    
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
            "INSERT INTO contracts (origin, destination, vehicle_type, fixed_cost_inr, expiry_date, contract_type) VALUES (?, ?, ?, ?, ?, ?)",
            seed_data
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
    """Returns a dictionary formatted for O(1) solver access: {(origin, destination, vehicle_type): cost}"""
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
        key = (origin, dest, veh)
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

# Initialize DB on load
init_db()
