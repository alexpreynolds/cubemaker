function ExportUtil(cube_maker) {

    return {
        to_png: export_as_png,
        to_json: export_as_json,
        to_url: generate_link
    };

    function generate_link() {
        var result = location.href;

        if (result.indexOf('?')) {
            result = result.substr(0, result.indexOf('?'));
        }

        var model = cube_maker.get_model();
        var scene_state = cube_maker.get_scene_state();

        result = result + "?source=" + encodeURI(model.source)
        + "&camPosition=" + xyz_to_str(scene_state.position)
        + "&camRotation=" + xyz_to_str(scene_state.rotation)
        + "&center=" + xyz_to_str(scene_state.center);
        return result;

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
}