#!/usr/bin/env python

import cgi, cgitb, json, hashlib, os, io, sys

form = cgi.FieldStorage()
email = form.getvalue('email')
model = form.getvalue('model')

cgitb.enable()

if not model or not email:
    print "Content-type:application/json\r\n\r\n"
    print json.dumps({})
else:
    # allow JSON object to contain UTF-8 bytes
    reload(sys)
    sys.setdefaultencoding('utf-8')

    hash_str = model
    hash_object = hashlib.sha1(hash_str.encode('utf-8'))
    hash_id = hash_object.hexdigest()[:16]
    
    gif_results_dir = os.path.join(os.getcwd(), "gifs")
    if not os.path.exists(gif_results_dir):
        os.makedirs(gif_results_dir)
    gif_hash_fn = os.path.join(gif_results_dir, hash_id) + ".json"
    with io.open(gif_hash_fn, 'w', encoding='utf-8') as gif_fh:
        gif_fh.write(unicode(model))
    gif_fh.close()
    
    id_results_dir = os.path.join(os.getcwd(), "ids")
    id_hash_fn = os.path.join(id_results_dir, hash_id) + ".json"
    with io.open(id_hash_fn, 'w', encoding='utf-8') as id_fh:
        id_fh.write(unicode(model))
    id_fh.close()
        
    # convert JSON to matrix and GIF files
    convert_command_components = [os.path.join(os.getcwd(), 'convert_model_to_gif_submit.py'), '-i', id_hash_fn, '-o', os.path.join(gif_results_dir, hash_id) + '.mtx', '-p', os.path.join(gif_results_dir, hash_id) + '.gif', '-e', email, '-d', hash_id]
    convert_command = ' '.join(convert_command_components)
    
    try:
        retval = os.system(convert_command)
        # return success or failure code
        print 'Content-Type: application/json'
        print
        print json.dumps(hash_id)
    except subprocess.CalledProcessError:
        print 'Content-type:application/json'
        print
        print json.dumps('(subprocess.CalledProcessError) convert stage failed on command: [ ' + str(convert_command_components) + ' ] - convert did not complete correctly?')
    except OSError:
        print 'Content-type:application/json'
        print
        print json.dumps('(OSError) convert stage failed on command: [ ' + convert_command + ' ] - missing executable?')