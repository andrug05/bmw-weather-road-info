# BMW Speed Camera Warning

Standalone BMW MGU ID7 app. Package ID: `aurelm_speed_camera_warning`.

## Version 0.3.0 — local database, online refresh, proximity logic

- Ships with a bundled camera database and immediately uses it offline.
- Keeps the last downloaded database in the app's private data directory as `camera-db-cache.json`.
- Checks the public versioned JSON database at startup and every 6 hours; the Refresh button forces a check.
- Downloads over HTTPS from this repository's raw GitHub file. Invalid, oversized, incomplete or unreachable downloads are rejected; the previous local copy remains active.
- A new database is accepted only when its integer `revision` is higher. Increment `revision` when publishing camera data changes.
- GPS proximity engine: first alert at 500 m; at speeds strictly above 90 km/h, first alert at 700 m; repeat at 200 m. Each camera alerts once per approach and rearms after leaving the approach area.
- Proximity alerts require a fresh BMW GPS fix with GST accuracy of 50 m or better and a camera record with verified numeric latitude/longitude.
- Voice/audio output remains disabled. Alert state and events are shown/logged; no radio or system volume is changed.

## Current data limitations

The four Yoshkar-Ola entries currently have descriptive addresses but null coordinates. They are preserved in the local/remote database, but **cannot trigger distance warnings until exact camera coordinates are verified and added**. Moscow and Sochi lists are empty. Do not treat an address description as a geocoded camera point.

## GPS

GPS is read from BMW's native SOME/IP broadcast:
- `de.bmw.infotainment.SatellitePositioning`, instance `1`;
- broadcast `updatePosition`;
- NMEA string payload.

The GPS integration follows the read-only bridge pattern from [istt1899/bmw-kaluga-cameras](https://github.com/istt1899/bmw-kaluga-cameras). Actual GPS delivery and background operation still require testing on the target MGU.

## Build

GitHub Actions workflow: `.github/workflows/speed-camera-release.yml`.
Manual workflow dispatch defaults to 0.3.0 and publishes `.tgz` and `.mgu` assets.

No Weather 0.2.7 source, runtime, dependencies or networking code is used.
