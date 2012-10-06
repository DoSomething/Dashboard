var config = require('../config.js').redmine;

var request = require('request')
  ,   async = require('async')

exports.updateInterval = 5 * 60 * 1000; // 1 minute
exports.update = function(callback) {
  async.parallel(
    {  open_issues: function(cb) { refresh_issues('o', cb); }
    ,  closed_issues: function(cb) { refresh_issues('c', cb); }
    }
  , function(err, results) {
      console.log("redmine - open:", results.open_issues, " closed:", results.closed_issues)
      callback(null, {redmine: results});
    }
  );
}

/* ------------- Private Methods ------------- */

/** Refreshes the count of issues with a status are open in this sprint. */
function refresh_issues(status, callback) {
  request(
    { uri: 'http://tech.dosomething.org/issues.json?status_id=' + status + '&fixed_version_id=' + config.CURRENT_SPRINT_ID
    , method: 'GET'
    , headers:
      {
        'Authorization': 'Basic ' + new Buffer(config.API_KEY + ':').toString('base64')
      }
    }
  , function (err, response, body) {
      if (err) {
        console.log("readmine - fetch open failed");
        return callback(err);
      }
      data = JSON.parse(body);
      callback(null, data.total_count);
    }
  );
}