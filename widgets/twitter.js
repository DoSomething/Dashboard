var config = require('../config.js').twitter;

var twit = require("twit");

var twitter = new twit({
  consumer_key:config.CONSUMER_KEY,
  consumer_secret:config.CONSUMER_SECRET,
  access_token: config.ACCESS_TOKEN,
  access_token_secret: config.ACCESS_TOKEN_SECRET
})

var recent_tweets = [];

exports.updateInterval = 2 * 60 * 1000; // 2 minutes
exports.update = function(callback) {
  twitter.get("users/show", { screen_name: 'dosomething' }, function(err, data) {
    if (err) return callback(err);

    if (data && data.followers_count) {
      console.log('twitter - %d followers', data.followers_count);
      callback(null, {'followers_count': data.followers_count});
    } else {
      callback("WARNING: Couldn't read follower count from Twitter API. Received:", data);
    }
  });
}

exports.stream = function(io) {
  console.log("twitter - settingup twitter stream");

  /** Uses twit to connect to the Twitter Streaming API and pull any tweets mentioning DS. */
  var twitter_stream = twitter.stream('statuses/filter', { track: '@dosomething' });
  twitter_stream.on('tweet', function(tweet) {
    console.log("twitter - “%s” %s", tweet.text, tweet.user.screen_name);

    var t = {
      'text': tweet.text,
      'name': tweet.user.name,
      'screen_name': tweet.user.screen_name,
      'avatar': tweet.user.profile_image_url,
      'id': tweet.id_str // ?
    }

    // save latest 3 tweets in an array
    recent_tweets.push(t);
    if(recent_tweets.length > 3) {
      recent_tweets.pop();
    }

    io.sockets.emit('twitter_stream', t);
  });
}
