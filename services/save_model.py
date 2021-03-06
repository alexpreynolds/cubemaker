#!/usr/bin/env python

import cgi, cgitb, json, hashlib, os, io, sys

form = cgi.FieldStorage()
model = form.getvalue('model')
if not model:
    model = json.dumps("""
    {
  "metadata": {
    "title": "Cubemaker",
    "subtitle": "Use mouse or arrow keys to rotate, scrollwheel to zoom, and double-tap arrow keys to animate",
    "axis": {
      "x": {
        "name": "PC1",
        "color": "red",
        "thickness": 1,
        "tick_color": "red",
        "tick_thickness": 1,
        "tick_length": 0.1
      },
      "y": {
        "name": "PC2",
        "color": "green",
        "thickness": 1,
        "tick_color": "green",
        "tick_thickness": 1
      },
      "z": {
        "name": "PC3",
        "color": "blue",
        "thickness": 1,
        "tick_color": "blue",
        "tick_thickness": 1
      }
    },
    "selected_class": "Lineage",
    "show_axes": true,
    "particle_size": 0.16,
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
    "range": {
      "x": [
        -324.249475042631,
        141.153439249043
      ],
      "y": [
        -126.375284207152,
        229.090197881056
      ],
      "z": [
        -97.4840574820861,
        430.242836265501
      ]
    },
    "materials": {
      "opaque_cube_line_material": {
        "color": "0xbbbbbb",
        "thickness": 3
      },
      "back_cube_material": {
        "color": "0xf7f7f7"
      }
    },
    "cameraPosition": "-1.8604964682882887:1.9798989873223334:0.6771653354143308",
    "cameraRotation": "-1.241248123020747:-0.726775079508622:-1.0954330148342262"
  },
  "data": [
    {
      "type": {
        "Lineage": 0,
        "Tissue": 0
      },
      "id": "AG04449-DS12319",
      "x": -276.412663905422,
      "y": -83.1758800539113,
      "z": -25.0089776269546
    },
    {
      "type": {
        "Lineage": 0,
        "Tissue": 0
      },
      "id": "AG04450-DS12270",
      "x": -225.16928363426,
      "y": -64.2873181026024,
      "z": -56.2128084230765
    },
    {
      "type": {
        "Lineage": 0,
        "Tissue": 0
      },
      "id": "AG09309-DS12352",
      "x": -324.249475042631,
      "y": -120.763294672146,
      "z": -50.4869757834736
    },
    {
      "type": {
        "Lineage": 0,
        "Tissue": 3
      },
      "id": "AG09319-DS12291",
      "x": -223.953698282166,
      "y": -83.9964379641139,
      "z": -97.4840574820861
    },
    {
      "type": {
        "Lineage": 0,
        "Tissue": 0
      },
      "id": "AG10803-DS12384",
      "x": -287.265505588092,
      "y": -109.849418312057,
      "z": -79.2499113283234
    },
    {
      "type": {
        "Lineage": 0,
        "Tissue": 1
      },
      "id": "SkMC-DS11949",
      "x": -302.061733136259,
      "y": -126.375284207152,
      "z": -29.6595604981266
    },
    {
      "type": {
        "Lineage": 1,
        "Tissue": 2
      },
      "id": "CD19-DS17281",
      "x": 136.01389377205,
      "y": 214.940307097836,
      "z": -22.6768465513087
    },
    {
      "type": {
        "Lineage": 1,
        "Tissue": 2
      },
      "id": "CD20-DS17541",
      "x": 141.153439249043,
      "y": 222.008601154387,
      "z": -25.9975593793299
    },
    {
      "type": {
        "Lineage": 1,
        "Tissue": 4
      },
      "id": "CD34-DS12274",
      "x": 100.474071131398,
      "y": 229.090197881056,
      "z": -52.6553280422026
    },
    {
      "type": {
        "Lineage": 1,
        "Tissue": 2
      },
      "id": "hTH1-DS7840",
      "x": 115.924864675695,
      "y": 209.289425464383,
      "z": -7.72061603054014
    },
    {
      "type": {
        "Lineage": 1,
        "Tissue": 2
      },
      "id": "hTH2-DS7842",
      "x": 114.435503466346,
      "y": 204.757615642075,
      "z": -6.19822633673763
    },
    {
      "type": {
        "Lineage": 2,
        "Tissue": 4
      },
      "id": "hESCT0-DS11909",
      "x": 111.185659772123,
      "y": -1.98890275613638,
      "z": 16.9654205670039
    },
    {
      "type": {
        "Lineage": 3,
        "Tissue": 0
      },
      "id": "Skin_Keratinocytes-DS18692",
      "x": -152.758667376666,
      "y": 10.7650810128968,
      "z": 430.242836265501
    },
    {
      "type": {
        "Lineage": 3,
        "Tissue": 0
      },
      "id": "Skin_Keratinocytes-DS18695",
      "x": -149.305110222447,
      "y": 14.7866787526815,
      "z": 422.939200493901
    },
    {
      "type": {
        "Lineage": 3,
        "Tissue": 0
      },
      "id": "vHMEC-DS18438",
      "x": -123.49178394839,
      "y": 28.7804673565906,
      "z": 303.912892981827
    }
  ]
}
    """)

# allow JSON object to contain UTF-8 bytes
reload(sys)
sys.setdefaultencoding('utf-8')

hash_str = model
hash_object = hashlib.sha1(hash_str.encode('utf-8'))
hash_id = hash_object.hexdigest()[:16]
results_dir = os.path.join(os.getcwd(), "ids")
if not os.path.exists(results_dir):
    os.makedirs(results_dir)
hash_fn = os.path.join(results_dir, hash_id) + ".json"
with io.open(hash_fn, 'w', encoding='utf-8') as fh:
    fh.write(unicode(model))
print "Content-type:application/json\r\n\r\n"
print json.dumps(hash_id)