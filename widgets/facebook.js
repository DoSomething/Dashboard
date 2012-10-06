var request = require("request");

exports.updateInterval = 2 * 60 * 1000; // 2 minutes
exports.update = function(callback) {
  request(
    { uri: 'http://graph.facebook.com/dosomething'
    , method: 'GET'
    }
  , function (err, response, body) {
      if (err) return callback(err);

      data = JSON.parse(body);
      console.log('facebook -', data.likes, 'likes');
      callback(null, {'likes_count': data.likes});
    }
  );
}
