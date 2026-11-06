'use strict';
const uplink = require('./net');
function getJson(url, options) {
  options = options || {};
  return uplink.request(url, options.timeout || 20000);
}
module.exports = { getJson };
