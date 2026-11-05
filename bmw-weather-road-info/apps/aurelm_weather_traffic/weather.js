'use strict';
const {getJson}=require('./http');
const URLSearchParams = require('url').URLSearchParams;
const {normalizeWeather,validCoordinates}=require('./model');
async function fetchWeather(location){
 if(!location||!validCoordinates(location.latitude,location.longitude))throw new Error('Invalid weather coordinates');
 const q=new URLSearchParams({latitude:String(location.latitude),longitude:String(location.longitude),current:'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',hourly:'temperature_2m,precipitation_probability,weather_code',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',forecast_days:'7',timezone:'auto'});
 return normalizeWeather(await getJson('https://api.open-meteo.com/v1/forecast?'+q));
}
module.exports={fetchWeather};
