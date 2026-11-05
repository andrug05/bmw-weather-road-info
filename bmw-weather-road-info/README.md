# BMW Weather & Road Info (MGU ID7)

Source starter for `aurelm_weather_traffic`, structured after the `apps/<id>/main.js` + `model.js` pattern in `aurelmarius/bmw-games`.

## Features in this source drop

- Open-Meteo current conditions and 7-day forecast (no API key).
- OpenStreetMap Overpass lookup for mapped construction, access restrictions, impassable surfaces and barriers within 5 km.
- Location service with persistent manual coordinates and a deliberately guarded GPS adapter.
- RHMI/OAP-style entry point using `mgu.run`, `ctx.canvas`, `ui.image`, `ctx.loop`, app buttons and the kit gauge helpers.

## Important limitations / next integration step

1. **GPS:** the public `bmw-games` sample does not establish a stable GPS API contract. `api/location.js` only activates a GPS provider if the target kit exposes `ctx.getLocation()`. Verify the actual OAP SDK/vehicle-data API on the target MGU and wire it there. Until then the app uses the manual fallback and labels it honestly.
2. **Manual city UI:** coordinates are persisted through settings (`city_name`, `latitude`, `longitude`). Add a city picker/settings sheet using the exact settings-sheet helpers from the checked-out kit; this source does not guess those helper names.
3. **Traffic:** OSM/Overpass is not a live traffic provider. It cannot provide reliable live congestion speed, current accident reports, or guaranteed road closure freshness. The app explicitly says so.
4. **MGU build:** this source drop intentionally does not include copied BMW community kit code. Place this app folder into a checkout of `aurelmarius/bmw-games` under `apps/aurelm_weather_traffic`, then add the app ID to that checkout's build/catalog configuration and run its `kit/tools/build.py` flow. The upstream build kit is required to produce a genuine MGU `.tgz`.

## Build integration

From a complete `bmw-games` checkout, copy `apps/aurelm_weather_traffic` into its `apps/` directory. Ensure its package manifest/catalog follows the current kit schema, then run:

```bash
python3 kit/tools/build.py aurelm_weather_traffic
```

Expected upstream artifact convention: `dist/aurelm_weather_traffic@0.1.0.tgz`.

## Tests

```bash
npm test
```

## Data sources

- Weather: https://open-meteo.com/ (forecast API)
- Map/road features: https://www.openstreetmap.org/ and https://overpass-api.de/

Respect the OpenStreetMap attribution and Overpass fair-use policy. Do not poll Overpass frequently; the default app refresh is 10 minutes and can be increased if the endpoint rate-limits requests.
