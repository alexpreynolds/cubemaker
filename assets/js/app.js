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
        
        $('#loading_cube_warning').removeClass("hidden");
        $(".notification .warning").show();

        var query_string = new CUBE_MAKER.QueryStringParser().parse();
        
        var id = query_string["id"];
        var matrix_url = query_string["import-matrix"];
        var json_model_url = query_string["import-json"];
        var export_type = query_string["export-type"];
        var pdf_id = query_string["pdf"];

        var url = "";
        if (typeof(id) !== "undefined") {
            json_model_url = "https://tools.stamlab.org/cubemaker/services/retrieve_model.py?id=" + id;
        }
        else if (typeof(pdf_id) !== "undefined") {
            json_model_url = "https://tools.stamlab.org/cubemaker/services/retrieve_model.py?id=" + pdf_id;
            if (history.pushState) {
               var new_URL = window.location.protocol + "//" + window.location.host + window.location.pathname + '?id=' + pdf_id;
                window.history.pushState({ path : new_URL }, '', new_URL);
            }
            setTimeout(function () { 
                document.getElementById('cube-export-helper').setAttribute("src", "https://tools.stamlab.org/cubemaker/services/export_pdf.py?id=" + pdf_id)
            }, 2000);
        }
        
        url = matrix_url || json_model_url || "assets/js/sample.json";
        
        var model;
        $.get(url, function (response) {

            if (matrix_url) {
                model = new MatrixParser(response).parse();
            } 
            else if (json_model_url) {
	            model = response;
	            if (typeof response !== "object")
	                model = JSON.parse(response);
            } 
            else {
                model = response;
            }
            
            $(".notification .warning").hide();
            $('#graph_settings_menu').removeClass("hidden");
            $('#graph_download_button').removeClass("hidden");
            
            // to deal with "older" cubes that might be imported, we populate new fields with decent defaults
            if (typeof model.metadata.rotation_automation === "undefined") {
                model.metadata.rotation_automation = CUBE_MAKER.Directions.OFF;
            }
            if (typeof model.metadata.label_visibility === "undefined") {
                model.metadata.label_visibility = CUBE_MAKER.LabelVisibilities.MOUSEOVER;
            }

            cube_maker = new CubeMaker("cube-container", model);
            export_util = new ExportUtil(cube_maker);

            if (export_type) {
                export_util.export_to_format(export_type);
            }
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
        
        $(document).on("click", "#export-pdf-form-submit", function () {
            export_util.to_pdf();
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
        
        $(document).on("click", "#graph_download_button", function () {
	        $('#export-link-btn').click();
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

        $(".notification .warning.warning-webgl").show();

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
