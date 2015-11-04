var CUBE_MAKER = CUBE_MAKER || {};

CUBE_MAKER.CubeMaker = function (rootElementId, model) {

    // ====== internal variables declaration section
    var defaults = {
        AXIS_SHOW_FLAG: true,
        LEGEND_SHOW_FLAG: true,
        TITLE_SHOW_FLAG: true,
        AXIS_INVERT_Y: false,
        AXIS_LABEL_DISTANCE_KOEFF: 0.75,
        BOUNDING_BOX_SCALE_FUDGE: 0.9,
        TICK_LENGTH: 0.1,
        TICK_COLOR: "#000000",
        TICK_THICKNESS: 1,
        TICKS_VALUES_PRECISION: 2,
        TICKS_PER_AXIS: 4,
        LINE_COLOR: "#000000",
        LINE_THICKNESS: 1,
        POINT_COLOR: [164,0,0],
        MAX_TICK_LABEL_LENGTH: 5,
        EXPONENTIAL_PRECISION: 2,
        PARTICLE_SIZE: 0.16,
        OPAQUE_CUBE_LINE_MATERIAL_COLOR: "0xbbbbbb",
        OPAQUE_CUBE_LINE_MATERIAL_THICKNESS: 3,
        BACK_CUBE_MATERIAL_COLOR: "0xf7f7f7",
        ROTATION_SPEED: 0.01
    };

    CUBE_MAKER.CubeMaker.get_defaults = get_defaults;

    var root_element = $("#" + rootElementId);
    var camera, scene, raycaster, renderer, controls, container, cube, vertex_materials;
    var mouse = new THREE.Vector2(), INTERSECTED;
    var opaque_cube_line_material, red_cube_line_material, green_cube_line_material, blue_cube_line_material;
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
    var selected_class = get_selected_class();
    var rotate = false;
    var Directions = {UP: "up", DOWN: "down", RIGHT: "right", LEFT: "left"};
    var rotation_direction;
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
        model.metadata.selected_class = category;
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

    function init(xd, yd, zr) {
        mouse = new THREE.Vector2();
        var opaque_cube_lines = new Array(6);

        var opaque_line_metadata = get_materials_metadata().opaque_cube_line_material || {};
        var opaque_line_color = parse_color(opaque_line_metadata.color) || 0xbbbbbb;
        var opaque_line_width = opaque_line_metadata.thickness || 3;

        opaque_cube_line_material = new THREE.LineBasicMaterial({color: opaque_line_color, opacity: 0.25, linewidth: opaque_line_width});
        red_cube_line_material = new THREE.LineBasicMaterial({color: 0xff0000, opacity: 0.25, linewidth: 3});
        green_cube_line_material = new THREE.LineBasicMaterial({color: 0x00ff00, opacity: 0.25, linewidth: 3});
        blue_cube_line_material = new THREE.LineBasicMaterial({color: 0x0000ff, opacity: 0.25, linewidth: 3});
        var cube_line_materials = new Array(6);
        for (var cube_line_materials_idx = 0; cube_line_materials_idx < cube_line_materials.length; cube_line_materials_idx++) {
            cube_line_materials[cube_line_materials_idx] = new THREE.LineBasicMaterial().clone(opaque_cube_line_material);
        }
        vertex_materials = {};
        bounding_boxes = [];
        horizontal_fudge = 1.75;
        x_deg = (typeof xd === 'undefined') ? 70 : xd;
        x_rad = Math.PI / 180 * x_deg;
        y_deg = (typeof yd === 'undefined') ? 45 : yd;
        y_rad = Math.PI / 180 * y_deg;
        z_rad = (typeof zr === 'undefined') ? 2.8 : zr;
        id_label = null;
        flag = true;
        dp_line_geos = new Array(6);
        dp_lines = new Array(6);
        dp_line_names = new Array(6);

        container = document.createElement('div');
        container.setAttribute('id', 'container');
        root_element.append(container);
        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);
        scene = new THREE.Scene();

        var cube_geometry = new THREE.BoxGeometry(1.005, 1.005, 1.005);

        var back_cube_material = get_materials_metadata().back_cube_material || {};
        var cube_material_color = parse_color(back_cube_material.color) || 0xf7f7f7;

        var cube_materials = [
            new THREE.MeshBasicMaterial({color: cube_material_color, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: cube_material_color, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: cube_material_color, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: cube_material_color, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: cube_material_color, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: cube_material_color, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: cube_material_color, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: cube_material_color, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: cube_material_color, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: cube_material_color, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: cube_material_color, transparent: true, opacity: 1, side: THREE.BackSide}),
            new THREE.MeshBasicMaterial({color: cube_material_color, transparent: true, opacity: 1, side: THREE.BackSide})
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
        }

        var offset_y;
        var offset_z;
        var offset_x = offset_y = offset_z = -0.5;

        $.each(model.data, function (point_index, point_data) {

            var particle_material;
            var particle_size = model.metadata.particle_size || defaults.PARTICLE_SIZE;

            if (selected_class) {
                var point_type_index = point_data["type"][selected_class];
                var point_type = model.metadata.classes[selected_class][point_type_index];
                var class_name = point_type.name;

                if (!vertex_materials[selected_class]) {
                    vertex_materials[selected_class] = {};
                }

                particle_material = vertex_materials[selected_class][class_name];

                if (!particle_material) {

                    particle_material = new THREE.PointsMaterial({
                        map: create_vertex_texture(point_type.rgb),
                        transparent: true,
                        size: particle_size,
                        alphaTest: 0.15
                    });
                    vertex_materials[selected_class][class_name] = particle_material;
                }
            } else {
                particle_material = new THREE.PointsMaterial({
                    map: create_vertex_texture(defaults.POINT_COLOR),
                    transparent: true,
                    size: particle_size,
                    alphaTest: 0.15
                });
            }


            // A particle has basically zero radius, so we build a bounding box around the particle, which we can
            // use with the raycaster to better mimic mouseover and mouseout events. For example, a mouseover might
            // append a text label to left of the sphere particle describing the point ID or parent class.

            var bounding_box_factor = particle_size / 1.6;
            var bounding_box_geometry = new THREE.BoxGeometry(bounding_box_factor, 
                                                              bounding_box_factor, 
                                                              bounding_box_factor);
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
            var flip_y_factor = (model.metadata.invert_y_axis ? -1 : 1);
            bounding_box.position.x = defaults.BOUNDING_BOX_SCALE_FUDGE * rescaled_point_xyz[0];
            bounding_box.position.y = defaults.BOUNDING_BOX_SCALE_FUDGE * rescaled_point_xyz[1] * flip_y_factor; /* flip upside down via -1 */
            bounding_box.position.z = defaults.BOUNDING_BOX_SCALE_FUDGE * rescaled_point_xyz[2];
            bounding_box.name = id || "";
            bounding_box.subname = class_name || "";
            scene.add(bounding_box);
            bounding_boxes.push(bounding_box);

            var particles = new THREE.Geometry();
            var particle = new THREE.Vector3(bounding_box.position.x,
                                             bounding_box.position.y,
                                             bounding_box.position.z);

            particles.vertices.push(particle);

            var particle_system = new THREE.Points(particles, particle_material);
            scene.add(particle_system);
        });
        
        

        // ============== add axes
        function axis(start, end, name) {
            if (!start.x) {
                start = {x: start[0], y: start[1], z: start[2]};
                end = {x: end[0], y: end[1], z: end[2]};
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
        if (!model.metadata.title || !model.metadata.show_title)
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

        // if there is no classes then skip class switcher element creation
        if (!model.metadata.classes || !selected_class || !model.metadata.show_legend)
            return;

        var content = document.createElement('div');
        content.id = "class_key_content";

        var class_title_div = document.createElement('div');
        class_title_div.id = "class_title";
        class_title_div.className = "key_title";

        var selected_class_combo = document.createElement('div');
        selected_class_combo.id = "class_combo_container";
        selected_class_combo.className = "class_combo";
        $(selected_class_combo).append('<a id="class_dropdown_link" class="dropdown-toggle" href="#">' + selected_class + '</a>');

        var selected_class_dropdown = document.createElement('ul');
        selected_class_dropdown.id = "categories-options";
        selected_class_dropdown.className = "dropdown-menu";

        $(".dropdown-toggle", selected_class_combo).click(function () {
            $(this).addClass("active");
            $(selected_class_dropdown).width(parseInt($(selected_class_combo).width()));
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

        if (Object.keys(model.metadata.classes).length > 1) {
            $(selected_class_combo).append(selected_class_dropdown);
            $('a', selected_class_combo).prepend('<span class="caret rotate_180"></span>');
        }
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
            class_name_div.style.marginLeft = "6px";
            class_name_div.style.position = "relative";
            class_name_div.style.top = "-1px";

            var class_parent = document.createElement('div');
            class_parent.id = "class_parent_" + class_name.replace(/\s/g, '');
            class_parent.style.display = "inline-block";
            class_parent.appendChild(class_rect_div);
            class_parent.appendChild(class_name_div);
            content.appendChild(class_parent);

            $(class_rect_div).data("classname", class_name);
            $(class_rect_div).data("classindex", class_index);
            $(class_rect_div).minicolors({
                show: function() {
                    $(class_rect_div).minicolors('value', rgb_array_to_hex(class_value.rgb));
                },
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
        if (model.metadata.camera_position) {
            var camera_position_els = model.metadata.camera_position.split(":");
            position = {
                "x" : camera_position_els[0],
                "y" : camera_position_els[1],
                "z" : camera_position_els[2]
            };
        }
        if (model.metadata.camera_rotation) {
            var camera_rotation_els = model.metadata.camera_rotation.split(":");
            rotation = {
                "x" : camera_rotation_els[0],
                "y" : camera_rotation_els[1],
                "z" : camera_rotation_els[2]
            };
        }
        if (model.metadata.control_center) {
            var control_center_els = model.metadata.control_center.split(":");
            control_center = {
                "x" : control_center_els[0],
                "y" : control_center_els[1],
                "z" : control_center_els[2]
            };
        }
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
        } 
        else {
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
                controls.rotateLeft(-model.metadata.rotation_speed);
            } else if (rotation_direction == Directions.RIGHT) {
                controls.rotateLeft(model.metadata.rotation_speed);
            } else if (rotation_direction == Directions.UP) {
                controls.rotateUp(-model.metadata.rotation_speed);
            } else if (rotation_direction == Directions.DOWN) {
                controls.rotateUp(model.metadata.rotation_speed);
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

    function determine_if_face_visible(cube_face_idx) {
        var face = cube.geometry.faces[cube_face_idx];
        var face_to_camera = new THREE.Vector3();
        face_to_camera.copy(camera.position);
        face_to_camera.sub(cube.geometry.vertices[face.a]);
        var dp = face.normal.dot(face_to_camera);
        return dp > 0;
    }

    function add_line(start, end, options) {
        if (options == undefined) {
            options = {};
        }

        var thickness = options.thickness || defaults.LINE_THICKNESS;
        var color = parse_color(options.color) || defaults.LINE_COLOR;
        var axis_line_material = new THREE.LineBasicMaterial({color: color, opacity: 0, linewidth: thickness});
        var axis_geometry = new THREE.Geometry();
        axis_geometry.vertices.push(new THREE.Vector3(start.x, start.y, start.z));
        axis_geometry.vertices.push(new THREE.Vector3(end.x, end.y, end.z));
        var line = new THREE.Line(axis_geometry, axis_line_material);
        scene.add(line);
        return line;
    }

    /*Adds text label to scene*/
    function add_mesh_label(label_text, position, text_params) {

        if (text_params == undefined) {
            text_params = {};   // to avoid undefined exceptions
        }

        var text3d = new THREE.TextGeometry(label_text, {
            size: text_params.size || 0.02,
            weight: "normal",
            height: 0,
            curveSegments: 3,
            font: "helvetiker"
        });

        var material = new THREE.MeshFaceMaterial([
            new THREE.MeshBasicMaterial({color: 0x000000, overdraw: 0.5})
        ]);

        var text_mesh = new THREE.Mesh(text3d, material);
        text_mesh.position.set(position.x, position.y, position.z);

        align_text(text_mesh.geometry, text_params.alignment);
        text_mesh.type = "label";
        scene.add(text_mesh);

        return text_mesh;


        function align_text(geometry, alignment) {
            switch (alignment) {
                case "right" :
                    align_right(geometry);
                    break;
                case "left":
                    align_left(geometry);
                    break;
                default :
                    align_center(geometry);
            }

            function align_right(geometry) {
                if(!geometry.boundingBox) geometry.computeBoundingBox();
                var alignment_point = geometry.boundingBox.min.negate();
                geometry.translate(alignment_point.x, alignment_point.y / 2, alignment_point.z);
            }

            function align_left(geometry) {
                if (!geometry.boundingBox) geometry.computeBoundingBox();
                var alignment_point = geometry.boundingBox.max.negate();
                geometry.translate(alignment_point.x, alignment_point.y / 2, alignment_point.z);
            }

            function align_center(geometry) {
                geometry.center();
            }
        }
    }

    /*Adds text label to scene*/
    function add_sprite_label(label_text, position, text_params) {

        if(text_params == undefined) {
            text_params = {};   // to avoid undefined exceptions
        }

        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        var size = text_params.size || 2048;
        canvas.width = size;
        canvas.height = size;

        context.textAlign = text_params.text_align || "center";
        context.font = text_params.font || 'normal 128px helvetica, arial, sans-serif';

        context.fillText(label_text, size/2, size/2);

        var label_texture = new THREE.Texture(canvas);
        label_texture.needsUpdate = true;

        var label_material = new THREE.SpriteMaterial({ map: label_texture});
        var label_sprite = new THREE.Sprite(label_material);
        scene.add(label_sprite);

        var label_position_vector = new THREE.Vector3(position.x, position.y, position.z);
        label_sprite.position.set(label_position_vector.x, label_position_vector.y, label_position_vector.z);

        return label_sprite;
    }

    function get_axis_metadata(axis_name) {
        return model.metadata.axis[axis_name[0]] || {};
    }

    function get_materials_metadata() {
        return model.metadata.materials || {};
    }

    function parse_color(color) {
        return $.isNumeric(color) ? parseInt(color) : color;
    }

    function rescale_vector(vector, scaling, dimensions_to_scale) {
        if (!dimensions_to_scale || dimensions_to_scale.length == 0) {
            dimensions_to_scale = ["x", "y", "z"];
        }
        var rescaled_vector = $.extend({}, vector);
        dimensions_to_scale.forEach(function (dimension) {
            rescaled_vector[dimension] = rescaled_vector[dimension] * scaling;
        });

        return rescaled_vector;
    }

    function add_axis(axis_name) {

        var axis_metadata = get_axis_metadata(axis_name);

        var axis = axes[axis_name];
        var axis_start_end_koeff = axis_length / 2;
        var start = axis.start;
        var end = axis.end;

        add_axis_line(axis);
        add_axis_label(axis);

        var ticks_info = calculate_axis_ticks(start, end, defaults.TICKS_PER_AXIS);
        ticks_info.forEach(function (tick) {
            add_axis_tick(axis_name, tick.position, tick.value);
        });

        function add_axis_label(axis) {
            var start = axis.start;
            var end = axis.end;

            var mid_point_koeff = axis_start_end_koeff * defaults.AXIS_LABEL_DISTANCE_KOEFF;
            var position = {
                x: (start.x + end.x) * mid_point_koeff,
                y: (start.y + end.y) * mid_point_koeff,
                z: (start.z + end.z) * mid_point_koeff
            };

            var label_text = axis_metadata.name;
            var text_params = {size: 0.06};

            axis.label = add_sprite_label(label_text, position);
            //axis.label = add_label(axis.name, position, text_params);
        }

        function add_axis_line(axis) {
            var start = axis.start;
            var end = axis.end;
            var start_vector = rescale_vector(start, axis_start_end_koeff);
            var end_vector = rescale_vector(end, axis_start_end_koeff);

            var axis_metadata = get_axis_metadata(axis.name);
            var options = {color: parse_color(axis_metadata.color), thickness: axis_metadata.thickness};
            var line = add_line(start_vector, end_vector, options);

            line.name = axis.name;
            axis.line = line;
        }

        function add_axis_tick(axis_name, tick_position, label) {
            var axis_metadata = get_axis_metadata(axis_name[0]);
            var tick_length = axis_metadata.tick_length || defaults.TICK_LENGTH;

            if (tick_position.x === undefined) {
                tick_position = {
	                x: tick_position[0], 
	                y: tick_position[1], 
	                z: tick_position[2]
	                };
            }
            var axis_letter = axis_name[0];
            var ticks = axes[axis_name].ticks;
            if (!ticks) {
                ticks = [];
                axes[axis_name].ticks = ticks;
            }

            var tick_name = axis_name + tick_position[axis_letter];
            var start, end, label_position;

            // for Y axis we have labels aligned left, so we need to keep those labels closer to ticks
            var tick_label_shift_koeff = axis_letter == "y" ? 1.2 : 2.1;
            
			//if (axis_metadata.name == "PC2") { console.log(axis_name, tick_position, label); }

            if (["z1", "y2", "z2"].indexOf(axis_name) > -1) {
                start = {
	                x: tick_position.x - tick_length, 
	                y: tick_position.y, 
	                z: tick_position.z
	                };
                end = {
	                x: tick_position.x, 
	                y: tick_position.y, 
	                z: tick_position.z
	                };
                label_position = { 
	                x: tick_position.x - tick_length * tick_label_shift_koeff, 
	                y: tick_position.y, 
	                z: tick_position.z
	                };
                ticks.push(create_axis_tick(start, end, tick_name, label, label_position));
            }

            if (["z3", "y3", "z4"].indexOf(axis_name) > -1) {
                start = {
	                x: tick_position.x, 
	                y: tick_position.y, 
	                z: tick_position.z
	                };
                end = {
	                x: tick_position.x + tick_length, 
	                y: tick_position.y, 
	                z: tick_position.z
	                };
                label_position = {
	                x: tick_position.x + tick_length * tick_label_shift_koeff, 
	                y: tick_position.y, 
	                z: tick_position.z
	                };
                ticks.push(create_axis_tick(start, end, tick_name, label, label_position));
            }
			
            if (["x1", "y1", "x3"].indexOf(axis_name) > -1) {
                start = {
	                x: tick_position.x, 
	                y: tick_position.y, 
	                z: tick_position.z - tick_length
	                };
                end = {
	                x: tick_position.x, 
	                y: tick_position.y, 
	                z: tick_position.z
	                };
                label_position = {
	                x: tick_position.x, 
	                y: tick_position.y,
	                z: tick_position.z - tick_length * tick_label_shift_koeff
	                };
                ticks.push(create_axis_tick(start, end, tick_name, label, label_position));
            }

            if (["x2", "y4", "x4"].indexOf(axis_name) > -1) {
                start = {
	                x: tick_position.x, 
	                y: tick_position.y, 
	                z: tick_position.z
	                };
                end = {
	                x: tick_position.x, 
	                y: tick_position.y, 
	                z: tick_position.z + tick_length};
                label_position = {
	                x: tick_position.x, 
	                y: tick_position.y, 
	                z: tick_position.z + tick_length * tick_label_shift_koeff
	                };
                ticks.push(create_axis_tick(start, end, tick_name, label, label_position));
            }

            function create_axis_tick(start, end, name, label, label_position) {
	            
	            if (((label_position.x >= 1) || (label_position.x <= -1)) 
	            	&&
	            	((label_position.z >= 1) || (label_position.z <= -1))) {
		            	label_position.y *= (model.metadata.invert_y_axis ? -1 : 1);
	            	}
	            
                var rescaled_start = rescale_vector(start, axis_start_end_koeff);
                var rescaled_end = rescale_vector(end, axis_start_end_koeff);

                var axis_metadata = get_axis_metadata(name[0]);

                var tick_line_options = {
                    color: axis_metadata.tick_color,
                    thickness: axis_metadata.tick_thickness
                };

                var tick_line_object = add_line(rescaled_start, rescaled_end, tick_line_options);
                tick_line_object.name = name;

                var tick_text_params = {
                    size: 0.02,
                    alignment: name[0] === "y" ? "left" : "center"
                };

                var actual_label_position = rescale_vector(label_position, axis_start_end_koeff);
                var tick_label = add_mesh_label(to_scientific_notation(label, defaults.MAX_TICK_LABEL_LENGTH), 
                								actual_label_position, 
			                					tick_text_params);
                scene.add(tick_line_object);

                return {
	                line: tick_line_object, 
	                label: tick_label
	                };
            }

            function to_scientific_notation(value, max_length) {
                if (parseFloat(value).toFixed(0).toString().length > max_length) {
                    return parseFloat(value).toExponential(defaults.EXPONENTIAL_PRECISION);
                }
                return value;
            }
        }

        function calculate_axis_ticks(start, end, number_of_ticks) {

            // determine axis along which ticks should be placed
            var axis = determine_axis(start, end);

            // rescale axes to calculate proper ticks coordinates
            var rescaled_start = rescale_vector(start, defaults.BOUNDING_BOX_SCALE_FUDGE, [axis]);
            var rescaled_end = rescale_vector(end, defaults.BOUNDING_BOX_SCALE_FUDGE, [axis]);

            var intermediate_coordinate_values = get_intermediate_coordinate_values(rescaled_start[axis], rescaled_end[axis], number_of_ticks);
            var intermediate_points = get_intermediate_points(rescaled_start, intermediate_coordinate_values, axis);
            var tick_values = get_tick_values(axis, number_of_ticks);

            var ticks_info = tick_values.map(function (value, index) {
                return {
	                value: value, 
	                position: intermediate_points[index]
	                };
            });

            return ticks_info;

            function get_tick_values(axis, count) {
                var range = model.metadata.range[axis];
                var min = range[0];
                var max = range[1];

                var diff = Math.abs(min - max);
                var step = diff / (count - 1);
                var results = [min.toFixed(defaults.TICKS_VALUES_PRECISION)];
                var value = min;
                for (var i = 0; i < count - 2; i++) {
                    value = parseFloat((value + step).toFixed(defaults.TICKS_VALUES_PRECISION));
                    results.push(value);
                }
                results.push(max.toFixed(defaults.TICKS_VALUES_PRECISION));

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
                    value = parseFloat((value + step).toFixed(defaults.TICKS_VALUES_PRECISION));
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
                if (child.type == "label") {
                    child.quaternion.copy(camera.quaternion)
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

        $(document).ready(function () 
        {
            console.log("Cubemaker - ready");

            $("#import-bgroup").clone(true, true).appendTo(document.getElementById('settings_panel_data'));
            $("#export-bgroup").clone(true, true).appendTo(document.getElementById('settings_panel_data'));
            $("#axes-bgroup").clone(true, true).appendTo(document.getElementById('settings_panel_parameters'));
            $("#legend-bgroup").clone(true, true).appendTo(document.getElementById('settings_panel_parameters'));
            $("#title-bgroup").clone(true, true).appendTo(document.getElementById('settings_panel_parameters'));
            $("#orientation-y-bgroup").clone(true, true).appendTo(document.getElementById('settings_panel_parameters'));
            $("#particle-size-bgroup").clone(true, true).appendTo(document.getElementById('settings_panel_parameters'));
            $("#rotation-speed-bgroup").clone(true, true).appendTo(document.getElementById('settings_panel_parameters'));
            
            if (model.metadata.show_axes) { $("#axes_on").click(); } else { $("#axes_off").click(); }
            $('.axes-options').on('click', function (e) {
                var name = $(this).attr("name");
                model.metadata.show_axes = (name == "axes_off") ? false : true;
                if (model.metadata.show_axes) {
                    $("#axes_color_group").removeClass("hidden");
                }
                else {
                    $("#axes_color_group").addClass("hidden");
                }
                render();
            });
            
            var axis_names = ["x", "y", "z"]; // axis_color_z
            for (idx in axis_names) {
                var acii_suffix = axis_names[idx];
                var acii = "#axis_color_" + acii_suffix;
                $(acii).attr("value", model.metadata.axis[acii_suffix].color);
                $(acii).minicolors({
                    show: function() {
                        $(acii).minicolors('value', model.metadata.axis[acii_suffix].color);
                    },
                    position: "bottom left",
                    change: function (hex) {
                        var axis = $(this).attr("axis");
                        model.metadata.axis[axis].color = hex;
                        model.metadata.axis[axis].tick_color = hex;
                        refresh();
                    }
                });
            }
            
            if (model.metadata.invert_y_axis) { $("#orientation_y_flipped").click(); } else { $("#orientation_y_unflipped").click(); }
            $('.orientation-y-options').on('click', function (e) {
                var name = $(this).attr("name");
                model.metadata.invert_y_axis = (name == "orientation_y_unflipped") ? false : true;
                refresh();
            });
            
            if (model.metadata.show_legend) { $("#legend_on").click(); } else { $("#legend_off").click(); }
            $('.legend-options').on('click', function (e) {
                var name = $(this).attr("name");
                model.metadata.show_legend = (name == "legend_off") ? false : true;
                if (model.metadata.show_legend) {
                    $("#graph_key").removeClass("hidden");
                }
                else {
                    $("#graph_key").addClass("hidden");
                }
                refresh();
            });
            
            if (model.metadata.show_title) { $("#title_on").click(); } else { $("#title_off").click(); }
            $('.title-options').on('click', function (e) {
                var name = $(this).attr("name");
                model.metadata.show_title = (name == "title_off") ? false : true;
                if (model.metadata.show_title) {
                    $("#graph_title").removeClass("hidden");
                }
                else {
                    $("#graph_title").addClass("hidden");
                }
                refresh();
            });
            
            if (model.metadata.particle_size == 0.08) { $('#particle_size_xs').click(); }
            else if (model.metadata.particle_size == 0.12) { $('#particle_size_s').click(); }
            else if (model.metadata.particle_size == 0.16) { $('#particle_size_m').click(); }
            else if (model.metadata.particle_size == 0.20) { $('#particle_size_l').click(); }
            else if (model.metadata.particle_size == 0.24) { $('#particle_size_xl').click(); }
            $('.particle-size-options').on('click', function(e) {
                var name = $(this).attr("name"); 
                if (name == "particle_size_xs") { model.metadata.particle_size = 0.08; }
                else if (name == "particle_size_s") { model.metadata.particle_size = 0.12; }
                else if (name == "particle_size_m") { model.metadata.particle_size = 0.16; }
                else if (name == "particle_size_l") { model.metadata.particle_size = 0.20; }
                else if (name == "particle_size_xl") { model.metadata.particle_size = 0.24; }
                refresh();
            });
            
            if (model.metadata.rotation_speed == 0.0025) { $('#rotation_speed_1').click(); }
            else if (model.metadata.rotation_speed == 0.006) { $('#rotation_speed_2').click(); }
            else if (model.metadata.rotation_speed == 0.0145) { $('#rotation_speed_3').click(); }
            $('.rotation-speed-options').on('click', function(e) {
                var name = $(this).attr("name"); 
                if (name == "rotation_speed_1") { model.metadata.rotation_speed = 0.0025; }
                else if (name == "rotation_speed_2") { model.metadata.rotation_speed = 0.006; }
                else if (name == "rotation_speed_3") { model.metadata.rotation_speed = 0.0145; }
                refresh();
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
                    refresh();
                    animate();
                }
            });

            $(document).on("source-change", function () {
                console.log("Changed data source!");
                /*
                if (model.source) {
                    $("#export-link-btn").removeAttr("disabled");
                } else {
                    $("#export-link-btn").attr("disabled", "disabled");
                }
                */
            });

        });
    }
    
    function refresh() {
        clear();
        var previous_position = camera.position;
        var previous_rotation = camera.rotation;
        init();
        /* set the camera to where and how it was prior to the category switch event */
        camera.position.set(previous_position.x, 
                            previous_position.y, 
                            previous_position.z);
        camera.rotation.set(previous_rotation.x, 
                            previous_rotation.y, 
                            previous_rotation.z);
        render();
    }

    function reload(data) {
        model = data;
        selected_class = get_selected_class();
        $(document).trigger("source-change");
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
            center:   controls.center,
            category: get_selected_class()
        }
    }

    function get_selected_class() {
        return model.metadata.selected_class;
    }

    function get_defaults() {
        return $.extend({}, defaults);
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

            if (axis.ticks != undefined) {
                for (var i = 0; i < axis.ticks.length; i++) {
                    var tick = axis.ticks[i];
                    tick.line.visible = visible;
                    tick.label.visible = visible;
                }
            }
        }
    }

};
