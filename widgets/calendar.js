var config = require('../config.js').calendar;
var  https = require('https');

var io;
var freebusy; // cached free busy information

var cals = {
  'fortress': 'dosomething.org_2d3538363933353536323630@resource.calendar.google.com',
  'themyscira': 'dosomething.org_2d38363637313938363230@resource.calendar.google.com',
  'xaviers': 'dosomething.org_3732343239383232313533@resource.calendar.google.com',
  'ingram': 'dosomething.org_2d33333338323238343834@resource.calendar.google.com',
  'batcave': 'dosomething.org_39363139303231372d3138@resource.calendar.google.com',
  'phone1': 'dosomething.org_32343432363339332d3434@resource.calendar.google.com',
  'phone2': 'dosomething.org_32353033383832362d3834@resource.calendar.google.com',
};

/* Set refresh interval. */
refreshCalendars();
setInterval(refreshCalendars, 30 * 1000);

function attachIO(_io) {
  io = _io;
}

function broadcast() {
  if(io) {
    io.sockets.emit('calendar', freebusy);
  } else {
    console.error("Error: Need to attach io object before Calendar can broadcast.");
  }
}

function send(socket) {
  socket.emit('calendar', freebusy);
}

exports.send = send;
exports.attachIO = attachIO;
exports.broadcast = broadcast;


/* ------------- Private Methods ------------- */

var access_token = "";
/** Gets a new access_token (expires every hour) using our refresh token. */
function refreshToken(callback) {
  var previous_token = access_token;

  var post_data = JSON.stringify({
    'client_id': config.CLIENT_ID,
    'client_secret': config.CLIENT_SECRET,
    'refresh_token': config.REFRESH_TOKEN,
    'grant_type': 'refresh_token'
  });

  var options = {
    host: 'accounts.google.com',
    port: 443,
    path: '/o/oauth2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': post_data.length,
      'Authorization': 'Bearer ' + access_token
    }
  }

  var req = https.request(options, function(res) {
    res.setEncoding('utf8');

    res.on('data', function(data) {
      data = JSON.parse(data);
      if(data.access_token != undefined) {
        // console.log("****** NEW ACCESS TOKEN ****** ");
        // console.log(data.access_token);
        // console.log("****************************** ");
        access_token = data.access_token;

        if(previous_token != access_token) {
          callback();
        } else {
          console.error("ERROR: Could not refresh access token.");
        }
      }
    });
  });

  req.write(post_data);
  req.end();
}

/** Refresh free/busy information from the Google Calendar API. */
function refreshCalendars() {
  var date = new Date();
  var now = date.toISOString();
  var endOfDay = now.substr(0, 11) + "23:59:59" + now.substr(19);

  console.log("Fetching free/busy information from " + now + " to " + endOfDay + ".");

  // HTTP request options
  var options = {
    host: 'www.googleapis.com',
    port: 443,
    path: '/calendar/v3/freeBusy/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + access_token
    }
  }

  // construct POST data
  var post_data = {
    "timeMin": now,
    "timeMax": endOfDay,
    "items":[],
  };
  Object.keys(cals).forEach(function(name) {
    post_data.items.push({id: cals[name]});
  });

  var req = https.request(options, function(res) {
    var buffer = "", data;
    res.setEncoding('utf8');

    res.on('data', function(chunk) {
      buffer += chunk;
    });

    res.on('end', function() {
      data = JSON.parse(buffer); // parse into valid JSON

      if(data.calendars != undefined) {
        // we got good data, yay!
        freebusy = {};
        Object.keys(cals).forEach(function(name) {
          var id = cals[name];
          freebusy[name] = parseFreeBusy(data.calendars[id].busy);
        });
        broadcast();
      } else {
        refreshToken(function() {
          refreshCalendars();
        });
      }
    });
  });

  req.write(JSON.stringify(post_data));
  req.end();
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
  if(freebusyArray.length === 0) {
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