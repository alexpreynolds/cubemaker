$(function(){

    //http://www.jqueryscript.net/lightbox/Super-Simple-Modal-Popups-with-jQuery-CSS3-Transitions.html
    var appendthis =  ("<div class='modal-overlay js-modal-close'></div>");

    $(document).on("click", "a[data-modal-id], button[data-modal-id]", function(e) {
        e.preventDefault();
        $("body").append(appendthis);
        $(".modal-overlay").fadeTo(500, 0.7);
        //$(".js-modalbox").fadeIn(500);
        var modalBox = $(this).attr('data-modal-id');
        $('#'+modalBox).fadeIn($(this).data());
    });


    $(".js-modal-close, .modal-overlay").click(function() {
        $(".modal-box, .modal-overlay").fadeOut(500, function() {
            $(".modal-overlay").remove();
        });

    });

    $(window).resize(function() {
        $(".modal-box").css({
            top: ($(window).height() - $(".modal-box").outerHeight()) / 2,
            left: ($(window).width() - $(".modal-box").outerWidth()) / 2
        });
    });

    $(window).resize();

});