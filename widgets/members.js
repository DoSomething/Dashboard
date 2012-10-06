var         config = require('../config.js').members;

var async = require('async')
  , request = require('request')
  , jsdom = require('jsdom')
  , MailChimpAPI = require('mailchimp').MailChimpAPI
  ;

exports.updateInterval = 10 * 60 * 1000; // 10 minutes
exports.update = function(callback) {
  refresh(callback);
}

/* ------------- Private Methods ------------- */

function refresh(callback) {
  async.parallel(
    {  mobilecommons: refreshMobileCommons
    ,  mailchimp: refreshMailchimp
    }
  , function(err, results) {
      var total_member_count = Math.floor(results.mobilecommons * .75) + results.mailchimp + 120000;
      callback(null, {'members': total_member_count});
    }
  );
}

/** Gets an estimate of the number of MobileCommons users, accurate within 5. */
function refreshMobileCommons(callback) {
  request(
    { uri: 'https://secure.mcommons.com/dashboard'
    , method: 'GET'
    , headers: {
        'Cookie': '_mcommons_session_id=31d937dee0b75b9dd9b77078bce80fb8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': '',
        'Accept-Language': 'en-US,en;q=0.8'
      }
    }
  , function (err, response, body) {
      if (err) return callback(err);

      jsdom.env(body, [
      'http://code.jquery.com/jquery-1.5.min.js'
      ], function(err, window) {
        if (err) return callback(err);

        var raw_count = window.$(".subscribers-a p span").text();
        var mobilecommons_count = parseInt(raw_count.replace(/,/g, ''));
        console.log("members - mobilecommons: " + mobilecommons_count);
        // Release the memory.
        window.close();
        callback(null, mobilecommons_count);
      });
    }
  );
}

/** Gets an the number of Mailchimp users. */
function refreshMailchimp(callback) {
  try {
    var api = new MailChimpAPI(config.MAILCHIMP_API_KEY, {version: '1.3', secure: false});
  } catch(error) {
    return callback(error);
  }

  api.listGrowthHistory({id: "f2fab1dfd4"}, function(error, data) {
    if (error) return callback(error);

    var latest = data[data.length - 1];
    var mailchimp_count = parseInt(latest.existing) + parseInt(latest.imports) + parseInt(latest.optins);
    console.log("members - mailchimp: " + mailchimp_count);

    callback(null, mailchimp_count);
  });
}