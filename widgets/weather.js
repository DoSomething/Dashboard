var config = require('../config.js').weather
  , request = require('request')
  ;

var io
  , latestForecast
  , forecast_summary = ""
  , current_condition = ""
  ;

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
function get_darksky_forecast(callback) {
  callback = callback || function(err) {};

  request(
    { uri: 'https://api.darkskyapp.com/v1/forecast/' + config.API_KEY + '/' + config.LATITUDE + ',' + config.LONGITUDE
    , method: 'GET'
    }
  , function (err, response, body) {
      latestForecast = JSON.parse(body);

      if (latestForecast != undefined && latestForecast.hourSummary != undefined) {
        forecast_summary = latestForecast.hourSummary;
        if (forecast_summary.length >= 30) {
          forecast_summary = latestForecast.briefHourSummary;
        }

        if (latestForecast.hourPrecipitation[0] != undefined) {
          var now_unix_time = Math.round((new Date()).getTime() / 1000);
          var condition_time = latestForecast.hourPrecipitation[0].time;

          if(condition_time <= now_unix_time) {
            // this forecast is already happening, so it's current
            current_condition = latestForecast.hourPrecipitation[0].type;
          } else {
            current_condition = "clear";
          }
        }

        if (forecast_summary == "clear") {
          current_condition = "clear";
        }
        console.log("weather: forecast - " + forecast_summary);
      } else {
        current_condition = "unknown";
        console.log("weather: fetch failed");
      }

      callback();
    }
  );
}
