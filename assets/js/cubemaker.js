var CUBE_MAKER = CUBE_MAKER || {};

CUBE_MAKER.CubeMaker = function (rootElementId, model) {

    // ====== internal variables declaration section
    const TICKS_VALUES_PRECISION = 2;
    const TICKS_PER_AXIS = 4;
    var root_element = $("#" + rootElementId);
    var camera, scene, raycaster, renderer, controls;
    var container, stats;
    var mouse = new THREE.Vector2(), INTERSECTED;
    var cube = null;
    var cube_materials = null;
    var opaque_cube_lines = new Array(6);
    var cube_line_geometry = null;
    var opaque_cube_line_material = new THREE.LineBasicMaterial({color: 0xbbbbbb, opacity: 0.25, linewidth: 3});
    var red_cube_line_material = new THREE.LineBasicMaterial({color: 0xff0000, opacity: 0.25, linewidth: 3});
    var green_cube_line_material = new THREE.LineBasicMaterial({color: 0x00ff00, opacity: 0.25, linewidth: 3});
    var blue_cube_line_material = new THREE.LineBasicMaterial({color: 0x0000ff, opacity: 0.25, linewidth: 3});
    var cube_line_materials;
    var vertex_materials;
    var bounding_boxes = [];
    var horizontal_fudge = 1.75;
    var x_deg = 70;
    var x_rad = Math.PI / 180 * x_deg;
    var y_deg = 45;
    var y_rad = Math.PI / 180 * y_deg;
    var z_rad = 2.8;
    var id_label = null;
    var flag = true;
    var dp_line_geos = new Array(6);
    var dp_lines = new Array(6);
    var dp_line_names = new Array(6);
    var selected_class = model.metadata.selected_class;
    var rotate = false;
    var Directions = {UP: "up", DOWN: "down", RIGHT: "right", LEFT: "left"};
    var rotation_direction;
    var rotationSpeed = 0.005;
    var mousedown = false;
    var Keys = {LEFT: '37', UP: '38', RIGHT: '39', DOWN: '40', ESC: '27'};
    var last_key = null;
    var play = false;
    var axes = {};
    var axis_length = 1;

    // executes on start
    activate();

    // component's public API
    return {
        reload: reload,
        get_model: get_model,
        get_snapshot: get_snapshot,
        get_scene_state: get_scene_state
    };

    // private functions
    function count_properties(obj) {
        var count = 0;
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop))
                ++count;
        }
        return count;
    }

    function rgb_array_to_str(arr) {
        return "rgb(" + arr.join(",") + ")";
    }

    function rgb_array_to_hex(arr) {
        return "#" + ((1 << 24) + (arr[0] << 16) + (arr[1] << 8) + arr[2]).toString(16).slice(1);
    }

    function hex_to_rgb_array(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
    }

    function rescaled_xyz(x, y, z, min_x, max_x, offset_x, min_y, max_y, offset_y, min_z, max_z, offset_z) {
        var result = [];
        result.push(rescale_val(x, min_x, max_x, offset_x));
        result.push(rescale_val(y, min_y, max_y, offset_y));
        result.push(rescale_val(z, min_z, max_z, offset_z));
        return result;
    }

    function rescale_val(val, min_val, max_val, offset) {
        return offset + (val - min_val) / (max_val - min_val);
    }

    function get_xyz_url_parameter(name) {
        var value = get_url_parameter(name);
        if (value) {
            var coords = value.split(":");
            return {
                x: parseFloat(coords[0]),
                y: parseFloat(coords[1]),
                z: parseFloat(coords[2])
            }
        }
        return undefined;
    }

    function get_url_parameter(name) {
        return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null
    }

    function create_vertex_texture(rgb) {
        var class_rgb = rgb_array_to_str(rgb);
        var class_d3_rgb = d3.rgb(class_rgb);
        d3.select("#sphere_gradient_0").style("stop-color", class_d3_rgb.brighter().brighter().toString());
        d3.select("#sphere_gradient_1").style("stop-color", class_d3_rgb.brighter().toString());
        d3.select("#sphere_gradient_2").style("stop-color", class_d3_rgb.darker().toString());
        var svg_html = $('#sphere_asset').html();
        var svg_canvas = document.createElement("canvas");
        canvg(svg_canvas, svg_html);
        var svg_texture = new THREE.Texture(svg_canvas);
        svg_texture.minFilter = THREE.LinearFilter;
        svg_texture.needsUpdate = true;
        return svg_texture;
    }

    function switch_category(category) {
        selected_class = category;
    }

    function import_sample(jsonString, source) {
        model = JSON.parse(jsonString);
        if (source) {
            model.source = encodeURI(source);
        }
        //todo: verify the sample object structure
        $(document).trigger("source-change");
    }

    function import_json(uri) {
        var d = $.Deferred();
        return $.get(uri, function (data) {
            import_sample(data, uri);
            d.resolve();
            //todo: add error handler
        });
    }

    function load() {
        var source = get_url_parameter("source");
        if (source) {
            return import_json(source);
        }
        return $.Deferred().resolve().promise();
    }

    function clear() {
        if (container) {
            container.remove();
        }
    }

    function init() {
        mouse = new THREE.Vector2();
        opaque_cube_lines = new Array(6);
        opaque_cube_line_material = new THREE.LineBasicMaterial({color: 0xbbbbbb, opacity: 0.25, linewidth: 3});
        red_cube_line_material = new THREE.LineBasicMaterial({color: 0xff0000, opacity: 0.25, linewidth: 3});
        green_cube_line_material = new THREE.LineBasicMaterial({color: 0x00ff00, opacity: 0.25, linewidth: 3});
        blue_cube_line_material = new THREE.LineBasicMaterial({color: 0x0000ff, opacity: 0.25, linewidth: 3});
        cube_line_materials = new Array(6);
        for (var cube_line_materials_idx = 0; cube_line_materials_idx < cube_line_materials.length; cube_line_materials_idx++) {
            cube_line_materials[cube_line_materials_idx] = new THREE.LineBasicMaterial().clone(opaque_cube_line_material);
        }
        vertex_materials = {};
        bounding_boxes = [];
        horizontal_fudge = 1.75;
        x_deg = 70;
        x_rad = Math.PI / 180 * x_deg;
        y_deg = 45;
        y_rad = Math.PI / 180 * y_deg;
        z_rad = 2.8;
        id_label = null;
        flag = true;
        dp_line_geos = new Array(6);
        dp_lines = new Array(6);
        dp_line_names = new Array(6);

        container = document.createElement('div');
        container.setAttribute('id', 'container');
        root_element.append(container);
        camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 5000);
        scene = new THREE.Scene();

        var cube_geometry = new THREE.BoxGeometry(1.005, 1.005, 1.005);
        cube_materials = [
            new THREE.MeshBasicMaterial({color: 0xf7f7f7, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: 0xf7f7f7, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: 0xf7f7f7, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: 0xf7f7f7, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: 0xf4f4f4, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: 0xf4f4f4, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: 0xf4f4f4, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: 0xf4f4f4, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: 0xf1f1f1, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: 0xf1f1f1, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: 0xf1f1f1, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: 0xf1f1f1, transparent: true, opacity: 1, side: THREE.BackSide})
        ];
        var cube_material = new THREE.MeshFaceMaterial(cube_materials);
        cube = new THREE.Mesh(cube_geometry, cube_material);
        for (var idx = 0; idx < cube.geometry.faces.length; idx++) {
            cube.geometry.faces[idx].materialIndex = idx;
        }
        scene.add(cube);

        for (var cube_line_idx = 0; cube_line_idx < opaque_cube_lines.length; cube_line_idx++) {
            cube_line_geometry = new THREE.Geometry();
            switch (cube_line_idx % opaque_cube_lines.length) {
                case 0:
                    cube_line_geometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
                    break;
                case 1:
                    cube_line_geometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
                    break;
                case 2:
                    cube_line_geometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
                    break;
                case 3:
                    cube_line_geometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
                    break;
                case 4:
                    cube_line_geometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
                    break;
                case 5:
                    cube_line_geometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
                    cube_line_geometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
                    break;
            }

            var opaque_cube_line = new THREE.Line(cube_line_geometry, opaque_cube_line_material);
            opaque_cube_lines[cube_line_idx] = opaque_cube_line;
            scene.add(opaque_cube_line);
            /*
             line_bounding_boxes[cube_line_idx] = new THREE.Box3().setFromObject(opaque_cube_lines[cube_line_idx]);
             line_bbox_cubes[cube_line_idx] = new THREE.Mesh(line_bbox_geometry, line_bbox_materials[cube_line_idx]);
             line_bbox_cubes[cube_line_idx].position.x = (line_bounding_boxes[cube_line_idx] .max.x + line_bounding_boxes[cube_line_idx] .min.x) / 2;
             line_bbox_cubes[cube_line_idx].position.y = (line_bounding_boxes[cube_line_idx] .max.y + line_bounding_boxes[cube_line_idx] .min.y) / 2;
             line_bbox_cubes[cube_line_idx].position.z = (line_bounding_boxes[cube_line_idx] .max.z + line_bounding_boxes[cube_line_idx] .min.z) / 2;
             scene.add(line_bbox_cubes[cube_line_idx]);
             */
        }

        var offset_y;
        var offset_z;
        var offset_x = offset_y = offset_z = -0.5;

        $.each(model.data, function (point_index, point_data) {
            var point_type_index = point_data["type"][selected_class];
            var point_type = model.metadata.classes[selected_class][point_type_index];

            var class_name = point_type.name;
            var class_rgb = rgb_array_to_str(point_type.rgb);

            var particles = new THREE.Geometry();

            if (!vertex_materials[selected_class]) {
                vertex_materials[selected_class] = {};
            }

            var particle_material = vertex_materials[selected_class][class_name];

            if (!particle_material) {
                particle_material = new THREE.PointsMaterial({
                    map: create_vertex_texture(point_type.rgb),
                    transparent: true,
                    size: 0.2,
                    alphaTest: 0.15
                });
                vertex_materials[selected_class][class_name] = particle_material;
            }

            // A particle has basically zero radius, so we build a bounding box around the particle, which we can
            // use with the raycaster to better mimic mouseover and mouseout events. For example, a mouseover might
            // append a text label to left of the sphere particle describing the point ID or parent class.

            var bounding_box_geometry = new THREE.BoxGeometry(0.125, 0.125, 0.125);
            var id = point_data.id;
            var rescaled_point_xyz = rescaled_xyz(point_data.x,
                point_data.y,
                point_data.z,
                model.metadata.range.x[0],
                model.metadata.range.x[1],
                offset_x,
                model.metadata.range.y[0],
                model.metadata.range.y[1],
                offset_y,
                model.metadata.range.z[0],
                model.metadata.range.z[1],
                offset_z);
            var bounding_box = new THREE.Mesh(bounding_box_geometry,
                new THREE.MeshLambertMaterial({
                    opacity: 0.33,
                    transparent: true,
                    alphaTest: 0.5
                }));
            bounding_box.position.x = 0.9 * rescaled_point_xyz[0];
            bounding_box.position.y = 0.9 * rescaled_point_xyz[1];
            bounding_box.position.z = 0.9 * rescaled_point_xyz[2];
            bounding_box.name = id;
            bounding_box.subname = class_name;
            scene.add(bounding_box);
            bounding_boxes.push(bounding_box);
            var particle = new THREE.Vector3(bounding_box.position.x,
                bounding_box.position.y,
                bounding_box.position.z);
            particles.vertices.push(particle);

            var particle_system = new THREE.Points(particles, particle_material);
            scene.add(particle_system);
        });

        // ============== add axes
        function axis(start, end, name) {
            if (!start.x){
                start = {x : start[0], y : start[1], z : start[2]};
                end = {x : end[0], y : end[1], z : end[2]};
            }
            axes[name] = new Axis(start, end, name);
        }

        axis([-1, -1, -1], [1, -1, -1], "x1");
        axis([-1, -1, 1], [1, -1, 1], "x2");
        axis([-1, 1, -1], [1, 1, -1], "x3");
        axis([-1, 1, 1], [1, 1, 1], "x4");

        axis([-1, -1, -1], [-1, 1, -1], "y1");
        axis([-1, -1, 1], [-1, 1, 1], "y2");
        axis([1, -1, -1], [1, 1, -1], "y3");
        axis([1, -1, 1], [1, 1, 1], "y4");

        axis([-1, -1, -1], [-1, -1, 1], "z1");
        axis([-1, 1, -1], [-1, 1, 1], "z2");
        axis([1, -1, -1], [1, -1, 1], "z3");
        axis([1, 1, -1], [1, 1, 1], "z4");

        add_all_axes();

        raycaster = new THREE.Raycaster();
        renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
        renderer.setClearColor(0xffffff, 1);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.sortObjects = false;
        container.appendChild(renderer.domElement);

        document.addEventListener('mousemove', on_document_mouse_move, false);
        window.addEventListener('resize', on_window_resize, false);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.minDistance = 1;
        controls.maxDistance = 5;
        controls.noPan = true;
        controls.addEventListener('change', render);

        update_position();

        // Defaults help ensure there is no initial and unwanted "mouseover" event

        mouse.x = -2000;
        mouse.y = -2000;

        update_title();
        update_key();
    }

    function update_title() {
        if (!model.metadata.title)
            return;

        $('#graph_title').remove();
        var title_label = document.createElement('div');
        title_label.id = "graph_title";
        title_label.style.position = 'absolute';
        /* title_label.style.top = parseInt(Math.floor(0.05 * window.innerHeight)) + 'px'; */
        title_label.style.top = '30px';
        title_label.style.left = '0px';
        title_label.style.width = parseInt(window.innerWidth) + 'px';
        title_label.style.padding = '0px';
        title_label.style.margin = '0px';
        title_label.innerHTML = '<center><span class="title_label">' + model.metadata.title + '</span><br><span class="title_sublabel">' + model.metadata.subtitle + '</span></center>';
        container.appendChild(title_label);
        $(title_label).find(".title_label").editInPlace({
            callback: function (unused, value) {
                model.metadata.title = value;
                return value;
            }
        });
        $(title_label).find(".title_sublabel").editInPlace({
            callback: function (unused, value) {
                model.metadata.subtitle = value;
                return value;
            }
        });
    }

    function update_key() {
        if (!model.metadata.classes)
            return;

        var content = document.createElement('div');
        content.id = "class_key_content";

        var class_title_div = document.createElement('div');
        class_title_div.id = "class_title";
        class_title_div.className = "key_title";

        var selected_class_combo = document.createElement('div');
        selected_class_combo.className = "class_combo";
        $(selected_class_combo).append('<a class="dropdown-toggle" href="#"><span class="caret"></span>' + selected_class + '</a>');

        var selected_class_dropdown = document.createElement('ul');
        selected_class_dropdown.id = "categories-options";
        selected_class_dropdown.className = "dropdown-menu";

        $(".dropdown-toggle", selected_class_combo).click(function () {
            $(this).addClass("active");
            $(selected_class_dropdown).addClass("open");
            $(selected_class_combo).trigger("show-category-selector");
        });

        $(selected_class_combo).on("show-category-selector", function () {
            $(selected_class_dropdown).empty();
            $.each(model.metadata.classes, function (category) {
                $(selected_class_dropdown).append('<li><a class="js-modal-close">' + category + '</a></li>');
            });
            $("a", selected_class_dropdown).click(function () {
                $(".dropdown-toggle", selected_class_combo).removeClass("active");
                $(selected_class_dropdown).removeClass("open");
                $(document).trigger("change-category", $(this).text());
                return false;
            });
        });

        $(selected_class_combo).append(selected_class_dropdown);
        class_title_div.insertBefore(selected_class_combo, class_title_div.childNodes[0]);

        content.appendChild(class_title_div);

        var classes = model.metadata.classes[selected_class];
        $.each(classes, function (class_index, class_value) {
            var class_name = class_value.name;
            var class_color = rgb_array_to_str(class_value.rgb);
            var class_rect_div = document.createElement('input');
            class_rect_div.id = "class_rect_parent_" + class_name.replace(/\s/g, '');
            class_rect_div.type = "hidden";
            class_rect_div.style.width = "13px";
            class_rect_div.style.height = "13px";
            class_rect_div.style.borderWidth = "1px";
            class_rect_div.style.borderColor = "black";
            class_rect_div.style.borderStyle = "solid";
            class_rect_div.style.backgroundColor = class_color;
            class_rect_div.value = rgb_array_to_hex(class_value.rgb);
            class_rect_div.style.display = "inline-block";
            class_rect_div.style.margin = "3px";
            class_rect_div.style.position = "relative";
            class_rect_div.style.top = "-3px";
            class_rect_div.innerHTML = "&nbsp;";

            var class_name_div = document.createElement('div');
            class_name_div.innerHTML = class_name;
            class_name_div.className = "key_element";
            class_name_div.style.display = "inline-block";
            class_name_div.style.margin = "3px";
            class_name_div.style.marginRight = "16px";
            class_name_div.style.position = "relative";
            class_name_div.style.top = "-3px";

            var class_parent = document.createElement('div');
            class_parent.id = "class_parent_" + class_name.replace(/\s/g, '');
            class_parent.style.display = "inline-block";
            class_parent.appendChild(class_rect_div);
            class_parent.appendChild(class_name_div);
            content.appendChild(class_parent);

            $(class_rect_div).data("classname", class_name);
            $(class_rect_div).data("classindex", class_index);
            $(class_rect_div).minicolors({
                position: "top left",
                change: function (hex) {
                    var rgb = hex_to_rgb_array(hex);
                    var associated_class_name = $(this).data("classname");
                    var associated_class_index = $(this).data("classindex");

                    var associated_class = classes[associated_class_index];
                    associated_class.rgb = rgb;
                    vertex_materials[selected_class][associated_class_name].map = create_vertex_texture(rgb);
                    vertex_materials[selected_class][associated_class_name].needsUpdate = true;

                    render();
                }
            });
        });

        $('#graph_key').remove();
        var graph_key = document.createElement('div');
        graph_key.id = "graph_key";
        graph_key.style.position = 'absolute';
        //graph_key.style.bottom = parseInt(Math.floor(0.05 * window.innerHeight)) + 'px';
        graph_key.style.bottom = '30px';
        graph_key.style.left = '0px';
        graph_key.style.width = parseInt(window.innerWidth) + 'px';
        graph_key.style.margin = 0;
        graph_key.style.padding = 0;
        graph_key.style.textAlign = "center";
        graph_key.appendChild(content);
        container.appendChild(graph_key);
    }

    function update_position() {
        var position = get_xyz_url_parameter("camPosition");
        var rotation = get_xyz_url_parameter("camRotation");
        var control_center = get_xyz_url_parameter("center");
        var x_deg = get_url_parameter("xdeg");
        var y_deg = get_url_parameter("ydeg");
        if (position || rotation || control_center) {
            if (position) {
                camera.position.set(position.x, position.y, position.z);
            }
            if (rotation) {
                camera.rotation.set(rotation.x, rotation.y, rotation.z);
            }
            if (control_center) {
                controls.center.set(control_center.x, control_center.y, control_center.z);
            }
        } else {
            if (x_deg) {
                x_rad = Math.PI / 180.0 * x_deg;
            }
            if (y_deg) {
                y_rad = Math.PI / 180.0 * y_deg;

            }
            controls.rotateLeft(x_rad);
            controls.rotateUp(y_rad);
            camera.position.z = z_rad;
        }
        controls.update();

        render();
    }

    function on_window_resize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        update_title();
        update_key();
        render();
    }

    function on_document_mouse_move(event) {
        event.preventDefault();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        if (!INTERSECTED) {
            $(".particle_label").remove();
        }
        render();
    }

    function midpoint_vertices(v) {
        var _vector = new THREE.Vector3();
        _vector.x = (v[0].x + v[1].x) / 2;
        _vector.y = (v[0].y + v[1].y) / 2;
        _vector.z = (v[0].z + v[1].z) / 2;
        return _vector;
    }

    function start_rotation(direction) {
        rotate = true;
        start_animation();
        rotation_direction = direction;
    }

    function stop_rotation() {
        rotate = false;
        stop_animation();
    }

    function update_rotation() {
        var x = camera.position.x,
            y = camera.position.y,
            z = camera.position.z;

        if (rotate) {

            if (rotation_direction == Directions.LEFT) {
                controls.rotateLeft(-rotationSpeed);
            } else if (rotation_direction == Directions.RIGHT) {
                controls.rotateLeft(rotationSpeed);
            } else if (rotation_direction == Directions.UP) {
                controls.rotateUp(-rotationSpeed);
            } else if (rotation_direction == Directions.DOWN) {
                controls.rotateUp(rotationSpeed);
            }
        }
    }

    function start_animation() {
        play = true;
        animate();
    }

    function stop_animation() {
        play = false;
    }

    function animate() {
        if (play)
            requestAnimationFrame(animate);
        update_rotation();
        controls.update();
        render();
    }

    function determine_if_face_visible(cube_face_idx){
        var face = cube.geometry.faces[cube_face_idx];
        var face_to_camera = new THREE.Vector3();
        face_to_camera.copy(camera.position);
        face_to_camera.sub(cube.geometry.vertices[face.a]);
        var dp = face.normal.dot(face_to_camera);
        return dp > 0;
    }

    function add_line(start, end) {
        var axis_line_material = new THREE.LineBasicMaterial({color: 0xbb0000, opacity: 0, linewidth: 5});
        var axis_geometry = new THREE.Geometry();
        axis_geometry.vertices.push(new THREE.Vector3(start.x, start.y, start.z));
        axis_geometry.vertices.push(new THREE.Vector3(end.x, end.y, end.z));
        var line = new THREE.Line(axis_geometry, axis_line_material);
        scene.add(line);
        return line;
    }

    /*Adds text label to scene*/
    function add_label(label_text, position, text_params) {

        if(text_params == undefined) {
            text_params = {};   // to avoid undefined exceptions
        }

        var text3d = new THREE.TextGeometry( label_text, {
            size: text_params.size || 0.02,
            height: 0,
            curveSegments: 2,
            font: "helvetiker"
        });

        var material = new THREE.MeshFaceMaterial( [
            new THREE.MeshBasicMaterial( { color: 0x000000, overdraw: 0.5 } )
        ] );

        var text_mesh = new THREE.Mesh( text3d, material );
        text_mesh.position.set(position.x, position.y, position.z);

        align_text(text_mesh.geometry, text_params.alignment);
        text_mesh.type = "label";
        scene.add( text_mesh );

        return text_mesh;


        function align_text(geometry, alignment) {
            switch (alignment) {
                case "right" : align_right(geometry); break;
                case "left": align_left(geometry); break;
                default : align_center(geometry);
            }

            function align_right(geometry) {

                if(!geometry.boundingBox) geometry.computeBoundingBox();
                var alignment_point = geometry.boundingBox.min.negate();
                geometry.translate(alignment_point.x, alignment_point.y/2, alignment_point.z);
            }

            function align_left(geometry) {
                if(!geometry.boundingBox) geometry.computeBoundingBox();
                var alignment_point = geometry.boundingBox.max.negate();
                geometry.translate(alignment_point.x, alignment_point.y/2, alignment_point.z);
            }
            function align_center(geometry) {
                THREE.GeometryUtils.center(geometry);
            }
        }
    }

    function add_axis(axis_name) {
        var axis = axes[axis_name];
        var axis_start_end_koeff = axis_length / 2;
        var start = axis.start;
        var end = axis.end;

        add_axis_line(axis);
        add_axis_label(axis);

        var ticks_info = calculate_axis_ticks(start, end, TICKS_PER_AXIS);
        ticks_info.forEach(function (tick) {
            add_axis_tick(axis_name, tick.position, tick.value);
        });

        function add_axis_label(axis) {
            var start = axis.start;
            var end = axis.end;
            var mid_point_koeff = axis_start_end_koeff * 0.65;
            var position = {
                x: (start.x + end.x) * mid_point_koeff,
                y: (start.y + end.y) * mid_point_koeff,
                z: (start.z + end.z) * mid_point_koeff
            };

            var axis_letter = axis.name[0];
            var label_text = model.metadata.axis[axis_letter];
            var text_params = {size: 0.05};

            axis.label = add_label(label_text, position, text_params);
            //axis.label = add_label(axis.name, position, text_params);
        }

        function add_axis_line(axis) {
            var start = axis.start;
            var end = axis.end;
            var start_vector = {x: axis_start_end_koeff * start.x, y: axis_start_end_koeff * start.y, z: axis_start_end_koeff * start.z};
            var end_vector = {x: axis_start_end_koeff * end.x, y: axis_start_end_koeff * end.y, z: axis_start_end_koeff * end.z};
            var line = add_line(start_vector, end_vector);

            line.name = axis.name;
            axis.line = line;
        }

        function add_axis_tick(axis_name, point, label) {
            var tick_length = 0.1;
            if (point.x === undefined){
                point = {x : point[0], y : point[1], z : point[2]};
            }
            var axis_letter = axis_name[0];
            var ticks = axes[axis_name].ticks;
            if (!ticks) {
                ticks = [];
                axes[axis_name].ticks = ticks;
            }

            var tick_name = axis_name + point[axis_letter];
            var start, end, label_position;

            if (["z1", "y2"].indexOf(axis_name) > -1) {
                start = {x: point.x - tick_length, y: point.y, z: point.z};
                end = {x: point.x, y: point.y, z: point.z};
                label_position = {x: point.x - tick_length*2, y: point.y, z: point.z};
                ticks.push(create_axis_tick(start, end, tick_name, label, label_position));
            }

            if (["z3", "y3"].indexOf(axis_name) > -1) {
                start = {x: point.x, y: point.y, z: point.z};
                end = {x: point.x + tick_length, y: point.y, z: point.z};
                label_position = {x: point.x + tick_length*2, y: point.y, z: point.z};
                ticks.push(create_axis_tick(start, end, tick_name, label, label_position));
            }

            if (["x1", "y1"].indexOf(axis_name) > -1) {
                start = {x: point.x, y: point.y, z: point.z - tick_length};
                end = {x: point.x, y: point.y, z: point.z};
                label_position = {x: point.x, y: point.y, z: point.z - tick_length*2};
                ticks.push(create_axis_tick(start, end, tick_name, label, label_position));
            }

            if(["x2", "y4"].indexOf(axis_name) > -1) {
                start = {x: point.x, y: point.y, z: point.z};
                end = {x: point.x, y: point.y, z: point.z + tick_length};
                label_position = {x: point.x, y: point.y, z: point.z + tick_length*2};
                ticks.push(create_axis_tick(start, end, tick_name, label, label_position));
            }

            if(["x3", "z2", "x4", "z4"].indexOf(axis_name) > -1) {
                start = {x: point.x, y: point.y, z: point.z};
                end = {x: point.x, y: point.y + tick_length, z: point.z};
                label_position = {x: point.x, y: point.y + tick_length*1.5, z: point.z};
                ticks.push(create_axis_tick(start, end, tick_name, label, label_position));
            }

            function create_axis_tick(start, end, name, label, label_position) {
                if (start.x === undefined){
                    start = {x : start[0], y : start[1], z : start[2]};
                    end = {x : end[0], y : end[1], z : end[2]};
                }
                var axis_ticks_line_material = new THREE.LineBasicMaterial({color: 0x0000bb, opacity: 0.25, linewidth: 5});
                var axis_tick_line_geometry = new THREE.Geometry();
                axis_tick_line_geometry.vertices.push(new THREE.Vector3(start.x * axis_length / 2, start.y * axis_length / 2, start.z * axis_length / 2));
                axis_tick_line_geometry.vertices.push(new THREE.Vector3(end.x * axis_length / 2, end.y * axis_length / 2, end.z * axis_length / 2));
                var tick_line_object = new THREE.Line(axis_tick_line_geometry, axis_ticks_line_material);
                tick_line_object.name = name;

                var tick_text_params = {
                    size: 0.02,
                    alignment: name[0] === "y" ? "left" : "center"
                };
                var tick_label = add_label(label, {x: label_position.x * axis_length / 2,y: label_position.y * axis_length / 2,z: label_position.z * axis_length / 2}, tick_text_params);
                scene.add(tick_line_object);

                return {line: tick_line_object, label: tick_label};
            }
        }

        function calculate_axis_ticks(start, end, number_of_ticks) {

            // determine axis along which ticks should be placed
            var axis = determine_axis(start, end);
            var intermediate_coordinate_values = get_intermediate_coordinate_values(start[axis], end[axis], number_of_ticks);
            var intermediate_points = get_intermediate_points(start, intermediate_coordinate_values, axis);
            var tick_values = get_tick_values(axis, number_of_ticks);

            var ticks_info = tick_values.map(function (value, index) {
                return {value: value, position: intermediate_points[index]};
            });

            return ticks_info;

            function get_tick_values(axis, count) {
                var range = model.metadata.range[axis];
                var min = range[0];
                var max = range[1];

                var diff = Math.abs(min - max);
                var step = diff / (count - 1);
                var results = [min.toFixed(TICKS_VALUES_PRECISION)];
                var value = min;
                for (var i = 0; i < count - 2; i++) {
                    value =  parseFloat((value + step).toFixed(TICKS_VALUES_PRECISION));
                    results.push(value);
                }
                results.push(max.toFixed(TICKS_VALUES_PRECISION));

                return results;
            }

            function get_intermediate_points(start, intermediate_values, axis) {
                var points = [];
                for (var i = 0; i < intermediate_values.length; i++) {
                    var value = intermediate_values[i];
                    var point = $.extend({}, start);
                    point[axis] = value;
                    points.push(point);
                }
                return points;
            }

            function get_intermediate_coordinate_values(start, end, count) {
                var diff = Math.abs(start - end);
                var step = diff / (count - 1);
                var results = [start];
                var value = start;
                for (var i = 0; i < count - 2; i++) {
                    value =  parseFloat((value + step).toFixed(TICKS_VALUES_PRECISION));
                    results.push(value);
                }
                results.push(end);
                return results;
            }

            function determine_axis(start, end) {
                if (start.x != end.x) {
                    return "x";
                } else if (start.y != end.y) {
                    return "y";
                } else if (start.z != end.z) {
                    return "z";
                }
            }

        }

    }

    function add_all_axes() {
        ["x1", "x2", "x3", "x4", "y1", "y2", "y3", "y4", "z1", "z2", "z3", "z4"].forEach(add_axis);
        set_visible_axes([]);
    }

    /**
     * Make visible only axes with given names
     */
    function set_visible_axes(axes_names) {

        for (var axis in axes) {
            if (axes.hasOwnProperty(axis)) {
                axes[axis].hide();
            }
        }

        axes_names.forEach(function (axis_name) {
            axes[axis_name].show();
        });
    }

    function get_axis_faces_metadata(positive_direction_cube_face_idx, negative_direction_cube_face_idx) {
        var result = {};
        result["+"] = {visible: determine_if_face_visible(positive_direction_cube_face_idx)};
        result["-"] = {visible: determine_if_face_visible(negative_direction_cube_face_idx)};
        return result;
    }

    function render() {

        // Make foreground cube lines transparent

        /*

         for (var cube_line_group_idx = 0; cube_line_group_idx < opaque_cube_lines.length; cube_line_group_idx++) {
         var face_to_camera = new THREE.Vector3();
         face_to_camera.copy(camera.position);
         var bbox = new THREE.Box3().setFromObject(opaque_cube_lines[cube_line_group_idx]);
         face_to_camera.sub(bbox.min);
         var dp = face.normal.dot(face_to_camera);
         if (flag)
         console.log(bbox), flag = false;
         }

         */

        /*

         for (var cube_line_idx = 0; cube_line_idx < opaque_cube_lines.length; cube_line_idx++) {
         var _face_to_camera = new THREE.Vector3();
         _face_to_camera.copy(camera.position);
         var _bbox = line_bounding_boxes[cube_line_idx];
         var _cube = line_bbox_cubes[cube_line_idx];
         var _face = _cube.geometry.faces[cube_line_idx];
         _face_to_camera.sub(_cube.geometry.vertices[_face.a]);
         var _dp = _face.normal.dot(_face_to_camera);
         if (_dp > 0) {
         line_bbox_materials[cube_line_idx] = new THREE.MeshBasicMaterial({color: 0x00ffff});
         }
         else {
         line_bbox_materials[cube_line_idx] = new THREE.MeshBasicMaterial({color: 0xffff00});
         }
         }
         */

        render_axes();
        adjust_labels();


        for (var cube_face_idx = 0; cube_face_idx < cube.geometry.faces.length; cube_face_idx++) {
            var face = cube.geometry.faces[cube_face_idx];
            var face_to_camera = new THREE.Vector3();
            face_to_camera.copy(camera.position);
            face_to_camera.sub(cube.geometry.vertices[face.a]);
            var dp = face.normal.dot(face_to_camera);
            /*
             if (flag) {
             console.log(Math.floor(cube_face_idx/2.0), dp, '{', cube.geometry.vertices[face.a].x, cube.geometry.vertices[face.a].y, cube.geometry.vertices[face.a].z, '}');
             }
             */
            var cube_line_idx = Math.floor(cube_face_idx / 2.0);
            if (cube_face_idx % 2 == 0) {
                dp_line_geos[cube_line_idx] = new THREE.Geometry();
                dp_line_geos[cube_line_idx].vertices.push(new THREE.Vector3(1.1 * cube.geometry.vertices[face.a].x, 1.1 * cube.geometry.vertices[face.a].y, 1.1 * cube.geometry.vertices[face.a].z));
            }
            if (cube_face_idx % 2 == 1) {
                dp_line_geos[cube_line_idx].vertices.push(new THREE.Vector3(1.1 * cube.geometry.vertices[face.b].x, 1.1 * cube.geometry.vertices[face.b].y, 1.1 * cube.geometry.vertices[face.b].z));
                var cube_line = new THREE.Line(dp_line_geos[cube_line_idx], (cube_face_idx % 3 == 0) ? red_cube_line_material : (cube_face_idx % 3 == 1) ? green_cube_line_material : blue_cube_line_material);
                cube_line.name = "cube_line_idx" + cube_line_idx;
                dp_lines[cube_line_idx] = cube_line;
                dp_line_names[cube_line_idx] = cube_line.name;
            }
            if (dp > 0) {
                if ((!scene.getObjectByName(dp_line_names[cube_line_idx])) && (dp_lines[cube_line_idx] !== undefined)) {
                    //console.log("adding id", dp_line_names[cube_line_idx]);
                    //scene.add(dp_lines[cube_line_idx]);
                    var _midpt = midpoint_vertices(dp_lines[cube_line_idx].geometry.vertices);
                    var _geometry = new THREE.BoxGeometry(0.075, 0.075, 0.075);
                    var _material = new THREE.MeshBasicMaterial({
                        color: dp_lines[cube_line_idx].material.color,
                        opacity: 0.5,
                        transparent: true,
                        alphaTest: 0.5
                    });
                    var _mesh = new THREE.Mesh(_geometry, _material);
                    _mesh.name = dp_line_names[cube_line_idx] + "_bb";
                    _mesh.position.x = _midpt.x;
                    _mesh.position.y = _midpt.y;
                    _mesh.position.z = _midpt.z;
                    //scene.add( _mesh );
                    //scene.updateMatrixWorld();
                    var _width = window.innerWidth, _height = window.innerHeight;
                    var _v = new THREE.Vector3();
                    _v.setFromMatrixPosition(_mesh.matrixWorld);
                    _v.project(camera);
                    /*
                     if (flag)
                     console.log(cube_line_idx, _v);
                     */
                    var _percX = (_v.x + 1) / 2;
                    var _percY = (_v.y + 1) / 2;
                    var _left = _percX * _width;
                    var _top = _percY * _height;
                    /*
                     if (flag)
                     console.log(cube_line_idx, _left, _top);
                     */
                }
            }
            else {
                if (scene.getObjectByName(dp_line_names[cube_line_idx])) {
                    console.log("removing id", dp_line_names[cube_line_idx]);
                    scene.remove(scene.getObjectByName(dp_line_names[cube_line_idx]));
                    scene.remove(scene.getObjectByName(dp_line_names[cube_line_idx] + "_bb"));
                }
            }
            /*
             if (dp > 0) {
             cube_materials[ cube_face_idx ] = new THREE.MeshBasicMaterial({color:0xff0000, transparent:true, opacity:0.1, side:THREE.FrontSide});
             }
             else {
             cube_materials[ cube_face_idx ] = new THREE.MeshBasicMaterial({color:0x0000ff, transparent:true, opacity:1, side:THREE.BackSide});
             }
             */
        }
        flag = false;

        // Find intersections with mouse pointer screen position and world objects

        var mouse_vector = new THREE.Vector3(mouse.x, mouse.y, 1).unproject(camera);
        raycaster.set(camera.position, mouse_vector.sub(camera.position).normalize());
        // cf. http://stackoverflow.com/a/27796523/19410
        var scene_right = new THREE.Vector3().crossVectors(raycaster.ray.origin, camera.up).setLength(0.0375);
        var bounding_box_intersections = raycaster.intersectObjects(bounding_boxes);
        if (bounding_box_intersections.length > 0) {
            if (INTERSECTED != bounding_box_intersections[0].object) {
                INTERSECTED = bounding_box_intersections[0].object;
                $(".particle_label").remove();
                id_label = null;

                var width = window.innerWidth, height = window.innerHeight;
                var widthHalf = width / 2, heightHalf = height / 2;
                var screen_object_center = new THREE.Vector3();
                screen_object_center.setFromMatrixPosition(INTERSECTED.matrixWorld);
                screen_object_center.project(camera);
                screen_object_center.x = (screen_object_center.x * widthHalf) + widthHalf;
                screen_object_center.y = -(screen_object_center.y * heightHalf) + heightHalf;

                // The screen_object_center instance shows the screen coordinates of the intersected object, while the
                // z position of the intersected object shows how relatively far away the object is in world coordinates.
                // We can use these two pieces of information to draw the point ID (or other label) and perhaps scale the
                // label font size by world object depth.

                var INTERSECTED_matrix_copy = new THREE.Matrix4().copy(INTERSECTED.matrixWorld);
                INTERSECTED_matrix_copy.setPosition(new THREE.Vector3(INTERSECTED.position.x + scene_right.x, INTERSECTED.position.y + scene_right.y, INTERSECTED.position.z + scene_right.z));
                var screen_object_edge = new THREE.Vector3();
                screen_object_edge.setFromMatrixPosition(INTERSECTED_matrix_copy);
                screen_object_edge.project(camera);
                screen_object_edge.x = (screen_object_edge.x * widthHalf) + widthHalf;
                screen_object_edge.y = -(screen_object_edge.y * heightHalf) + heightHalf;

                if (!id_label) {
                    id_label = document.createElement('div');
                    id_label.id = INTERSECTED.name;
                    id_label.style.position = 'absolute';
                    id_label.style.top = '-10000px';
                    id_label.style.left = '-10000px';
                    id_label.innerHTML = '<span class="particle_label">' + INTERSECTED.name + '<br><span class="particle_sublabel">' + INTERSECTED.subname + '</span></span>';
                    container.appendChild(id_label);
                    var id_label_rect = id_label.getBoundingClientRect();
                    id_label.style.top = (screen_object_center.y - 0.85 * (id_label_rect.height / 2)) + 'px';
                    if (mouse.x < 0) {
                        id_label.style.left = (screen_object_center.x - horizontal_fudge * (screen_object_edge.x - screen_object_center.x)) + 'px';
                    }
                    else {
                        id_label.style.left = (screen_object_center.x + horizontal_fudge * (screen_object_edge.x - screen_object_center.x) - id_label_rect.width) + 'px';
                        id_label.style.textAlign = 'right';
                    }
                }
            }
        } else {
            // mouseout
            if (INTERSECTED) {
                //console.log(INTERSECTED);
                $(".particle_label").remove();
                id_label = null;
            }
            INTERSECTED = null;
        }
        renderer.render(scene, camera);

        function render_axes() {
            // render axes
            if (model.metadata.show_axes) {

                var faces = {};
                faces.x = get_axis_faces_metadata(1, 3);
                faces.y = get_axis_faces_metadata(5, 7);
                faces.z = get_axis_faces_metadata(9, 11);


                if (faces.y["+"].visible) {
                    if (faces.x["+"].visible) {
                        if (faces.z["+"].visible)        set_visible_axes(["x2", "y2", "z3"]);
                        else if (faces.z["-"].visible)   set_visible_axes(["x1", "y4", "z3"]);
                        else                             set_visible_axes(["x4", "y4", "z3"]);

                    } else if (faces.x["-"].visible) {
                        if (faces.z["+"].visible)        set_visible_axes(["x2", "y1", "z1"]);
                        else if (faces.z["-"].visible)   set_visible_axes(["x1", "y3", "z1"]);
                        else                             set_visible_axes(["x3", "y1", "z1"]);
                    } else {
                        if (faces.z["+"].visible)        set_visible_axes(["x2", "y2", "z2"]);
                        else if (faces.z["-"].visible)   set_visible_axes(["x1", "y3", "z4"]);
                        else                             set_visible_axes(["x3", "z2"]);
                    }
                } else if (faces.y["-"].visible) {
                    if (faces.x["+"].visible) {
                        if (faces.z["+"].visible)         set_visible_axes(["x1", "y2", "z1"]);
                        else                              set_visible_axes(["x2", "y4", "z1"]);
                    } else if (faces.x["-"].visible) {
                        if (faces.z["-"].visible)         set_visible_axes(["x2", "y3", "z3"]);
                        else                              set_visible_axes(["x1", "y1", "z3"]);
                    } else {
                        if (faces.z["+"].visible)         set_visible_axes(["x1", "y2", "z1"]);
                        else if (faces.z["-"].visible)    set_visible_axes(["x2", "y3", "z3"]);
                        else                              set_visible_axes(["x1", "z1"]);
                    }
                } else {
                    if (faces.x["+"].visible) {
                        if (faces.z["+"].visible)         set_visible_axes(["x2", "y2", "z3"]);
                        else if (faces.z["-"].visible)    set_visible_axes(["x1", "y4", "z3"]);
                        else                              set_visible_axes(["y4", "z3"]);
                    } else if (faces.x["-"].visible) {
                        if (faces.z["+"].visible)         set_visible_axes(["x2", "y1", "z1"]);
                        else if (faces.z["-"].visible)    set_visible_axes(["x1", "y3", "z1"]);
                        else                              set_visible_axes(["y1", "z1"]);
                    } else {
                        if (faces.z["+"].visible)         set_visible_axes(["x2", "y2"]);
                        else                              set_visible_axes(["x1", "y3"]);
                    }
                }
            } else {
                // hide all axes
                set_visible_axes([])
            }
        }

        function adjust_labels() {
            scene.children.forEach(function (child) {
                if(child.type == "label") {
                    child.lookAt(camera.position);
                }
            });
        }

    }



    function activate() {
        setup_action_handlers();
        load().done(function () {
            init();
            animate();
        });
    }

    function setup_action_handlers() {
        $(document).keydown(function (event) {
            var key = (event.keyCode ? event.keyCode : event.which);
            if (rotate && (key == Keys.LEFT || key == Keys.RIGHT || key == Keys.UP || key == Keys.DOWN || key == Keys.ESC)) {
                stop_rotation();
                event.stopPropagation();
            }
            if (last_key && last_key == key) {
                if (key == Keys.LEFT) {
                    start_rotation(Directions.LEFT);
                } else if (key == Keys.RIGHT) {
                    start_rotation(Directions.RIGHT);
                } else if (key == Keys.UP) {
                    start_rotation(Directions.UP);
                } else if (key == Keys.DOWN) {
                    start_rotation(Directions.DOWN);
                }
            }
            last_key = key;
            setTimeout(function () {
                last_key = null;
            }, 1000);
        });

        $(document).mousedown(function () {
            mousedown = true;
        }).mousemove(function () {
            if (mousedown) {
                rotate = false;
            }
        }).mouseup(function () {
            mousedown = false;
        });

        $(document).ready(function () {

            console.log("ready");

            $("#import-bgroup").clone().appendTo(document.getElementById('settings_panel_data'));
            $("#export-bgroup").clone().appendTo(document.getElementById('settings_panel_data'));
            $("#axes-bgroup").clone().appendTo(document.getElementById('settings_panel_parameters'));

            var axes_checkbox = $("[name='axes-checkbox']");
            axes_checkbox.bootstrapSwitch();
            axes_checkbox.bootstrapSwitch('onColor', 'primary');
            axes_checkbox.bootstrapSwitch('size', 'small');
            axes_checkbox.bootstrapSwitch('state', model.metadata.show_axes);
            axes_checkbox.focus(function(event){
                $(event.target).blur();
            });

            axes_checkbox.bootstrapSwitch('onSwitchChange', function(event, state) {
                model.metadata.show_axes = state;
                render();
            });

            $("#link").click(function () {
                var $this = $(this);
                $this.focus();
                $this.select();

                // Work around Chrome's little problem
                $this.mouseup(function () {
                    // Prevent further mouseup intervention
                    $this.unbind("mouseup");
                    return false;
                });
            });

            $(document).on("change-category", function (event, newValue) {
                if (newValue != selected_class) {
                    switch_category(newValue);
                    clear();
                    init();
                    animate();
                }
            });

            $(document).on("source-change", function () {
                if (model.source) {
                    $("#export-link-btn").removeAttr("disabled");
                } else {
                    $("#export-link-btn").attr("disabled", "disabled");
                }
            });
        });
    }

    function reload(data) {
        import_sample(data);
        clear();
        init();
        animate();
    }

    function get_model() {
        return model;
    }

    function get_snapshot() {
        return renderer.domElement.toDataURL("image/png");
    }

    function get_scene_state() {
        return {
            position: camera.position,
            rotation: camera.rotation,
            center: controls.center
        }
    }

    function Axis(start, end, name) {

        var axis = {
            name: name,
            start: start,
            end: end,
            show: show,
            hide: hide
        };

        return axis;

        function show() {
            set_elements_visibility(true);
        }

        function hide() {
            set_elements_visibility(false);
        }

        function set_elements_visibility(visible) {
            axis.line.visible = visible;
            axis.label.visible = visible;

            if(axis.ticks != undefined) {
                for (var i = 0; i < axis.ticks.length; i++) {
                    var tick = axis.ticks[i];
                    tick.line.visible = visible;
                    tick.label.visible = visible;
                }
            }
        }
    }

};