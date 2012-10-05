var config = require('../config.js').social;

var    twit = require("twit"),
    request = require("request");

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
// update_followers_count();
// setInterval(update_followers_count, 120 * 1000);

// update_likes_count();
// setInterval(update_likes_count, 60 * 1000);

exports.update = function(callback) {
  update_followers_count(callback);
  update_likes_count(callback);
}

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


function update_followers_count(callback) {
  twitter.get("users/show", { screen_name: 'dosomething' }, function(err, data) {
    if (err) return callback(err);

    if (data && data.followers_count) {
      callback(null, {'followers_count': data.followers_count});
    } else {
      callback("WARNING: Couldn't read follower count from Twitter API. Received:", data);
    }
  });
}

function update_likes_count(callback) {
  request(
    { uri: 'http://graph.facebook.com/dosomething'
    , method: 'GET'
    }
  , function (err, response, body) {
      if (err) return callback(err);

      data = JSON.parse(body);
      callback(null, {'likes_count': data.likes});
    }
  );
}

