'use strict';
// HTTPS through the mgu-uplink route, resolving hostnames with the DNS servers
// from this app's uplink.json lease (same approach as nickgcode/idrive7-apps).
const https = require('https');
const url = require('url');
const uplink = require('./uplink');
let network = uplink.create(process.cwd());
function configure(dataDir) { network = uplink.create(dataDir || process.cwd()); }
function getJson(href, options) {
  options = options || {};
  return new Promise((resolve, reject) => {
    const parsed = url.parse(href);
    if (parsed.protocol !== 'https:' || !parsed.hostname) {
      reject(new Error('Only HTTPS URLs are supported'));
      return;
    }
    const requestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.path,
      method: 'GET',
      headers: { 'User-Agent': 'BMW-Weather-Road-Info/0.2.1', 'Accept': 'application/json' },
      timeout: options.timeout || 20000
    };
    const lookup = network.lookup();
    if (lookup) requestOptions.lookup = lookup;
    let settled = false;
    const fail = err => {
      if (settled) return;
      settled = true;
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    const req = https.request(requestOptions, res => {
      let body = '';
      if (typeof res.setEncoding === 'function') res.setEncoding('utf8');
      res.on('data', chunk => {
        if (settled) return;
        body += chunk;
        if (body.length > 3 * 1024 * 1024) {
          req.abort();
          fail(new Error('Response too large'));
        }
      });
      res.on('end', () => {
        if (settled) return;
        if (res.statusCode < 200 || res.statusCode >= 300) {
          fail(new Error('HTTP ' + res.statusCode));
          return;
        }
        try { settled = true; resolve(JSON.parse(body)); }
        catch (e) { fail(new Error('Invalid JSON: ' + e.message)); }
      });
      res.on('error', fail);
    });
    req.on('error', fail);
    req.on('timeout', () => {
      const err = new Error('Network timeout');
      req.abort();
      fail(err);
    });
    req.end();
  });
}
module.exports = { configure, getJson };
