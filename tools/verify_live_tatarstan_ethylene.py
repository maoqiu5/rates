import json
import urllib.parse
import urllib.request


address = 'Republic of Tatarstan, Tukayevsky Municipal District, Biklyanskoye Rural Settlement, territory of the industrial park "Ethylene 600'
query = urllib.parse.urlencode({"address": address})
url = f"http://172.19.0.1:8025/api/truck-distance?{query}"

with urllib.request.urlopen(url, timeout=60) as response:
    data = json.loads(response.read().decode("utf-8"))

first = data["items"][0]
assert data["destination"]["countryCode"] == "RU", data["destination"]
assert data["meta"]["stationGroup"] == "russia", data["meta"]
assert first["station"]["slug"] == "krugloe-pole-siding", first

print(
    "live_tatarstan_ethylene_ok",
    data["destination"]["source"],
    first["station"]["slug"],
    first["distanceKm"],
    first["freightEur"],
)
