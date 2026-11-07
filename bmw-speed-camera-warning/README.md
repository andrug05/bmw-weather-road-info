# BMW Speed Camera Warning

Standalone BMW MGU ID7 application. Package ID: `aurelm_speed_camera_warning`.

## Version 0.1.0 — offline camera directory

The app is packaged independently and includes:
- native MGU menu with city selection;
- local camera directory for Yoshkar-Ola;
- previous/next navigation through camera records;
- local database with no dependency on the Weather app or internet access.

## Known limitations

- GPS proximity detection is not active: the vehicle-position SOME/IP interface has not yet been confirmed on the target MGU.
- Voice output is disabled; the app does not alter radio or system volume.
- Camera records are informational. Addresses are not verified GPS points and must not be treated as guaranteed camera locations.
- Moscow and Sochi lists are empty pending verified data.

The app does not use Weather 0.2.7 or the Weather & Road Info source, runtime, dependencies or networking code.

## Build

GitHub Actions workflow: `.github/workflows/speed-camera-release.yml`.
Manual workflow dispatch accepts a release version. A successful run publishes `.tgz` and `.mgu` files as a GitHub Release.
