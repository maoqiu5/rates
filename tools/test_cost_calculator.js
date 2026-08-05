const assert = require('assert');
const CostCalculator = require('../web/cost-calculator.js');

const railRates = {
  rates: [
    { borderCrossing: 'A', destinationName: 'Dest', containerType: '40', ownership: 'SOC', priceUsd: 1000 },
    { borderCrossing: 'A', destinationName: 'Dest', containerType: '40', ownership: 'COC', priceUsd: 1100 },
    { borderCrossing: 'A', destinationName: 'Dest', containerType: '20<24ton', ownership: 'SOC', priceUsd: 500 },
  ],
};

const costData = {
  meta: { validFrom: '2026/08/01', validUntil: '2026/08/31', currency: 'USD' },
  railCostRules: [
    { id: 'a_40_soc_discount', type: 'quote_discount', borderCrossing: 'A', containerGroup: '40', ownership: 'SOC', amountUsd: -230 },
    { id: 'a_40_coc_discount', type: 'quote_discount', borderCrossing: 'A', containerGroup: '40', ownership: 'COC', amountUsd: -200 },
    { id: 'a_20_table', type: 'quote_discount', borderCrossing: 'A', containerGroup: '20', ownership: '*', amountUsd: 0 },
    { id: 'b_selyatino_fixed', type: 'fixed_cost', borderCrossing: 'B', destinationNames: ['Selyatino'], containerGroup: '40', ownership: '*', priceUsd: 4300 },
  ],
  leaseBasePrices: [
    { pickupPoint: 'Taicang', containerGroup: '40', priceUsd: 2100 },
    { pickupPoint: 'Tianjin', containerGroup: '40', priceUsd: 1800 },
    { pickupPoint: 'Taicang', containerGroup: '20', priceUsd: 500 },
  ],
  leaseRules: [
    { id: 'a_40_taicang_fixed', borderCrossing: 'A', containerGroup: '40', pickupPoint: 'Taicang', type: 'fixed', priceUsd: 1950 },
    { id: 'a_40_tianjin_discount', borderCrossing: 'A', containerGroup: '40', pickupPoint: 'Tianjin', type: 'base_discount', amountUsd: -150 },
    { id: 'a_20_all_discount', borderCrossing: 'A', containerGroup: '20', pickupPoint: '*', type: 'base_discount', amountUsd: -100 },
  ],
};

let result = CostCalculator.calculateRailCost(costData, railRates, {
  borderCrossing: 'A',
  destinationName: 'Dest',
  containerType: '40',
  ownership: 'SOC',
});
assert.strictEqual(result.costUsd, 770);
assert.strictEqual(result.basePriceUsd, 1000);

result = CostCalculator.calculateRailCost(costData, railRates, {
  borderCrossing: 'A',
  destinationName: 'Dest',
  containerType: '20<24ton',
  ownership: 'SOC',
});
assert.strictEqual(result.costUsd, 500);

result = CostCalculator.calculateRailCost(costData, railRates, {
  borderCrossing: 'B',
  destinationName: 'Selyatino',
  containerType: '40',
  ownership: 'COC',
});
assert.strictEqual(result.costUsd, 4300);

result = CostCalculator.calculateContainerLease(costData, {
  borderCrossing: 'A',
  containerType: '40',
  pickupPoint: 'Taicang',
});
assert.strictEqual(result.leaseUsd, 1950);

result = CostCalculator.calculateContainerLease(costData, {
  borderCrossing: 'A',
  containerType: '40',
  pickupPoint: 'Tianjin',
});
assert.strictEqual(result.leaseUsd, 1650);

result = CostCalculator.calculateContainerLease(costData, {
  borderCrossing: 'A',
  containerType: '20<24ton',
  pickupPoint: 'Taicang',
});
assert.strictEqual(result.leaseUsd, 400);

console.log('cost calculator smoke passed');
