'use strict';
/**
 * mgu-uplink supplies per-UID routing. DNS must use the DNS servers in its lease.
 * Resolve all IPv4 records so a failed first address does not block the request.
 */
const dns = require('dns');
const fs = require('fs');
const path = require('path');

function readLease(dataDir) {
  const candidates = [dataDir && path.join(dataDir, 'uplink.json'), dataDir && path.join(dataDir, 'mgu-uplink', 'lease.json'), '/run/mgu-uplink/lease.json'];
  for (const file of candidates) {
    if (!file) continue;
    try {
      const value = JSON.parse(fs.readFileSync(file, 'utf8'));
      const servers = value && Array.isArray(value.dns) ? value.dns.filter(s => typeof s === 'string' && s.trim()) : [];
      if (servers.length) return Object.assign({}, value, { dns: servers, leasePath: file });
    } catch (e) {}
  }
  return null;
}
function resolver() {
  let instance = null, serversKey = '';
  function getResolver(lease) {
    const servers = lease && lease.dns;
    if (!Array.isArray(servers) || !servers.length) return null;
    const key = servers.join(',');
    if (key !== serversKey) { instance = new dns.Resolver(); instance.setServers(servers); serversKey = key; }
    return instance;
  }
  function resolveAll(hostname, lease) {
    return new Promise((resolve, reject) => {
      const active = getResolver(lease);
      if (!active) return reject(new Error('mgu-uplink DNS lease unavailable'));
      let done = false;
      const timer = setTimeout(() => { if (!done) { done = true; reject(new Error('DNS query timeout for ' + hostname)); } }, 7000);
      active.resolve4(hostname, (err, addresses) => {
        if (done) return;
        done = true; clearTimeout(timer);
        if (err) return reject(new Error('mgu-uplink DNS failed for ' + hostname + ': ' + err.message));
        const unique = [];
        (addresses || []).forEach(address => { if (unique.indexOf(address) < 0) unique.push(address); });
        if (!unique.length) return reject(new Error('mgu-uplink DNS returned no IPv4 address for ' + hostname));
        resolve(unique);
      });
    });
  }
  function lookupFor(lease) {
    if (!getResolver(lease)) return null;
    return function lookup(hostname, options, callback) {
      if (typeof options === 'function') { callback = options; options = {}; }
      options = options || {};
      resolveAll(hostname, lease).then(addresses => {
        if (options.all) callback(null, addresses.map(address => ({ address, family: 4 })));
        else callback(null, addresses[0], 4);
      }, callback);
    };
  }
  return { lookupFor, resolveAll };
}
function create(dataDir) {
  const dnsTools = resolver();
  const currentLease = () => readLease(dataDir);
  return {
    lease: currentLease,
    lookup: () => { const value = currentLease(); return value ? dnsTools.lookupFor(value) : null; },
    resolve: hostname => { const value = currentLease(); return value ? dnsTools.resolveAll(hostname, value) : Promise.reject(new Error('mgu-uplink lease/DNS unavailable')); },
    status: () => {
      const value = currentLease();
      return value ? { available: true, dns: value.dns, ip: value.ip || null, path: value.leasePath } : { available: false, dns: [], ip: null, path: null };
    }
  };
}
module.exports = { lease: readLease, resolver, create };
