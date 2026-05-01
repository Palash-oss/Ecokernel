"""
Lightweight geocoding helpers using OpenStreetMap (Nominatim) with
OSRM/Photon fallback for resiliency. Intended for address suggestions
and reverse lookups without paid APIs.
"""

from typing import List, Optional, Dict, Tuple
import httpx
import time

_GEOCODE_CACHE: Dict[str, Tuple[float, List[Dict]]] = {}
_REVERSE_CACHE: Dict[str, Tuple[float, Dict]] = {}
_CACHE_TTL = 60 * 60  # 1 hour


def _normalize_query(query: str) -> str:
    return " ".join(query.strip().split())


def _get_cached(cache: Dict, key: str) -> Optional:
    entry = cache.get(key)
    if not entry:
        return None
    ts, value = entry
    if time.time() - ts > _CACHE_TTL:
        try:
            del cache[key]
        except KeyError:
            pass
        return None
    return value


def _set_cached(cache: Dict, key: str, value) -> None:
    cache[key] = (time.time(), value)


def search_places_async(query: str, limit: int = 8, country_code: str = "in") -> List[Dict]:
    """
    Search for address suggestions using Nominatim with Photon fallback.
    """
    q = _normalize_query(query)
    if not q:
        return []

    cache_key = f"{q}|{limit}|{country_code}"
    cached = _get_cached(_GEOCODE_CACHE, cache_key)
    if cached is not None:
        return cached

    headers = {"User-Agent": "EcoKernel/1.0"}

    try:
        resp = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": q,
                "format": "json",
                "addressdetails": 1,
                "limit": limit,
                "countrycodes": country_code,
            },
            headers=headers,
            timeout=8.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            results = []
            for item in data:
                name = item.get("display_name") or item.get("name") or q
                lat = float(item.get("lat"))
                lng = float(item.get("lon"))
                place_type = item.get("type") or item.get("class") or "place"
                results.append({"name": name, "lat": lat, "lng": lng, "type": place_type})

            _set_cached(_GEOCODE_CACHE, cache_key, results)
            return results
    except Exception:
        pass

    # Fallback to Photon
    try:
        resp = httpx.get(
            "https://photon.komoot.io/api/",
            params={
                "q": q,
                "limit": limit,
                "lat": 20.5937,
                "lon": 78.9629,
                "location_bias_scale": 0.9,
            },
            timeout=8.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            results = []
            for feature in data.get("features", []):
                props = feature.get("properties", {})
                name = props.get("name") or props.get("street") or props.get("city") or q
                sub = ", ".join(
                    [p for p in [props.get("street"), props.get("district"), props.get("city"), props.get("state")] if p]
                )
                label = f"{name}, {sub}" if sub else name
                coords = feature.get("geometry", {}).get("coordinates", [None, None])
                results.append({"name": label, "lat": coords[1], "lng": coords[0], "type": props.get("osm_value") or props.get("type") or "place"})

            _set_cached(_GEOCODE_CACHE, cache_key, results)
            return results
    except Exception:
        return []

    return []


def reverse_geocode_async(lat: float, lng: float, country_code: Optional[str] = "in") -> Optional[Dict]:
    cache_key = f"{round(lat, 5)},{round(lng, 5)}|{country_code}"
    cached = _get_cached(_REVERSE_CACHE, cache_key)
    if cached is not None:
        return cached

    headers = {"User-Agent": "EcoKernel/1.0"}
    try:
        resp = httpx.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "lat": lat,
                "lon": lng,
                "format": "json",
                "addressdetails": 1,
                "countrycodes": country_code,
            },
            headers=headers,
            timeout=8.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            name = data.get("display_name") or "My Location"
            result = {"name": name, "lat": lat, "lng": lng}
            _set_cached(_REVERSE_CACHE, cache_key, result)
            return result
    except Exception:
        return None

    return None


# Legacy sync names for backwards compatibility
def search_places(query: str, limit: int = 8, country_code: str = "in") -> List[Dict]:
    return search_places_async(query, limit, country_code)


def reverse_geocode(lat: float, lng: float, country_code: Optional[str] = "in") -> Optional[Dict]:
    return reverse_geocode_async(lat, lng, country_code)
