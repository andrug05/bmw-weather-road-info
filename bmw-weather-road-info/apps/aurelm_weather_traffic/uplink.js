'use strict';
/**
 * Resolve through the DNS servers supplied by mgu-uplink.
 * Internet routing itself is provided to the app UID by package.json mguInternet.
 */
const dns = require('dns');
const fs = require('fs');
const path = require('path');

function readLease(dataDir) {
  const candidates = [
    dataDir && path.join(dataDir, 'uplink.json'),
    dataDir && path.join(dataDir, 'mgu-uplink', 'lease.json'),
    '/run/mgu-uplink/lease.json'
  ];
  for (const file of candidates) {
    if (!file) continue;
    try {
      const value = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (value && Array.isArray(value.dns) && value.dns.length) {
        const servers = value.dns.filter(s => typeof s === 'string' && s.trim());
        if (servers.length) return Object.assign({}, value, { dns: servers, leasePath: file });
      }
    } catch (e) {}
  }
  return null;
}

function resolver() {
  let instance = null;
  let serversKey = '';
  return function lookupFor(currentLease) {
    const servers = currentLease && currentLease.dns;
    if (!Array.isArray(servers) || !servers.length) return null;
    const key = servers.join(',');
    if (key !== serversKey) {
      instance = new dns.Resolver();
      instance.setServers(servers);
      serversKey = key;
    }
    const activeResolver = instance;
    return function lookup(hostname, options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      options = options || {};
      let completed = false;
      const done = (err, address, family) => {
        if (completed) return;
        completed = true;
        if (err) return callback(err);
        if (options.all) return callback(null, [{ address, family }]);
        callback(null, address, family);
      };
      activeResolver.resolve4(hostname, (err, addresses) => {
        if (err) return done(new Error('mgu-uplink DNS failed for ' + hostname + ': ' + err.message));
        if (!addresses || !addresses.length) return done(new Error('mgu-uplink DNS returned no IPv4 address for ' + hostname));
        done(null, addresses[0], 4);
      });
    };
  };
}

function create(dataDir) {
  const lookupFor = resolver();
  return {
    lease: () => readLease(dataDir),
    lookup: () => {
      const currentLease = readLease(dataDir);
      return currentLease ? lookupFor(currentLease) : null;
    },
    status: () => {
      const currentLease = readLease(dataDir);
      return currentLease
        ? { available: true, dns: currentLease.dns, ip: currentLease.ip || null, path: currentLease.leasePath }
        : { available: false, dns: [], ip: null, path: null };
    }
  };
}

module.exports = { lease: readLease, resolver, create };
