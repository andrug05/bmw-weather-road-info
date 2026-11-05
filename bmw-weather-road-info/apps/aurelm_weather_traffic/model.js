'use strict';

const DEFAULT_LOCATION = { name: 'Chisinau', latitude: 47.0105, longitude: 28.8638 };

function validCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function formatTemperature(value) {
  if (!Number.isFinite(Number(value))) return '—';
  return `${Math.round(Number(value))}°`;
}

function weatherLabel(code) {
  const labels = {
    0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle',
    55: 'Dense drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain',
    67: 'Heavy freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
    77: 'Snow grains', 80: 'Rain showers', 81: 'Showers', 82: 'Heavy showers',
    85: 'Snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm',
    96: 'Thunderstorm / hail', 99: 'Severe thunderstorm / hail'
  };
  return labels[Number(code)] || 'Unknown conditions';
}

function normalizeWeather(payload) {
  if (!payload || !payload.current) throw new Error('Weather response has no current conditions');
  const c = payload.current;
  const hourly = payload.hourly || {};
  const daily = payload.daily || {};
  return {
    temperature: Number(c.temperature_2m),
    feelsLike: Number(c.apparent_temperature),
    humidity: Number(c.relative_humidity_2m),
    wind: Number(c.wind_speed_10m),
    precipitation: Number(c.precipitation),
    code: Number(c.weather_code),
    description: weatherLabel(c.weather_code),
    time: c.time || '',
    hourly: (hourly.time || []).slice(0, 8).map((time, i) => ({
      time,
      temperature: Number((hourly.temperature_2m || [])[i]),
      precipitation: Number((hourly.precipitation_probability || [])[i] || 0),
      code: Number((hourly.weather_code || [])[i])
    })),
    daily: (daily.time || []).slice(0, 7).map((date, i) => ({
      date,
      min: Number((daily.temperature_2m_min || [])[i]),
      max: Number((daily.temperature_2m_max || [])[i]),
      code: Number((daily.weather_code || [])[i]),
      precipitation: Number((daily.precipitation_probability_max || [])[i] || 0)
    }))
  };
}

function normalizeRoadFeature(element) {
  const tags = element.tags || {};
  const name = tags.name || tags.ref || tags.highway || 'Unnamed road';
  const reasons = [];
  if (tags.highway === 'construction' || tags.construction) reasons.push('Road construction');
  if (tags.access === 'no' || tags.motor_vehicle === 'no' || tags.vehicle === 'no') reasons.push('Access restricted');
  if (tags.barrier) reasons.push(`Barrier: ${tags.barrier}`);
  if (tags.smoothness === 'impassable') reasons.push('Impassable surface');
  if (tags.maxspeed) reasons.push(`Speed limit ${tags.maxspeed}`);
  return {
    id: String(element.id),
    name,
    type: reasons.length ? reasons.join(' · ') : 'OSM road feature',
    lat: Number(element.lat || (element.center && element.center.lat)),
    lon: Number(element.lon || (element.center && element.center.lon)),
    updated: tags.check_date || tags.source || 'OSM data; update time unavailable'
  };
}

module.exports = { DEFAULT_LOCATION, validCoordinates, formatTemperature, weatherLabel, normalizeWeather, normalizeRoadFeature };
