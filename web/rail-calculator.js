(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RailCalculator = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  function moneyNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function findRate(rateData, input) {
    return (rateData.rates || []).find(rate =>
      rate.borderCrossing === input.borderCrossing &&
      rate.destinationName === input.destinationName &&
      rate.containerType === input.containerType &&
      rate.ownership === input.ownership
    );
  }

  function isFortyFoot(input) {
    return String(input.containerType || '').startsWith('40');
  }

  function degToRad(value) {
    return value * Math.PI / 180;
  }

  function distanceBetween(a, b) {
    const radiusKm = 6371;
    const dLat = degToRad(b.lat - a.lat);
    const dLon = degToRad(b.lon - a.lon);
    const lat1 = degToRad(a.lat);
    const lat2 = degToRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * radiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function routeDistance(nodes) {
    let total = 0;
    for (let i = 1; i < nodes.length; i++) {
      total += distanceBetween(nodes[i - 1], nodes[i]);
    }
    return Math.round(total);
  }

  function isSamePoint(a, b) {
    return Math.abs(a.lat - b.lat) < 0.15 && Math.abs(a.lon - b.lon) < 0.15;
  }

  function buildRailRoute(rateData, input) {
    const network = rateData.routeNetwork || {};
    const corridor = network.corridors && network.corridors[input.borderCrossing];
    const destination = network.destinations && network.destinations[input.destinationName];
    if (!corridor || !destination) {
      throw new Error('该线路暂无路径数据');
    }
    const nodes = (corridor.nodes || []).map(node => ({ ...node, role: node.role || 'corridor' }));
    const destinationNode = { ...destination, role: 'destination' };
    const finalNodes = nodes.length && isSamePoint(nodes[nodes.length - 1], destinationNode)
      ? [...nodes.slice(0, -1), destinationNode]
      : [...nodes, destinationNode];
    return {
      borderCrossing: input.borderCrossing,
      destinationName: input.destinationName,
      corridorName: corridor.name || input.borderCrossing,
      nodes: finalNodes,
      distanceKm: routeDistance(finalNodes),
      distanceBasis: network.distanceBasis || 'corridor_polyline_estimate',
    };
  }

  function findObservedRoute(rateData, rate) {
    const tracking = rateData.trackingRoutes || {};
    const patterns = tracking.destinationPatterns || [];
    const exact = patterns.find(pattern =>
      pattern.borderCrossing === rate.borderCrossing &&
      pattern.destination === rate.destinationName
    );
    const fallback = patterns.find(pattern => pattern.destination === rate.destinationName);
    const match = exact || fallback;
    if (!match) return null;
    return {
      ...match,
      matchType: exact ? 'border_destination' : 'destination_only',
      basis: tracking.meta && tracking.meta.basis,
    };
  }

  function findSpotRate(spotRateData, input) {
    const ownership = String(input.ownership || '').toUpperCase();
    return (spotRateData && spotRateData.rates || []).find(rate =>
      rate.borderCrossing === input.borderCrossing &&
      rate.destinationName === input.destinationName &&
      rate.containerType === (input.containerType || '40HQ') &&
      (
        (ownership === 'COC' && rate.cocPriceUsd != null) ||
        (ownership === 'SOC' && rate.socPriceUsd != null) ||
        (rate.predictionOnly && (rate.ownerships || []).includes(ownership))
      )
    ) || null;
  }

  function summarizeSpotRates(spotRateData) {
    const rates = spotRateData && spotRateData.rates || [];
    const prices = [];
    rates.forEach(rate => {
      if (rate.cocPriceUsd != null) prices.push(rate.cocPriceUsd);
      if (rate.socPriceUsd != null) prices.push(rate.socPriceUsd);
    });
    const sorted = prices.slice().sort((a, b) => a - b);
    const average = sorted.length ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : 0;
    return {
      recordCount: rates.length,
      priceCount: prices.length,
      minPriceUsd: sorted.length ? sorted[0] : null,
      maxPriceUsd: sorted.length ? sorted[sorted.length - 1] : null,
      averagePriceUsd: Number(average.toFixed(0)),
    };
  }

  function spotPriceForOwnership(rate, ownership) {
    return String(ownership || '').toUpperCase() === 'SOC' ? rate.socPriceUsd : rate.cocPriceUsd;
  }

  function fitSpotPriceModel(spotRateData, ownership) {
    const samples = (spotRateData && spotRateData.rates || [])
      .map(rate => ({ distanceKm: moneyNumber(rate.routeDistanceKm), priceUsd: moneyNumber(spotPriceForOwnership(rate, ownership)) }))
      .filter(sample => sample.distanceKm > 0 && sample.priceUsd > 0);
    if (!samples.length) {
      throw new Error('散点报价样本不足，无法预测');
    }
    const avgX = samples.reduce((sum, sample) => sum + sample.distanceKm, 0) / samples.length;
    const avgY = samples.reduce((sum, sample) => sum + sample.priceUsd, 0) / samples.length;
    const numerator = samples.reduce((sum, sample) => sum + (sample.distanceKm - avgX) * (sample.priceUsd - avgY), 0);
    const denominator = samples.reduce((sum, sample) => sum + (sample.distanceKm - avgX) ** 2, 0);
    const slope = denominator ? numerator / denominator : avgY / avgX;
    const intercept = avgY - slope * avgX;
    const residuals = samples.map(sample => Math.abs(sample.priceUsd - (intercept + slope * sample.distanceKm)));
    residuals.sort((a, b) => a - b);
    const medianResidual = residuals[Math.floor(residuals.length / 2)] || 0;
    return {
      ownership: String(ownership || 'COC').toUpperCase(),
      sampleCount: samples.length,
      interceptUsd: Number(intercept.toFixed(0)),
      slopeUsdPerKm: Number(slope.toFixed(4)),
      medianResidualUsd: Number(medianResidual.toFixed(0)),
    };
  }

  function buildSpotRoute(spotRateData, spotRate) {
    const origin = spotRateData.origin || { name: 'Zabaykalsk', lat: 49.65, lon: 117.32 };
    const corridorNodes = spotRateData.corridorNodes || [origin];
    const destination = {
      name: spotRate.destinationName,
      stationCode: spotRate.stationCode,
      lat: spotRate.lat,
      lon: spotRate.lon,
      role: 'destination',
    };
    if (!destination.lat || !destination.lon) {
      throw new Error('该目的站缺少坐标，无法按路线公里预测');
    }
    let nodes;
    if (destination.lon > origin.lon) {
      nodes = [{ ...origin, role: 'border' }, destination];
    } else {
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      corridorNodes.forEach((node, index) => {
        const distance = distanceBetween(node, destination);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      nodes = corridorNodes.slice(0, nearestIndex + 1).map((node, index) => ({
        ...node,
        role: index === 0 ? 'border' : 'corridor',
      })).concat(destination);
    }
    return {
      borderCrossing: spotRate.borderCrossing,
      destinationName: spotRate.destinationName,
      corridorName: `${spotRate.borderCrossing} - 散点预测通道`,
      nodes: spotRate.routeNodes || nodes,
      distanceKm: moneyNumber(spotRate.routeDistanceKm) || routeDistance(nodes),
      distanceBasis: spotRate.distanceBasis || (spotRateData.meta && spotRateData.meta.distanceBasis) || 'estimated spot route',
    };
  }

  function normalizePredictionContainer(containerType) {
    return String(containerType || '').startsWith('40') ? '40HQ' : String(containerType || '40HQ');
  }

  function predictionKey(...parts) {
    return parts.map(part => String(part || '')).join('||');
  }

  function buildPredictionRateData(spotRateData, publicRateData) {
    const merged = {
      ...(spotRateData || {}),
      rates: [...(spotRateData && spotRateData.rates || [])],
    };
    const existing = new Set(merged.rates.map(rate => predictionKey(rate.borderCrossing, rate.destinationName, rate.containerType)));
    const quoteGroups = new Map();
    (publicRateData && publicRateData.rates || []).forEach(rate => {
      const containerType = normalizePredictionContainer(rate.containerType);
      if (containerType !== '40HQ') return;
      const key = predictionKey(rate.borderCrossing, rate.destinationName, containerType);
      const group = quoteGroups.get(key) || {
        borderCrossing: rate.borderCrossing,
        destinationName: rate.destinationName,
        stationCode: rate.stationCode,
        containerType,
        ownerships: [],
        anchorPricesByOwnership: {},
        operatorCode: publicRateData && publicRateData.meta && publicRateData.meta.operatorCode,
        operatorName: publicRateData && publicRateData.meta && publicRateData.meta.operatorName,
      };
      if (rate.ownership && !group.ownerships.includes(rate.ownership)) group.ownerships.push(rate.ownership);
      if (rate.ownership && moneyNumber(rate.priceUsd) > 0) group.anchorPricesByOwnership[rate.ownership] = moneyNumber(rate.priceUsd);
      if (!group.stationCode && rate.stationCode) group.stationCode = rate.stationCode;
      quoteGroups.set(key, group);
    });
    quoteGroups.forEach(group => {
      const key = predictionKey(group.borderCrossing, group.destinationName, group.containerType);
      if (existing.has(key)) return;
      let route = null;
      try {
        route = buildRailRoute(publicRateData, group);
      } catch (_) {
        route = null;
      }
      const destinations = publicRateData && publicRateData.routeNetwork && publicRateData.routeNetwork.destinations || {};
      const destination = destinations[group.destinationName] || {};
      merged.rates.push({
        ...group,
        predictionOnly: true,
        predictionSource: 'public_quote_station',
        lat: destination.lat,
        lon: destination.lon,
        routeNodes: route && route.nodes,
        routeDistanceKm: route && route.distanceKm,
        distanceBasis: route && route.distanceBasis || 'public quote route network',
      });
    });
    return merged;
  }

  function matchMarketRegion(marketFactors, destinationName) {
    const text = String(destinationName || '').toLowerCase();
    return (marketFactors && marketFactors.regionFactors || []).find(region =>
      (region.destinationPatterns || []).some(pattern => text.includes(String(pattern || '').toLowerCase()))
    ) || null;
  }

  function capMultiplier(value, caps) {
    const min = caps && moneyNumber(caps.minMultiplier) || 0;
    const max = caps && moneyNumber(caps.maxMultiplier) || 0;
    if (min && value < min) return min;
    if (max && value > max) return max;
    return value;
  }

  function calculateMarketAdjustment(marketFactors, input, spotRate) {
    if (!marketFactors) return { multiplier: 1, factors: [], capped: false };
    const ownership = String(input.ownership || '').toUpperCase();
    const factors = [];
    const addFactor = (id, config) => {
      if (!config || !moneyNumber(config.multiplier)) return;
      factors.push({
        id,
        label: config.label || id,
        multiplier: moneyNumber(config.multiplier),
        sourceIds: config.sourceIds || [],
      });
    };
    const direction = input.direction || (marketFactors.defaults && marketFactors.defaults.direction) || 'westbound';
    addFactor(`direction_${direction}`, marketFactors.directionFactors && marketFactors.directionFactors[direction]);
    addFactor(`ownership_${ownership}`, marketFactors.ownershipFactors && marketFactors.ownershipFactors[ownership]);
    addFactor(`border_${spotRate.borderCrossing}`, marketFactors.borderFactors && marketFactors.borderFactors[spotRate.borderCrossing]);
    Object.entries(marketFactors.transitPlatformFactors || {}).forEach(([id, config]) => {
      if ((config.appliesToBorders || []).includes(spotRate.borderCrossing)) addFactor(id, config);
    });
    const region = matchMarketRegion(marketFactors, spotRate.destinationName);
    if (region) addFactor(region.id, region);
    addFactor('season', { multiplier: marketFactors.defaults && marketFactors.defaults.seasonFactor, label: '季节/当前月度系数' });
    const rawMultiplier = factors.reduce((value, factor) => value * factor.multiplier, 1);
    const multiplier = capMultiplier(rawMultiplier, marketFactors.caps);
    return {
      version: marketFactors.meta && marketFactors.meta.version,
      multiplier: Number(multiplier.toFixed(4)),
      rawMultiplier: Number(rawMultiplier.toFixed(4)),
      capped: Math.abs(multiplier - rawMultiplier) > 0.0001,
      factors,
      confidence: marketFactors.defaults && marketFactors.defaults.confidence,
      sources: marketFactors.sources || [],
    };
  }

  function summarizePredictionEvidence(marketFactors, spotRate, publicQuotePriceUsd, executionAdjustments, market) {
    const factorSources = [];
    (market && market.factors || []).forEach(factor => {
      (factor.sourceIds || []).forEach(sourceId => factorSources.push(sourceId));
    });
    const publicSources = (marketFactors && marketFactors.sources || []).map(source => ({
      id: source.id,
      name: source.name,
      url: source.url,
      signals: source.signals || [],
    }));
    const uniqueFactorSources = Array.from(new Set(factorSources));
    const hasDirectAnchor = publicQuotePriceUsd > 0;
    const hasRateLikeSource = publicSources.some(source => /rate|tariff|price/i.test([source.id, source.name].join(' ')));
    const evidenceLevel = hasDirectAnchor ? '高' : (hasRateLikeSource || uniqueFactorSources.length >= 4 ? '中' : '低');
    const bandPct = hasDirectAnchor ? 0.06 : (hasRateLikeSource ? 0.10 : 0.15);
    const sampleSources = publicSources.slice(0, 4).map(source => ({
      id: source.id,
      name: source.name,
      signals: source.signals.slice(0, 2),
    }));
    return {
      level: evidenceLevel,
      bandPct: Number(bandPct.toFixed(2)),
      sources: sampleSources,
      sourceCount: publicSources.length,
      factorSourceCount: uniqueFactorSources.length,
      directAnchor: hasDirectAnchor ? {
        priceUsd: publicQuotePriceUsd,
        executionAdjustments: executionAdjustments || [],
      } : null,
      basis: hasDirectAnchor
        ? 'public quote anchor'
        : hasRateLikeSource
          ? 'public tariff / market sources'
          : 'route km model',
      routeKm: spotRate && spotRate.routeDistanceKm || null,
    };
  }

  function anchorExecutionAdjustments(marketFactors, spotRate) {
    return (marketFactors && marketFactors.executionAdjustments || []).filter(rule =>
      rule.appliesTo === 'public_quote_anchor' &&
      (!rule.operatorCode || rule.operatorCode === spotRate.operatorCode) &&
      (!rule.borderCrossing || rule.borderCrossing === spotRate.borderCrossing) &&
      (!rule.containerType || rule.containerType === spotRate.containerType)
    ).map(rule => ({
      id: rule.id,
      label: rule.label || rule.id,
      amountUsd: moneyNumber(rule.amountUsd),
      source: rule.source,
    }));
  }

  function matchingSupplierSources(supplierData, input) {
    const border = input && input.borderCrossing;
    const sources = supplierData && supplierData.sources || [];
    const usageRank = {
      quote_anchor: 0,
      official_tariff_component: 1,
      transit_platform_signal: 2,
      supplier_reference: 3,
      market_signal: 4,
      europe_end_reference: 5,
    };
    return sources
      .filter(source => {
        const borders = source.borderCrossings || [];
        return borders.includes('*') || borders.includes(border);
      })
      .sort((a, b) => (usageRank[a.usage] ?? 9) - (usageRank[b.usage] ?? 9));
  }

  function predictSpotRailQuote(spotRateData, input, marketFactors) {
    const spotRate = findSpotRate(spotRateData, {
      borderCrossing: input.borderCrossing,
      destinationName: input.destinationName,
      containerType: input.containerType || '40HQ',
      ownership: input.ownership,
    });
    if (!spotRate) {
      throw new Error('该组合暂无散点站预测样本');
    }
    const ownership = String(input.ownership || 'COC').toUpperCase();
    const model = fitSpotPriceModel(spotRateData, ownership);
    const route = buildSpotRoute(spotRateData, spotRate);
    const quantity = Math.max(1, Math.floor(moneyNumber(input.quantity) || 1));
    const modelPrice = model.interceptUsd + model.slopeUsdPerKm * route.distanceKm;
    const modelBasePriceUsd = Math.max(0, Math.round(modelPrice));
    const market = calculateMarketAdjustment(marketFactors, input, spotRate);
    const marketAdjustedPriceUsd = Math.max(0, Math.round(modelBasePriceUsd * market.multiplier));
    const publicQuotePriceUsd = spotRate.anchorPricesByOwnership && moneyNumber(spotRate.anchorPricesByOwnership[ownership]);
    const executionAdjustments = publicQuotePriceUsd > 0 ? anchorExecutionAdjustments(marketFactors, spotRate) : [];
    const anchorPriceUsd = publicQuotePriceUsd > 0
      ? Math.max(0, publicQuotePriceUsd + executionAdjustments.reduce((sum, item) => sum + item.amountUsd, 0))
      : 0;
    const configuredAnchorRatio = marketFactors && marketFactors.defaults && moneyNumber(marketFactors.defaults.publicQuoteAnchorBlendRatio);
    const anchorBlendRatio = anchorPriceUsd > 0 ? (configuredAnchorRatio || 0.93) : 0;
    const basePriceUsd = anchorPriceUsd > 0
      ? Math.max(0, Math.round(anchorPriceUsd * anchorBlendRatio + marketAdjustedPriceUsd * (1 - anchorBlendRatio)))
      : marketAdjustedPriceUsd;
    const evidence = summarizePredictionEvidence(marketFactors, spotRate, publicQuotePriceUsd, executionAdjustments, market);
    const priceBandPct = evidence.bandPct || 0.15;
    const priceRangeUsd = {
      low: Math.max(0, Math.round(basePriceUsd * (1 - priceBandPct))),
      high: Math.max(0, Math.round(basePriceUsd * (1 + priceBandPct))),
      bandPct: priceBandPct,
    };
    const samplePriceUsd = spotPriceForOwnership(spotRate, ownership);
    const adjustments = [];
    if (ownership === 'COC') {
      const boxUseFeeUsd = moneyNumber(input.boxUseFeeUsd);
      if (boxUseFeeUsd > 0) {
        adjustments.push({ id: 'coc_box_use_fee', label: 'COC箱使费', amountUsd: boxUseFeeUsd });
      }
    }
    const adjustmentTotalUsd = adjustments.reduce((sum, item) => sum + item.amountUsd, 0);
    const unitTotalUsd = basePriceUsd + adjustmentTotalUsd;
    const nearestDistance = Math.min(...(spotRateData.rates || [])
      .filter(rate => spotPriceForOwnership(rate, ownership) > 0 && rate.routeDistanceKm > 0 && rate.destinationName !== spotRate.destinationName)
      .map(rate => Math.abs(rate.routeDistanceKm - route.distanceKm)));
    const confidence = Number.isFinite(nearestDistance) && nearestDistance <= 350 ? '高'
      : Number.isFinite(nearestDistance) && nearestDistance <= 900 ? '中'
      : '低';
    return {
      mode: 'prediction',
      rate: {
        borderCrossing: spotRate.borderCrossing,
        destinationName: spotRate.destinationName,
        stationCode: spotRate.stationCode,
        containerType: spotRate.containerType,
        ownership,
      },
      route,
      quantity,
      basePriceUsd,
      adjustments,
      adjustmentTotalUsd,
      unitTotalUsd,
      totalUsd: unitTotalUsd * quantity,
      prediction: {
        model,
        modelBasePriceUsd,
        marketAdjustedPriceUsd,
        anchorPriceUsd: anchorPriceUsd || null,
        publicQuotePriceUsd: publicQuotePriceUsd || null,
        executionAdjustments,
        anchorBlendRatio,
        market,
        samplePriceUsd,
        routeDistanceKm: route.distanceKm,
        usdPerKm: Number((basePriceUsd / route.distanceKm).toFixed(3)),
        confidence,
        validUntil: spotRateData.meta && spotRateData.meta.validUntil,
        evidence,
        priceRangeUsd,
      },
    };
  }

  function calculateRailAnalytics(rateData, quoteResult) {
    const route = buildRailRoute(rateData, quoteResult.rate);
    const usdPerKm = Number((quoteResult.basePriceUsd / route.distanceKm).toFixed(3));
    const peers = (rateData.rates || [])
      .filter(rate => rate.containerType === quoteResult.rate.containerType && rate.ownership === quoteResult.rate.ownership)
      .map(rate => {
        try {
          const peerRoute = buildRailRoute(rateData, rate);
          return rate.priceUsd / peerRoute.distanceKm;
        } catch (_) {
          return null;
        }
      })
      .filter(value => Number.isFinite(value) && value > 0);
    const peerAverage = peers.length ? peers.reduce((sum, value) => sum + value, 0) / peers.length : usdPerKm;
    return {
      route,
      observedRoute: findObservedRoute(rateData, quoteResult.rate),
      distanceKm: route.distanceKm,
      usdPerKm,
      peerAverageUsdPerKm: Number(peerAverage.toFixed(3)),
      routeCoefficient: Number((usdPerKm / peerAverage).toFixed(3)),
    };
  }

  function calculateRailQuote(rateData, input) {
    const rate = findRate(rateData, input);
    if (!rate) {
      throw new Error('该组合无报价');
    }

    const quantity = Math.max(1, Math.floor(moneyNumber(input.quantity) || 1));
    const basePriceUsd = moneyNumber(rate.priceUsd);
    const adjustments = [];

    if (input.ownership === 'COC') {
      const boxUseFeeUsd = moneyNumber(input.boxUseFeeUsd);
      if (boxUseFeeUsd > 0) {
        adjustments.push({ id: 'coc_box_use_fee', label: 'COC箱使费', amountUsd: boxUseFeeUsd });
      }
    }

    if (input.specialDocumentReview && ['满洲里/后贝加尔', '二连/扎门乌德'].includes(input.borderCrossing)) {
      adjustments.push({ id: 'special_document_review', label: '特别审单代理要求', amountUsd: 50 });
    }

    if (input.erlianUnder55Hq && input.borderCrossing === '二连/扎门乌德' && isFortyFoot(input)) {
      adjustments.push({ id: 'erlian_under_55_hq', label: '二连少于55x40HQ', amountUsd: 150 });
    }

    if (input.shusharyVoskhod && /Shushary/i.test(input.destinationName || '')) {
      adjustments.push({ id: 'shushary_voskhod', label: 'Shushary选择Voskhod场站', amountUsd: 150 });
    }

    if (input.belarusBts && isFortyFoot(input)) {
      adjustments.push({ id: 'belarus_bts', label: '白俄段指定BTS服务', amountUsd: 80 });
    }

    const transitDeclarationCount = Math.max(1, Math.floor(moneyNumber(input.transitDeclarationCount) || 1));
    if (['山口/Dostyk', '果斯/Altynkol'].includes(input.borderCrossing) && transitDeclarationCount > 1 && isFortyFoot(input)) {
      adjustments.push({
        id: 'extra_transit_declaration',
        label: `山口/果斯超一票转关 x ${transitDeclarationCount - 1}`,
        amountUsd: (transitDeclarationCount - 1) * 55,
      });
    }

    const adjustmentTotalUsd = adjustments.reduce((sum, item) => sum + item.amountUsd, 0);
    const unitTotalUsd = basePriceUsd + adjustmentTotalUsd;
    return {
      rate,
      quantity,
      basePriceUsd,
      adjustments,
      adjustmentTotalUsd,
      unitTotalUsd,
      totalUsd: unitTotalUsd * quantity,
    };
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function availableOptions(rateData) {
    const rates = rateData.rates || [];
    const borderCrossings = unique(rates.map(rate => rate.borderCrossing));
    const destinationsByBorder = {};
    const containerTypesBySelection = {};
    const ownershipsBySelection = {};

    borderCrossings.forEach(border => {
      destinationsByBorder[border] = unique(rates.filter(rate => rate.borderCrossing === border).map(rate => rate.destinationName));
    });

    rates.forEach(rate => {
      const destinationKey = `${rate.borderCrossing}||${rate.destinationName}`;
      const containerKey = `${destinationKey}||${rate.containerType}`;
      containerTypesBySelection[destinationKey] = unique([...(containerTypesBySelection[destinationKey] || []), rate.containerType]);
      ownershipsBySelection[containerKey] = unique([...(ownershipsBySelection[containerKey] || []), rate.ownership]);
    });

    return { borderCrossings, destinationsByBorder, containerTypesBySelection, ownershipsBySelection };
  }

  return {
    calculateRailQuote,
    availableOptions,
    buildRailRoute,
    calculateRailAnalytics,
    findObservedRoute,
    findSpotRate,
    summarizeSpotRates,
    fitSpotPriceModel,
    buildSpotRoute,
    buildPredictionRateData,
    predictSpotRailQuote,
    matchingSupplierSources,
  };
});
