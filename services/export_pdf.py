#!/usr/bin/env python

import cgi, cgitb, json, hashlib, os, io, sys, subprocess

form = cgi.FieldStorage()
id = form.getvalue('id')

allowed_chars = set('0123456789abcdefABCDEF')
id_set = set(list(id))
if not id_set.issubset(allowed_chars):
    print 'Content-type:application/json'
    print
    print json.dumps(id)

reload(sys)
sys.setdefaultencoding('utf-8')

results_dir = os.path.join(os.getcwd(), "pdfs")
pdf_fn = os.path.join(results_dir, id) + ".pdf"
with io.open(pdf_fn, 'rb') as fh:
    fb = fh.read()

# return success or failure code
print 'Content-Type: application/pdf'
print 'Content-Disposition: attachment; filename=' + id + '.pdf'
print 'Content-Description: File to download'
print
print fb