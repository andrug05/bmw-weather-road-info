'use strict';
const https = require('https');
function getJson(url, options) {
 options = options || {};
 return new Promise((resolve,reject) => {
  const req = https.get(url,{headers:{'User-Agent':'BMW-Weather-Road-Info/0.1 (MGU ID7)'}},res => {
   let body=''; res.setEncoding('utf8');
   res.on('data',chunk=>{body+=chunk;if(body.length>3*1024*1024)req.destroy(new Error('Response too large'));});
   res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300)return reject(new Error('HTTP '+res.statusCode));try{resolve(JSON.parse(body));}catch(e){reject(new Error('Invalid JSON: '+e.message));}});
  });
  req.setTimeout(options.timeout||12000,()=>req.destroy(new Error('Network timeout'))); req.on('error',reject);
 });
}
module.exports={getJson};
