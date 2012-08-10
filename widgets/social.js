var config = require('../config.js').social;

var   twit = require("twit"),
      http = require("http"),
     https = require("https");

var io;

var twitter = new twit({
  consumer_key: config.TWITTER.CONSUMER_KEY,
  consumer_secret: config.TWITTER.CONSUMER_SECRET,
  access_token: config.TWITTER.ACCESS_TOKEN,
  access_token_secret: config.TWITTER.ACCESS_TOKEN_SECRET
})

var recent_tweets = [];
var followers_count = 0;
var likes_count = 0;

/* Set refresh intervals. */
update_followers_count();
setInterval(update_followers_count, 120 * 1000);

update_likes_count();
setInterval(update_likes_count, 60 * 1000);

/** Attach Socket.IO object for broadcasts. Everything else will automagically start! */
function attachIO(_io) {
  io = _io;
  
  update_followers_count();
}

/** Used to send cached data to clients on a new connection (so they don't have to wait for next broadcast). */
function send(socket) {
  for(t = recent_tweets.length - 1; t >= 0; t--) {
    socket.emit('twitter_stream', recent_tweets[t]);
  }
  
  socket.emit('followers_count', followers_count);
  socket.emit('likes_count', likes_count);
}

exports.attachIO = attachIO;
exports.send = send;


/* ------------- Private Methods ------------- */

/** Uses twit to connect to the Twitter Streaming API and pull any tweets mentioning DS. */
var twitter_stream = twitter.stream('statuses/filter', { track: '@dosomething' });
twitter_stream.on('tweet', function(tweet) {
  console.dir(tweet);
  
  // save latest 3 tweets in an array
  var t = {
    'text': tweet.text,
    'name': tweet.user.name,
    'screen_name': tweet.user.screen_name,
    'avatar': tweet.user.profile_image_url,
    'id': tweet.id_str // ?
  }
  
  recent_tweets.push(t);

  if(recent_tweets.length > 3) {
    recent_tweets.pop();
  }
  
  if(io) {
    io.sockets.emit('twitter_stream', t);
  }
});


function update_followers_count() {
  twitter.get("users/show", { screen_name: 'dosomething' }, function(err, data) {
    if(data && data.followers_count) {
      followers_count = data.followers_count;
    } else {
      console.log("WARNING: Couldn't read follower count from Twitter API. Received:");
      console.dir(data);
    }
    
    if(io) {
      io.sockets.emit('followers_count', followers_count);
    }
  });
}

function update_likes_count() {
  var buffer = "";
  
  var options = {
    host: 'graph.facebook.com',
    port: 80,
    path: '/dosomething',
    method: 'GET'
  };
  
  var req = http.request(options, function(res, err) {
    res.on('data', function(chunk) {
      buffer += chunk;
    });
    
    res.on('end', function() {
        data = JSON.parse(buffer);
        likes_count = data.likes;
        
        if(io) {
          io.sockets.emit('likes_count', likes_count);
        }
    });
  });
  
  req.on('error', function(e) {
   console.error("Error making request to Facebook Graph API: " + e);
  });
  
  req.end();
}

