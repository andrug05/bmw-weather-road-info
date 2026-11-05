# BMW Weather & Road Info (MGU ID7)

OAP app source for BMW iDrive 7 / MGU, version 0.1.8.

- Weather and 7-day forecast: Open-Meteo.
- Road works, mapped access restrictions, barriers and impassable surfaces: OpenStreetMap Overpass.
- Location: vehicle GPS only if the installed runtime exposes a verified `ctx.getLocation()` provider; otherwise Settings offers a manual city selection.
- Internet: requires Robert Nisipeanu's `mgu-uplink`; the release build marks the package with `mguInternet: true`.

## Limitations

OSM/Overpass does not provide live traffic speed, reliable current congestion, or guaranteed up-to-date incident reports. GPS integration is guarded and has not yet been verified on a physical MGU ID7 head unit.

## Build

Run the GitHub Actions workflow **Build and publish MGU app**. It builds against the public `aurelmarius/bmw-games` app kit and creates a GitHub Release with `aurelm_weather_traffic@0.1.8.tgz`.
