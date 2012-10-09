var config = require('../config.js').weather
  , request = require('request')
  ;

exports.updateInterval = 60 * 1000; // 1 minute
exports.update = function(callback) {
  get_darksky_forecast(callback);
}

/* ------------- Private Methods ------------- */

/** Fetches updated microforecast information from Dark Sky API. */
function get_darksky_forecast(callback) {
  request(
    { uri: 'https://api.darkskyapp.com/v1/forecast/' + config.API_KEY + '/' + config.LATITUDE + ',' + config.LONGITUDE
    , method: 'GET'
    }
  , function (err, response, body) {
      if (err) return callback(err);

      var latestForecast = JSON.parse(body)
        , forecast_summary = ""
        , current_condition = "unknown"
        ;

      if (latestForecast == undefined || latestForecast.hourSummary == undefined) {
        return callback("couldn't parse weather data");
      }

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

      console.log("weather - %d°F %s/%s", latestForecast.currentTemp, current_condition, forecast_summary);

      callback(null, { 'darksky_forecast':
        { temperature: latestForecast.currentTemp
        , condition: current_condition
        , forecast: forecast_summary
        }
      });
    }
  );
}
