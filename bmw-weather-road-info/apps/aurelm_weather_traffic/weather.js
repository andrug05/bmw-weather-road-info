'use strict';
const { getJson } = require('./http');
const { normalizeWeather, validCoordinates } = require('./model');

async function fetchWeather(location) {
  if (!location || !validCoordinates(Number(location.latitude), Number(location.longitude))) {
    throw new Error('Invalid weather coordinates');
  }
  // Avoid URLSearchParams: some embedded Node builds in MGU do not expose it.
  const params = [
    ['latitude', location.latitude],
    ['longitude', location.longitude],
    ['current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m'],
    ['hourly', 'temperature_2m,precipitation_probability,weather_code'],
    ['daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'],
    ['forecast_days', '7'],
    ['timezone', 'auto']
  ];
  const query = params.map(([key, value]) =>
    encodeURIComponent(key) + '=' + encodeURIComponent(String(value))
  ).join('&');
  const payload = await getJson('https://api.open-meteo.com/v1/forecast?' + query, { timeout: 20000 });
  return normalizeWeather(payload);
}
module.exports = { fetchWeather };
