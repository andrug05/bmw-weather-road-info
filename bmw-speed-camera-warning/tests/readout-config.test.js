'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'apps/aurelm_speed_camera_warning/app.json'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'apps/aurelm_speed_camera_warning/main.js'), 'utf8');

assert.strictEqual(spec.id, 'aurelm_speed_camera_warning');
assert.strictEqual(spec.version, '0.1.0');
assert.ok(spec.signals['de.bmw.infotainment.speech.readout.ReadoutService']);
assert.ok(spec.signals['de.bmw.infotainment.speech.readout.ReadoutInstance']);
assert.deepStrictEqual(
    spec.signals['de.bmw.infotainment.speech.readout.ReadoutService']._methods,
    ['registerReadoutClient', 'unregisterReadoutClient']
);
assert.deepStrictEqual(
    spec.signals['de.bmw.infotainment.speech.readout.ReadoutInstance']._methods,
    ['startReadout']
);
assert.ok(source.includes("signals.proxy(READOUT_SERVICE"));
assert.ok(source.includes("signals.call(proxy, 'startReadout'"));
assert.ok(source.includes('textLanguage: language === \'en\' ? 2 : 14'));
assert.ok(!source.includes('Weather 0.2.7'));
console.log('Readout app config tests passed');