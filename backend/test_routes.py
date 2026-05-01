#!/usr/bin/env python3
"""Quick test of route alternatives generation."""
import sys
sys.path.insert(0, '.')
from data.route_service import get_route_alternatives
import json

# Test with Mumbai to Vasai
coords_origin = [72.8409, 19.0544]  # lng, lat
coords_dest = [72.7845, 19.6329]

print("Testing route alternatives generation...")
routes = get_route_alternatives(coords_origin, coords_dest, max_alternatives=3)
print(f"\nGenerated {len(routes)} alternatives:")
print(json.dumps(routes, indent=2))
