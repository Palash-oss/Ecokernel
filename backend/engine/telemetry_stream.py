"""
EcoKernel Real-Time WebSocket Telemetry Streamer

Simulates live OBD-II vehicle telemetry streams (GPS coordinates, battery State of Charge (SOC),
motor temperature, speed, payload weight) and broadcasts live JSON packets to connected WebSockets.
"""

import asyncio
import json
import math
from typing import List, Dict, Any, Set
from fastapi import WebSocket

class TelemetryBroadcaster:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.vehicles = [
            {
                "id": "EV-MH-04",
                "name": "Mahindra Blazo EV Heavy",
                "type": "electric",
                "lat": 19.0760,
                "lng": 72.8777,
                "target_lat": 28.6139,
                "target_lng": 77.2090,
                "speed_kmh": 68.0,
                "soc_percent": 88.0,
                "motor_temp_c": 42.0,
                "payload_tonnes": 14.5,
                "status": "OPTIMAL_TRANSIT"
            },
            {
                "id": "DL-01-AX",
                "name": "Ashok Leyland Euro-6",
                "type": "euro6_diesel",
                "lat": 28.6139,
                "lng": 77.2090,
                "target_lat": 12.9716,
                "target_lng": 77.5946,
                "speed_kmh": 74.5,
                "soc_percent": 100.0,
                "motor_temp_c": 82.0,
                "payload_tonnes": 18.0,
                "status": "LINEHAUL"
            },
            {
                "id": "KA-05-EV",
                "name": "Tata Prima EV Express",
                "type": "electric",
                "lat": 12.9716,
                "lng": 77.5946,
                "target_lat": 13.0827,
                "target_lng": 80.2707,
                "speed_kmh": 58.0,
                "soc_percent": 34.0,
                "motor_temp_c": 51.5,
                "payload_tonnes": 10.0,
                "status": "LOW_BATTERY_WARNING"
            }
        ]
        self._running = False

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        print(f"[WebSocket Telemetry] Client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"[WebSocket Telemetry] Client disconnected. Total active: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        if not self.active_connections:
            return
        
        dead_sockets = set()
        msg_text = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(msg_text)
            except Exception:
                dead_sockets.add(connection)

        for dead in dead_sockets:
            self.active_connections.remove(dead)

    def _update_vehicle_positions(self):
        """Simulate micro-movements and sensor battery drain."""
        for v in self.vehicles:
            # Step position slightly towards target
            d_lat = (v["target_lat"] - v["lat"]) * 0.005
            d_lng = (v["target_lng"] - v["lng"]) * 0.005
            
            v["lat"] += d_lat
            v["lng"] += d_lng
            
            # Speed micro fluctuation
            v["speed_kmh"] = round(v["speed_kmh"] + (math.sin(v["lat"]) * 1.5), 1)

            # Battery SOC drain for EVs
            if v["type"] == "electric":
                v["soc_percent"] = max(5.0, round(v["soc_percent"] - 0.15, 1))
                if v["soc_percent"] < 20.0:
                    v["status"] = "REROUTING_CHARGING"
                else:
                    v["status"] = "OPTIMAL_TRANSIT"

    async def start_broadcasting(self):
        """Background broadcasting loop."""
        self._running = True
        while self._running:
            if self.active_connections:
                self._update_vehicle_positions()
                packet = {
                    "type": "TELEMETRY_STREAM",
                    "timestamp": asyncio.get_event_loop().time(),
                    "vehicles": self.vehicles
                }
                await self.broadcast(packet)
            await asyncio.sleep(2.0)

# Global singleton broadcaster
telemetry_broadcaster = TelemetryBroadcaster()
