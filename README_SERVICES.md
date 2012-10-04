Service Authentication
======================
Some of the services that Dashboard hooks into handle authentication through OAuth. Here's the step-by-step if you want to generate your own OAuth keys:

Google Calendar
---------------
Here's the quick version. See the [Google OAuth2 for Devices Docs](https://developers.google.com/accounts/docs/OAuth2ForDevices) for more information.

1. Register an application with Google through the [Developer Console](https://code.google.com/apis/console#access). This should give you a {CLIENT_ID} and {CLIENT_SECRET} which are used in the following steps.
2. Use CURL to get a user code to give Dash permission to use your account. Save the `user_code` and `device_code` returned here for later steps.
````
curl -d "client_id={Client ID}&scope=https://www.googleapis.com/auth/calendar.readonly" https://accounts.google.com/o/oauth2/device/code
````
3. Go to [http://www.google.com/device](http://www.google.com/device) in a browser and enter the `user_code` returned in the previous step. This will tell Google that the account holder has given permission to let Dashboard use these permissions.
4. Next, use CURL to get access & refresh tokens. You'll need to put the `device_code` returned in Step 1 in where it says `{USER_CODE}`.
````
curl -d "client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}&code={USER_CODE}&grant_type=http://oauth.net/grant_type/device/1.0" https://accounts.google.com/o/oauth2/token
````
5. This should return an `access_token` and `refresh_token`. If it says `"error" : "authorization_pending"`, double-check that you authorized Dashboard to use the correct account in Step 3.
6. Paste the given `access_token` and `refesh_token` into their corresponding variables in `config.js`.


Github
------
Here's the quick version.

    var GitHubApi = require("github");
    var github = new GitHubApi({
        version: "3.0.0"
    });
    github.authenticate({
      type: "basic",
      username: 'YOUR USERNAME',
      password: 'YOUR PASSWORD'
    });
    github.oauth.createAuthorization(
      { scopes:['repo'],
        note:'DoSomething Dashboard'
      }
    , function(e,d) {
        console.log("error: " + e, "token: " + d.token);
      }
    );

If it's successful you'll see something like:

    error: null token: 49ed7dbc40c3171d024fd32582bd3ead273eee52

And you can use that token.


Twitter
-------
You can get your own Twitter API key at [dev.twitter.com/apps](https://dev.twitter.com/apps). It doesn't need any special permissions - all data is fetched from the public timeline. Don't worry about the callback URL, since we don't authenticate individual users using the app.

Dark Sky
--------
You can register an account with the Dark Sky API at their [developer site](https://developer.darkskyapp.com/).

Redmine
-------
You can get your Redmine API key from your [My Account](http://tech.dosomething.org/my/account) page on Redmine in the right sidebar.

Mailchimp
---------
Ask someone for the Mailchimp API key, since that requires permission to access the data in our DoSomething.org account.


Mobile Commons
--------------
...and then some services just weren't friendly at all. Mobile Commons doesn't expose the count of active subscribers through their API, so Dashboard is actually impersonating a logged-in session and parsing the number straight out of their dashboard HTML. I know, that's pretty gross. If the token ever expires, you can just inspect the headers from a legitimate session and plop the `'Cookie'` header into the request in `widgets/members.js`.
