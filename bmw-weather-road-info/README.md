# BMW Weather & Road Info (MGU ID7)

Weather and road information app for BMW iDrive 7 / MGU.

## Internet transport

The app now follows the networking architecture used by RideTube:
- a separate root tool, `aurelm-weather-net`, owns the local Unix socket;
- the tool allocates a dedicated free UID outside MainApp's application UID ranges;
- that UID is registered in `/var/opt/mgu-uplink/uids.d/aurelm-weather-net`;
- each HTTPS request is executed by a short-lived child process running as that UID (never as root);
- the app sends requests to the local socket and does not require the MGU system/root network route.

The app must be installed from the repository's MGU Store catalog so the service dependency is installed first. The Store source is:
`andrug05/bmw-weather-road-info` (GitHub repository source; select its `catalog` release).

## Data sources

- Weather and 7-day forecast: Open-Meteo.
- Road works, access restrictions, barriers and impassable surfaces: OpenStreetMap Overpass.
- OSM data is not live traffic speed, congestion or guaranteed real-time incident data.

## Troubleshooting

On the MGU over SSH:
```sh
systemctl status aurelm-weather-net
journalctl -u aurelm-weather-net -b
cat /var/opt/aurelm-weather-net/state/uids.json
cat /var/opt/mgu-uplink/uids.d/aurelm-weather-net
/var/opt/mgu-uplink/mgu-uplink status
```
