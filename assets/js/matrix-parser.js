var CUBE_MAKER = CUBE_MAKER || {};

CUBE_MAKER.MatrixParser = function (matrix_text) {
    const DELIMITER = "\t";
    const LINAGE_COLUMN = "Lineage";
    const TISSUE_COLUMN = "Tissue";

    var index_to_name = {};
    var class_to_index_relation = {};

    return {
        parse: parse
    };

    function parse() {
        var result = {};
        var rows = text_to_array_of_rows(matrix_text);
        index_to_name = create_index_to_name_relation(rows[0]);
        class_to_index_relation = get_name_index_relation_for_classes(rows);

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

        function row_to_object(row) {
            var values = row_to_array(row);

            var obj = {
                type: {}
            };
            values.forEach(function (value, index) {
                var field = get_field_name(index);
                if(field == TISSUE_COLUMN || field == LINAGE_COLUMN) {
                    obj.type[field] = transform_value(field, value);
                } else {
                    obj[field] = $.isNumeric(value) ? parseFloat(value) : value;
                }
            });

            return obj;

            function get_field_name(index) {
                var relation = {
                    0: "x",
                    1: "y",
                    2: "z",
                    Name: "id"
                };

                if(index < 3) {
                    return relation[index];
                } else {
                    var name = index_to_name[index];
                    if(name in relation) {
                        return relation[name];
                    } else {
                        return name;
                    }
                }

            }
        }

        function transform_value(field, value) {

            return field in class_to_index_relation ? class_to_index_relation[field][value] : value;
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
                "color": "red",
                "thickness": 1,
                "tick_color": "red",
                "tick_thickness": 1,
                "tick_length": 0.1
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
                "show_axes": true,
                "classes": {},
                "range": {},
                "materials": {
                    "opaque_cube_line_material": {
                        "color": "0xbbbbbb",
                        "thickness": 3
                    },
                    "back_cube_material": {
                        "color": "0xf7f7f7"
                    }
                }
            }
        }


        function parse_classes() {

            // count total number of subclasses to generate colors palette
            var class_values_count = Object.keys(class_to_index_relation).reduce(function (sum, clazz) {
                return sum + clazz.length;
            }, 0);
            var colors = generate_random_colors(class_values_count);

            // build classes and subclasses tree with colors
            var classes = {};
            var color_index = 0;
            Object.keys(class_to_index_relation).forEach(function (clazz) {
                var class_values = [];
                Object.keys(class_to_index_relation[clazz]).forEach(function (clazz_name) {
                    class_values.push({
                        name: clazz_name,
                        rgb: colors[color_index]
                    });
                    color_index++;
                });
                classes[clazz] = class_values;
                class_values = [];
            });

            return classes;
        }

        function generate_random_colors(count) {
            var color_generator = new CUBE_MAKER.ColorGenerator(0.35, 0.99, 0.99);
            var colors = [];
            for (var i = 0; i < count; i++) {
                colors.push(color_generator.generate_color())
            }
            return colors;
        }
    }

    function create_index_to_name_relation(first_row) {
        var names = row_to_array(first_row);

        var relation = {};
        names.forEach(function (name, index) {
            relation[index] = name;
        });

        return relation;
    }

    function text_to_array_of_rows(text) {
        return but_last(text.split("\n"));
    }

    function row_to_array(row) {
        return row.split(DELIMITER);
    }

    function get_name_index_relation_for_classes(matrix_rows) {

        var lineage_column_index = -1, tissue_column_index = -1;
        var header = row_to_array(matrix_rows[0]);

        // find tissue and lineage column indexes;
        header.forEach(function (column_name, index) {
            if(column_name == LINAGE_COLUMN) {
                lineage_column_index = index;
            } else if (column_name == TISSUE_COLUMN) {
                tissue_column_index = index;
            }
        });

        var class_tree = create_class_tree(matrix_rows, lineage_column_index, tissue_column_index);
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

        function create_class_tree(matrix_rows, lineage_column_index, tissue_column_index) {
            var classes = {};
            matrix_rows.slice(1).forEach(function (row) {
                var row_values = row_to_array(row);
                // if there is linage column in matrix then create map of all possible subclasses
                if(lineage_column_index > -1) {
                    if(!(LINAGE_COLUMN in classes)) {
                        classes[LINAGE_COLUMN] = {};
                    }
                    var lineage_subclass = row_values[lineage_column_index];
                    classes[LINAGE_COLUMN][lineage_subclass] = "";
                }

                // same for tissue
                if(tissue_column_index > -1) {
                    if(!(TISSUE_COLUMN in classes)) {
                        classes[TISSUE_COLUMN] = {};
                    }
                    var tissue_subclass = row_values[tissue_column_index];
                    classes[TISSUE_COLUMN][tissue_subclass] = "";
                }
            });

            return classes;
        }
    }

    function but_last(array) {
        return array.slice(0, array.length-1)
    }
};