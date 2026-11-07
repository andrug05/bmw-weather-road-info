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
const storeSource = fs.readFileSync(path.join(appDir, 'camera-store.js'), 'utf8');
const { nmeaFix, INTERFACE, INSTANCE } = require(path.join(appDir, 'gps.js'));
const { validateDatabase } = require(path.join(appDir, 'camera-store.js'));
const { ProximityWarnings, distanceMeters, FAST_WARNING_M, FIRST_WARNING_M, SECOND_WARNING_M } =
    require(path.join(appDir, 'proximity.js'));

assert.strictEqual(spec.id, 'aurelm_speed_camera_warning');
assert.strictEqual(spec.version, '0.3.0');
assert.strictEqual(spec.screens[0].name, 'MAIN');
assert.strictEqual(db.schemaVersion, 1);
assert.ok(Array.isArray(db.cities['yoshkar-ola']) && db.cities['yoshkar-ola'].length >= 1);
assert.ok(spec.signals[INTERFACE]._broadcasts.includes('updatePosition'));
assert.strictEqual(spec.signals[INTERFACE]._instances, '1');
assert.ok(source.includes("require('./camera-store')"));
assert.ok(source.includes("require('./proximity')"));
assert.ok(source.includes('gps.start()'));
assert.ok(source.includes('refreshDatabase'));
assert.ok(source.includes('PROXIMITY_WARNING'));
assert.ok(storeSource.includes('camera-db-cache.json'));
assert.ok(storeSource.includes('https://raw.githubusercontent.com/'));
assert.ok(!/Weather 0\.2\.7|open-meteo|overpass-api/i.test(source + gpsSource + storeSource));
assert.deepStrictEqual(validateDatabase(db).cities['yoshkar-ola'].length, 4);

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
assert.strictEqual(nmeaFix({ nmeaString: nmea.replace(/\*[0-9A-F]{2}/, '*00') }, now), null);
assert.strictEqual(nmeaFix({ nmeaString: '$GNRMC,broken' }, now), null);

assert.strictEqual(FIRST_WARNING_M, 500);
assert.strictEqual(FAST_WARNING_M, 700);
assert.strictEqual(SECOND_WARNING_M, 200);
const camera = { id: 'test-camera', lat: 0, lon: 0.00449, name: 'test' };
const slow = new ProximityWarnings();
let events = slow.update({ lat: 0, lon: 0, speedKmh: 60, accuracyM: 5 }, [camera]);
assert.strictEqual(events.length, 1);
assert.strictEqual(events[0].stage, 1);
assert.ok(events[0].distanceM <= 500);
events = slow.update({ lat: 0, lon: 0.0027, speedKmh: 60, accuracyM: 5 }, [camera]);
assert.strictEqual(events.length, 1);
assert.strictEqual(events[0].stage, 2);
assert.strictEqual(slow.update({ lat: 0, lon: 0.0026, speedKmh: 60, accuracyM: 5 }, [camera]).length, 0);

const fast = new ProximityWarnings();
const fastCamera = { id: 'fast-camera', lat: 0, lon: 0.006, name: 'fast' };
events = fast.update({ lat: 0, lon: 0, speedKmh: 95, accuracyM: 5 }, [fastCamera]);
assert.strictEqual(events.length, 1);
assert.ok(events[0].distanceM <= 700);
assert.ok(events[0].distanceM > 500);
assert.strictEqual(fast.update({ lat: 0, lon: 0, speedKmh: 95, accuracyM: 60 }, [fastCamera]).length, 0);
assert.ok(distanceMeters({ lat: 0, lon: 0 }, { lat: 0, lon: 0.001 }) > 100);
console.log('Speed Camera Warning GPS, database and proximity tests passed');
