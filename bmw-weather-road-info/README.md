# BMW Weather & Road Info

Weather forecasts and mapped road restrictions for BMW G05 / MGU ID7.

## Internet connection

The app follows the networking method in [nickgcode/idrive7-apps](https://github.com/nickgcode/idrive7-apps):

- The OAP package declares `mguInternet: true`, so mgu-uplink routes traffic for this app's UID.
- mgu-uplink writes the active lease to the app data directory as `uplink.json`.
- The lease contains the uplink DNS servers. The MGU system resolver is not used for external hostnames.
- `uplink.js` reads that lease and creates a per-request Node.js `lookup` callback using `dns.Resolver`.
- `http.js` passes that callback to `https.request()`.

There is no separate root daemon, custom UID allocator, or local socket service. The app reads
`ctx.dataDir/uplink.json` and falls back to `/run/mgu-uplink/lease.json`.

## Install

Add `andrug05/bmw-weather-road-info` as a source in MGU Store and install/update
**Weather & Road Info**. The catalog is published in the GitHub Release named `catalog`.

## Data sources

- Weather and 7-day forecast: Open-Meteo.
- Road works, access restrictions, barriers and impassable surfaces: OpenStreetMap Overpass.
- OSM data is not live traffic speed, congestion or guaranteed real-time incident data.

## Diagnostics

On the MGU over SSH:

```sh
cat /var/opt/public/oap/oap_*/data/uplink.json
cat /run/mgu-uplink/lease.json
/var/opt/mgu-uplink/mgu-uplink status
```

The app log is in its OAP data directory as `aurelm_weather_traffic.log`.
