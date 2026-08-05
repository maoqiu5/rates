(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CostCalculator = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  function moneyNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function containerGroup(containerType) {
    return String(containerType || '').startsWith('20') ? '20' : '40';
  }

  function owns(ruleOwnership, ownership) {
    return !ruleOwnership || ruleOwnership === '*' || String(ruleOwnership).toUpperCase() === String(ownership || '').toUpperCase();
  }

  function namesMatch(names, destinationName) {
    if (!names || !names.length) return true;
    const target = String(destinationName || '').toLowerCase();
    return names.some(name => target === String(name || '').toLowerCase() || target.includes(String(name || '').toLowerCase()));
  }

  function findPublicRate(railRateData, input) {
    return (railRateData && railRateData.rates || []).find(rate =>
      rate.borderCrossing === input.borderCrossing &&
      rate.destinationName === input.destinationName &&
      containerGroup(rate.containerType) === containerGroup(input.containerType) &&
      String(rate.ownership || '').toUpperCase() === String(input.ownership || '').toUpperCase()
    ) || null;
  }

  function findRailCostRule(costData, input) {
    const group = containerGroup(input.containerType);
    return (costData && costData.railCostRules || []).find(rule =>
      rule.borderCrossing === input.borderCrossing &&
      rule.containerGroup === group &&
      owns(rule.ownership, input.ownership) &&
      namesMatch(rule.destinationNames, input.destinationName)
    ) || null;
  }

  function calculateRailCost(costData, railRateData, input) {
    const rule = findRailCostRule(costData, input);
    if (!rule) {
      throw new Error('该组合暂无境外段成本规则');
    }
    if (rule.type === 'fixed_cost') {
      return {
        mode: 'rail_cost',
        costUsd: moneyNumber(rule.priceUsd),
        basePriceUsd: moneyNumber(rule.priceUsd),
        adjustmentUsd: 0,
        rule,
      };
    }
    const rate = findPublicRate(railRateData, input) || findPublicRate({ rates: costData && costData.railQuoteRates || [] }, input);
    if (!rate) {
      throw new Error('该组合暂无可用于成本计算的表价');
    }
    const basePriceUsd = moneyNumber(rate.priceUsd);
    const adjustmentUsd = moneyNumber(rule.amountUsd);
    return {
      mode: 'rail_cost',
      costUsd: Math.max(0, basePriceUsd + adjustmentUsd),
      basePriceUsd,
      adjustmentUsd,
      rate,
      rule,
    };
  }

  function findLeaseBase(costData, input) {
    const group = containerGroup(input.containerType);
    return (costData && costData.leaseBasePrices || []).find(item =>
      item.pickupPoint === input.pickupPoint &&
      item.containerGroup === group
    ) || null;
  }

  function findLeaseRule(costData, input) {
    const group = containerGroup(input.containerType);
    const rules = costData && costData.leaseRules || [];
    return rules.find(rule =>
      rule.borderCrossing === input.borderCrossing &&
      rule.containerGroup === group &&
      rule.pickupPoint === input.pickupPoint
    ) || rules.find(rule =>
      rule.borderCrossing === input.borderCrossing &&
      rule.containerGroup === group &&
      rule.pickupPoint === '*'
    ) || null;
  }

  function calculateContainerLease(costData, input) {
    const rule = findLeaseRule(costData, input);
    if (!rule) {
      throw new Error('该组合暂无TC租箱规则');
    }
    const base = findLeaseBase(costData, input);
    if (rule.type === 'fixed') {
      return {
        mode: 'container_lease',
        leaseUsd: moneyNumber(rule.priceUsd),
        basePriceUsd: base ? moneyNumber(base.priceUsd) : moneyNumber(rule.priceUsd),
        adjustmentUsd: base ? moneyNumber(rule.priceUsd) - moneyNumber(base.priceUsd) : 0,
        rule,
        base,
      };
    }
    if (!base) {
      throw new Error('该提箱点暂无表价');
    }
    const basePriceUsd = moneyNumber(base.priceUsd);
    const adjustmentUsd = moneyNumber(rule.amountUsd);
    return {
      mode: 'container_lease',
      leaseUsd: Math.max(0, basePriceUsd + adjustmentUsd),
      basePriceUsd,
      adjustmentUsd,
      rule,
      base,
    };
  }

  function availableCostOptions(costData, railRateData) {
    const railRules = costData && costData.railCostRules || [];
    const railBorders = Array.from(new Set(railRules.map(rule => rule.borderCrossing).filter(Boolean)));
    const destinationsByBorder = {};
    railBorders.forEach(border => {
      const fixedNames = railRules
        .filter(rule => rule.borderCrossing === border)
        .flatMap(rule => rule.destinationNames || []);
      const quotedNames = [...(railRateData && railRateData.rates || []), ...(costData && costData.railQuoteRates || [])]
        .filter(rate => railRules.some(rule =>
          rule.borderCrossing === rate.borderCrossing &&
          rule.borderCrossing === border &&
          rule.containerGroup === containerGroup(rate.containerType) &&
          owns(rule.ownership, rate.ownership)
        ))
        .map(rate => rate.destinationName);
      destinationsByBorder[border] = Array.from(new Set([...fixedNames, ...quotedNames].filter(Boolean)));
    });
    return {
      railBorders,
      destinationsByBorder,
      pickupPoints: Array.from(new Set((costData && costData.leaseBasePrices || []).map(item => item.pickupPoint).filter(Boolean))),
      leaseBorders: Array.from(new Set((costData && costData.leaseRules || []).map(rule => rule.borderCrossing).filter(Boolean))),
    };
  }

  return {
    calculateRailCost,
    calculateContainerLease,
    availableCostOptions,
    containerGroup,
  };
});
