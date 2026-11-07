'use strict';

const { validCoordinates } = require('./model');

const WIND_MPS_MIDPOINTS = [0, 0.2, 1.85, 5.7, 9.4, 14, 20.85, 28.55, 34.5];
const PRECIP_MM_H_MIDPOINTS = [0, 0.125, 0.625, 2.5, 7, 13, 23, 40, 62.5, 75];

function weatherDescription(value) {
  const code = String(value || '').replace(/(day|night)$/, '');
  const labels = {
    clear: 'Clear', pcloudy: 'Partly cloudy', mcloudy: 'Mostly cloudy',
    cloudy: 'Cloudy', humid: 'Humid / foggy', lightrain: 'Light rain',
    oshower: 'Occasional showers', ishower: 'Isolated showers',
    lightsnow: 'Light snow', rain: 'Rain', snow: 'Snow',
    rainsnow: 'Sleet / freezing rain', ts: 'Thunderstorm',
    tsrain: 'Thunderstorm with rain', windy: 'Windy'
  };
  return labels[code] || 'Variable conditions';
}

function windKmh(value) {
  const speed = Number(value);
  if (!Number.isFinite(speed) || speed < 1 || speed > 8) return 0;
  return Math.round(WIND_MPS_MIDPOINTS[speed] * 3.6);
}

function precipitationRate(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 9) return 0;
  return Math.round(PRECIP_MM_H_MIDPOINTS[amount] * 10) / 10;
}

function parseInit(value) {
  const s = String(value || '');
  if (!/^\d{10}$/.test(s)) throw new Error('7Timer response has invalid init timestamp');
  const date = new Date(Date.UTC(
    Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1,
    Number(s.slice(6, 8)), Number(s.slice(8, 10))
  ));
  if (!Number.isFinite(date.getTime())) throw new Error('7Timer response has invalid init timestamp');
  return date;
}

function normalize7Timer(payload, now) {
  if (!payload || !Array.isArray(payload.dataseries) || !payload.dataseries.length) {
    throw new Error('7Timer response has no forecast data');
  }
  const init = parseInit(payload.init);
  const series = payload.dataseries.map(item => {
    const hours = Number(item.timepoint);
    const date = new Date(init.getTime() + hours * 3600000);
    const temp = Number(item.temp2m);
    if (!Number.isFinite(hours) || !Number.isFinite(temp) || !Number.isFinite(date.getTime())) return null;
    return {
      date,
      temperature: temp,
      humidity: parseFloat(String(item.rh2m)),
      wind: windKmh(item.wind10m && item.wind10m.speed),
      precipitation: precipitationRate(item.prec_amount),
      description: weatherDescription(item.weather),
      weather: String(item.weather || '')
    };
  }).filter(Boolean);
  if (!series.length) throw new Error('7Timer response contains no usable forecast points');

  const currentTime = now instanceof Date ? now.getTime() : Number(now || Date.now());
  let current = series.find(point => point.date.getTime() >= currentTime) || series[series.length - 1];

  const byDay = {};
  series.forEach(point => {
    const key = point.date.toISOString().slice(0, 10);
    if (!byDay[key]) byDay[key] = { date: key, min: point.temperature, max: point.temperature, code: 0, precipitation: 0 };
    byDay[key].min = Math.min(byDay[key].min, point.temperature);
    byDay[key].max = Math.max(byDay[key].max, point.temperature);
  });

  return {
    temperature: current.temperature,
    feelsLike: null,
    humidity: Number.isFinite(current.humidity) ? current.humidity : 0,
    wind: current.wind,
    precipitation: current.precipitation,
    code: 0,
    description: current.description,
    time: current.date.toISOString(),
    hourly: series.slice(0, 8).map(point => ({
      time: point.date.toISOString(),
      temperature: point.temperature,
      precipitation: point.precipitation,
      code: 0
    })),
    daily: Object.keys(byDay).sort().slice(0, 7).map(key => byDay[key])
  };
}

async function fetchWeather(location) {
  const latitude = Number(location && location.latitude);
  const longitude = Number(location && location.longitude);
  if (!validCoordinates(latitude, longitude)) throw new Error('Invalid weather coordinates');

  // 7Timer! provides a global, keyless GFS-based civil forecast in 3-hour steps.
  // Its API expects coordinate precision of approximately 0.001 degrees.
  const query = 'lon=' + longitude.toFixed(3) +
    '&lat=' + latitude.toFixed(3) +
    '&product=civil&output=json&unit=metric';
  const payload = await require('./http').getJson(
    'https://www.7timer.info/bin/api.pl?' + query,
    { timeout: 20000 }
  );
  return normalize7Timer(payload);
}

module.exports = { fetchWeather, normalize7Timer, weatherDescription, windKmh, precipitationRate };
