var config = require('../config.js').calendar;
var request = require('request');

var cals = {
  'fortress': 'dosomething.org_2d3538363933353536323630@resource.calendar.google.com',
  'themyscira': 'dosomething.org_2d38363637313938363230@resource.calendar.google.com',
  'xaviers': 'dosomething.org_3732343239383232313533@resource.calendar.google.com',
  'ingram': 'dosomething.org_2d33333338323238343834@resource.calendar.google.com',
  'batcave': 'dosomething.org_39363139303231372d3138@resource.calendar.google.com',
  'phone1': 'dosomething.org_32343432363339332d3434@resource.calendar.google.com',
  'phone2': 'dosomething.org_32353033383832362d3834@resource.calendar.google.com',
};

exports.updateInterval = 60 * 1000; // 1 minute
exports.update = function(callback) {
  refreshCalendars(callback);
}

/* ------------- Private Methods ------------- */

var access_token = "";
/** Gets a new access_token (expires every hour) using our refresh token. */
function refreshToken(callback) {
  var previous_token = access_token;

  request(
    { uri: 'https://accounts.google.com/o/oauth2/token'
    , method: 'POST'
    , headers: { 'Authorization': 'Bearer ' + access_token }
    , form:
      { 'client_id': config.CLIENT_ID
      , 'client_secret': config.CLIENT_SECRET
      , 'refresh_token': config.REFRESH_TOKEN
      , 'grant_type': 'refresh_token'
      }
    }
  , function (err, response, body) {
      if (err) return callback(err);

      data = JSON.parse(body);
      if (data.access_token != undefined) {
        access_token = data.access_token;

        if (previous_token != access_token) {
          console.log("calendar - got a new token");
          callback(err, access_token);
        }
      }
    }
  );
}

/** Refresh free/busy information from the Google Calendar API. */
function refreshCalendars(callback) {
  var date = new Date();
  var now = date.toISOString();
  var endOfDay = now.substr(0, 11) + "23:59:59" + now.substr(19);

  // construct POST data
  var post_data = {
    "timeMin": now,
    "timeMax": endOfDay,
    "items":[],
  };
  Object.keys(cals).forEach(function(name) {
    post_data.items.push({id: cals[name]});
  });

  console.log("calendar - fetching between " + now + " and " + endOfDay);

  request(
    { uri: 'https://www.googleapis.com/calendar/v3/freeBusy/'
    , method: 'POST'
    , headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + access_token
      }
    , body: JSON.stringify(post_data)
    }
  , function (err, response, body) {
      // check for a failed token
      if (response && response.statusCode == 401) {
        console.log("calendar - auth failed fetching a new token");
        refreshToken(function(err) {
          if (err) return callback(err);

          refreshCalendars(callback);
        });
        return;
      }
      else if (err) return callback(err);

      data = JSON.parse(body);
      if (!data) {
        callback("Couldn't parse JSON");
      }

      var freebusy = {};
      Object.keys(cals).forEach(function(name) {
        var id = cals[name];
        freebusy[name] = parseFreeBusy(data.calendars[id].busy);
      });
      callback(null, {'calendar': freebusy});
    }
  );
}

// ------- results -------
// {
//   'status': 'free',
//   'until': '2012-07-18T11:45:47-07:00'
// }
//
// {
//   'status': 'inuse',
//   'until': 'tomorrow'
// }
function parseFreeBusy(freebusyArray) {
  if (freebusyArray.length === 0) {
    // no events for the rest of the day
    return {
      'status': 'free',
      'until': 'tomorrow'
    }
  }

  // there are events, let's check them out

  // first, let's see if this room is in-use or not...
  var now = new Date();
  var startTime = new Date(freebusyArray[0].start);

  if(startTime < now) {
    // There's an event in progress!
    for(var i = 0; i < freebusyArray.length; i++) {
      if(i == freebusyArray.length - 1) {
        // Forced end of contiguous events.
        endTime = freebusyArray[i].end;

        break;
      }

      if(freebusyArray[i].end == freebusyArray[i+1].start) {
        // Found a contiguous block of events. Looping until it ends.
      } else {
        // Found the end of the contiguous events.
        endTime = freebusyArray[i].end;

        break;
      }
    }

    return {
      'status': 'inuse',
      'until': endTime
    };
  }

  return {
    'status': 'free',
    'until': freebusyArray[0].start
  };
}