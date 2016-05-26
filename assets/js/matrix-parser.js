var CUBE_MAKER = CUBE_MAKER || {};

CUBE_MAKER.MatrixParser = function (matrix_text) {
    const COLUMNS_DELIMITER = "\t";
    const EOL_PATTERN = /\r\n|\r|\n/g;

    // mapping of column index in matrix to column name, e.g. {0: PC1, 1: PC2, 2: PC3, 3: Name}
    var column_index_to_name_map = {};

    /**
     *  Since we store classes in JSON model as numbers, we need to create mapping of subclass string value to it's
     *  numeric representation.
     *
     *  Example:
     *  {
     *      Lineage: { "Ectoderm": 0, "Lymphoid": 1, "Paraxial mesoderm deratives" : 2, "Primitive": 3 },
     *      Tissue: { "Gingival": 1, "Immune": 3, "Muscle": 2, "Skin": 0, "Stem": 4 }
     *  }
     */
    var class_to_index_map = {};

    var cube_maker_defaults = CUBE_MAKER.CubeMaker().get_defaults();

    return {
        parse: parse
    };

    function parse() {
        var result = {};
        var rows = text_to_array_of_rows(matrix_text);
        column_index_to_name_map = create_column_index_to_name_map(rows[0]);
        class_to_index_map = create_name_to_index_map_for_classes(rows);

        result.data = parse_data(rows);
        result.metadata = parse_metadata(rows, result.data);

        return result;
    }

    function parse_data(data_rows) {

        var data = [];
        data_rows.slice(1).forEach(function (row) {
            var obj = row_to_object(row);
            data.push(obj);
        });

        return data;

        /**
         * Transforms matrix row into JSON object
         */
        function row_to_object(row) {
            var values = row_to_array(row);

            var obj = {
                type: {}
            };
            values.forEach(function (value, index) {

                // get field name based on column index in matrix
                var field = get_field_name(index).trim();

                if(index > 3) {
                    // for category columns keep numeric value instead of string
                    obj.type[field] = transform_value(field, value);
                } else {
                    obj[field] = $.isNumeric(value) ? parseFloat(value) : value;
                }
            });

            return obj;
        }

        function get_field_name(index) {
            var relation = {
                0: "x",
                1: "y",
                2: "z",
                3: "id"
            };

            if(index < 4) {
                return relation[index];
            } else {
                return column_index_to_name_map[index];
            }
        }

        function transform_value(field, value) {
            return field in class_to_index_map ? class_to_index_map[field][value] : value;
        }
    }

    function parse_metadata(raw_lines, parsed_data) {
        var metadata = get_default_metadata();

        metadata.range = calculate_ranges(parsed_data);
        metadata.axis = parse_axes_metadata(raw_lines[0]);
        metadata.classes = parse_classes(raw_lines);
        metadata.selected_class = Object.keys(metadata.classes)[0];     // set first class as selected

        return metadata;

        function parse_axes_metadata(first_line) {

            var arr = row_to_array(first_line);
            var default_axis_metadata = {
                "color": cube_maker_defaults.LINE_COLOR,
                "thickness": cube_maker_defaults.LINE_THICKNESS,
                "tick_color": cube_maker_defaults.TICK_COLOR,
                "tick_thickness": cube_maker_defaults.TICK_THICKNESS,
                "tick_length": cube_maker_defaults.TICK_LENGTH
            };

            return {
                x: $.extend({name: arr[0]}, default_axis_metadata),
                y: $.extend({name: arr[1]}, default_axis_metadata),
                z: $.extend({name: arr[2]}, default_axis_metadata)
            };
        }

        function calculate_ranges(data) {
            var first = data[0];
            var range = {
                x: {min: first.x, max: first.x},
                y: {min: first.y, max: first.y},
                z: {min: first.z, max: first.z}
            };

            data.forEach(function (value) {
                range.x.min = value.x < range.x.min ? value.x: range.x.min;
                range.x.max = value.x > range.x.max ? value.x: range.x.max;

                range.y.min = value.y < range.y.min ? value.y: range.y.min;
                range.y.max = value.y > range.y.max ? value.y: range.y.max;

                range.z.min = value.z < range.z.min ? value.z: range.z.min;
                range.z.max = value.z > range.z.max ? value.z: range.z.max;
            });

            return {x: [range.x.min, range.x.max], y:[range.y.min, range.y.max], z: [range.z.min, range.z.max]};
        }

        function get_default_metadata() {
            return {
                "title": "Cubemaker",
                "subtitle": "Use mouse or arrow keys to rotate, scrollwheel to zoom, and double-tap arrow keys to animate",
                "axis": {},
                "selected_class": "",
                "label_visibility": cube_maker_defaults.LABEL_VISIBILITY,
                "show_axes": cube_maker_defaults.AXIS_SHOW_FLAG,
                "invert_y_axis": cube_maker_defaults.AXIS_INVERT_Y,
                "show_legend": cube_maker_defaults.LEGEND_SHOW_FLAG,
                "show_title": cube_maker_defaults.TITLE_SHOW_FLAG,
                "particle_size": cube_maker_defaults.PARTICLE_SIZE,
                "rotation_automation": cube_maker_defaults.ROTATION_AUTOMATION,
                "rotation_speed": cube_maker_defaults.ROTATION_SPEED,
                "classes": {},
                "range": {},
                "materials": {
                    "opaque_cube_line_material": {
                        "color": cube_maker_defaults.OPAQUE_CUBE_LINE_MATERIAL_COLOR,
                        "thickness": cube_maker_defaults.OPAQUE_CUBE_LINE_MATERIAL_THICKNESS
                    },
                    "back_cube_material": {
                        "color": cube_maker_defaults.BACK_CUBE_MATERIAL_COLOR
                    }
                }
            }
        }


        function parse_classes() {
            var color_generator = new CUBE_MAKER.ColorGenerator(-0.618033988749895, 0.99, 0.85);

            // build classes and subclasses tree with colors
            var classes = {};
            Object.keys(class_to_index_map).forEach(function (class_name) {
                var class_values = [];
                Object.keys(class_to_index_map[class_name]).forEach(function (sub_class_name) {
                    class_values.push({
                        name: sub_class_name.trim(),
                        rgb: color_generator.generate_color()
                    });
                });
                classes[class_name.trim()] = class_values;
                class_values = [];
            });

            return classes;
        }

    }

    function create_column_index_to_name_map(first_row) {
        var names = row_to_array(first_row);

        var relation = {};
        names.forEach(function (name, index) {
            relation[index] = name;
        });

        return relation;
    }

    function text_to_array_of_rows(text) {
        console.log(text);
        return but_last(text.split(EOL_PATTERN));
    }

    function row_to_array(row) {
        return row.split(COLUMNS_DELIMITER);
    }

    function create_name_to_index_map_for_classes(matrix_rows) {

        var class_tree = create_class_tree(matrix_rows);
        set_subclass_indexes(class_tree);

        return class_tree;

        function set_subclass_indexes(class_tree) {
            Object.keys(class_tree).forEach(function (class_name) {
                var subclasses = class_tree[class_name];
                Object.keys(subclasses).forEach(function (subclass_name, index) {
                    subclasses[subclass_name] = index;
                });
            })
        }

        function create_class_tree(matrix_rows) {
            var classes = {};
            var header = row_to_array(matrix_rows[0]).slice(4);
            matrix_rows.slice(1).forEach(function (row) {
                var row_values = row_to_array(row);


                // create map of all possible classes and subclasses
                row_values.slice(4).forEach(function (class_value, index) {
                    var class_name = header[index].trim();

                    //add new class to map
                    if(!(class_name in classes)) {
                        classes[class_name] = {};
                    }

                    // add subclass to current class
                    classes[class_name][class_value] = "";
                });

            });

            return classes;
        }
    }

    function but_last(array) {
        return array.slice(0, array.length-1)
    }
};