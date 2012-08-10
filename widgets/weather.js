var config = require('../config.js').weather;
var https = require('https');

var latestForecast;
var forecast_summary = "";
var current_condition = "";

/* Set broadcast interval. */
setInterval(broadcast, 60 * 1000);

/** Sends forecast data to a single client, given a io.socket object. */
function send(socket) {
  get_darksky_forecast(function(data) {
    socket.emit('darksky_forecast', {
      temperature: latestForecast.currentTemp,
      forecast: forecast_summary,
      condition: current_condition
    });
  });
}

/** Attach Socket.IO object for broadcasts. */
function attachIO(_io) {
  io = _io;
}

/** Broadcasts forecast data to all connected clients, given io object. */
function broadcast() {
  if(io) {
    get_darksky_forecast(function(data) {
      io.sockets.emit('darksky_forecast', {
        temperature: latestForecast.currentTemp,
        forecast: forecast_summary,
        condition: current_condition
      });
    });
  }
}

exports.send = send;
exports.attachIO = attachIO;
exports.broadcast = broadcast;


/* ------------- Private Methods ------------- */

/** Fetches updated microforecast information from Dark Sky API. */
function get_darksky_forecast(callback, error) {
  var options = {
    host: 'api.darkskyapp.com',
    port: 443,
    path: '/v1/forecast/' + config.API_KEY + '/' + config.LATITUDE + ',' + config.LONGITUDE,
    method: 'GET'
  };

  var req = https.request(options, function(res, err) {
    if(callback) {
      res.on('data', function(d) {
        latestForecast = JSON.parse(d);
        
        if(latestForecast != undefined && latestForecast.hourSummary != undefined) {
          var hourSum = latestForecast.hourSummary;
          
          console.log("Forecast text length: " + hourSum.length);
          if(hourSum.length >= 30) {
            forecast_summary = latestForecast.briefHourSummary;
            console.log("Shortened weather -- " + latestForecast.hourSummary + " --> " + latestForecast.briefHourSummary);
          } else {
            forecast_summary = latestForecast.hourSummary;
          }
          
          console.dir(latestForecast.hourPrecipitation[0]);
          
          if(latestForecast.hourPrecipitation[0] != undefined) {
            var now_unix_time = Math.round((new Date()).getTime() / 1000);
            var condition_time = latestForecast.hourPrecipitation[0].time;
            
            if(condition_time <= now_unix_time) {
              // this forecast is already happening, so it's current
              
              current_condition = latestForecast.hourPrecipitation[0].type;
            } else {
              current_condition = "clear";
            }
          }
          
          if(forecast_summary == "clear") {
            current_condition = "clear";
          }

        } else {
          current_condition = "unknown";
        }
        
        
        
        callback(d);
      });
    }

    req.on('error', function(e) {
      // error(e);
      console.error("Error making request to Dark Sky API.");
    });
  });

  req.end();
}

/** Fetches updated current conditions information from the National Weather Service API.  */
function get_nws_conditions(callback, error) {
  // w1.weather.gov/xml/current_obs/KNYC.xml
}