'use strict';
const net = require('net');
const SOCKET = '/run/aurelm-weather-net/ctl.sock';
let nextId = 1;
function request(url, timeout) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    let done = false, buffer = '';
    const socket = net.createConnection(SOCKET);
    const finish = (err, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { socket.destroy(); } catch (e) {}
      if (err) reject(err); else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error('Internet service timeout')), timeout || 25000);
    socket.on('connect', () => socket.write(JSON.stringify({ id, url, timeout: timeout || 20000 }) + '\n'));
    socket.on('data', chunk => {
      buffer += chunk.toString('utf8');
      if (buffer.length > 4 * 1024 * 1024) return finish(new Error('Internet service response too large'));
      let at;
      while ((at = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, at);
        buffer = buffer.slice(at + 1);
        if (!line) continue;
        let message;
        try { message = JSON.parse(line); } catch (e) { return finish(new Error('Invalid internet service response')); }
        if (message.id !== id) continue;
        if (message.error) return finish(new Error(message.error));
        if (message.status < 200 || message.status >= 300) return finish(new Error('HTTP ' + message.status));
        try { finish(null, JSON.parse(message.body)); }
        catch (e) { finish(new Error('Invalid JSON: ' + e.message)); }
        return;
      }
    });
    socket.on('error', err => finish(new Error('Internet service: ' + err.message)));
    socket.on('close', () => { if (!done) finish(new Error('Internet service disconnected')); });
  });
}
module.exports = { request };
