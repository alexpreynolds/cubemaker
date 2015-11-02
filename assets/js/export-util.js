var CUBE_MAKER = CUBE_MAKER || {};

CUBE_MAKER.ExportUtil = function (cube_maker) {

    return {
        to_png: export_as_png,
        to_json: export_as_json,
        to_url: generate_link
    };

    function generate_link(el) 
    {
        $(el).html("");
        $(el).addClass("spinner");
        
        var prefix = "<p>Please copy the following web address to your clipboard:</p>";
        var suffix = "<p>&nbsp;</p><p>You can use this address to reload the cube and any modifications.</p>";
        
        var url_result = window.location.protocol + "//" + window.location.hostname + (window.location.port != 80 ? ":" + window.location.port : "") + "/";

        var model = cube_maker.get_model();
        var scene_state = cube_maker.get_scene_state();

        /*
        result = result + "?source=" + encodeURI(model.source)
                        + "&camPosition=" + xyz_to_str(scene_state.position)
                        + "&camRotation=" + xyz_to_str(scene_state.rotation)
                        + "&center=" + xyz_to_str(scene_state.center)
                        + "&selectedCategory=" + encodeURI(scene_state.category);
                        */

        /* update metadata, as needed */
        model.metadata.camera_position = xyz_to_str(scene_state.position);
        model.metadata.camera_rotation = xyz_to_str(scene_state.rotation);
        model.metadata.control_center = xyz_to_str(scene_state.center);
        model.metadata.selected_class = scene_state.category;

        var root_URL = "https://tools.stamlab.org/cubemaker/services";
        $.ajax({
            url: root_URL + "/save_model.py",
            type: "post",
            data : { 
                model : JSON.stringify(model)
            },
            success : function(response) {
                var clipboard = new Clipboard('.btn-clipboard');
                clipboard.on('success', function(e) {
                    console.info('Action:', e.action);
                    console.info('Text:', e.text);
                    console.info('Trigger:', e.trigger);
                    e.clearSelection();
                });
                url_result += "?id=" + response;
                var html_result = prefix + "<a href='" + url_result + "'>" + url_result + "</a> <button class='btn btn-custom btn-clipboard' data-clipboard-demo data-clipboard-action='copy' data-clipboard-text='" + url_result + "'>Copy to clipboard</button>" + suffix;
                $(el).removeClass("spinner");
                $(el).html(html_result);
            }
        });

        function xyz_to_str(coords) {
            return coords.x + ":" + coords.y + ":" + coords.z;
        }
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
        var data = 'data:text/json;charset=utf-8,';
        data += escape(JSON.stringify(cube_model, null, 2));
        download_URI(data, "data.json");
    }

    function export_as_png() {
        var data = cube_maker.get_snapshot();
        download_URI(data, "cube.png");
    }
};