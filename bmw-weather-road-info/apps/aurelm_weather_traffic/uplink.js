'use strict';
/**
 * mgu-uplink DNS support, following nickgcode/idrive7-apps kit/runtime/uplink.js.
 * The app's UID gets the route; this module resolves hostnames through the DNS
 * servers carried in the mgu-uplink lease rather than the MGU system resolver.
 */
const dns = require('dns');
const fs = require('fs');
const path = require('path');

function lease(dataDir) {
  const files = [dataDir ? path.join(dataDir, 'uplink.json') : '', '/run/mgu-uplink/lease.json'];
  for (let i = 0; i < files.length; i++) {
    if (!files[i]) continue;
    try {
      const value = JSON.parse(fs.readFileSync(files[i], 'utf8'));
      if (value && value.ip) return value;
    } catch (e) {}
  }
  return null;
}
function resolver() {
  let current = null, serversKey = '';
  return function lookupFor(currentLease) {
    const servers = currentLease && Array.isArray(currentLease.dns)
      ? currentLease.dns.filter(s => typeof s === 'string' && s) : [];
    if (!servers.length) return undefined;
    const key = servers.join(',');
    if (key !== serversKey) {
      current = new dns.Resolver();
      current.setServers(servers);
      serversKey = key;
    }
    const instance = current;
    return function lookup(hostname, options, callback) {
      if (typeof options === 'function') callback = options;
      instance.resolve4(hostname, (err, addresses) => {
        if (err || !addresses || !addresses.length) callback(err || new Error('No IPv4 address for ' + hostname));
        else callback(null, addresses[0], 4);
      });
    };
  };
}
function create(dataDir) {
  const lookupFor = resolver();
  return { lease: () => lease(dataDir), lookup: () => lookupFor(lease(dataDir)) };
}
module.exports = { lease, resolver, create };
