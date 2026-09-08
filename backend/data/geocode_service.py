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


def _clean_place_label(props: dict, fallback_q: str) -> str:
    raw_parts = [
        props.get("name"),
        props.get("street"),
        props.get("district"),
        props.get("city"),
        props.get("state"),
        props.get("country")
    ]
    seen = set()
    clean_parts = []
    for part in raw_parts:
        if part and str(part).strip():
            p_str = str(part).strip()
            p_lower = p_str.lower()
            if p_lower not in seen:
                seen.add(p_lower)
                clean_parts.append(p_str)
    return ", ".join(clean_parts) if clean_parts else fallback_q


def search_places_async(query: str, limit: int = 8, country_code: str = "in") -> List[Dict]:
    """
    Search for address suggestions using Photon / Nominatim with strict country code filtering (e.g. India)
    and deduplicated place labels.
    """
    q = _normalize_query(query)
    if not q:
        return []

    q_lower = q.lower().strip()
    
    # 1. Check local CITIES dictionary first if query is an exact single city name
    try:
        from config import CITIES
        for cname, cdata in CITIES.items():
            if q_lower == cname.lower():
                return [{
                    "name": f"{cname}, India",
                    "lat": cdata["lat"],
                    "lng": cdata["lng"],
                    "type": "city"
                }]
    except Exception:
        pass

    cache_key = f"{q}|{limit}|{country_code}"
    cached = _get_cached(_GEOCODE_CACHE, cache_key)
    if cached is not None:
        return cached

    headers = {"User-Agent": "EcoKernel-Logistics/2.0"}

    # 2. Query Photon Geocoding API with explicit countrycode parameter (e.g. 'in' for India)
    try:
        params = {
            "q": q,
            "limit": limit,
            "lat": 20.5937,
            "lon": 78.9629,
            "location_bias_scale": 0.9,
        }
        if country_code:
            params["countrycode"] = country_code

        resp = httpx.get(
            "https://photon.komoot.io/api/",
            params=params,
            headers=headers,
            timeout=5.0,
        )
        if resp.status_code == 200:
            features = resp.json().get("features", [])
            results = []
            for feat in features:
                props = feat.get("properties", {})
                coords = feat.get("geometry", {}).get("coordinates", [None, None])
                if coords[0] is not None and coords[1] is not None:
                    label = _clean_place_label(props, q)
                    results.append({
                        "name": label,
                        "lat": float(coords[1]),
                        "lng": float(coords[0]),
                        "type": props.get("osm_value") or "locality"
                    })
            if results:
                _set_cached(_GEOCODE_CACHE, cache_key, results)
                return results[:limit]
    except Exception:
        pass

    # 3. Fallback to Nominatim search with countrycodes filter
    try:
        params = {
            "q": q,
            "format": "json",
            "addressdetails": 1,
            "limit": limit,
        }
        if country_code:
            params["countrycodes"] = country_code

        resp = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params=params,
            headers=headers,
            timeout=6.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            results = []
            for item in data:
                addr = item.get("address", {})
                props = {
                    "name": item.get("name") or item.get("display_name", "").split(",")[0],
                    "city": addr.get("city") or addr.get("town") or addr.get("village"),
                    "state": addr.get("state"),
                    "country": addr.get("country")
                }
                label = _clean_place_label(props, item.get("display_name") or q)
                lat = float(item.get("lat"))
                lng = float(item.get("lon"))
                place_type = item.get("type") or item.get("class") or "place"
                results.append({"name": label, "lat": lat, "lng": lng, "type": place_type})

            if results:
                _set_cached(_GEOCODE_CACHE, cache_key, results)
                return results[:limit]
    except Exception:
        pass

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
