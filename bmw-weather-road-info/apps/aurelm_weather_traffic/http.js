'use strict';
// HTTPS requests are delegated to the root-owned aurelm-weather-net service.
// The service runs outbound HTTPS under the mgu-uplink fetch UID.
const net = require('net');
const url = require('url');

const SOCKET = '/run/aurelm-weather-net/ctl.sock';
let sequence = 0;

function configure() {}

function getJson(href, options) {
  options = options || {};
  return new Promise((resolve, reject) => {
    const parsed = url.parse(href);
    if (parsed.protocol !== 'https:' || !parsed.hostname) {
      reject(new Error('Network: only HTTPS URLs are supported'));
      return;
    }

    const timeoutMs = Math.max(5000, Number(options.timeout) || 20000);
    const id = String(Date.now()) + '-' + (++sequence);
    let socket = null;
    let buffer = '';
    let settled = false;
    let timer = null;

    function finish(err, value) {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (socket) {
        try { socket.destroy(); } catch (_) {}
      }
      if (err) reject(err);
      else resolve(value);
    }

    try {
      socket = net.createConnection(SOCKET);
      socket.on('connect', () => {
        try {
          socket.write(JSON.stringify({
            id: id,
            url: href,
            timeout: timeoutMs
          }) + '\n');
        } catch (e) {
          finish(new Error('Weather internet service write failed: ' + e.message));
        }
      });

      socket.on('data', chunk => {
        if (settled) return;
        buffer += chunk.toString('utf8');
        if (buffer.length > 3 * 1024 * 1024 + 65536) {
          finish(new Error('Weather internet service response exceeds 3 MB'));
          return;
        }
        const at = buffer.indexOf('\n');
        if (at < 0) return;

        let response;
        try {
          response = JSON.parse(buffer.slice(0, at));
        } catch (e) {
          finish(new Error('Weather internet service returned invalid JSON: ' + e.message));
          return;
        }
        if (!response || String(response.id) !== id) {
          finish(new Error('Weather internet service response ID mismatch'));
          return;
        }
        if (response.error) {
          finish(new Error('mgu-uplink HTTPS failed: ' + response.error));
          return;
        }
        const status = Number(response.status);
        if (status < 200 || status >= 300) {
          finish(new Error('Weather internet service HTTP status ' + status));
          return;
        }
        try {
          const body = typeof response.body === 'string' ? response.body : '';
          const data = JSON.parse(body);
          finish(null, data);
        } catch (e) {
          finish(new Error('Weather API returned invalid JSON: ' + e.message));
        }
      });

      socket.on('error', err => {
        finish(new Error('Weather internet service socket error: ' +
          (err.code ? err.code + ': ' : '') + err.message));
      });
      socket.on('end', () => {
        if (!settled && buffer.indexOf('\n') < 0) {
          finish(new Error('Weather internet service closed without a response'));
        }
      });
      timer = setTimeout(() => {
        finish(new Error('Weather internet service timeout after ' + timeoutMs + ' ms'));
      }, timeoutMs + 5000);
    } catch (e) {
      finish(new Error('Weather internet service unavailable: ' + e.message));
    }
  });
}

module.exports = { configure, getJson };
