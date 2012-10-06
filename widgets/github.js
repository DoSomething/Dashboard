var    config = require("../config.js").github;

var async = require('async')
  , feedparser = require('feedparser')
  , githubapi = require("github")
  , github = new githubapi({
      version: "3.0.0"
    })
  ;
var commits = [];
var waitingCommits = 0;

var lastPush, lastPush_str;

exports.updateInterval = 5 * 60 * 1000; // 5 minutes
exports.update = function(callback) {
  async.waterfall([findDeployDate, getGitCommits], callback);
}

/* ------------- Private Methods ------------- */

function findDeployDate(callback) {
  var url = 'https://rpm.newrelic.com/account_feeds/0b5f8ad286e73a42f6070a9765c19a4c9dbde3f77236856/applications/626617/events.rss'
    , parser = new feedparser();

  parser.parseUrl(url, function (error, meta, articles){
    if (error) return callback(error);

    for (var i = 0, l = articles.length; i < l; i++) {
      var article = articles[i];
      if (article.title && article.title.match(/^\[deployment\]/)) {
        console.log("newrelic - last deployment was", article.date);
        return callback(null, article.date);
      }
    };
    // Uh, I guess it's been a while since we deployed....
    console.log("newrelic - no deployment found");
    callback(null, new Date(0));
  });
}

function getGitCommits(lastPush, callback) {
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
    if (err) return callback(err);

    for (var n in res) {
      if (res[n].commit && res[n].commit.message != "Merge branch 'master' of github.com:" + config.USER + "/" + config.REPO) {
        var commitDate = new Date(Date.parse(res[n].commit.committer.date));
        if (commitDate > lastPush) {
          waitingCommits++;
        }
      }
    }

    console.log("github - found", waitingCommits, "commit(s) to be deployed");
    callback(null, {
      'recent_commits': waitingCommits
    , 'code_push': lastPush.toISOString()
    });
  });
}