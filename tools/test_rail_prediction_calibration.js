const assert = require('assert');
const RailCalculator = require('../web/rail-calculator.js');

const spotRateData = {
  meta: { validUntil: '2026/07/31' },
  origin: { name: 'Zabaykalsk', lat: 49.65, lon: 117.32 },
  corridorNodes: [
    { name: 'Zabaykalsk', lat: 49.65, lon: 117.32 },
    { name: 'Chita', lat: 52.03, lon: 113.5 },
    { name: 'Omsk', lat: 54.99, lon: 73.37 },
    { name: 'Moscow', lat: 55.75, lon: 37.62 },
  ],
  rates: [
    { borderCrossing: '满洲里/后贝加尔', destinationName: 'Chelyabinsk', stationCode: '800101', containerType: '40HQ', lat: 55.1644, lon: 61.4368, routeDistanceKm: 4615, cocPriceUsd: 4630, socPriceUsd: 4630 },
    { borderCrossing: '满洲里/后贝加尔', destinationName: 'OMSK-VOSTOCHNY', stationCode: '831203', containerType: '40HQ', lat: 54.9893, lon: 73.3682, routeDistanceKm: 3480, cocPriceUsd: 4457, socPriceUsd: 4873 },
    { borderCrossing: '满洲里/后贝加尔', destinationName: 'LAGERNAYA, Kazan', stationCode: '250209', containerType: '40HQ', lat: 55.7908, lon: 49.1144, routeDistanceKm: 5202, cocPriceUsd: 5640, socPriceUsd: 5418 },
  ],
};
const marketFactors = {
  sources: [
    { id: 'utlc_services_rates_2026', name: 'UTLC ERA published transit rate PDFs', url: 'https://utlc.com/en/services/', signals: ['Published transit rate PDFs and rate scope.'] },
    { id: 'fesco_falb_service', name: 'FESCO land-border service map', url: 'https://www.fesco.com/', signals: ['Service map for land-border rail nodes.'] },
  ],
  defaults: { direction: 'westbound', seasonFactor: 1, confidence: 'medium' },
  directionFactors: { westbound: { multiplier: 1.03, label: 'westbound demand', sourceIds: ['utlc_services_rates_2026'] } },
  ownershipFactors: { COC: { multiplier: 1.01, label: 'COC equipment signal', sourceIds: ['fesco_falb_service'] } },
  borderFactors: { '满洲里/后贝加尔': { multiplier: 1, label: 'Zabaykalsk border signal', sourceIds: ['fesco_falb_service'] } },
  caps: { minMultiplier: 0.92, maxMultiplier: 1.14 },
};

const result = RailCalculator.predictSpotRailQuote(spotRateData, {
  borderCrossing: '满洲里/后贝加尔',
  destinationName: 'Chelyabinsk',
  containerType: '40HQ',
  ownership: 'COC',
  quantity: 1,
}, marketFactors);

assert(result.prediction, 'prediction payload missing');
assert(result.prediction.priceRangeUsd, 'prediction price range missing');
assert(Number.isFinite(result.prediction.priceRangeUsd.low), 'prediction range low missing');
assert(Number.isFinite(result.prediction.priceRangeUsd.high), 'prediction range high missing');
assert(result.prediction.priceRangeUsd.high > result.prediction.priceRangeUsd.low, 'prediction range must be ordered');
assert(result.prediction.evidence, 'prediction evidence summary missing');
assert(Array.isArray(result.prediction.evidence.sources), 'prediction evidence sources missing');
assert(result.prediction.evidence.sources.length > 0, 'prediction evidence sources should not be empty');
assert(result.prediction.evidence.level, 'prediction evidence level missing');

console.log('rail prediction calibration smoke passed');
