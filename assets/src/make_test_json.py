#!/usr/bin/env python

import json, random

sample = {
    'metadata' : {
        'title' : 'Random points',
        'subtitle' : 'Testing of randomly sampled points',
        'axis': {
            'x': {
                'name': 'PC1',
                'color': '#000000',
                'thickness': 1,
                'tick_color': '#000000',
                'tick_thickness': 1,
                'tick_length': 0.1
            },
            'y': {
                'name': 'PC2',
                'color': '#000000',
                'thickness': 1,
                'tick_color': '#000000',
                'tick_thickness': 1,
                'tick_length': 0.1
            },
            'z': {
                'name': 'PC3',
                'color': '#000000',
                'thickness': 1,
                'tick_color': '#000000',
                'tick_thickness': 1,
                'tick_length': 0.1
            }
        },
        'selected_class': 'Lineage',
        'show_axes': True,
        'invert_y_axis': False,
        'show_legend': True,
        'show_title': True,
        'particle_size': 0.16,
        'rotation_speed': 0.006,
        'classes' : {
            'Lineage' : [
                {
                    'name': 'Paraxial mesoderm deratives',
                    'rgb': [
                        238,
                        23,
                        23
                ]
                },
                {
                    'name': 'Lymphoid',
                    'rgb': [
                        222,
                        99,
                        20
                ]
                },
                {
                    'name': 'Primitive',
                    'rgb': [
                        128,
                        128,
                        255
                ]
                },
                {
                    'name': 'Ectoderm',
                    'rgb': [
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
    ]
}

samples = 100

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
