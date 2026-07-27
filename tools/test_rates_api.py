import importlib.util
from pathlib import Path

module_path = Path('scripts/rates_api.py')
spec = importlib.util.spec_from_file_location('rates_api', module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.DEFAULT_DB_PATH.endswith('/root/apps/rates/data/rates/rates.db')
assert module.DEFAULT_SCHEMA_PATH.endswith('/root/apps/rates/schema/RATES_SQLITE_SCHEMA.sql')
assert 'rates' in module.HTTP_USER_AGENT.lower()
assert hasattr(module, 'calculate_truck_freight_model')
assert hasattr(module, 'load_truck_stations')
assert hasattr(module, 'load_truck_market_references')
model = module.calculate_truck_freight_model(100, {'countryCode': 'DE'}, {'countryCode': 'DE'})
assert model['totalEur'] >= module.TRUCK_FREIGHT_MIN_EUR
print('rates api smoke passed')
