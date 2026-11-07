'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),cp=require('child_process');
const base=path.join(__dirname,'../apps/aurelm_speed_camera_warning');
const db=require(path.join(base,'camera-db.json')),map=require(path.join(base,'city-map.json'));
assert.strictEqual(db.revision,2);
assert.strictEqual(db.cities['yoshkar-ola'].filter(c=>typeof c.lat==='number'&&typeof c.lon==='number').length,4);
assert.strictEqual(db.cities['yoshkar-ola'].filter(c=>c.lat===null&&c.lon===null).length,2);
assert(map.roads.length>=20);
for(const r of map.roads){assert.strictEqual(r.length,5);assert(r.slice(1).every(Number.isFinite));}
const app=JSON.parse(fs.readFileSync(path.join(base,'app.json'),'utf8'));assert.strictEqual(app.version,'0.4.0');assert.strictEqual(app.screens[0].kind,'canvas');
for(const f of ['main.js','gps.js','camera-store.js','proximity.js'])cp.execFileSync(process.execPath,['--check',path.join(base,f)]);
console.log('Speed Camera Warning 0.4.0 map/database tests passed');
