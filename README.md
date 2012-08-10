DS Dashboard
============

DS Dashboard is an at-a-glance view of what's happening at DoSomething.org. It is built using Node.js, Express.js, Socket.io, and a ton of different APIs.


Requirements
============
* Mac OS X
* Node.js 0.8.4
* Forever for Node.js (installed globally)
* Rdio for Mac
* Nicecast

Usage
=====
1. Enter this into the terminal: `sudo ipfw add 100 fwd 127.0.0.1,3000 tcp from any to any 80 in`. Only needs to be done after restarting the computer.
2. Start up the Node.js app using the `start.sh` script in the root directory.
3. Start Nicecast and hit "Start Broadcast" to begin streaming audio.
4. That's it! You can restart Dashboard by running `forever restartall`, or stop it using `forever stopall`. Log messages are placed in the home directory.

Settings
========
Settings are stored in `widgets/config.js` on the server (not included in the repo). You can make your own version for local testing by filling in the missing parts of `widgets/config_sample.js` with your own API keys. Don't use the versions we use in production or we'll hit rate limits very quickly! Check the [Services README](README_SERVICES.md) for details.

Basic Structure
===============
Check out the implementation details in [do/welcome](http://do/welcome) for a high-level overview. The code is organized into "widgets" server-side, which each have public `send()`, `attachIO()` and `broadcast()` methods. Otherwise their functionality is largely self-contained, relying on an internal refresh interval and a combination of private methods.
The server-side app sends the latest cached data (just stored in memory at the moment) to new clients when they connect, and broadcast updated data to all connected clients when it changes. Data that needs to be kept long-term is stored in the `widgets/data` folder.
Client-side, the app listens for broadcasts over Socket.io and updates the UI on demand. Currently everything is pretty much hard-coded into the client-side interface and logic, so you'll need to add all that in by hand using Socket.io event listeners and JQuery. There is a client-side helper function that handles animating in numerical changes.

Feature suggestions:
====================
Here's some features I wanted to add to Dashboard but didn't make it into 1.0:
* Better MVC structure for handling data.
* Database to hold persistent stored data.
* NOAA thunderstorm & cloud cover (sunny, partly cloudy, cloudy) information
* Less hacky method of pulling Mobile Commons user count (look at the code, its *really* hackish).
* Pacman and other arcade high scores
* Message "broadcast" feature to post a banner announcement on the dashboard?
* ...or anything else you can think of!
