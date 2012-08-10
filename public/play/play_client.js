var socket = io.connect();

Piecon.setOptions({
    color: "#333",
    background: "#ddd",
})

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

/* ------------- Now Playing ------------- */
var start_time;
var song_duration = 0;
var voted = false;

socket.on('now_playing', function(data) {
    $("#song span").text(data.song);
    $("#artist span").text(data.artist);
    $("#album span").text(data.album);
    $("#album_art").attr('src', data.artwork);
    
    Piecon.reset();
    
    document.title = data.song + " - " + data.artist;
    
    song_duration = data.duration;
    start_time = data.startTime;
    voted = false;
    
    if(localStorage.getItem("voted") == start_time) {
        $("#do_skipsong").addClass("active");
        $("#do_skipsong").text("Voted");
        $("#skipvotes").show();
        voted = true;
    } else {
        localStorage.setItem("voted", "");
    }
    
    setTrackProgress();
});

function setTrackProgress() {
    var time_difference = (Date.now() - start_time) / 1000;
    var percentage = Math.min((time_difference / song_duration) * 100, 100);
    
    Piecon.setProgress(percentage)
    
    $("#track_percent_complete").width(percentage + "%");
}

setInterval(setTrackProgress, 1000);

$(document).ready(function() {
    $("#ui_skipsong").hide();
});

$("#show_queuesong").click(function(e) {
    e.preventDefault();
    
    $("#ui_skipsong").hide();
    
    if($("#ui_queuesong").is(":visible")) {
        $("#ui_queuesong").hide();
    } else {
        $("#ui_queuesong").show();
    }
});

//setup before functions
var typingTimer;                //timer identifier
var doneTypingInterval = 400;  //time in ms, 5 second for example

// prevent hitting Enter from exploding things
$(window).keydown(function(event){
  if(event.keyCode == 13) {
    event.preventDefault();
    return false;
  }
});

//on keyup, start the countdown
$('#ui_queuesong .search').keyup(function(){
    $("#queue_searchresults").html("<span class='searching'>Searching&hellip;</span>");
    clearTimeout(typingTimer);
    typingTimer = setTimeout(doneTyping, doneTypingInterval);
});

//on keydown, clear the countdown 
$('#ui_queuesong .search').keydown(function(){
    clearTimeout(typingTimer);
});

function doneTyping () {
    $.get('/api/play/search', {'s': $('#ui_queuesong .search').val()}, function(data) {
        displayResults(data);
    });
}

function displayResults(data) {
    $("#queue_searchresults").html("");
    
    for(result in data) {
        var albumartUrl = data[result].icon;
        $("#queue_searchresults").append('<div data-id="' + data[result].key + '" class="song searchresult"><img width="35" height="35" src="' + albumartUrl + '" /><p class="song_meta"><span><strong>' + data[result].name + '</strong> by ' + data[result].artist + '</p></span></div>');


    }
    
    $(".searchresult").click(function(e) {
        e.preventDefault();
        
        var id = $(this).attr("data-id");
        
        console.log("Posting " + id + " to queue!");
        
        $.ajax({
            url: '/api/play/queue',
            type: 'POST',
            data: "id=" + id
        });
        
        
        $("#ui_queuesong .search").val("");
        $("#queue_searchresults").html("");
    });
}

socket.on("queue_addition", function(data) {
   $("#empty_queue").hide();
   
   $("#queue_contents").append('<div class="song queuedsong loadedin"><img width="35" height="35" src="' + data.albumart+ '" /><p class="song_meta"><span><strong>' + data.song + '</strong> by ' + data.artist + '</p></span></div>');
});

socket.on('full_queue', function(data) {
    $("#queue_contents").html("");
    
    if(data.length > 0) {
        $("#empty_queue").hide();
        for(s in data) {
            $("#queue_contents").append('<div class="song queuedsong"><img width="35" height="35" src="' + data[s].albumart+ '" /><p class="song_meta"><span><strong>' + data[s].song + '</strong> by ' + data[s].artist + '</p></span></div>');
        }
    } else {
        $("#empty_queue").show();
    }
});


$("#do_skipsong").click(function(e) {
    e.preventDefault();
    if(!(voted || localStorage.getItem("voted") == start_time)) {
        $.ajax({
            url: '/api/play/skip',
            type: 'POST'
        });
        
        $(this).addClass("active");
        $(this).text("Voted");
        $("#skipvotes").show();
        
        voted = true;
        localStorage.setItem("voted", start_time);
    }
});

socket.on('skip_votes', function(data) {
    if(data == 3) {
        $("#votes_remaining").text(data + " more votes");
        $("#do_skipsong").removeClass("active");
        $("#do_skipsong").text("Vote to Skip");
        
        $("#skipvotes").hide();
        voted = false;
    } else if(data > 1) {
        $("#votes_remaining").text(data + " more votes");
    } else {
        $("#votes_remaining").text(data + " more vote");
    }
});
