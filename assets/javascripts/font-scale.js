//
// This code was adapted from an answer on Stack Overflow by user "Beejamin"
// http://stackoverflow.com/a/5358519
//

$(document).ready( function() {
  var $div = $('.resize-text'); //Cache this for performance

  var setBodyScale = function() {
    var scaleSource = $div.width(),
      scaleFactor = 0.35,
      maxScale = 600,
      minScale = 30; //Tweak these values to taste

    var fontSize = scaleSource * scaleFactor; //Multiply the width of the body by the scaling factor:

    if (fontSize > maxScale) fontSize = maxScale;
    if (fontSize < minScale) fontSize = minScale; //Enforce the minimum and maximums

    $('.resize-text h2').css('font-size', fontSize + '%');
    console.log("Font Size =" + fontSize + "%");
  }

  $(window).resize(function(){
    setBodyScale();
  });

  //Fire it when the page first loads:
  setBodyScale();
});

