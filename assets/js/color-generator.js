var CUBE_MAKER = CUBE_MAKER || {};

CUBE_MAKER.ColorGenerator = function ColorGenerator(hue, saturation, value) {

    const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;
    var h = hue, s = saturation, v = value;


    return {
        generate_color: generate_color
    };

    function generate_color() {
        h += GOLDEN_RATIO_CONJUGATE;
        h %= 1;
        var color = hsv2rgb(h, s, v);
        return [ color.red , color.green , color.blue ];
    }

    //hsv2rgb from http://jsres.blogspot.com/2008/01/convert-hsv-to-rgb-equivalent.html
    function hsv2rgb (h, s, v) {
        // Adapted from http://www.easyrgb.com/math.html
        // hsv values = 0 - 1, rgb values = 0 - 255
        var r, g, b;
        var RGB = [];
        if (s == 0) {
            RGB['red'] = RGB['green'] = RGB['blue'] = Math.round(v * 255);
        } else {
            // h must be < 1
            var var_h = h * 6;
            if (var_h == 6)
                var_h = 0;
            //Or ... var_i = floor( var_h )
            var var_i = Math.floor(var_h);
            var var_1 = v * (1 - s);
            var var_2 = v * (1 - s * (var_h - var_i));
            var var_3 = v * (1 - s * (1 - (var_h - var_i)));
            if (var_i == 0) {
                r = v;
                g = var_3;
                b = var_1;
            } else if (var_i == 1) {
                r = var_2;
                g = v;
                b = var_1;
            } else if (var_i == 2) {
                r = var_1;
                g = v;
                b = var_3
            } else if (var_i == 3) {
                r = var_1;
                g = var_2;
                b = v;
            } else if (var_i == 4) {
                r = var_3;
                g = var_1;
                b = v;
            } else {
                r = v;
                g = var_1;
                b = var_2
            }
            //rgb results = 0 ÷ 255
            RGB['red'] = Math.round(r * 255);
            RGB['green'] = Math.round(g * 255);
            RGB['blue'] = Math.round(b * 255);
        }
        return RGB;
    }
};