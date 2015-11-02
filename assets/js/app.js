$(function () {

    var CubeMaker = CUBE_MAKER.CubeMaker;
    var ExportUtil = CUBE_MAKER.ExportUtil;
    var MatrixParser = CUBE_MAKER.MatrixParser;

    var cube_maker;
    var export_util;

    activate();

    function activate() {
        if (!check_WebGL()) {
            return
        }

        $.getJSON("assets/js/sample.json", function (sample) {
            cube_maker = new CubeMaker("cube-container", sample);
            export_util = new ExportUtil(cube_maker);
        });

        // set settings panel action handlers
        set_action_handlers();
    }

    function set_action_handlers() {

        $(document).on("click", "#export-json-btn", function () {
            export_util.to_json();
        });

        $(document).on("click", "#export-png-btn", function () {
            export_util.to_png();
        });

        $(document).on("click", "#export-link-btn", function () {
            export_util.to_url("#export-link-result");
        });

        $(document).on("click", "#json-import-btn", function () {
            var data = $("#json-import-data").val();
            cube_maker.reload(JSON.parse(data));
        });

        $(document).on("click", "#matrix-import-btn", function () {
            var file_content = read_file("matrix-file-input", function (reader) {
                var file_content = reader.target.result;
                var data = new MatrixParser(file_content).parse();
                cube_maker.reload(data);
            });
        });
    }

    function check_WebGL() {
        var canvas = document.createElement("canvas");
        var gl;
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

    function read_file(input_id, success) {
        var files = $("#" + input_id).prop('files');

        if (!files || !files[0]) {
            return;
        }

        var file_reader = new FileReader();

        file_reader.onloadend = success;
        file_reader.readAsText(files[0]);
    }

});
