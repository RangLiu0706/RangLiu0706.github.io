/*
* Greedy Navigation
*
* http://codepen.io/lukejacksonn/pen/PwmwWV
*
*/

var $nav = $('#site-nav');
var $btn = $('#site-nav button');
var $vlinks = $('#site-nav .visible-links');
var $hlinks = $('#site-nav .hidden-links');

var breaks = [];

function updateNav() {
  var availableSpace = $btn.hasClass('hidden') ? $nav.width() : $nav.width() - $btn.width() - 30;

  // Move as many items as needed; each iteration removes one visible item.
  while ($vlinks.children().length && $vlinks.width() > availableSpace) {
    breaks.push($vlinks.width());
    $vlinks.children().last().prependTo($hlinks);
    $btn.removeClass('hidden');
    availableSpace = $nav.width() - $btn.width() - 30;
  }

  // Restore every item that fits, including the space released by the last menu button.
  while (breaks.length && $hlinks.children().length) {
    var restoredSpace = breaks.length === 1 ? $nav.width() : $nav.width() - $btn.width() - 30;
    if (restoredSpace < breaks[breaks.length - 1]) break;
    $hlinks.children().first().appendTo($vlinks);
    breaks.pop();

    // Font sizes may change at a breakpoint, so verify the restored item still fits.
    if ($vlinks.width() > restoredSpace) {
      breaks.push($vlinks.width());
      $vlinks.children().last().prependTo($hlinks);
      break;
    }
  }

  if (breaks.length < 1) {
    $btn.addClass('hidden').removeClass('close');
    $hlinks.addClass('hidden');
  }
  $btn.attr('count', breaks.length);
}

// Window listeners

$(window).resize(function() {
  updateNav();
});

$btn.on('click', function() {
  $hlinks.toggleClass('hidden');
  $(this).toggleClass('close');
});

updateNav();
