var CUBE_MAKER = CUBE_MAKER || {};

CUBE_MAKER.MatrixParser = function (matrix_text) {
    const DELIMITER = "\t";
    var index_to_name = {};


    return {
        parse: parse
    };

    function parse() {
        var result = get_default_sample();
        var lines = text_to_array_of_lines(matrix_text);
        index_to_name = create_index_to_name_relation(lines[0]);

        lines.slice(1).forEach(function (line) {
            var obj = line_to_object(line);
            result.data.push(obj);
        });

        result.metadata.range = calculate_ranges(result.data);
        result.metadata.axis = get_axis_names(lines[0]);

        return result;
    }

    function calculate_ranges(data) {
        var range = {
            x: {min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY},
            y: {min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY},
            z: {min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY}
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

    function get_axis_names(first_line) {
        var arr = line_to_array(first_line);
        return {
            x: arr[0], y:arr[1], z:arr[2]
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
            if(field == "Tissue" || field == "Lineage") {
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
        var relation = {
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

        return field in relation ? relation[field][value] : value;
    }

    function get_default_sample() {
        return {
            metadata: {
                "title": "Cubemaker",
                "subtitle": "Use mouse or arrow keys to rotate, scrollwheel to zoom, and double-tap arrow keys to animate",
                "axis": {},
                "selected_class": "Lineage",
                "show_axes": true,
                "classes": {
                    "Lineage": [
                        {
                            "name": "Paraxial mesoderm deratives",
                            "rgb": [
                                238,
                                23,
                                23
                            ]
                        },
                        {
                            "name": "Lymphoid",
                            "rgb": [
                                222,
                                99,
                                20
                            ]
                        },
                        {
                            "name": "Primitive",
                            "rgb": [
                                128,
                                128,
                                255
                            ]
                        },
                        {
                            "name": "Ectoderm",
                            "rgb": [
                                0,
                                0,
                                255
                            ]
                        }
                    ],
                    "Tissue": [
                        {
                            "name": "Skin",
                            "rgb": [
                                127,
                                255,
                                0
                            ]
                        },
                        {
                            "name": "Muscle",
                            "rgb": [
                                178,
                                34,
                                34
                            ]
                        },
                        {
                            "name": "Immune",
                            "rgb": [
                                218,
                                165,
                                32
                            ]
                        },
                        {
                            "name": "Gingival",
                            "rgb": [
                                188,
                                143,
                                143
                            ]
                        },
                        {
                            "name": "Stem",
                            "rgb": [
                                70,
                                130,
                                180
                            ]
                        }
                    ]
                },
                "range": {}
            },
            data: []
        };
    }

    function but_last(array) {
        return array.slice(0, array.length-1)
    }
};