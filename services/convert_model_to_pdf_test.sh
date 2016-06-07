#!/bin/sh

# example $1=acc4c8a1ccab2cee $2=alexpreynolds@gmail.com

./convert_model_to_pdf_submit.py -i /var/www/html.ssl/cubemaker/services/ids/$1.json -o /var/www/html.ssl/cubemaker/services/pdfs/$1.mtx -p /var/www/html.ssl/cubemaker/services/pdfs/$1.pdf -e $2