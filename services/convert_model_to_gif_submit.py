#!/usr/bin/env python

import json, io, sys, getopt, math, subprocess, os.path, requests, re

def usage(fh):
    sys.stderr.write('usage: convert_model_to_gif_submit.py -i <input_json_model_file> -o <output_matrix_file> -p <output_gif_file> -e <email_address> -d <id>\n')
    if int(fh) != 0:
        sys.exit(fh)

def main(argv):
    ijson = None
    omtx = None
    opdf = None
    email = None
    id = None
    try:
        opts, args = getopt.getopt(argv,"hi:o:p:e:d:",["ijson=", "omtx=", "opdf=", "email=", "id="])
    except getopt.GetoptError:
        usage(2)
    for opt, arg in opts:
        if opt == '-h':
            usage(0)
        elif opt in ("-i", "--ijson"):
            ijson = arg
        elif opt in ("-o", "--omtx"):
            omtx = arg
        elif opt in ("-p", "--opdf"):
            opdf = arg
        elif opt in ("-e", "--email"):
            email = arg
        elif opt in ("-d", "--id"):
            id = arg
    if not (ijson and omtx and opdf and email and id):
        usage(2)
        
    # validate email parameter
    email_match = re.match('^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,4})$', email)
    if email_match == None:
        usage(2)

    # bring in JSON-formatted model data
    with open(ijson) as ijsonh:
        ijsono = json.load(ijsonh)

    # we need axis labels, the selected class, the class data that contain color information
    lines = []
    column_headers = ['point_label', 'point_sublabel']
    for axis_label in ['x', 'y', 'z']:
        column_headers.append( ijsono['metadata']['axis'][axis_label]['name'] )
    column_headers.append("rgb")
    lines.append( '\t'.join(column_headers) )
    selected_class = ijsono['metadata']['selected_class']
    attribute_map = ijsono['metadata']['classes'][selected_class]
    for data_point in ijsono['data']:
        row_data = []
        row_data.append(str(data_point['id']))
        attribute_map_index = data_point['type'][selected_class]
        row_data.append(str(attribute_map[attribute_map_index]['name']))
        for axis_label in ['x', 'y', 'z']:
            row_data.append(str(data_point[axis_label]))
        row_data.append(','.join([str(x) for x in attribute_map[attribute_map_index]['rgb']]))
        lines.append( '\t'.join(row_data) )

    # write datapoint matrix to file
    with io.open(omtx, 'w', encoding='utf-8') as omtxh:
        omtxh.write(unicode('\n'.join(lines)))

    # retrieve phi, theta and other presentation parameters
    theta = math.degrees(ijsono['metadata']['theta'])
    phi = math.degrees(ijsono['metadata']['phi'])
    radius = ijsono['metadata']['radius']
    invert_y_axis = str(ijsono['metadata']['invert_y_axis'])

    # scp data matrix to fiddlehead
    scp_mtx_command_components = ['/usr/bin/scp', omtx, 'alexpreynolds@fiddlehead.stamlab.org:/Users/alexpreynolds/Developer/Node/cubemaker/cubemaker-viz-proxy/mtxs/' + os.path.basename(omtx)]
    scp_mtx_command = ' '.join(scp_mtx_command_components)
    try:
        subprocess.check_call(scp_mtx_command_components)
        sys.stderr.write( '(subprocess.check_call) scp of data matrix succeeded\n' )
    except subprocess.CalledProcessError:
        sys.stderr.write('subprocess.CalledProcessError) scp stage failed on command: [ ' + scp_mtx_command + ' ] - copy of data matrix did not complete correctly?\n')
        return
    except OSError:
        sys.stderr.write('(OSError) scp stage failed on command: [ ' + scp_mtx_command + ' ] - missing executable?\n')
        return

    # send request to fiddlehead to render
    try:
        r = requests.get('https://fiddlehead.stamlab.org', \
                params = { \
                    'action'        : 'convert_mtx_to_animated_gif', \
                    'input'         : os.path.basename(omtx), \
                    'output'        : os.path.basename(opdf), \
                    'email'         : email, \
                    'id'            : id, \
                    'theta'         : theta, \
                    'phi'           : phi, \
                    'radius'        : radius, \
                    'invertYAxis'   : invert_y_axis
                    }, \
                verify = False)
        sys.stderr.write('%s %s %s\n' % (str(r.status_code), str(r.reason), str(r.text)))
        return
    except requests.exceptions.ConnectionError as ce:
        sys.stderr.write('(requests.exceptions.ConnectionError) scp stage failed on request: [ ' + str(ce) + ' ] - request did not complete correctly?\n')
        return

if __name__ == "__main__":
   main(sys.argv[1:])