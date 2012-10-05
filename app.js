/* ------------- Dependencies ------------- */

var express = require('express'),
     routes = require('./routes'),
       http = require('http'),
      https = require('https'),
     cookie = require('cookie'),
         fs = require('fs'),
       path = require('path'),
       mime = require('mime');

var widgets = [
    require('./widgets/weather.js')
  , require('./widgets/github.js')
  , require('./widgets/social.js')
  , require('./widgets/calendar.js')
  , require('./widgets/redmine.js')
  , require('./widgets/members.js')
  ];
// Keep track of what we sent out last so we can send it to new connections.
var lastUpdates = {};

/* ------------- Setup ------------- */

var app = express();

var MemoryStore = express.session.MemoryStore,
   sessionStore = new MemoryStore();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon(__dirname + '/public/favicon.ico', { maxAge: 2592000000 }));
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.cookieParser());
  app.use(express.session({
    store: sessionStore,
    secret: 'secret',
    key: 'express.sid'
  }));
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var ext_app = express();
ext_app.configure(function(){
  ext_app.set('port', 9001);
  ext_app.use(express.logger('dev'));
  ext_app.use(express.bodyParser());
  ext_app.use(express.methodOverride());
  ext_app.use(app.router);
});

/* ------------- Server/Socket.IO ------------- */

// start up server and initialize things
var server = http.createServer(app);
var ext_server = http.createServer(ext_app);
var io = require('socket.io').listen(server);

var numConnections = 0;

server.listen(app.get('port'), function(){
  console.log("Internal (main) server listening on port " + app.get('port'));
});

ext_server.listen(ext_app.get('port'), function(){
  console.log("External (limited API) server listening on port " + ext_app.get('port'));
});

var Session = require('connect').middleware.session.Session;
io.set('log level', 2);
io.set('authorization', function(data, accept) {
  // check if there's a cookie header
  if(data.headers.cookie) {
    data.cookie = cookie.parse(data.headers.cookie);
    data.sessionID = data.cookie['express.sid'];
    data.sessionStore = sessionStore;

    // get the session data from the session store
    sessionStore.get(data.sessionID, function(err, session) {
      if(err || !session) {
        accept('Error', false);
      } else {
        // create a session object based on request & the session data we just acquired
        data.session = new Session(data, session);
        accept(null, true);
      }
    });
  } else {
    return accept('No cookie transmitted.', false);
  }

  accept(null, true);
});

// attach Socket.io to widgets
var handleUpdate = function(err, response) {
  if (err) {
    console.log("failed update...", err, response);
    return;
  }
  Object.keys(response).forEach(function(name) {
    io.sockets.emit(name, response[name]);

    // Keep track of what we've sent out.
    lastUpdates[name] = response[name];
  });
}

// on new connections
io.on('connection', function(socket) {
  var keys = Object.keys(lastUpdates);
  if (keys.length > 0) {
console.log("last updates", lastUpdates);
    // Send a copy of all the old data.
    keys.forEach(function(name) {
      socket.emit(name, lastUpdates[name]);
    });
  }
  else {
    widgets.forEach(function(source) {
      source.update(handleUpdate);
    });
  }

  numConnections++;
  console.log("\n ** A socket has connected! (" + numConnections + " users connected.)");
  console.log(" ** Socket: " + socket.handshake.sessionID + " \n");

  socket.on('disconnect', function() {
    numConnections--;
    console.log("\n ** A socket has disconnected! " + numConnections + " users connected.\n");
  })
});

/* ------------- Redirects ------------- */

app.get('/bugs', function(req, res) {
  res.redirect("http://tech.dosomething.org");
});

app.get('/techwiki', function(req, res) {
  res.redirect("http://www.dosomething.org/tech");
});


/* ------------- API ------------- */

var last_push;

/** [POST] Accepts a secret key to indicate that code has been pushed. */
ext_app.post('/api/codepush', function(req, res) {
  var key = req.param('key', null);

  console.log("Received key is: " + key);
  if(key == '9ea0e06f22661970ce1b12661970ce1b1b1fa1d2e6f1') {
    // since this is internal only, i think this is a reasonable safeguard
    console.log("[POST] Received indication that code has been pushed. Updating timestamp!")
    github.codepush();

    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end("OK");
  } else {
    console.log("[POST] Ack! received a code push notification with an invalid key. Ignoring.")

    res.writeHead(403, {'Content-Type': 'text/plain'});
    res.end("INVALID KEY");
  }
});

