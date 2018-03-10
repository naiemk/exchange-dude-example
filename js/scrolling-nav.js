"use strict"; 
var scrollerIsSet = { isIt: false }

function setScroller() {
  if (scrollerIsSet.isIt) return;
  scrollerIsSet.isIt = true;
  // Smooth scrolling using jQuery easing
  $('a.js-scroll-trigger[href*="#"]:not([href="#"])').click(function() {
    if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
      if (target.length) {
        $('html, body').animate({
          scrollTop: (target.offset().top - 54)
        }, 1000, "easeInOutExpo");
        return false;
      }
    }
  });

  // Closes responsive menu when a scroll trigger link is clicked
  $('.js-scroll-trigger').click(function() {
    $('.navbar-collapse').collapse('hide');
  });

  // Activate scrollspy to add active class to navbar items on scroll
  $('body').scrollspy({
    target: '#mainNav',
    offset: 54
  });

  var TOP_MARGIN = 50;

  var top = $('.thisone').offset().top + TOP_MARGIN;
  $('.trigger').click(function () {
      $('.thisone').css('position','');
      $('.left2').toggle('slow',function(){
          // top = $('.thisone').offset().top + TOP_MARGIN;
          top = TOP_MARGIN;
      });
      
      
  });
      
      $(document).scroll(function(){
          $('.thisone').css('position','');
          // top = $('.thisone').offset().top + TOP_MARGIN;
          top = TOP_MARGIN;
        $('.thisone').css('position','absolute');   
        $('.thisone').css('top',Math.max(top + TOP_MARGIN,$(document).scrollTop() + TOP_MARGIN));
      });

}