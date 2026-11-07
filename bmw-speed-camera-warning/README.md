# BMW Speed Camera Warning

Standalone BMW MGU ID7 application. Package ID: `aurelm_speed_camera_warning`.

## Version 0.2.0 — BMW GPS integration

GPS is read from the vehicle's native SOME/IP broadcast:
- interface: `de.bmw.infotainment.SatellitePositioning`;
- instance: `1`;
- broadcast: `updatePosition`;
- payload: BMW NMEA string (`nmeaString`).

This follows the read-only BMW GPS bridge pattern used by [istt1899/bmw-kaluga-cameras](https://github.com/istt1899/bmw-kaluga-cameras), but does not copy its camera daemon, Waze/cluster rendering, Kaluga-specific coordinates, or audio implementation.

The app validates NMEA checksums, pairs RMC/GGA epochs, checks UTC freshness and coordinate consistency, and accepts metre accuracy only when a matching GST sentence is present. GPS display shows live coordinates, speed/course data is parsed for future proximity logic. The OAP package is configured for high-priority background execution so the GPS subscription can remain active while native BMW navigation is foreground.

## Current limitations

- GPS event subscription and parser are implemented, but must still be tested on the target MGU. Until then, treat GPS status as experimental.
- Camera records currently contain descriptive addresses, not verified latitude/longitude points. No proximity alert is generated from those descriptions.
- Camera voice announcements remain disabled. No radio/system volume is changed.
- Moscow and Sochi lists are empty pending verified camera records.

No Weather 0.2.7 source, runtime, dependencies or networking code is used.

## Build

GitHub Actions workflow: `.github/workflows/speed-camera-release.yml`.
Manual workflow dispatch defaults to 0.2.0 and publishes separate `.tgz` and `.mgu` assets.
