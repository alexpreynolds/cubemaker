var CUBE_MAKER = CUBE_MAKER || {};

CUBE_MAKER.ExportUtil = function (cube_maker) {

    var formats = {
        PNG: "PNG",
        JSON: "JSON",
        LINK: "LINK"
    };

    return {
        to_png: export_as_png,
        to_json: export_as_json,
        to_url: generate_link_dialog,
        export_to_format: export_to_format
    };

    function export_to_format(format) {
        switch (format.toUpperCase()) {
            case formats.JSON:
                export_as_json();
                break;
            case formats.PNG:
                export_as_png();
                break;
            case formats.LINK:
                generate_link_dialog();
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
        var suffix = "<p>&nbsp;</p><p>You can use this address at any time to reload the cube, along with any modifications you have applied. <strong>Note:</strong> If you apply further modifications, please remember to export a new link!</p>";
        
        //var url_result = window.location.protocol + "//" + window.location.hostname + (window.location.port != 80 ? ":" + window.location.port : "") + "/";
        var url_result = window.location.href.replace('#','').split('?')[0];

        var model = cube_maker.get_model();
        var scene_state = cube_maker.get_scene_state();

        /* update metadata, as needed */
        model.metadata.camera_position = xyz_to_str(scene_state.position);
        model.metadata.camera_rotation = xyz_to_str(scene_state.rotation);
        model.metadata.control_center = xyz_to_str(scene_state.center);
        model.metadata.selected_class = scene_state.category;

        var root_URL = "https://tools.stamlab.org/cubemaker/services";
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
};