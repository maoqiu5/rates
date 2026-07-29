import importlib.util
from pathlib import Path

module_path = Path(__file__).resolve().parents[1] / 'scripts' / 'rates_api.py'
spec = importlib.util.spec_from_file_location('rates_api', module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

address = 'Panattoni Park Airport Brno Sinclair Hall C, enter 49-63 620 00 Brno Tuřany Czech Republic'
candidates = module.truck_geocode_candidates(address)

assert any('Letiště Brno-Tuřany 949/5' in candidate for candidate in candidates), candidates
assert any('Panattoni Park Brno Airport' in candidate and 'Czech Republic' in candidate for candidate in candidates), candidates
assert any('Evropská' in candidate and 'Brno' in candidate for candidate in candidates), candidates

module.http_json = lambda *_args, **_kwargs: []
result = module.geocode_address(address)

assert result['countryCode'] == 'CZ', result
assert result['source'] == 'known-fallback', result
assert 'Panattoni Park Brno Airport' in result['label'], result
assert abs(result['lat'] - 49.156185) < 0.02, result
assert abs(result['lon'] - 16.6963522) < 0.02, result

print('brno panattoni geocode checks ok')
