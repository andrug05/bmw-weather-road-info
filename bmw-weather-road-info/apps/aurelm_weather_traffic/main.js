'use strict';
/** BMW Weather & Road Info — MGU ID7 / OAP SDK app entry point.
 * The UI follows the bmw-games app contract (mgu.run, ctx.canvas, ui.image, ctx.loop).
 */
const mgu = require('./kit/mgu');
const G = require('./kit/gauges');
const { fetchWeather } = require('./weather');
const { fetchRoadInfo } = require('./roads');
const { createLocationService } = require('./location');
const { formatTemperature } = require('./model');

const W = 1600, H = 520;
const REFRESH_MS = 10 * 60 * 1000;

mgu.run({
  async start(ctx) {
    const { ui, settings, log } = ctx;
    const locations = createLocationService(ctx, settings, log);
    let weather = null, roads = [], busy = false, lastUpdate = 0;
    let error = '', location = await locations.current(), tab = 'weather';
    let visible = false;
    const setStatus = (s) => { error = s || ''; };

    async function refresh() {
      if (busy) return;
      busy = true; setStatus('Updating…');
      try {
        location = await locations.current();
        const results = await Promise.allSettled([fetchWeather(location), fetchRoadInfo(location, 5000)]);
        if (results[0].status === 'fulfilled') weather = results[0].value;
        if (results[1].status === 'fulfilled') roads = results[1].value;
        const failures = results.filter(x => x.status === 'rejected');
        lastUpdate = Date.now();
        setStatus(failures.length ? failures.map(x => x.reason.message).join(' / ') : 'Updated');
      } catch (e) { setStatus(e.message); }
      finally { busy = false; }
    }

    ui.onClick('BTN_REFRESH', refresh);
    ui.onClick('BTN_WEATHER', () => { tab = 'weather'; });
    ui.onClick('BTN_ROADS', () => { tab = 'roads'; });
    ui.onClick('BTN_LOCATION', async () => {
      // A configured location list can be wired to this action in the kit's Settings sheet.
      // Current behavior toggles GPS/manual source when a verified GPS provider exists.
      if (locations.gpsAvailable()) {
        settings.set('location_mode', String(settings.get('location_mode') || 'gps') === 'gps' ? 'manual' : 'gps');
      }
      await refresh();
    });

    function drawWeather(cv, t) {
      G.panel(cv, t, 34, 92, 960, 392, 'CURRENT WEATHER');
      if (!weather) {
        cv.text('Weather data not loaded', 70, 190, 32, t.dim);
        cv.text('Press Refresh to try again', 70, 238, 22, t.text);
        return;
      }
      cv.text(formatTemperature(weather.temperature), 72, 236, 112, t.text, { font: 'num' });
      cv.text(weather.description, 300, 160, 34, t.text, { font: 'bold' });
      cv.text(`Feels like ${formatTemperature(weather.feelsLike)}`, 302, 202, 23, t.dim);
      cv.text(`Humidity  ${Math.round(weather.humidity)}%`, 302, 254, 23, t.text);
      cv.text(`Wind  ${Math.round(weather.wind)} km/h`, 302, 292, 23, t.text);
      cv.text(`Precipitation  ${weather.precipitation} mm`, 302, 330, 23, t.text);
      cv.text('7-DAY FORECAST', 70, 392, 19, t.dim, { font: 'bold', spacing: 1.2 });
      weather.daily.slice(0, 5).forEach((d, i) => {
        const x = 70 + i * 172;
        cv.text(d.date.slice(5), x, 434, 20, t.text);
        cv.text(`${Math.round(d.max)}° / ${Math.round(d.min)}°`, x, 466, 20, t.accent);
      });
    }

    function drawRoads(cv, t) {
      G.panel(cv, t, 34, 92, 960, 392, 'ROAD INFORMATION · OPENSTREETMAP');
      cv.text('Mapped restrictions and road works', 70, 140, 24, t.text);
      if (!roads.length) {
        cv.text('No matching OSM features in 5 km', 70, 218, 26, t.dim);
        cv.text('This does not mean roads are clear.', 70, 260, 21, t.warn);
        return;
      }
      roads.slice(0, 6).forEach((r, i) => {
        const y = 190 + i * 48;
        cv.text(r.name.slice(0, 42), 70, y, 22, t.text, { font: 'bold' });
        cv.text(r.type.slice(0, 70), 420, y, 19, t.warn);
      });
    }

    function render() {
      const t = ctx.theme();
      const cv = ctx.canvas(W, H).clear(t.bg);
      G.frame(cv, t, ['Weather & Road Info'], 0, [{ text: busy ? 'Updating' : (error || 'Ready'), color: error && error !== 'Updated' ? 'warn' : 'accent' }]);
      cv.text(location.name || 'Selected location', 36, 68, 22, t.dim);
      if (tab === 'weather') drawWeather(cv, t); else drawRoads(cv, t);
      G.panel(cv, t, 1020, 92, 546, 392, 'LOCATION & STATUS');
      cv.text(`Source: ${location.source === 'gps' ? 'Vehicle GPS' : 'Manual city'}`, 1050, 152, 22, t.text);
      cv.text(`Coordinates: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`, 1050, 192, 18, t.dim);
      cv.text(`Road features: ${roads.length}`, 1050, 246, 22, t.text);
      cv.text(`Updated: ${lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '—'}`, 1050, 286, 20, t.dim);
      cv.text('OSM is not live traffic speed data', 1050, 354, 20, t.warn);
      cv.text('Use Settings to configure a manual city', 1050, 414, 18, t.dim);
      return ui.image('MAIN_GFX', cv);
    }

    ui.onVisible((name, v) => { if (name === 'MAIN') visible = v; });
    visible = !!(ui.isVisible && ui.isVisible('MAIN'));
    ctx.loop('MAIN', 1000, render);
    await refresh();
    setInterval(() => { if (visible && Date.now() - lastUpdate >= REFRESH_MS) refresh(); }, 30000);
    Promise.resolve().then(render).catch(e => log.warn('initial render: ' + e.message));
  }
});
