$(function () {

    var CubeMaker = CUBE_MAKER.CubeMaker;
    var ExportUtil = CUBE_MAKER.ExportUtil;

    var cube_maker;
    var export_util;

    init();

    function init() {
        if (check_WebGL()) {

            $.getJSON("assets/js/sample.json", function (sample) {

                // create cube maker component
                cube_maker = new CubeMaker("cube-container", sample);

                // setup exports
                export_util = new ExportUtil(cube_maker);

            });
        }

        // set settings panel action handlers
        setActionHandlers();
    }


    function setActionHandlers() {

        $(document).on("click", "#export-json-btn", function () {
            export_util.to_json();
        });

        $(document).on("click", "#export-png-btn", function () {
            export_util.to_png();
        });

        $(document).on("click", "#export-link-btn", function () {
            $("#link").val(export_util.to_url());
        });

        $(document).on("click", "#import-btn", function () {
            var data = $("#import-data").val();
            cube_maker.reload(data);
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

});
