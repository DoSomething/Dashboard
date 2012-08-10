var      config = require('../config.js').rdio;

var applescript = require("applescript"),
           Rdio = require("rdio-node").Rdio;
           
var r = new Rdio({
  consumerKey: config.CONSUMER_KEY,
  consumerSecret: config.CONSUMER_SECRET
});

// state information about currently playing song
var url, song, artist, album, albumart, duration, startTime, endTime;
var skipVotes = 3;

// state information for queue
var queued_tracks = [];
var saved_tracks = [];

var track_progress_timer;

/** Tells Rdio to start playing the next queued song. */
function playNext() {
  if(queued_tracks.length == 0) {
    if(saved_tracks.length == 0) {
      // build the 'automatic mode' shuffle playlist
      addToSaved("t2844835");
      addToSaved("t4778095");
      addToSaved("t2213006");
      addToSaved("t2213062");
      addToSaved("t2213149");
      addToSaved("t7761186");
      addToSaved("t7761192");
      addToSaved("t7950983");
      addToSaved("t2860776");
      addToSaved("t2846119");
      addToSaved("t2888034");
      addToSaved("t18490113");
      addToSaved("t1255506");
      addToSaved("t3763109");
      addToSaved("t2841983");
      addToSaved("t15625903");
      addToSaved("t1249277");
      addToSaved("t2732580");
      addToSaved("t2035603");
      addToSaved("t12449177", function() { shuffle(); });
    } else {
      shuffle();
    }
  } else {
    var nextSong = queued_tracks[0];
    queued_tracks.splice(0, 1);
    playTrack(nextSong);
  }
}

var chosen_id;
/** Plays a random song! */
function shuffle() {
  if(saved_tracks.length != 0) {
    // fire up the random number generator, make sure same song isn't just repeated again
    var new_chosen_id = Math.floor(Math.random() * (saved_tracks.length + 1));
    if(new_chosen_id == chosen_id) {
      shuffle();
    } else {
      chosen_id = new_chosen_id
      playTrack(saved_tracks[chosen_id]);
    }
  }
}

/** Immediately starts playing a given track (given one of the objects produced by getTrackInfoFromID). */
function playTrack(track) {
  clearInterval(track_progress_timer);
  if(track != undefined && track.song != undefined) {
    song = track.song;
    artist = track.artist;
    album = track.album;
    albumart = track.albumart;
    duration = track.duration;
    
    runApplescript('tell application "Rdio" to play source "' + track.id + '"');
    startTime = Date.now();
    skipVotes = 3;
    
    track_progress_timer = setTimeout(playNext, duration * 1000);
    
    broadcast();
  } else {
    playNext()
  }
}

/** Send current track information to the given client (io.socket) */
function send(socket) {
  socket.emit('now_playing', {
    'song': song,
    'artist': artist,
    'album': album,
    'duration': duration,
    'startTime': startTime,
    'artwork': albumart
  });
  
  socket.emit('full_queue', queued_tracks);
  socket.emit('skip_votes', skipVotes);
}

/** Attach Socket.IO object for broadcasts. */
function attachIO(_io) {
  io = _io;
}

/** Broadcast current track information to all clients (io) */
function broadcast() {
  if(io != undefined) {
    io.sockets.emit('now_playing', {
      'song': song,
      'artist': artist,
      'album': album,
      'duration': duration,
      'startTime': startTime,
      'artwork': albumart
    });
    
    io.sockets.emit('full_queue', queued_tracks);
    
    io.sockets.emit('skip_votes', skipVotes);
  }
}

/** Returns a unique identifier (timestamp) for *CURRENTLY* playing instance of song. */
function getSongID() {
  return startTime;
}


/** Count up votes to skip the current song, and do so if 3 votes are tallied. */
function skip() {
  if(skipVotes > 1) {
    skipVotes--;

    io.sockets.emit('skip_votes', skipVotes);
  } else {
    playNext();
  }
}

/** Pipes a search request through to Rdio's search API. */
function search(s, callback) {
  r.makeRequest('search', {query: s, types: "Track", count: 8}, function() {
    callback(arguments['1'].result.results);
  });
}

/** Self-explanatory, no? Adds a song to the queue. */
function addToQueue(id, callback) {
  console.log("Rdio module is ready for the job! Queueing up " + id + ".");

  var isDuplicate = false;
  getTrackInfoFromID(id, function(d) {
    for(i in queued_tracks) {
      if(d.id == queued_tracks[i].id) {
        isDuplicate = true;
      }
    }
    if(!isDuplicate) {
      queued_tracks.push(d);
      if(io) {
        io.sockets.emit('queue_addition', d);
      }
    }
    
    if(callback != undefined) {
      callback();
    }
  });
}

/** Saves a song to the stored playlist, which is used when no songs are in the queue. */
function addToSaved(id, callback) {
  console.log("Rdio module is ready for the job! Saving " + id + ".");
  getTrackInfoFromID(id, function(d) {
    saved_tracks.push(d);
    if(callback != undefined) {
      callback();
    }
  });
}

exports.playNext = playNext;
exports.send = send;
exports.attachIO = attachIO;
exports.broadcast = broadcast;

exports.getSongID = getSongID;
exports.skip = skip;
exports.search = search;
exports.addToQueue = addToQueue;


/* ------------- Private Methods ------------- */

function getTrackInfoFromID(id, callback) {
  r.makeRequest('get', {keys: id}, function(err, data) {
    if(data != undefined && data.result != undefined && data.result[id] != undefined) {
      if(callback) {
        callback({
          'id': data.result[id].key,
          'song': data.result[id].name,
          'artist': data.result[id].artist,
          'album': data.result[id].album,
          'albumart': data.result[id].icon,
          'duration': data.result[id].duration
        });
      } else {
        console.log("Error: No callback given for getTrackInfoFromID");
      }
    } else {
      getTrackInfoFromID(id, callback);
    }
  });
}

function getTrackInfoFromUrl(track_url, callback) {
  r.makeRequest('getObjectFromUrl', {url: track_url}, function() {
    console.dir(arguments['1'].result);
    
    song = arguments['1'].result.name;
    artist = arguments['1'].result.artist;
    album = arguments['1'].result.album;
    duration = arguments['1'].result.duration;
    albumart = arguments['1'].result.icon;
    
    callback();
  });
}

function runApplescript(s, callback) {
  applescript.execString(s, function(err, rtn) {
    if(err) {
      // something went wrong! handle this shit!
    }

    if(callback && rtn) {
      callback(rtn);
    }
  });
}

function runApplescriptFile(f, callback) {
  applescript.execFile(__dirname + "/applescripts/" + f + ".applescript", function(err, rtn) {
    if(err) {
      // something went wrong! handle this shit!
    }

    if(callback && rtn) {
      callback(rtn);
    }
  });
}