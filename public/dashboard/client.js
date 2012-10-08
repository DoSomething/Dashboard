var socket = io.connect();

/* ------------- Connection Events ------------- */
socket.on('disconnect', function() {
   console.log("disconnected");
});

socket.on('reconnecting', function(reconnectionDelay,reconnectionAttempts) {
    var reconnectTime = reconnectionDelay / 1000;
    $("#error").html("Lost connection to server&hellip;");
    $("#error").show();
});

socket.on('reconnect', function() {
    $("#error").hide();
});

/* ------------- Dark Sky ------------- */
socket.on('darksky_forecast', function(data) {
    console.log("Given condition: " + data.condition);

    if(data.condition == "unknown") {
        // ...

        $("#weather").removeClass();
        $("#weather").addClass("unknown");

        $("#weather").text("Weather Unavailable");
    } else {
        $("#weather").html(data.temperature + "&deg;F, " + data.forecast);
        $("#weather").removeClass();

        switch(data.condition) {
            case "clear": setClearSkyImage(); break;
            case "rain": $("#weather").addClass("rain"); break;
            case "sleet": $("#weather").addClass("sleet"); break;
            case "snow": $("#weather").addClass("snow"); break;
            case "night_new": $("#weather").addClass("night_new"); break;
            case "night_waxing": $("#weather").addClass("night_waxing"); break;
            case "night_waning": $("#weather").addClass("night_waning"); break;
            case "night_full": $("#weather").addClass("night_full"); break;
        }
    }
});

function setClearSkyImage() {
    today = new Date();         // initialize to current date
    var h = today.getHours();

    if(h < 5 || h > 20) {
        setNightSkyImage();
    } else {
        $("#weather").addClass("clear");
    }
}


/** Determines the proper night sky image for a clear night. */
function setNightSkyImage() {
    // Code to calculate moon phase is courtesy of: http://biology.clc.uc.edu/steincarter/moon/moon%20code.htm

    today = new Date();         // initialize to current date
    hh = today.getHours();          // goes from 0 to 23
    var ampm = "am"
            var NoLoops = hh        // this variable is also used for the cuckoo clock
                    if(hh == 0) { NoLoops = 12};
                    if(hh > 12) { NoLoops = hh - 12; ampm = "pm" }
                    if(hh == 12) { ampm = "pm" }
    var dd = today.getDate();
    var mm = today.getMonth() + 1;  // Jan is 0, Feb is 1, etc., hence the +1
    var dow = today.getDay();
    MonNames = new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
    var ThisMonth = MonNames[mm];

    // var yy = today.getYear();
    // browser Y2K bug fix -- convert from msec to years because getYear() doesn't work right
        var millisec = today.getTime();            // this gives msecs
        var yy = ((((millisec / 1000) / 3600) / 24) / 365.25);
        yy = Math.floor(yy);
        yy +=1970;

    var txtDate = "" + ((dd < 10) ? "0" : "") + dd;   // add 0 if less than 10 so displays right
    txtDate += "&nbsp;" + ThisMonth;
    txtDate += "&nbsp;" + yy;
    var mn = today.getMinutes();        // goes from 0 to 59
    var txtTime = "" + ((NoLoops < 10) ? "0" : "") + NoLoops;
    txtTime += ((mn<10) ? ":0" : ":") + mn;

    // here's where the calculations from the book start
    var moondate = today;
    tzone = moondate.getTimezoneOffset() / 60               // in min so convert to hours
    var moonmsec = moondate.getTime();                      // this gives msecs
    GMtime = moonmsec + (tzone * 60 * 60 * 1000)            // GMT in msec
    // adapted from my VB code
    var startDate = new Date(89, 11, 31, 00, 00, 00);       // equivalent of the book's 0 Jan 90
    var startMsec = startDate.getTime();
    var dmsec = GMtime - startMsec;
    D = ((((dmsec /1000) /60) /60) /24);
    var n = D * (360 / 365.242191);                         //no 46-3
    if (n > 0) {
            n = n - Math.floor(Math.abs(n / 360)) * 360;    //no 46-3
    } else {
            n = n + (360 + Math.floor(Math.abs(n / 360)) * 360);  //no 46-3
    }
    var Mo = n + 279.403303 - 282.768422;                   //no 46-4;
    if(Mo < 0) { Mo = Mo + 360 }                         //no 46-4
    var Ec = 360 * .016713 * Math.sin(Mo * 3.141592654 / 180) / 3.141592654;        //no 46-5
    var lamda = n + Ec + 279.403303;                        //no 46-6
    if(lamda > 360) { lamda = lamda - 360 }              //no 46-6
    var l = 13.1763966 * D + 318.351648;                    //no 65-4
    if (l > 0) {
            l = l - Math.floor(Math.abs(l / 360)) * 360;    //no 65-4
    } else {
            l = l + (360 + Math.floor(Math.abs(l / 360)) * 360);  //no 65-4
    }
    var Mm = l - .1114041 * D - 36.34041;                   //no 65-5
    if (Mm > 0) {
            Mm = Mm - Math.floor(Math.abs(Mm / 360)) * 360; //no 65-5
    } else {
            Mm = Mm + (360 + Math.floor(Math.abs(Mm / 360)) * 360); //no 65-5
    }
    var N65 = 318.510107 - .0529539 * D;                    //no 65-6
    if (N65 > 0) {
            N65 = N65 - Math.floor(Math.abs(N65 / 360)) * 360;      //no 65-6
    } else {
            N65 = N65 + (360 + Math.floor(Math.abs(N65 / 360)) * 360);      //no 65-6
    }
    var Ev = 1.2739 * Math.sin((2 * (l - lamda) - Mm) * 3.141592654 / 180); //no 65-7
    var Ae = .1858 * Math.sin(Mo * 3.141592654 / 180);      //no 65-8
    var A3 = .37 * Math.sin(Mo * 3.141592654 / 180);        //no 65-8
    var Mmp = Mm + Ev - Ae - A3;                            //no 65-9
    var Ec = 6.2886 * Math.sin(Mmp * 3.141592654 / 180);    //no 65-10
    var A4 = .214 * Math.sin((2 * Mmp) * 3.141592654 / 180);        //no 65-11
    var lp = l + Ev + Ec - Ae + A4;                         //no 65-12
    var V = .6583 * Math.sin((2 * (lp - lamda)) * 3.141592654 / 180);       //no 65-13
    var lpp = lp + V;                                       //no 65-14
    var D67 = lpp - lamda;                                  //no 67-2
    Ff = .5 * (1 - Math.cos(D67 * 3.141592654 / 180));      //no 67-3
    Xx = (Math.sin(D67 * 3.141592654 / 180));

    // figure out what phase the moon is in and what icon to use to go with it
    if(Ff < .02) {
            // new moon
            $("#weather").addClass("moon_new");
    }
    if((Ff > .45) && (Ff < .55) && (Xx > 0)) {
            // first quarter
            $("#weather").addClass("moon_crescent");
    }
    if((Ff > .45) && (Ff < .55) && (Xx < 0)) {
            // last (third) quarter
            $("#weather").addClass("moon_gibbous");
    }
    if(Ff > .98) {
            // full moon
            $("#weather").addClass("moon_full");
    }
    if((Ff > .02) && (Ff < .45) && (Xx > 0)) {
            // waxing
            $("#weather").addClass("moon_crescent");
    }
    if((Ff > .02) && (Ff < .45) && (Xx < 0)) {
            // waning
            $("#weather").addClass("moon_crescent");
    }
    if((Ff > .55) && (Ff < .98) && (Xx > 0)) {
            // waxing gibbous
            $("#weather").addClass("moon_gibbous");
    }
    if((Ff > .55) && (Ff < .98) && (Xx < 0)) {
            // waning gibbous
            $("#weather").addClass("moon_gibbous");
    }
}

/* ------------- Social Ticker ------------- */
numTweets = 0;
socket.on('twitter_stream', function(data) {
    $(".ticker_tape").prepend('<span class="tweet"><a class="twitter_name" href="' + 'http://www.twitter.com/' + data.screen_name + '" title="' + data.name + '">' + '<div class="twitter_avatar"><img src="' + data.avatar + '" width="24px" height="24px" /></div>' + data.screen_name + '</a> <a class="twitter_msg" href="' + 'http://www.twitter.com/' + data.screen_name + '/status/' + data.id + '"><span class="twitter_message">' + data.text + '</span></span></a>');

    var tweet_width = $(".tweet:first").width() + 18;
    $(".ticker_tape").css('right', -1 * tweet_width);

    $(".ticker_tape").animate({
        right: 0
    }, 2000)

    numTweets++;

    if(numTweets > 10) {
        $(".tweet:last").remove();
    }
});

/* ------------- Greeting ------------- */
$(document).ready(function() {
    function setWelcome() {
        var date = new Date(),
            day = date.getDate(),
            month = date.getMonth(),
            year = date.getFullYear(),
            hours = date.getHours(),
            dateNextHour = new Date(year, month, day, hours + 1, 0, 0, 0),
            dayName,
            monthName;

        switch(day) {
            case 1: dayName = "Monday"; break;
            case 2: dayName = "Tuesday"; break;
            case 3: dayName = "Wednedsay"; break;
            case 4: dayName = "Thursday"; break;
            case 5: dayName = "Friday"; break;
            case 6: dayName = "Saturday"; break;
            case 7: // fall through here.
            case 0: dayName = "Sunday"; break;
        }

        switch(month) {
            case 0: monthName = "January"; break;
            case 1: monthName = "February"; break;
            case 2: monthName = "March"; break;
            case 3: monthName = "April"; break;
            case 4: monthName = "May"; break;
            case 5: monthName = "June"; break;
            case 6: monthName = "July"; break;
            case 7: monthName = "August"; break;
            case 8: monthName = "September"; break;
            case 9: monthName = "October"; break;
            case 10: monthName = "November"; break;
            case 11: monthName = "December"; break;
        }

        if((hours <= 6) || (hours >= 20)) {
            $("body").addClass("night");
            $("#welcome_message").html("<strong>Go to sleep!</strong> " + monthName + " " + dayName + " " + year);
        } else {
            $("body").removeClass("night");
            $("#welcome_message").html("<strong>Happy " + dayName + "!</strong> " + monthName + " " + dayName + " " + year);
        }

        // Update the time next hour
        setTimeout(setWelcome, dateNextHour - date);
    }

    setWelcome();

    // make whole container clickable for meeting rooms
    $(".confroom").click(function() {
        window.location=$(this).find("a").attr("href");
        return false;
    });

    $(".phonebooth").click(function() {
        window.location=$(this).find("a").attr("href");
        return false;
    });
});

/* ------------- Facebook Graph / Twitter follower count ------------- */
socket.on('likes_count', function(data) {
    animateNumber("likes_count", $("#facebook-likes"), data, "", null);
})

socket.on('followers_count', function(data) {
    animateNumber("followers_count", $("#twitter-followers"), data, "", null);
});

/* ------------- Github ------------- */
socket.on('recent_commits', function(data) {
    if(data == 1) {
        $("#waiting_commits").text(data + " commit");
    } else {
        $("#waiting_commits").text(data + " commits");
    }
});

socket.on('code_push', function(data) {
    $("#code_push").changeTimeago(data);
});

/* ------------- Redmine ------------- */
socket.on('redmine', function(data) {
    var open = data.open_issues;
    var closed = data.closed_issues;

    if(open == 1) {
        open_str = open + " open ticket";
    } else {
        open_str = open + " open tickets";
    }

    if(closed == 1) {
        closed_str = closed + " ticket";
    } else {
        closed_str = closed + " tickets";
    }

    $("#open_tickets").text(open_str);
    $("#closed_tickets").text(closed_str);
});

/* ------------- Calendar ------------- */
socket.on('calendar', function(data) {
    // need to remove free/inuse
    setMeetingRoomStatus($("#conf_fortress"), data.fortress);
    setMeetingRoomStatus($("#conf_themyscira"), data.themyscira);
    setMeetingRoomStatus($("#conf_xaviers"), data.xaviers);
    setMeetingRoomStatus($("#conf_ingram"), data.ingram);
    setMeetingRoomStatus($("#conf_batcave"), data.batcave);
    setMeetingRoomStatus($("#conf_phone1"), data.phone1);
    setMeetingRoomStatus($("#conf_phone2"), data.phone2);
});

function setMeetingRoomStatus(id, json) {
    id.removeClass("free");
    id.removeClass("inuse");

    id.addClass(json.status);

    var niceStatus, niceTime;
    if(json.status == "free") {
        niceStatus = "free";
    } else {
        niceStatus = "in-use";
    }

    if(json.until == "tomorrow") {
        niceTime = "tomorrow";
    } else {
        var d = new Date(json.until);
        var hour = d.getHours();
        var minute = d.getMinutes();
        var ampm = "AM";

        if(hour > 12) {
            hour = hour - 12;
            ampm = "PM";
        } else if(hour == 12) {
            ampm = "PM";
        }

        if(minute < 10) {
            minute = "0" + minute;
        }

        niceTime = hour + ":" + minute + " " + ampm;

    }

    id.find("em").text(niceStatus + " until " + niceTime);
}

var counter = 0;


socket.on('members', function(data) {
    animateNumber("user_count", $("#users"), data, " members", $("#userprogress .filled"), 1500000);
});


/* ------------- Helpers ------------- */
function animateNumber(name, display, target, label, progressbar, max) {
    var counter = 0;
    if(localStorage.getItem(name) && (target - localStorage.getItem(name) <= 1000)) {
        counter = localStorage.getItem(name);
    } else {
        counter = target - Math.min(Math.floor(target * 0.1), 400);
    }

    if(target - counter < 15) {
        interval = 50;
    } else {
        interval = 5;
    }

    var countAnimation = setInterval(function() {
        display.html(delimitNumbers(counter) + label);

        if(progressbar) {
            progressbar.css("width", ((counter/max) * 100) + "%");
        }

        if(counter >= target) {
            clearInterval(countAnimation);
            localStorage.setItem(name, counter)
        }

        if(counter < target) {
            counter++;
        } else {
            counter--;
        }
    }, interval);
}


function delimitNumbers(str) {
  return (str + "").replace(/\b(\d+)((\.\d+)*)\b/g, function(a, b, c) {
    return (b.charAt(0) > 0 && !(c || ".").lastIndexOf(".") ? b.replace(/(\d)(?=(\d{3})+$)/g, "$1,") : b) + c;
  });
}

$.fn.changeTimeago = function(isotime) {
    return $(this).attr("title",isotime).data("timeago",null).timeago();
}
