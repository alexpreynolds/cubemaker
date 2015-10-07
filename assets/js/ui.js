$(function(){

    //http://www.jqueryscript.net/lightbox/Super-Simple-Modal-Popups-with-jQuery-CSS3-Transitions.html
    var appendthis =  ("<div class='modal-overlay js-modal-close'></div>");
    var settings_panel = new SettingsPanel();

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
        var modal_box = $(".modal-box");
        modal_box.css({
            top: ($(window).height() - modal_box.outerHeight()) / 2,
            left: ($(window).width() - modal_box.outerWidth()) / 2
        });

        settings_panel.update();
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
    });

    $(document).on("click", "#container", function () {
        settings_panel.hide();
    });

    $("#graph_settings_cog").on("click", function () {
        settings_panel.toggle_visibility();
    });


    function SettingsPanel() {

        var panel = $("#graph_settings_panel");
        var sub_panel = $('#graph_settings_subpanel');

        return {
            show: show,
            hide: hide,
            toggle_visibility: toggle_visibility,
            update: update
        };

        function hide() {
            panel.removeClass("show");
        }

        function show() {
            panel.addClass("show");
        }

        function toggle_visibility() {
            panel.toggleClass("show");
        }

        function update() {
            sub_panel.height(parseInt(window.innerHeight));
        }
    }
});