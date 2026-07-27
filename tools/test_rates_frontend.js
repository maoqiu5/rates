const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('web/index.html', 'utf8');

if (!html.includes('<title>境外运价</title>')) throw new Error('rates title missing');
if (!html.includes('data-module="truck"')) throw new Error('truck module missing');
if (!html.includes('data-module="rail"')) throw new Error('rail module missing');
if (html.includes('data-module="gps"')) throw new Error('rates project must not expose GPS module');
if (html.includes('id="module-gps"')) throw new Error('rates project must not contain GPS trajectory panel');
if (!html.includes("window.location.pathname.startsWith('/rates')")) throw new Error('rates frontend must use /rates API base in production');
if (html.includes("http://127.0.0.1:8015")) throw new Error('rates frontend must not use GPS local API port');
if (!html.includes('./rail-calculator.js?v=')) throw new Error('rail calculator should use cache-busting version');
if (!html.includes('id="rail-pricing-strategy"')) throw new Error('rail pricing strategy panel missing');
if (!html.includes('truck-market-references')) throw new Error('truck market reference API usage missing');
if (!html.includes('id="truck-distance-results"')) throw new Error('full truck distance result table missing');
if (!html.includes('id="rail-pricing-mode"')) throw new Error('rail prediction/public quote mode missing');
if (!html.includes('RailCalculator.buildPredictionRateData')) throw new Error('rail prediction stations should include public quote anchors');
if (!html.includes('function drawRailRoute')) throw new Error('rail route map renderer missing');

const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
inlineScripts.forEach((script, index) => new vm.Script(script, { filename: `inline-${index}.js` }));

console.log('rates frontend smoke passed');
