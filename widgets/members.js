var         config = require('../config.js').members;

var          https = require('https'),
             jsdom = require('jsdom'),
      MailChimpAPI = require('mailchimp').MailChimpAPI,
                qs = require('qs');
    
var io, total_member_count = 0;
var mobilecommons_count = 0;
var mailchimp_count = 0;

/* Set refresh interval. */
refresh();
setInterval(refresh, 10 * 60 * 1000); // 10 minutes

/** Sends to a single client, given their socket object. */
function send(socket) {
  socket.emit('members', total_member_count);
}

/** Attach Socket.IO object for broadcasts. */
function attachIO(_io) {
  io = _io;
}

/** Broadcasts to all clients. Socket.IO object must have been previously attached. */
function broadcast() {
  if(io) {
    console.log("*** BROADCASTING MEMBER COUNT: " + total_member_count);
    io.sockets.emit('members', total_member_count);
  } else {
    console.log("Error: Need to attach io object before Members can broadcast.");
  }
}

exports.send = send;
exports.attachIO = attachIO;
exports.broadcast = broadcast;


/* ------------- Private Methods ------------- */

function refresh() {
  refreshMobileCommons(function() {
    refreshMailchimp(function() {
      total_member_count = Math.floor(mobilecommons_count * .75) + mailchimp_count + 120000;
      
      broadcast();
    });
  });
}

/** Gets an estimate of the number of MobileCommons users, accurate within 5. */



function refreshMobileCommons(callback) {
  var mCommonsPage;
  
  // var post_data = qs.stringify({
  //   'email': 'bfilbin@dosomething.org',
  //   'password': 'Kickba11'
  // })
  
  var options = {
    host: 'secure.mcommons.com',
    port: 443,
    path: '/dashboard',
    method: 'GET',
    headers: {
        'Cookie': '_mcommons_session_id=31d937dee0b75b9dd9b77078bce80fb8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': '',
        'Accept-Language': 'en-US,en;q=0.8'
    }
  };
  
  var req = https.request(options, function(res, err) {
    if(callback) {
      var data = "";
      
      res.on('data', function(d) {
        data += d.toString();
      });
      
      res.on('end', function() {
        mCommonsPage = data;
        //console.log(mCommonsPage);
        
        jsdom.env(mCommonsPage, [
        'http://code.jquery.com/jquery-1.5.min.js'
        ], function(errors, window) {
          var raw_count = window.$(".subscribers-a p span").text();
          mobilecommons_count = parseInt(raw_count.replace(/,/g, ''));
          console.log("*** MOBILECOMMONS: " + mobilecommons_count + " ***");
        });
        
        callback();
      });
    }
  
    req.on('error', function(e) {
      console.log("Error making request to Mobile Commons.");
    });
  });

  req.end();
}

/** Gets an the number of Mailchimp users. */
function refreshMailchimp(callback) {
  try {
    var api = new MailChimpAPI(config.MAILCHIMP_API_KEY, {version: '1.3', secure: false});
  } catch(error) {
    console.log(error.message);
  }
  
  api.listGrowthHistory({id: "f2fab1dfd4"}, function(error, data) {
    console.log("******* MAILCHIMP DATA *******");
    console.dir(data[data.length - 1]);

    var latest = data[data.length - 1];
    mailchimp_count = parseInt(latest.existing) + parseInt(latest.imports) + parseInt(latest.optins);
    
    console.log("***** END MAILCHIMP DATA *****");
    
    callback();
  });
}