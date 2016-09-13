#!/usr/bin/env node

const SERVICE_PRIVATE_KEY = '/Users/alexpreynolds/.ssh/id_rsa'
const SERVICE_URL = "https://fiddlehead.stamlab.org/"
const CLIENT_HOST = "basquiat.stamlab.org"
const CLIENT_PORT = "22"
const CLIENT_USERNAME = "areynolds"
const CLIENT_DEST_PATH = "/var/www/html.ssl/cubemaker/services"
const SCP_BINARY = "/usr/bin/scp"
const REQUEST_TYPES = {
    CONVERT_MTX_TO_PDF :  'convert_mtx_to_pdf',
    CONVERT_MTX_TO_ANIMATED_GIF : 'convert_mtx_to_animated_gif'
};

var express = require('express');
var request = require('request');
var url = require('url');
var https = require('https');
var valid_url = require('valid-url');
var fs = require('fs');
var winston = require('winston');
var path = require('path');
var child_process = require('child_process');
var node_ssh = require('node-ssh');
var nodemailer = require('nodemailer');

var ssh = new node_ssh();
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            json: false,
            colorize: true
        })
    ]
});
var mailer = nodemailer.createTransport();

function normalize_port(val) {
    var port = parseInt(val, 10);
    if (isNaN(port)) {
        // named pipe
        return val;
    }
    if (port >= 0) {
        // port number
        return port;
    }
    return false;
}

var https_options = {
    key: fs.readFileSync('./certs/stamlab.org.key.local'),
    cert: fs.readFileSync('./certs/stamlab.org.crt.local'),
    ca: [ fs.readFileSync('./certs/gd_bundle-g2.crt.local') ],
    requestCert: false,
    rejectUnauthorized: false
};

var https_app = express();  
https_app.use('/', function (req, res, next) {
    var query_correctly_specified = false;
    var query = url.parse(req.url, true).query;
    var response_errors = new Array();
    var rotation_theta = 155;
    var rotation_phi = 30;
    var rotation_radius = 1;
    var rotation_mphi = 30;
    var rotation_invertYAxis = false;
    var label_visibility = false;

    // process query
    var date = new Date();
    logger.info('date: ' + date.toISOString());
    logger.info('query: ' + JSON.stringify(query));
    if (query.action) {
        query_correctly_specified = true;
        if (query.action == REQUEST_TYPES.CONVERT_MTX_TO_PDF) {
            if (query.input && query.projmtx && query.output && query.email && query.id) {
                logger.info('converting matrix input to pdf output');
		if (query.theta) {
		    rotation_theta = parseFloat(query.theta);
		}
		if (query.phi) {
		    rotation_phi = parseFloat(query.phi);
		}
		if (query.radius) {
		    rotation_radius = parseFloat(query.radius);
		}
		if (query.mphi) {
		    rotation_mphi = parseFloat(query.mphi);
		}
		if (query.invertYAxis) {
		    rotation_invertYAxis = query.invertYAxis == "True" ? true : false;
		}
		if (query.labelVisibility) {
		    label_visibility = query.labelVisibility == "all" ? true : false;
		}
	    }
            else {
                response_errors.push('missing email, input or output variable setting');
                query_correctly_specified = false;
            }
        } 
	else if (query.action == REQUEST_TYPES.CONVERT_MTX_TO_ANIMATED_GIF) {
	    if (query.input && query.output && query.email && query.id) {
		logger.info('converting matrix input to gif output');
		if (query.theta) {
		    rotation_theta = parseFloat(query.theta);
		}
		if (query.phi) {
		    rotation_phi = parseFloat(query.phi);
		}
		if (query.radius) {
		    rotation_radius = parseFloat(query.radius);
		}
		if (query.invertYAxis) {
		    rotation_invertYAxis = query.invertYAxis == "True" ? true : false;
		}
		if (query.labelVisibility) {
		    label_visibility = query.labelVisibility == "all" ? true : false;
		}
	    }
	    else {
		response_errors.push('missing email, input or output variable setting');
		query_correctly_specified = false;
	    }
	}
        else {
            response_errors.push('missing action variable setting');
            query_correctly_specified = false;
        }
    }

    // is service private key available?
    var private_key_available = false;
    if (fs.existsSync(SERVICE_PRIVATE_KEY)) {
	private_key_available = true;
	response_errors.push('missing or unavailable private key (scp may fail silently)');
    }

    // send response
    if (!query_correctly_specified || !private_key_available) {
        logger.error(response_errors.join('\n'));
        res.status(400);
        res.send(response_errors.join('\n'));
    }
    else {
        if (query.action == REQUEST_TYPES.CONVERT_MTX_TO_PDF) {
	    var mtx_fn = path.join(__dirname, 'mtxs', query.input);
	    var proj_mtx_fn = path.join(__dirname, 'mtxs', query.projmtx);
	    var pdf_fn = path.join(__dirname, 'pdfs', query.output);
	    var mtx_to_pdf_script = path.join(__dirname, 'convert_model_mtx_to_pdf_via_rgl.Rscript');
	    var cmd_options = ['--input', mtx_fn, '--projmtx', proj_mtx_fn, '--output', pdf_fn, '--theta', rotation_theta, '--phi', rotation_phi, '--radius', rotation_radius, '--mphi', rotation_mphi, '--invertYAxis', rotation_invertYAxis, '--labelsVisible', label_visibility];
	    logger.info(cmd_options);
	    var cmd_process = child_process.spawn(mtx_to_pdf_script, cmd_options);
	    var cmd_process_completed = true;
	    cmd_process.stdout.on('data', function(output) {
		    logger.info(output.toString('utf8'));
		});
	    cmd_process.stderr.on('data', function(err) {
		    logger.error(err.toString('utf8'));
		});
	    cmd_process.on('close', function() {
		    if (cmd_process_completed) {
			logger.info('mtx-to-pdf conversion finished');
			var scp_options = {
			    file: pdf_fn,
			    user: CLIENT_USERNAME,
			    host: CLIENT_HOST,
			    port: CLIENT_PORT,
			    path: CLIENT_DEST_PATH + '/pdfs/' + path.basename(pdf_fn),
			    privateKey: SERVICE_PRIVATE_KEY
			}
			logger.info(scp_options);
			ssh.connect({
			    host     : scp_options['host'],
			    username : scp_options['user'],
			    privateKey: scp_options['privateKey']
			}).then(function() {
				ssh.put(pdf_fn, scp_options['path']).then(function() {
					logger.info('scp succeeded');
					res.sendStatus(200);
					/*
					var email = {
					    from: 'areynolds@altiusinstitute.org',
					    to: query.email,
					    subject: 'Cubemaker - PDF ready to download',
					    text: 'Please visit https://tools.stamlab.org/cubemaker/?pdf=' + query.id + ' to download the PDF rendering.'
					};
					mailer.sendMail(email, function(error, info) {
						if (error) {
						    logger.error(error);
						    res.sendStatus(400);
						}
						else {
						    logger.info('message sent: ' + JSON.stringify(info));
						    res.sendStatus(200);
						}
					    });
					*/
				    },
				    function(error) {
					logger.error("ssh failed");
					res.sendStatus(400);
				    });
			    })
		    }
		    else {
			res.sendStatus(400);
		    }
		});
        }
        else if (query.action == REQUEST_TYPES.CONVERT_MTX_TO_ANIMATED_GIF) {
	    var mtx_fn = path.join(__dirname, 'mtxs', query.input);
	    var gif_fn = path.join(__dirname, 'gifs', query.output);
	    var mtx_to_gif_script = path.join(__dirname, 'convert_model_mtx_to_animated_gif.sh');
	    var cmd_options = ['-i', mtx_fn, '-o', gif_fn, '-t', rotation_theta, '-p', rotation_phi, '-r', rotation_radius, '-y', rotation_invertYAxis, '-l', label_visibility];
	    logger.info(cmd_options);
	    var cmd_process = child_process.spawn(mtx_to_gif_script, cmd_options);
	    var cmd_process_completed = true;
	    cmd_process.stdout.on('data', function(output) {
		    logger.info(output.toString('utf8'));
		});
	    cmd_process.stderr.on('data', function(err) {
		    logger.error(err.toString('utf8'));
		});
	    cmd_process.on('close', function() {
		    if (cmd_process_completed) {
			logger.info('mtx-to-gif conversion finished');
			var scp_options = {
			    file: gif_fn,
			    user: CLIENT_USERNAME,
			    host: CLIENT_HOST,
			    port: CLIENT_PORT,
			    path: CLIENT_DEST_PATH + '/gifs/' + path.basename(gif_fn),
			    privateKey: SERVICE_PRIVATE_KEY
			}
			logger.info(scp_options);
			ssh.connect({
			    host     : scp_options['host'],
			    username : scp_options['user'],
			    privateKey: scp_options['privateKey']
			}).then(function() {
				ssh.put(gif_fn, scp_options['path']).then(function() {
					logger.info('scp succeeded');
					var email = {
					    from: 'areynolds@altiusinstitute.org',
					    to: query.email,
					    subject: 'Cubemaker - Animated GIF ready to download',
					    text: 'Please visit https://tools.stamlab.org/cubemaker/?gif=' + query.id + ' to download the GIF file.'
					};
					mailer.sendMail(email, function(error, info) {
						if (error) {
						    logger.error(error);
						    res.sendStatus(400);
						}
						else {
						    logger.info('message sent: ' + JSON.stringify(info));
						    res.sendStatus(200);
						}
					    });
				    },
				    function(error) {
					logger.error("ssh failed");
					res.sendStatus(400);
				    });
			    })
		    }
		    else {
			res.sendStatus(400);
		    }
		});
        }
    }
});

logger.info("env", process.env);

var https_port = normalize_port(process.env.PORT || 443);
https_app.set('port', https_port);

var https_server = https.createServer(https_options, https_app);

logger.info("Listening on port " + https_app.get('port'));

https_server.listen(https_port);
