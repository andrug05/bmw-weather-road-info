'use strict';
const { getJson } = require('./http');
const { normalizeRoadFeature, validCoordinates } = require('../model');

// OpenStreetMap / Overpass returns mapped road features, not live traffic speeds or live incidents.
async function fetchRoadInfo(location, radiusMeters) {
  if (!location || !validCoordinates(location.latitude, location.longitude)) throw new Error('Invalid road coordinates');
  const radius = Math.max(500, Math.min(15000, Number(radiusMeters) || 5000));
  const around = `around:${radius},${location.latitude},${location.longitude}`;
  const query = `[out:json][timeout:15];(way[highway=construction](${around});way[construction](${around});way[access=no](${around});way[motor_vehicle=no](${around});way[vehicle=no](${around});way[smoothness=impassable](${around});node[barrier](${around}););out center tags;`;
  const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
  const payload = await getJson(url, { timeout: 20000 });
  return (payload.elements || []).map(normalizeRoadFeature).filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lon));
}
module.exports = { fetchRoadInfo };
