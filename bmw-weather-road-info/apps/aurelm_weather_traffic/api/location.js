'use strict';
const { DEFAULT_LOCATION, validCoordinates } = require('../model');

// The public bmw-games sample does not document a stable MGU GPS API.
// Keep this adapter explicit: a kit-specific provider can be injected after verifying
// the actual vehicle's OAP/vehicle-data capabilities. Never pretend a fallback is GPS.
function createLocationService(ctx, settings, log) {
  let manual = {
    name: String(settings.get('city_name') || DEFAULT_LOCATION.name),
    latitude: Number(settings.get('latitude') || DEFAULT_LOCATION.latitude),
    longitude: Number(settings.get('longitude') || DEFAULT_LOCATION.longitude)
  };
  let gpsProvider = null;
  try {
    if (ctx && typeof ctx.getLocation === 'function') gpsProvider = () => ctx.getLocation();
  } catch (e) { if (log) log.warn('GPS adapter unavailable: ' + e.message); }

  return {
    setManual(value) {
      if (!value || !validCoordinates(Number(value.latitude), Number(value.longitude))) throw new Error('Coordinates out of range');
      manual = { name: String(value.name || 'Selected location'), latitude: Number(value.latitude), longitude: Number(value.longitude) };
      settings.set('city_name', manual.name); settings.set('latitude', manual.latitude); settings.set('longitude', manual.longitude);
    },
    manual() { return Object.assign({}, manual); },
    async current() {
      const mode = String(settings.get('location_mode') || 'gps');
      if (mode === 'gps' && gpsProvider) {
        try {
          const p = await gpsProvider();
          if (p && validCoordinates(Number(p.latitude), Number(p.longitude))) return { name: 'Vehicle GPS', latitude: Number(p.latitude), longitude: Number(p.longitude), source: 'gps' };
        } catch (e) { if (log) log.warn('GPS read failed: ' + e.message); }
      }
      return Object.assign({ source: 'manual' }, manual);
    },
    gpsAvailable: () => !!gpsProvider
  };
}
module.exports = { createLocationService };
