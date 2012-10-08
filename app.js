/* ------------- Dependencies ------------- */

var express = require('express'),
     routes = require('./routes'),
       http = require('http'),
      https = require('https'),
     cookie = require('cookie'),
         fs = require('fs'),
       path = require('path'),
       mime = require('mime');

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
var io = require('socket.io').listen(server);

var numConnections = 0;

server.listen(app.get('port'), function(){
  console.log("app - server listening on port " + app.get('port'));
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

// on new connections
io.on('connection', function(socket) {
  var keys = Object.keys(lastUpdates);
  if (keys.length > 0) {
    // Send a copy of all the old data.
    keys.forEach(function(name) {
      socket.emit(name, lastUpdates[name]);
    });
  }

  numConnections++;
  console.log("app - A socket has connected! " + numConnections + " users connected.");

  socket.on('disconnect', function() {
    numConnections--;
    console.log("app - A socket has disconnected! " + numConnections + " users connected.");
  })
});

var widgets = [
    'weather'
  , 'github'
  , 'twitter'
  , 'facebook'
  , 'calendar'
  , 'redmine'
  , 'members'
  ];
widgets.forEach(function (widgetName) {
  var widget = require('./widgets/' + widgetName);
  widget.name = widgetName;

  // Handled updates and schedule the widget's next update.
  widget.update(function handler(err, response) {
    // Schedule the next update. It might be nice to back off if there was a
    // error.
    setTimeout(function() { widget.update(handler) }, widget.updateInterval || 60 * 1000);

    if (err) {
      console.log(widget.name, "- update failed", err, response);
      return;
    }
    Object.keys(response).forEach(function(name) {
      // Don't waste bandwidth repeating outselves.
      if (response[name] != lastUpdates[name]) {
        io.sockets.emit(name, response[name]);
        lastUpdates[name] = response[name];
      }
    });
  });

  // If it streams updates give it a copy of the io.
  if (widget.stream) {
    widget.stream(io);
  }
});

/* ------------- Redirects ------------- */

app.get('/bugs', function(req, res) {
  res.redirect("http://tech.dosomething.org");
});

app.get('/techwiki', function(req, res) {
  res.redirect("http://www.dosomething.org/tech");
});

