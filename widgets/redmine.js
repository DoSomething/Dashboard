var config = require('../config.js').redmine;

var   http = require('http');

var io, open_issues = 0, closed_issues = 0;

/* Set refresh interval. */
refresh();
setInterval(refresh, 30*1000);

/** Sends to a single client, given their socket object. */
function send(socket) {
  socket.emit('redmine', { 
    "open_issues": open_issues,
    "closed_issues": closed_issues
  });
}

/** Attach Socket.IO object for broadcasts. */
function attachIO(_io) {
  io = _io;
}

/** Broadcasts to all clients. Socket.IO object must have been previously attached. */
function broadcast() {
  if(io) {
    io.sockets.emit('redmine', { 
      "open_issues": open_issues,
      "closed_issues": closed_issues
    });
  } else {
    console.log("Error: Need to attach io object before Github can broadcast.");
  }
}

exports.send = send;
exports.attachIO = attachIO;
exports.broadcast = broadcast;

/* ------------- Private Methods ------------- */

function refresh() {
  refresh_open_issues();
  refresh_closed_issues();
  broadcast();
}

/** Refreshes the count of issues that are open in this sprint. */
function refresh_open_issues() {
  var buffer = "";
  
  var auth = 'Basic ' + new Buffer(config.API_KEY + ':').toString('base64');
  var options = {
    host: 'tech.dosomething.org',
    port: 80,
    path: '/issues.json?status_id=o&fixed_version_id=' + config.CURRENT_SPRINT_ID,
    method: 'GET',
    headers: {
      'Authorization': auth
    }
  };
  
  var req = http.request(options, function(res, err) {
    res.on('data', function(chunk) {
      buffer += chunk;
    });
    
    res.on('end', function() {
        data = JSON.parse(buffer);
        open_issues = data.total_count;
    });
  });
  
  req.on('error', function(e) {
   console.log("Error making request to Redmine API: " + e);
  });
  
  req.end();
}

/** Refreshes the count of issues that were closed this week. */
function refresh_closed_issues() {

  
  var buffer = "";
  
  var auth = 'Basic ' + new Buffer(config.API_KEY + ':').toString('base64');
  var options = {
    host: 'tech.dosomething.org',
    port: 80,
    path: '/issues.json?status_id=c&fixed_version_id=' + config.CURRENT_SPRINT_ID,
    method: 'GET',
    headers: {
      'Authorization': auth
    }
  };
  
  var req = http.request(options, function(res, err) {
    res.on('data', function(chunk) {
      buffer += chunk;
    });
    
    res.on('end', function() {
        data = JSON.parse(buffer);
        closed_issues = data.total_count;
    });
  });
  
  req.on('error', function(e) {
   console.log("Error making request to Redmine API: " + e);
  });
  
  req.end();
}