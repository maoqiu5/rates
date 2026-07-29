import importlib.util
from pathlib import Path


root = Path(__file__).resolve().parents[1]
module_path = root / "scripts" / "rates_api.py"
spec = importlib.util.spec_from_file_location("rates_api", module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

stations = {station["slug"]: station for station in module.TRUCK_STATIONS}
station = stations["krugloe-pole-siding"]

assert station["stationGroup"] == "russia", station
assert station["countryCode"] == "RU", station
assert "Krugloe Pole" in station["name"], station
assert "ECP 64840" in station["sourceNote"], station
assert abs(station["lat"] - 55.619347) < 0.0001, station
assert abs(station["lon"] - 52.172053) < 0.0001, station

schema = (root / "schema" / "RATES_SQLITE_SCHEMA.sql").read_text(encoding="utf-8")
assert "krugloe-pole-siding" in schema
assert "55.619347" in schema
assert "52.172053" in schema

print("krugloe pole station checks ok")
