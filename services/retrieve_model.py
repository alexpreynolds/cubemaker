#!/usr/bin/env python

import cgi, cgitb, json, hashlib, os, io, sys, codecs

cgitb.enable(format='text')

form = cgi.FieldStorage()
id = form.getvalue('id')

# allow JSON object to contain UTF-8 bytes
reload(sys)
sys.setdefaultencoding('utf-8')

results_dir = os.path.join(os.getcwd(), "ids")
if not os.path.exists(results_dir):
    result = None
else:
    id_fn = os.path.join(results_dir, id) + ".json"
    fh = codecs.open(id_fn, 'rb', 'utf-8')
    result = fh.read()

print "Content-type:application/json\r\n\r\n"
print json.dumps(result, ensure_ascii=False).encode('utf8')