function CubeMaker(rootDiv, sample) {


    return {
        init: _init,
        render: _render
    };

    function _init() {

        var count_properties = function (obj) {
            var count = 0;
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop))
                    ++count;
            }
            return count;
        };

        var rgb_array_to_str = function (arr) {
            return "rgb(" + arr.join(",") + ")";
        };

        var rgb_array_to_hex = function (arr) {
            return "#" + ((1 << 24) + (arr[0] << 16) + (arr[1] << 8) + arr[2]).toString(16).slice(1);
        };

        var hex_to_rgb_array = function (hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
        };

        var rescaled_xyz = function (x, y, z, min_x, max_x, offset_x, min_y, max_y, offset_y, min_z, max_z, offset_z) {
            var result = new Array();
            result.push(rescale_val(x, min_x, max_x, offset_x));
            result.push(rescale_val(y, min_y, max_y, offset_y));
            result.push(rescale_val(z, min_z, max_z, offset_z));
            return result;
        };

        var rescale_val = function (val, min_val, max_val, offset) {
            return offset + (val - min_val) / (max_val - min_val);
        };

        var get_xyz_url_parameter = function (name) {
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
        };

        var xyz_to_str = function (coords) {
            return coords.x + ":" + coords.y + ":" + coords.z;
        };

        var get_url_parameter = function (name) {
            return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null
        };

        var create_vertex_texture = function (rgb) {
            var class_rgb = rgb_array_to_str(rgb);
            var class_d3_rgb = d3.rgb(class_rgb);
            d3.select("#sphere_gradient_0").style("stop-color", class_d3_rgb.brighter().brighter().toString());
            d3.select("#sphere_gradient_1").style("stop-color", class_d3_rgb.brighter().toString());
            d3.select("#sphere_gradient_2").style("stop-color", class_d3_rgb.darker().toString());
            var svg_html = new String($('#sphere_asset').html());
            var svg_canvas = document.createElement("canvas");
            canvg(svg_canvas, svg_html);
            var svg_texture = new THREE.Texture(svg_canvas);
            svg_texture.minFilter = THREE.LinearFilter;
            svg_texture.needsUpdate = true;
            return svg_texture;
        };

        var generate_link = function () {
            var result = location.href;
            if (result.indexOf('?')) {
                result = result.substr(0, result.indexOf('?'));
            }
            result = result + "?source=" + encodeURI(sample.source)
            + "&camPosition=" + xyz_to_str(camera.position)
            + "&camRotation=" + xyz_to_str(camera.rotation)
            + "&center=" + xyz_to_str(controls.center);
            return result;
        };

        var download_URI = function (uri, name) {
            var link = document.createElement("a");
            link.download = name;
            link.href = uri;
            link.target = "_blank";
            var click_event = document.createEvent('MouseEvents');
            click_event.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
            link.dispatchEvent(click_event);
        };

        var export_as_json = function () {
            var data = 'data:text/json;charset=utf-8,';
            data += escape(JSON.stringify(sample, null, 2));
            download_URI(data, "data.json");
        };

        var export_as_png = function () {
            var data = renderer.domElement.toDataURL("image/png");
            download_URI(data, "cube.png");
        };

        var switch_category = function (category) {
            selected_class = category;
        };

        var import_sample = function (jsonString, source) {
            sample = JSON.parse(jsonString);
            if (source) {
                sample.source = encodeURI(source);
            }
            //todo: verify the sample object structure
            $(document).trigger("source-change");
        };

        var import_json = function (uri) {
            var d = $.Deferred();
            return $.get(uri, function (data) {
                import_sample(data, uri);
                d.resolve();
                //todo: add error handler
            });
            return d.promise();
        };


        var container, stats;
        var camera, scene, raycaster, renderer;
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
        var selected_class = sample.metadata.selected_class;

        var load = function () {
            var source = get_url_parameter("source");
            if (source) {
                return import_json(source);
            }
            return $.Deferred().resolve().promise();
        };

        load()
            .done(function () {
                init();
                animate();
            });

        var clear = function () {
            if (container) {
                document.body.removeChild(container);
            }
        };

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
            document.body.appendChild(container);
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

            var offset_x = offset_y = offset_z = -0.5;

            $.each(sample.data, function (point_index, point_data) {
                var point_type_index = point_data["type"][selected_class];
                var point_type = sample.metadata.classes[selected_class][point_type_index];

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
                    sample.metadata.range.x[0],
                    sample.metadata.range.x[1],
                    offset_x,
                    sample.metadata.range.y[0],
                    sample.metadata.range.y[1],
                    offset_y,
                    sample.metadata.range.z[0],
                    sample.metadata.range.z[1],
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
            update_settings_panel();
        }

        function update_settings_panel() {
            $('#graph_settings_subpanel').height(parseInt(window.innerHeight));
        }

        function update_title() {
            if (!sample.metadata.title)
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
            title_label.innerHTML = '<center><span class="title_label">' + sample.metadata.title + '</span><br><span class="title_sublabel">' + sample.metadata.subtitle + '</span></center>';
            container.appendChild(title_label);
            $(title_label).find(".title_label").editInPlace({
                callback: function (unused, value) {
                    sample.metadata.title = value;
                    return value;
                }
            });
            $(title_label).find(".title_sublabel").editInPlace({
                callback: function (unused, value) {
                    sample.metadata.subtitle = value;
                    return value;
                }
            });
        }

        function update_key() {
            if (!sample.metadata.classes)
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
                $.each(sample.metadata.classes, function (category) {
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

            var classes = sample.metadata.classes[selected_class];
            $.each(classes, function (class_index, class_value) {
                class_name = class_value.name;
                class_color = rgb_array_to_str(class_value.rgb);
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
            update_settings_panel();
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

        var rotate = false;
        var Directions = {UP: "up", DOWN: "down", RIGHT: "right", LEFT: "left"};
        var rotation_direction;

        var start_rotation = function (direction) {
            rotate = true;
            start_animation();
            rotation_direction = direction;
        };

        var stop_rotation = function () {
            rotate = false;
            stop_animation();
        };

        var rotationSpeed = 0.005;

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

        var play = false;

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
        }

        var Keys = {LEFT: '37', UP: '38', RIGHT: '39', DOWN: '40', ESC: '27'};
        var last_key = null;
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

        var mousedown = false;
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

            $("[name='axes-checkbox']").bootstrapSwitch();
            $("[name='axes-checkbox']").bootstrapSwitch('onColor', 'primary');
            $("[name='axes-checkbox']").bootstrapSwitch('size', 'small');
            $("[name='axes-checkbox']").bootstrapSwitch('state', sample.metadata.show_axes);
            $("[name='axes-checkbox']").bootstrapSwitch('disabled', true);

            update_settings_panel();

            $("#import-btn").click(function () {
                var data = $("#import-data").val();
                import_sample(data);
                clear();
                init();
                animate();
            });

            $(document).on("click", "#export-json-btn", function () {
                export_as_json();
            });

            $(document).on("click", "#export-png-btn", function () {
                export_as_png();
            });

            $(document).on("click", "#export-link-btn", function () {
                $("#link").val(generate_link());
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
                if (sample.source) {
                    $("#export-link-btn").removeAttr("disabled");
                } else {
                    $("#export-link-btn").attr("disabled", "disabled");
                }
            });
        });
    }

    function _render() {

    }

}