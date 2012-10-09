var config = require('../config.js').redmine;

var request = require('request')
  , async = require('async')
  , current_sprint
  ;

exports.updateInterval = 5 * 60 * 1000; // 5 minutes
exports.update = function(callback) {
  // Make sure we've got a sprint before trying to get the issues.
  if (!current_sprint) {
    return find_current_sprint(function (err, sprint) {
      if (err) return callback(err);

      current_sprint = sprint;
      exports.update(callback);
    });
  }

  async.parallel(
    {  open_issues: function(cb) { refresh_issues('o', cb); }
    ,  closed_issues: function(cb) { refresh_issues('c', cb); }
    }
  , function(err, results) {
      if (err) return callback(err);

      results.sprint_name = current_sprint.name;
      console.log("redmine - open: %d closed: %d", results.open_issues, results.closed_issues)
      callback(null, {redmine: results});
    }
  );
}

/* ------------- Private Methods ------------- */


function find_current_sprint(callback) {
  request(
    { uri: 'http://tech.dosomething.org/projects/ds-web/versions.json'
    , method: 'GET'
    , headers: { 'Authorization': 'Basic ' + new Buffer(config.API_KEY + ':').toString('base64') }
    }
  , function (err, response, body) {
      if (err) return callback(err);

      data = JSON.parse(body);
      if (!data) return
      // TODO check for parse errors.

      var versions
        , now = new Date()
        , current
        ;

      // The data comes back sorted by (I believe) by id. Strip it down to the
      // name and a date we can easily sort...
      versions = data.versions.map(function(version) {
        // Chop up a date like: 2012/12/28
        var parts = (version.due_date || '1970/1/1').split('/');
        return {
          'id': version.id,
          'name': version.name,
          'date': new Date(parts[0], parts[1], parts[2], 23, 59)
        };
      });
      // ...put it in order and ignore sprints that have already completed...
      versions.sort(function(a, b) { return a.date - b.date; });
      versions = versions.filter(function(value) {
        return now < value.date;
      });

      // ...and the first one left should be it.
      if (!versions[0]) return callback("It seems like there's no sprint scheduled.")
      current = versions[0];

      console.log("redmine - working on %s (id: %d)", current.name, current.id);
      callback(null, current);
    }
  );
}


/** Refreshes the count of issues with a status are open in this sprint. */
function refresh_issues(status, callback) {
  if (!current_sprint || !current_sprint.id) return callback("Missing version id");

  request(
    { uri: 'http://tech.dosomething.org/issues.json?status_id=' + status + '&fixed_version_id=' + current_sprint.id
    , method: 'GET'
    , headers: { 'Authorization': 'Basic ' + new Buffer(config.API_KEY + ':').toString('base64') }
    }
  , function (err, response, body) {
      if (err) return callback(err);

      data = JSON.parse(body);
      callback(null, data.total_count);
    }
  );
}