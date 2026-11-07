'use strict';
const assert = require('assert');
const { normalize7Timer, weatherDescription, windKmh, precipitationRate } = require('../apps/aurelm_weather_traffic/weather');

const payload = {
  init: '2026110700',
  dataseries: [
    { timepoint: 3, temp2m: 8, rh2m: '80%', prec_amount: 0, wind10m: { speed: 2 }, weather: 'pcloudyday' },
    { timepoint: 6, temp2m: 5, rh2m: '85%', prec_amount: 2, wind10m: { speed: 3 }, weather: 'lightrainnight' },
    { timepoint: 27, temp2m: 2, rh2m: '90%', prec_amount: 1, wind10m: { speed: 1 }, weather: 'cloudyday' }
  ]
};
const result = normalize7Timer(payload, new Date('2026-11-07T00:00:00Z'));
assert.strictEqual(result.temperature, 8);
assert.strictEqual(result.humidity, 80);
assert.strictEqual(result.description, 'Partly cloudy');
assert.strictEqual(result.daily.length, 2);
assert.strictEqual(result.daily[0].min, 5);
assert.strictEqual(result.daily[0].max, 8);
assert.strictEqual(windKmh(2), 7);
assert.strictEqual(precipitationRate(2), 0.6);
assert.strictEqual(weatherDescription('tsrainday'), 'Thunderstorm with rain');
console.log('7Timer weather tests passed');
