# BMW Speed Camera Warning 0.4.0
Standalone BMW MGU ID7 app, separate from Weather; Weather 0.2.7 is not used.

## Map
- Offline vector/schematic map drawn locally; no map tiles or internet needed to display it.
- BMW SatellitePositioning GPS marker and heading, camera markers, zoom, selected-camera panel.
- Road geometry is a simplified drawing from published coordinate ranges for city patrol routes. It is not a complete OSM map or turn-by-turn navigation.
- Camera markers appear only for source-published coordinates. Two new 2026 complexes are listed but remain un-geocoded.

## Yoshkar-Ola camera coordinates
Driver Helper public camera list:
- Tsargradsky Avenue: 56.638036, 47.908825
- Mira Street: 56.633352, 47.945252
- Karl Marx Street: 56.620741, 47.886987
- Zvezdnaya Street: 56.615322, 47.970090

New complexes at Tsargradsky/Voskresensky and Lenin/Pervomayskaya are confirmed by local press, but precise device coordinates are not published in consulted articles. They remain null and cannot trigger proximity warnings.

Sources:
- https://www.driver-helper.ru/kamery-gibdd/joshkar_ola
- https://www.marpravda.ru/news/auto/v-yoshkar-ole-na-perekrestkakh-za-voditelyami-sledyat-2-novye-skorostnye-kamery/
- https://www.mk-mari.ru/social/2026/09/17/novye-kamery-kontrolya-skorosti-zarabotali-na-avariynykh-perekrestkakh-yoshkaroly.html
- https://pg12.ru/news/120500

Alerts: first 500 m, first 700 m above 90 km/h, repeat 200 m. Fresh BMW GPS fix and numeric GST accuracy <=50 m required. Voice disabled; no radio/system volume changes.
Bundled/cached database updates at startup, every 6 hours, and manually. Higher revisions only replace local cache.
