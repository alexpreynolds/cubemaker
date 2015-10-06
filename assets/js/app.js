// settings panel
var settings_panel_visible = false;

var show_settings_panel = function() {
    var e = document.getElementById("graph_settings_panel");
    if (e.classList) {
        e.classList.toggle("show");
    }
    else {
        var classes = e.className;
        if (classes.indexOf("show") >= 0) {
            e.className = classes.replace("show", "");
        }
        else {
            e.className = classes + " show";
        }
    }
    settings_panel_visible = !settings_panel_visible;
};

$("body").on("click", "#container", function() {
    if (settings_panel_visible)
        show_settings_panel();
});

var check_WebGL = function () {
    var canvas = document.createElement("canvas");
    try {
        gl = canvas.getContext("webgl");
    } catch (x) {
        gl = null;
    }

    if (gl == null) {
        try {
            gl = canvas.getContext("experimental-webgl");
        } catch (x) {
            gl = null;
        }
    }

    if (gl) {
        $("#webgl_missing_warning").remove();
        return true;
    }

    $(".notification .warning.webgl").show();

    return false;
};


if (check_WebGL()) {

    $.getJSON("assets/js/sample.json", function (sample) {
        var cube_maker = new CubeMaker("cube-container", sample);
        cube_maker.init();
    });

}
