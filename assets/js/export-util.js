var CUBE_MAKER = CUBE_MAKER || {};

CUBE_MAKER.ExportUtil = function (cube_maker) {

    var root_URL = "https://tools.stamlab.org/cubemaker/services";
    var formats = {
        PNG:  "png",
        JSON: "json",
        LINK: "link",
        PDF:  "pdf"
    };

    return {
        to_png:  export_as_png,
        to_json: export_as_json,
        to_url:  generate_link_dialog,
        to_pdf:  export_as_pdf,
        export_to_format: export_to_format
    };

    function export_to_format(format) {
        switch (format) {
            case formats.JSON:
                export_as_json();
                break;
            case formats.PNG:
                export_as_png();
                break;
            case formats.LINK:
                generate_link_dialog();
                break;
            case formats.PDF:
                export_as_pdf();
                break;
            default :
                throw "Unknown export format: " + format
        }
    }

    //TODO[Alexander Serebriyan]: remove el argument and all DOM manipulations. It should just return a URL.
    function generate_link_dialog(el) {
        if (!el) {
            el = "#export-link-result";
        }
        $(el).html("");
        $(el).addClass("spinner");

        var prefix = "<p>Please copy the following web address to your clipboard:</p>";
        var suffix = "<p>&nbsp;</p><p>You can use this address at any time to reload the cube, along with any modifications you have applied.</p><p><strong>Note:</strong> If you apply further modifications, please remember to export a new link!</p>";
        
        //var url_result = window.location.protocol + "//" + window.location.hostname + (window.location.port != 80 ? ":" + window.location.port : "") + "/";
        var url_result = window.location.href.replace('#','').split('?')[0];

        var model = cube_maker.get_model();
        var scene_state = cube_maker.get_scene_state();

        /* update metadata, as needed */
        model.metadata.camera_position = xyz_to_str(scene_state.position);
        model.metadata.camera_rotation = xyz_to_str(scene_state.rotation);
        model.metadata.control_center = xyz_to_str(scene_state.center);
        model.metadata.selected_class = scene_state.category;
        model.metadata.theta = scene_state.theta;
        model.metadata.phi = scene_state.phi;
        model.metadata.radius = scene_state.radius;
        model.metadata.modified_phi = scene_state.modified_phi;
        model.metadata.camera_projection_matrix = scene_state.camera_projection_matrix;

        $.ajax({
            url: root_URL + "/save_model.py",
            type: "post",
            data: {
                model: JSON.stringify(model)
            },
            success: function (response) {
                var clipboard = new Clipboard('.btn-clipboard');
                clipboard.on('success', function (e) {
                    console.info('Action:', e.action);
                    console.info('Text:', e.text);
                    console.info('Trigger:', e.trigger);
                    e.clearSelection();
                });
                url_result += "?id=" + response;
                var html_result = prefix + "<a href='" + url_result + "'>" + url_result + "</a> <button class='btn btn-custom btn-clipboard' data-clipboard-demo data-clipboard-action='copy' data-clipboard-text='" + url_result + "'>Copy to clipboard</button>" + suffix;
                $(el).removeClass("spinner");
                $(el).html(html_result);
                window.history.pushState(null, null, url_result);
            }
        });
    }

    function download_URI(uri, name) {
        var link = document.createElement("a");
        link.download = name;
        link.href = uri;
        link.target = "_blank";
        var click_event = document.createEvent('MouseEvents');
        click_event.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
        link.dispatchEvent(click_event);
    }

    function export_as_json() {
        var cube_model = cube_maker.get_model();
        var scene_state = cube_maker.get_scene_state();

        /* update metadata, as needed */
        cube_model.metadata.camera_position = xyz_to_str(scene_state.position);
        cube_model.metadata.camera_rotation = xyz_to_str(scene_state.rotation);
        cube_model.metadata.control_center = xyz_to_str(scene_state.center);
        cube_model.metadata.selected_class = scene_state.category;
        cube_model.metadata.theta = scene_state.theta;
        cube_model.metadata.phi = scene_state.phi;
        cube_model.metadata.radius = scene_state.radius;
        cube_model.metadata.modified_phi = scene_state.modified_phi;
        cube_model.metadata.camera_projection_matrix = scene_state.camera_projection_matrix;
        
        var data = 'data:text/json;charset=utf-8,';
        data += escape(JSON.stringify(cube_model, null, 2));
        download_URI(data, "data.json");
    }
    
    function xyz_to_str(coords) {
        return coords.x + ":" + coords.y + ":" + coords.z;
    }

    function export_as_png() {
        var data = cube_maker.get_snapshot();
        download_URI(data, "cube.png");
    }
    
    function export_as_pdf() {
        $("#export-pdf-form-submit").blur();
        var email = document.getElementById('export-pdf-form-email').value;
        var model = cube_maker.get_model();
        if (validate_email(email)) {
            $.ajax({
                url: root_URL + "/convert_model_to_pdf.py",
                type: "post",
                data: {
                    email: JSON.stringify(email),
                    model: JSON.stringify(model)
                },
                success: function (response) {
                    //if (history.pushState) {
                    //   var new_URL = window.location.protocol + "//" + window.location.host + window.location.pathname + '?id=' + response;
                    //    window.history.pushState({ path : new_URL }, '', new_URL);
                    //}
                    //console.log(response);
                    $("#export-pdf-cancel").trigger("click");
                    window.location.href = window.location.protocol + "//" + window.location.host + window.location.pathname + '?pdf=' + response;
                }
            });
        }
        else {
            $("#export-pdf-form-warning").hide();
            $("#export-pdf-form-warning").html('Please specify email address');
            $("#export-pdf-form-warning").fadeIn("slow", function() {});
        }
    }
    
    function validate_email(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }
};