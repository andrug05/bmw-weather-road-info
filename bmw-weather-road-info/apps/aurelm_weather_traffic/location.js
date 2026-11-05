'use strict';
const {DEFAULT_LOCATION,validCoordinates}=require('./model');
const CITIES={chisinau:{name:'Chisinau',latitude:47.0105,longitude:28.8638},bucharest:{name:'Bucharest',latitude:44.4268,longitude:26.1025},iasi:{name:'Iasi',latitude:47.1585,longitude:27.6014},kyiv:{name:'Kyiv',latitude:50.4501,longitude:30.5234},warsaw:{name:'Warsaw',latitude:52.2297,longitude:21.0122},berlin:{name:'Berlin',latitude:52.52,longitude:13.405},yoshkar_ola:{name:'Yoshkar-Ola',latitude:56.6388,longitude:47.8908}};
function createLocationService(ctx,settings,log){
 let manual=Object.assign({},DEFAULT_LOCATION); let gpsProvider=null;
 try{if(ctx&&typeof ctx.getLocation==='function')gpsProvider=()=>ctx.getLocation();}catch(e){if(log)log.warn('GPS adapter unavailable: '+e.message);}
 function selectedCity(){const id=String(settings.get('city')||'chisinau');return Object.assign({source:'manual'},CITIES[id]||manual);}
 return {
  setManual(value){if(!value||!validCoordinates(Number(value.latitude),Number(value.longitude)))throw new Error('Coordinates out of range');manual={name:String(value.name||'Selected location'),latitude:Number(value.latitude),longitude:Number(value.longitude)};settings.set('city_name',manual.name);settings.set('latitude',manual.latitude);settings.set('longitude',manual.longitude);},
  manual(){return Object.assign({},manual);},
  async current(){if(String(settings.get('location_mode')||'gps')==='gps'&&gpsProvider){try{const p=await gpsProvider();if(p&&validCoordinates(Number(p.latitude),Number(p.longitude)))return{name:'Vehicle GPS',latitude:Number(p.latitude),longitude:Number(p.longitude),source:'gps'};}catch(e){if(log)log.warn('GPS read failed: '+e.message);}}return selectedCity();},
  gpsAvailable:()=>!!gpsProvider
 };
}
module.exports={createLocationService,CITIES};
