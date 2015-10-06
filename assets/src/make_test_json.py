#!/usr/bin/env python

import json, random

sample = {
    'metadata' : {
        'title' : 'Random data points',
        'subtitle' : 'Subtitle of random dataset',
        'axis' : {
            'x' : 'PC1',
            'y' : 'PC2',
            'z' : 'PC3'
            },
        'selected_class' : 'Lineage',
        'show_axes' : False,
        'classes' : {
            'Lineage' : [
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
                      ]
            },
        'range' : {
            'x' : [ -1000.0, 1000.0 ],
            'y' : [ -1000.0, 1000.0 ],
            'z' : [ -1000.0, 1000.0 ]
            }
        },
    'data' : [
        {
            "type" : {
                "Lineage": 0
            },
            "id": "Point 0",
            "x": -276.412663905422,
            "y": -83.1758800539113,
            "z": -25.0089776269546
        }
    ]
}

samples = 300

for i in xrange(samples):
    x_rand = random.uniform(sample['metadata']['range']['x'][0], sample['metadata']['range']['x'][1])
    y_rand = random.uniform(sample['metadata']['range']['y'][0], sample['metadata']['range']['y'][1])
    z_rand = random.uniform(sample['metadata']['range']['z'][0], sample['metadata']['range']['z'][1])
    type_rand = random.randint(0, len(sample['metadata']['classes']['Lineage']) - 1)
    sample['data'].append({
        'type' : { 'Lineage' : type_rand },
        'id' : 'Point ' + str(i),
        'x' : x_rand,
        'y' : y_rand,
        'z' : z_rand
        })

print json.dumps(sample)
