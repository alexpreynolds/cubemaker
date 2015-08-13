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

    function closeOverlay(){
        $(".modal-box, .modal-overlay").fadeOut(500, function() {
            $(".modal-overlay").remove();
        });
    }

    $(document).on("click", ".js-modal-close, .modal-overlay", closeOverlay);

    $(window).resize(function() {
        $(".modal-box").css({
            top: ($(window).height() - $(".modal-box").outerHeight()) / 2,
            left: ($(window).width() - $(".modal-box").outerWidth()) / 2
        });
    });

    $(window).resize();

    $(document).on("click", ".dropdown-toggle", function () {
        $(this).addClass("active");
        var dropdownId = $(this).attr('data-dropdown-id');
        if (dropdownId) {
            var dropdown = $("#" + dropdownId);
            dropdown.addClass("open");
            $("body").append(appendthis);
            $(".modal-overlay").fadeTo(500, 0);
        }
    });

    $(document).on("click", ".dropdown-menu li", closeOverlay);
    $(document).on("click", ".dropdown-menu li .js-modal-close, .modal-overlay", function () {
        $(".dropdown-toggle").removeClass("active");
        $(".dropdown-menu").removeClass("open");
    })
});