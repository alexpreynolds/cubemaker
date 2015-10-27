var CUBE_MAKER = CUBE_MAKER || {};

CUBE_MAKER.MatrixParser = function (matrix_text) {
    const DELIMITER = "\t";
    const LINAGE_COLUMN = "Lineage";
    const NAME_COLUMN = "Name";
    const TISSUE_COLUMN = "Tissue";

    var index_to_name = {};

    return {
        parse: parse
    };

    function parse() {
        var result = {};
        var lines = text_to_array_of_lines(matrix_text);
        index_to_name = create_index_to_name_relation(lines[0]);

        result.data = parse_data(lines);
        result.metadata = parse_metadata(lines, result.data);

        return result;
    }

    function parse_data(data_lines) {

        var data = [];
        data_lines.slice(1).forEach(function (line) {
            var obj = line_to_object(line);
            data.push(obj);
        });

        return data;
    }

    function parse_metadata(raw_lines, parsed_data) {
        var metadata = get_default_metadata();

        metadata.range = calculate_ranges(parsed_data);
        metadata.axis = parse_axes_metadata(raw_lines[0]);
        metadata.classes = parse_classes(raw_lines);
        metadata.selected_class = Object.keys(metadata.classes)[0];     // set first class as selected

        return metadata;

        function parse_axes_metadata(first_line) {

            var arr = line_to_array(first_line);
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


        function parse_classes(raw_lines) {
            var header = raw_lines[0].split(DELIMITER);
            var relation = get_name_index_relation_for_classes();

            var class_values_count = Object.keys(relation).reduce(function (sum, clazz) {
                return sum + clazz.length;
            }, 0);

            var colors = generate_random_colors(class_values_count);

            var classes = {};

            var color_index = 0;
            Object.keys(relation).forEach(function (clazz) {
                var class_values = [];
                Object.keys(relation[clazz]).forEach(function (clazz_name) {
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
            var colors = [];
            for (var i = 0; i < count; i++) {
                colors.push([random_int(255), random_int(255), random_int(255)])
            }
            return colors;

            function random_int(max) {
                return Math.floor(Math.random() * max);
            }
        }
    }


    function create_index_to_name_relation(first_line) {
        var names = line_to_array(first_line);

        var relation = {};
        names.forEach(function (name, index) {
            relation[index] = name;
        });

        return relation;
    }

    function text_to_array_of_lines(text) {
        return but_last(text.split("\n"));
    }

    function line_to_object(line) {
        var values = line_to_array(line);

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

    function line_to_array(line) {
        return line.split(DELIMITER);
    }


    function transform_value(field, value) {
        var relation = get_name_index_relation_for_classes();

        return field in relation ? relation[field][value] : value;
    }

    function get_name_index_relation_for_classes(matrix_lines) {

        return {
            Lineage: {
                'Paraxial mesoderm deratives': 0,
                'Lymphoid': 1,
                'Primitive': 2,
                'Ectoderm': 3
            },
            Tissue: {
                'Skin': 0,
                'Muscle': 1,
                'Immune': 2,
                'Gingival': 3,
                'Stem': 4
            }
        };
    }

    function but_last(array) {
        return array.slice(0, array.length-1)
    }
};