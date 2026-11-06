'use strict';
// Root service; all HTTPS work is delegated to a short-lived child running as the mgu-uplink fetch UID.
const fs = require('fs');
const path = require('path');
const net = require('net');
const cp = require('child_process');
const https = require('https');
const urlmod = require('url');
const SELF = 'aurelm-weather-net';
const ROOT = '/var/opt/aurelm-weather-net';
const STATE = ROOT + '/state';
const SOCKET = '/run/aurelm-weather-net/ctl.sock';
const MAX_UID = 60000;
const MAINAPPS = [{ root: '/usr/lib/oap-mainapp', hmi: 'HmiMain3D' }, { root: '/usr/lib/oap-mainapp21', hmi: 'Hmi8' }];
function read(file) { try { return fs.readFileSync(file, 'utf8'); } catch (e) { return ''; } }
function json(file) { try { return JSON.parse(read(file)); } catch (e) { return null; } }
function list(dir) { try { return fs.readdirSync(dir); } catch (e) { return []; } }
function mkdirp(dir) { if (fs.existsSync(dir)) return; mkdirp(path.dirname(dir)); fs.mkdirSync(dir, 0o755); }
function isId(n) { return n > 0 && n === Math.floor(n); }
function mainappConfig() {
  const have = MAINAPPS.filter(m => fs.existsSync(path.join(m.root, 'config/base.json')));
  let selected = have.length === 1 ? have[0] : null;
  if (have.length > 1) {
    const running = list('/proc').filter(n => /^\d+$/.test(n)).map(n => read('/proc/' + n + '/comm').trim());
    const active = have.filter(m => running.indexOf(m.hmi) >= 0);
    if (active.length === 1) selected = active[0];
  }
  return selected ? json(path.join(selected.root, 'config/base.json')) : null;
}
function allocateUid() {
  const cfg = mainappConfig();
  if (!cfg || !cfg.usableUidsAndGids) throw new Error('Cannot read MainApp UID ranges');
  const ranges = [cfg.usableUidsAndGids].concat(Object.keys(cfg.usableUidsAndGidsRse || {}).map(k => cfg.usableUidsAndGidsRse[k]))
    .filter(r => r && isId(Number(r.min)) && Number(r.max) >= Number(r.min))
    .map(r => ({ min: Number(r.min), max: Number(r.max) }));
  if (!ranges.length) throw new Error('MainApp UID ranges are empty');
  const inRange = u => ranges.some(r => u >= r.min && u <= r.max);
  const taken = {};
  const add = v => { const n = Number(v); if (String(v).trim() && isId(n)) taken[n] = true; };
  read('/etc/passwd').split('\n').forEach(l => { const f=l.split(':'); add(f[2] || ''); add(f[3] || ''); });
  read('/etc/group').split('\n').forEach(l => add(l.split(':')[2] || ''));
  list('/var/opt/public/oap').forEach(n => { const m=/^oap_(\d+)$/.exec(n); if(m)add(m[1]); });
  const mgr='/var/opt/public/oap/oap_12201';
  list(mgr + '/data/apps').forEach(n => { const a=json(mgr + '/data/apps/' + n); if(a)add(a.userId); });
  read(mgr + '/security/uids.txt').split('\n').forEach(l => add(l.split('=')[0]));
  list('/var/opt/mgu-uplink/uids.d').filter(n => n !== SELF && n.charAt(0) !== '.').forEach(n =>
    read('/var/opt/mgu-uplink/uids.d/' + n).split(/[\s,]+/).forEach(v => add(v.split('#')[0])));
  const updater=json('/var/opt/mgu-updater/state/uids.json') || {};
  Object.keys(updater).forEach(k => add(updater[k]));
  (cfg.mainAppUids || []).forEach(add);
  list('/proc').filter(n => /^\d+$/.test(n)).forEach(pid => read('/proc/' + pid + '/status').split('\n').forEach(l => {
    const m=/^[UG]id:\s+(.*)$/.exec(l); if(m)m[1].split(/\s+/).forEach(add);
  }));
  const kept=Number((json(STATE + '/uids.json') || {}).fetch);
  let uid=isId(kept) && !taken[kept] && !inRange(kept) ? kept : null;
  if(uid === null) {
    let n=Math.max.apply(null, ranges.map(r=>r.max))+1;
    while(n<=MAX_UID && (taken[n] || inRange(n))) n++;
    if(n<=MAX_UID) uid=n;
  }
  if(uid === null) throw new Error('No free internet UID below ' + MAX_UID);
  mkdirp(STATE);
  fs.writeFileSync(STATE + '/uids.json', JSON.stringify({fetch:uid}) + '\n', {mode:0o644});
  fs.writeFileSync(STATE + '/internet-uids', String(uid) + '\n', {mode:0o644});
  const uplink='/var/opt/mgu-uplink';
  if(fs.existsSync(uplink)) {
    mkdirp(uplink + '/uids.d');
    fs.writeFileSync(uplink + '/uids.d/' + SELF, String(uid) + '\n', {mode:0o644});
  }
  console.log('internet fetch UID: ' + uid);
  return uid;
}
function helper() {
  let raw='';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', d => { raw += d; if(raw.length > 1024*1024) process.exit(2); });
  process.stdin.on('end', () => {
    let q;
    try { q=JSON.parse(raw); } catch(e) { process.stdout.write(JSON.stringify({error:'bad request'})); return; }
    let u;
    try { u=urlmod.parse(q.url); } catch(e) { process.stdout.write(JSON.stringify({error:'bad URL'})); return; }
    if(u.protocol !== 'https:' || !u.hostname) { process.stdout.write(JSON.stringify({error:'HTTPS URL required'})); return; }
    let ended=false, chunks=[], size=0;
    const timer=setTimeout(() => { if(!ended){ended=true; req.abort(); process.stdout.write(JSON.stringify({error:'HTTPS timeout'}));} }, Math.min(Number(q.timeout)||20000,30000));
    const req=https.get({hostname:u.hostname, port:u.port||443, path:u.path, headers:{'User-Agent':'BMW-Weather-Road-Info/0.2.0'}}, res => {
      res.on('data', c => { size+=c.length; if(size>3*1024*1024){if(!ended){ended=true;clearTimeout(timer);req.abort();process.stdout.write(JSON.stringify({error:'response too large'}));}} else chunks.push(c); });
      res.on('end', () => { if(ended)return; ended=true;clearTimeout(timer);process.stdout.write(JSON.stringify({status:res.statusCode,body:Buffer.concat(chunks).toString('utf8')})); });
      res.on('error', e => { if(!ended){ended=true;clearTimeout(timer);process.stdout.write(JSON.stringify({error:e.message}));} });
    });
    req.on('error', e => { if(!ended){ended=true;clearTimeout(timer);process.stdout.write(JSON.stringify({error:e.code ? e.code + ': ' + e.message : e.message}));} });
  });
}
if(process.argv.indexOf('--fetch') >= 0) { helper(); }
else {
  let uid;
  try { uid=allocateUid(); } catch(e) { console.error(e.message); process.exit(1); }
  try { fs.unlinkSync(SOCKET); } catch(e) {}
  mkdirp('/run/aurelm-weather-net');
  const server=net.createServer(socket => {
    let buf='';
    socket.on('data', chunk => {
      buf+=chunk.toString('utf8');
      if(buf.length>1024*1024){socket.destroy();return;}
      let at;
      while((at=buf.indexOf('\n'))>=0) {
        const line=buf.slice(0,at);buf=buf.slice(at+1);
        if(!line)continue;
        let q;try{q=JSON.parse(line);}catch(e){socket.write(JSON.stringify({id:null,error:'bad request'})+'\n');continue;}
        const child=cp.spawn(process.execPath,[__filename,'--fetch'],{uid:uid,gid:uid,cwd:'/',env:{},stdio:['pipe','pipe','ignore']});
        let out='',done=false;
        const timer=setTimeout(()=>{if(!done){done=true;child.kill('SIGKILL');socket.write(JSON.stringify({id:q.id,error:'fetch timeout'})+'\n');}},31000);
        child.stdout.on('data',d=>{out+=d.toString('utf8');if(out.length>4*1024*1024){child.kill('SIGKILL');}});
        child.on('error',e=>{if(!done){done=true;clearTimeout(timer);socket.write(JSON.stringify({id:q.id,error:e.message})+'\n');}});
        child.on('close',()=>{if(done)return;done=true;clearTimeout(timer);let result;try{result=JSON.parse(out);}catch(e){result={error:'fetch helper returned no JSON'};}result.id=q.id;socket.write(JSON.stringify(result)+'\n');});
        child.stdin.end(JSON.stringify(q));
      }
    });
  });
  server.listen(SOCKET,()=>{try{fs.chownSync(SOCKET,0,12202);fs.chmodSync(SOCKET,0o660);}catch(e){} console.log('listening ' + SOCKET);});
}
