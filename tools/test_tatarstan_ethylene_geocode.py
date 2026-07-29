import importlib.util
from pathlib import Path

module_path = Path(__file__).resolve().parents[1] / 'scripts' / 'rates_api.py'
spec = importlib.util.spec_from_file_location('rates_api', module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

address = 'Republic of Tatarstan, Tukayevsky Municipal District, Biklyanskoye Rural Settlement, territory of the industrial park "Ethylene 600'
candidates = module.truck_geocode_candidates(address)

assert any('Ethylene 600' in candidate and 'Russia' in candidate for candidate in candidates), candidates
assert any('Этилен 600' in candidate for candidate in candidates), candidates
assert any('Biklyan' in candidate and 'Tatarstan' in candidate for candidate in candidates), candidates

module.http_json = lambda *_args, **_kwargs: []
result = module.geocode_address(address)

assert result['countryCode'] == 'RU', result
assert result['source'] == 'known-fallback', result
assert 'Ethylene 600' in result['label'], result
assert abs(result['lat'] - 55.61) < 0.2, result
assert abs(result['lon'] - 52.12) < 0.2, result

print('tatarstan ethylene geocode checks ok')
