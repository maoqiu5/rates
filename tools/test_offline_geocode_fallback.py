import importlib.util
from pathlib import Path
from urllib.error import URLError

module_path = Path(__file__).resolve().parents[1] / "scripts" / "rates_api.py"
spec = importlib.util.spec_from_file_location("rates_api", module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def refused(*_args, **_kwargs):
    raise URLError("[WinError 10061] connection refused")


module.http_json = refused

result = module.geocode_address("Milano, Italy")

assert result["countryCode"] == "IT", result
assert result["source"] in {"known-address", "known-fallback"}, result
assert abs(result["lat"] - 45.4642) < 0.02, result
assert abs(result["lon"] - 9.1900) < 0.02, result

module.os.environ["RATES_USE_OSRM"] = "0"
routes = module.calculate_truck_distances(result, stations=module.TRUCK_STATIONS[:3])

assert len(routes) == 3, routes
assert all(route["source"] == "estimate" for route in routes), routes

print("offline geocode fallback checks ok")
