var    config = require("../config.js").github;

var githubapi = require("github"),
           fs = require("fs");

var github = new githubapi({
  version: "3.0.0"
});

var commits = [];
var waitingCommits = 0;

var lastPush, lastPush_str;

// read saved code push values
fs.readFile(__dirname + "/data/codepush.txt", function (err, data) {
  if (err) throw err;
  console.log("**** SAVED CODE PUSH DATA: " + data.toString() + "********");
  lastPush = new Date(data.toString());
  lastPush_str = lastPush.toISOString();
});

/* Set refresh interval. */
setInterval(refresh, 10*1000);

/** Sends to a single client, given their socket object. */
function send(socket) {
  socket.emit('recent_commits', { 
    "waiting_commits": waitingCommits
  });
  
  socket.emit('code_push', lastPush_str);
}

/** Attach Socket.IO object for broadcasts. */
function attachIO(_io) {
  io = _io;
}

/** Broadcasts to all clients. Socket.IO object must have been previously attached. */
function broadcast() {
  if(io) {
    io.sockets.emit('recent_commits', { 
      "waiting_commits": waitingCommits
    });
    
    io.sockets.emit('code_push', lastPush_str);
  } else {
    console.error("Error: Need to attach io object before Github can broadcast.");
  }
}

/** Updates the time of last code push. */
function codepush() {
  var now = new Date();
  
  lastPush = now;
  lastPush_str = now.toISOString();
  
  var stream = fs.createWriteStream(__dirname + "/data/codepush.txt");
  stream.once('open', function(fd) {
    stream.write(lastPush_str);
  });
  
  broadcast();
}

exports.send = send;
exports.attachIO = attachIO;
exports.broadcast = broadcast;

exports.codepush = codepush;


/* ------------- Private Methods ------------- */

function refresh() {
  // commits = [];
  waitingCommits = 0;
  
  github.authenticate({
    type: "oauth",
    token: config.TOKEN
  });
  
  github.repos.getCommits({
    user: config.USER,
    repo: config.REPO
  }, function(err, res) {
    for(var n in res) {
        if(res[n].commit && res[n].commit.message != "Merge branch 'master' of github.com:" + config.USER + "/" + config.REPO) {
          var commitDate = new Date(Date.parse(res[n].commit.committer.date));
          if(commitDate > lastPush) {
            waitingCommits++;
          }
        }
    }
    
    broadcast();
  });
}