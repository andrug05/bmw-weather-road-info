'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'apps/aurelm_speed_camera_warning');
const spec = JSON.parse(fs.readFileSync(path.join(appDir, 'app.json'), 'utf8'));
const db = JSON.parse(fs.readFileSync(path.join(appDir, 'camera-db.json'), 'utf8'));
const source = fs.readFileSync(path.join(appDir, 'main.js'), 'utf8');
const gpsSource = fs.readFileSync(path.join(appDir, 'gps.js'), 'utf8');
const { nmeaFix, INTERFACE, INSTANCE } = require(path.join(appDir, 'gps.js'));

assert.strictEqual(spec.id, 'aurelm_speed_camera_warning');
assert.strictEqual(spec.version, '0.2.0');
assert.strictEqual(spec.screens[0].name, 'MAIN');
assert.ok(Array.isArray(db['yoshkar-ola']) && db['yoshkar-ola'].length >= 1);
assert.ok(spec.signals[INTERFACE]._broadcasts.includes('updatePosition'));
assert.strictEqual(spec.signals[INTERFACE]._instances, '1');
assert.ok(source.includes("require('./gps')"));
assert.ok(source.includes('gps.start()'));
assert.ok(source.includes('GPS BMW'));
assert.ok(gpsSource.includes('buildAndInitTypedProxy'));
assert.ok(!/Weather 0.2.7|open-meteo|overpass-api/i.test(source + gpsSource));

function sentence(body) {
    let sum = 0;
    for (let i = 0; i < body.length; i++) sum ^= body.charCodeAt(i);
    return '$' + body + '*' + ('0' + sum.toString(16)).slice(-2).toUpperCase();
}
const now = Date.now();
const d = new Date(now);
const hh = String(d.getUTCHours()).padStart(2, '0');
const mm = String(d.getUTCMinutes()).padStart(2, '0');
const ss = String(d.getUTCSeconds()).padStart(2, '0');
const dd = String(d.getUTCDate()).padStart(2, '0');
const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
const yy = String(d.getUTCFullYear()).slice(-2);
const time = hh + mm + ss + '.00';
const date = dd + mo + yy;
const nmea = [
    sentence('GNRMC,' + time + ',A,5607.0000,N,04715.0000,E,10.0,90.0,' + date + ',,,A'),
    sentence('GNGGA,' + time + ',5607.0000,N,04715.0000,E,1,10,0.8,100.0,M,0.0,M,,'),
    sentence('GNGST,' + time + ',,2.0,1.0,0.0,2.0,1.0,1.0')
].join('\r\n');
const fix = nmeaFix({ nmeaString: nmea }, now);
assert.ok(fix, 'valid BMW NMEA should yield a fix');
assert.strictEqual(fix.source, 'BMW SatellitePositioning');
assert.ok(Math.abs(fix.lat - 56.1166667) < 0.00001);
assert.ok(Math.abs(fix.lon - 47.25) < 0.00001);
assert.ok(fix.accuracyM > 0 && fix.accuracyM < 15);
assert.strictEqual(fix.speedKmh, 18.52);
assert.strictEqual(nmeaFix({ nmeaString: nmea.replace(/\*[0-9A-F]{2}/, '*00') }, now), null,
    'bad NMEA checksum must be rejected');
assert.strictEqual(nmeaFix({ nmeaString: '$GNRMC,broken' }, now), null);
console.log('Speed Camera Warning GPS tests passed');
