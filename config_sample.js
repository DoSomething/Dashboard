var config = {}

config.calendar = {};
config.github = {};
config.members = {};
config.rdio = {};
config.redmine = {};
config.social = {};
config.weather = {};

/**

  See the documentation in README_SERVICES.md for details on how to set this up.
  When you have filled in all the appropriate information, save this file as 'config.js'
  
**/

config.calendar.DEVICE_CODE = ''
config.calendar.CLIENT_ID = ''
config.calendar.CLIENT_SECRET = ''
config.calendar.REFRESH_TOKEN = ''

config.github.TOKEN = ''
config.github.USER = 'DoSomething'
config.github.REPO = 'DoSomething-7.x'

config.members.MAILCHIMP_API_KEY = ''

config.rdio.CONSUMER_KEY = ''
config.rdio.CONSUMER_SECRET = ''

config.redmine.API_KEY = ''
config.redmine.CURRENT_SPRINT_ID = ''

config.social.TWITTER = {}
config.social.TWITTER.CONSUMER_KEY = ''
config.social.TWITTER.CONSUMER_SECRET = ''
config.social.TWITTER.ACCESS_TOKEN = ''
config.social.TWITTER.ACCESS_TOKEN_SECRET =''

config.weather.API_KEY = ''
config.weather.LATITUDE = '40.740833'
config.weather.LONGITUDE = '-73.991667'

module.exports = config;