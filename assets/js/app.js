(function () {

    var CubeMaker = CUBE_MAKER.CubeMaker;
    var ExportUtil = CUBE_MAKER.ExportUtil;

    var cube_maker;
    var export_util;
    var settings_panel_visible = false;

    init();

    function init() {
        if (check_WebGL()) {

            $.getJSON("assets/js/sample.json", function (sample) {

                // create cube maker component
                cube_maker = new CubeMaker("cube-container", sample);
                cube_maker.init();

                // setup exports
                export_util = new ExportUtil(cube_maker);

            });
        }

        // set settings panel action handlers
        setActionHandlers();
    }

    function show_settings_panel() {
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
    }

    function setActionHandlers() {
        $("body").on("click", "#container", function () {
            if (settings_panel_visible)
                show_settings_panel();
        });

        $("#graph_settings_cog").on("click", function () {
            show_settings_panel();
        });

        $(document).on("click", "#export-json-btn", function () {
            export_util.to_json();
        });

        $(document).on("click", "#export-png-btn", function () {
            export_util.to_png();
        });

        $(document).on("click", "#export-link-btn", function () {
            $("#link").val(export_util.to_url());

        });
    }


    function check_WebGL() {
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
    }

    function update_settings_panel() {
        $('#graph_settings_subpanel').height(parseInt(window.innerHeight));
    }

})();
