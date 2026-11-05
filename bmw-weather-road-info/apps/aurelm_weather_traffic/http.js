'use strict';
const https = require('https');

/**
 * MGU's embedded Node HTTPS shim may not implement Node's optional
 * (url, options, callback) overload. Use the portable (url, callback)
 * form so the callback is never mistaken for an options/listener value.
 */
function getJson(url, options) {
  options = options || {};
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    let req;
    try {
      req = https.get(url, (res) => {
        let body = '';
        if (typeof res.setEncoding === 'function') res.setEncoding('utf8');

        res.on('data', (chunk) => {
          body += chunk;
          if (body.length > 3 * 1024 * 1024) {
            if (req && typeof req.destroy === 'function') req.destroy(new Error('Response too large'));
            else fail(new Error('Response too large'));
          }
        });

        res.on('end', () => {
          if (settled) return;
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return fail(new Error('HTTP ' + res.statusCode));
          }
          try {
            settled = true;
            resolve(JSON.parse(body));
          } catch (e) {
            fail(new Error('Invalid JSON: ' + e.message));
          }
        });

        if (typeof res.on === 'function') res.on('error', fail);
      });
    } catch (e) {
      fail(e);
      return;
    }

    if (req && typeof req.on === 'function') req.on('error', fail);
    if (req && typeof req.setTimeout === 'function') {
      req.setTimeout(options.timeout || 12000, () => {
        const err = new Error('Network timeout');
        if (typeof req.destroy === 'function') req.destroy(err);
        else fail(err);
      });
    }
  });
}

module.exports = { getJson };
