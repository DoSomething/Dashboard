/* ------------- Dependencies ------------- */

var express = require('express'),
     routes = require('./routes'),
       http = require('http'),
      https = require('https'),
     cookie = require('cookie'),
         fs = require('fs'),
       path = require('path'),
       mime = require('mime');

var weather = require('./widgets/weather.js'),
       rdio = require('./widgets/rdio.js'),
     github = require('./widgets/github.js'),
     social = require('./widgets/social.js'),
   calendar = require('./widgets/calendar.js'),
    redmine = require('./widgets/redmine.js'),
    members = require('./widgets/members.js');

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

rdio.playNext();

// attach Socket.io to widgets
weather.attachIO(io);
rdio.attachIO(io);
github.attachIO(io);
social.attachIO(io);
calendar.attachIO(io);
redmine.attachIO(io);
members.attachIO(io);

// on new connections
io.on('connection', function(socket) {
  weather.send(socket);
  rdio.send(socket);
  github.send(socket);
  social.send(socket);
  calendar.send(socket);
  redmine.send(socket);
  members.send(socket);

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

app.get('/play/listen.m3u', function(req, res) {
  var file = __dirname + '/public/download/listen.m3u';

  var filename = path.basename(file);
  var mimetype = mime.lookup(file);

  res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
  res.setHeader('Content-Type', mimetype);

  var filestream = fs.createReadStream(file);
  filestream.on('data', function(chunk) {
    res.write(chunk);
  });
  filestream.on('end', function() {
    res.end();
  });
});

/* ------------- API ------------- */

var user_count;
var last_push;
var songID = "";
var skip_limit_table = {};

/** [POST] Add a new song to the play queue by Rdio ID. */
app.post('/api/play/queue', function(req, res) {
  if(rdio) {
    rdio.addToQueue(req.param('id', null), function(data) {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end("OK");
    });
  } else {
    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.end("Internal Error - Rdio not initialized.");
  }
});

/** [GET] Fetch search results for a given term through Rdio module. */
app.get('/api/play/search', function(req, res) {
  req.on('end', function() {
    if(rdio) {
      console.log("Searching Rdio for tracks matching: " + req.param('s', null));
      rdio.search(req.param('s', null), function(data) {
        res.json(data);
      });


    } else {
      res.writeHead(500, {'Content-Type': 'text/plain'});
      res.end("Internal Error - Rdio not initialized.");
    }


  });
});


/** [POST] Receives votes to skip current playing song & forwards request to Rdio module. */
app.post('/api/play/skip', function(req, res) {
  req.on('end', function() {
    // clear the skip limit table if this is a new song
    if(songID != rdio.getSongID()) {
      songID = rdio.getSongID();

      skip_limit_table = {};
      console.log("Cleared skip limit table after new song!");
    }

    console.dir(skip_limit_table);
    // check if IP is in table, if so refuse request
    if(skip_limit_table[req.ip] == "voted") {
      console.log("Found IP in skip limit table, refusing request!");

      res.writeHead(403, {'Content-Type': 'text/plain'});
      res.end("FORBIDDEN");
    } else {
      if(rdio) {
        rdio.skip();
      }

      skip_limit_table[req.ip] = "voted";
      console.log("Added an IP to refuse future skip requests to!")
      console.dir(skip_limit_table);

      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end("OK");
    }


  });
});

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

