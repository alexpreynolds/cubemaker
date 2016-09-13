#!/usr/bin/env python

import json, io, sys, getopt, math, subprocess, os.path, requests, re

def usage(fh):
    sys.stderr.write('usage: convert_model_to_pdf_submit.py -i <input_json_model_file> -j <output_projection_matrix_file> -o <output_matrix_file> -p <output_pdf_file> -e <email_address> -d <id>\n')
    if int(fh) != 0:
        sys.exit(fh)

def main(argv):
    ijson = None
    jmtx = None
    omtx = None
    opdf = None
    email = None
    id = None
    try:
        opts, args = getopt.getopt(argv,"hi:o:p:e:d:j:",["ijson=", "jmtx=", "omtx=", "opdf=", "email=", "id="])
    except getopt.GetoptError:
        usage(2)
    for opt, arg in opts:
        if opt == '-h':
            usage(0)
        elif opt in ("-i", "--ijson"):
            ijson = arg
        elif opt in ("-j", "--jmtx"):
            jmtx = arg
        elif opt in ("-o", "--omtx"):
            omtx = arg
        elif opt in ("-p", "--opdf"):
            opdf = arg
        elif opt in ("-e", "--email"):
            email = arg
        elif opt in ("-d", "--id"):
            id = arg
    if not (ijson and jmtx and omtx and opdf and email and id):
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
        row_data.append(unicode(data_point['id']))
        attribute_map_index = data_point['type'][selected_class]
        row_data.append(unicode(attribute_map[attribute_map_index]['name']))
        for axis_label in ['x', 'y', 'z']:
            row_data.append(unicode(data_point[axis_label]))
        row_data.append(','.join([unicode(x) for x in attribute_map[attribute_map_index]['rgb']]))
        lines.append( '\t'.join(row_data) )
        
    # write datapoint matrix to file
    with io.open(omtx, 'w', encoding='utf-8') as omtxh:
        omtxh.write(unicode('\n'.join(lines)))
    
    # retrieve phi, theta, y-axis inversion, label visibility and other presentation parameters
    theta = math.degrees(ijsono['metadata']['theta'])
    phi = math.degrees(ijsono['metadata']['phi'])
    radius = ijsono['metadata']['radius']
    modified_phi = ijsono['metadata']['modified_phi']
    invert_y_axis = str(ijsono['metadata']['invert_y_axis'])
    label_visibility = str(ijsono['metadata']['label_visibility'])
    
    # retrieve camera projection matrix (column-major order -- cf. http://threejs.org/docs/index.html#Reference/Math/Matrix4)
    camera_projection_matrix = ijsono['metadata']['camera_projection_matrix']
    camera_projection_matrix_row_major_order = [[camera_projection_matrix[i] for i in xrange(j, len(camera_projection_matrix), 4)] for j in xrange(0, 4)]
    
    # write camera projection matrix to file
    with io.open(jmtx, 'w', encoding='utf-8') as jmtxh:
    	for row_idx in range(0, len(camera_projection_matrix_row_major_order)):
    		jmtxh.write('%s\n' % ('\t'.join([unicode(x) for x in camera_projection_matrix_row_major_order[row_idx]])))
    
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
    
    # scp projection matrix to fiddlehead    
    scp_projmtx_command_components = ['/usr/bin/scp', jmtx, 'alexpreynolds@fiddlehead.stamlab.org:/Users/alexpreynolds/Developer/Node/cubemaker/cubemaker-viz-proxy/mtxs/' + os.path.basename(jmtx)]
    scp_projmtx_command = ' '.join(scp_projmtx_command_components)
    try:
        subprocess.check_call(scp_projmtx_command_components)
        sys.stderr.write( '(subprocess.check_call) scp of projection matrix succeeded\n' )
    except subprocess.CalledProcessError:
        sys.stderr.write('subprocess.CalledProcessError) scp stage failed on command: [ ' + scp_projmtx_command + ' ] - copy of projection matrix did not complete correctly?\n')
        return
    except OSError:
        sys.stderr.write('(OSError) scp stage failed on command: [ ' + scp_projmtx_command + ' ] - missing executable?\n')
        return
        
    # send request to fiddlehead to render
    try:
        r = requests.get('https://fiddlehead.stamlab.org', \
                params = { \
                    'action'          : 'convert_mtx_to_pdf', \
                    'input'           : os.path.basename(omtx), \
                    'output'          : os.path.basename(opdf), \
                    'projmtx'         : os.path.basename(jmtx), \
                    'email'           : email, \
                    'id'              : id, \
                    'theta'           : theta, \
                    'phi'             : phi, \
                    'radius'          : radius, \
                    'mphi'            : modified_phi, \
                    'invertYAxis'     : invert_y_axis, \
                    'labelVisibility' : label_visibility \
                    }, \
                verify = False)
        sys.stderr.write('%s %s %s\n' % (str(r.status_code), str(r.reason), str(r.text)))
        return
    except requests.exceptions.ConnectionError as ce:
        sys.stderr.write('(requests.exceptions.ConnectionError) scp stage failed on request: [ ' + str(ce) + ' ] - request did not complete correctly?\n')
        return

if __name__ == "__main__":
   main(sys.argv[1:])
