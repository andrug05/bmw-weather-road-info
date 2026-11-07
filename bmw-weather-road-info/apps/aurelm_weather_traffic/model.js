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

module.exports = { DEFAULT_LOCATION, validCoordinates, formatTemperature, normalizeRoadFeature };
