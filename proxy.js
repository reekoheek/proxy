var http = require('http'),
    https = require('https'),
    net = require('net'),
    url = require('url'),
    fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Create an HTTP tunneling proxy
var proxy = http.createServer(function (req, res) {
    console.log('HTTP', req.method, req.url);

    var chunks = [];
    req.on('data', function(chunk) {
        chunks.push(chunk);
    });

    req.on('end', function() {
        req.body = Buffer.concat(chunks);

        var parsed = url.parse(req.url);

        var options = {
            // host: parsed.host,
            hostname: parsed.hostname,
            port: parsed.port || 80,
            method: req.method,
            path: parsed.path,
            headers: req.headers
            // localAddress: null,
            // socketPath: null,
            // auth: null,
            // agent: null,
        };

        var cReq = http.request(options, function(cRes) {

            var headers = {};
            for(var i in cRes.headers) {
                if (i === 'content-length') continue;
                headers[i] = cRes.headers[i];
            }

            res.writeHead(cRes.statusCode, headers);

            var chunks = [];
            cRes.on('data', function(chunk) {
                chunks.push(chunk);

                res.write(chunk);
            });

            cRes.on('end', function() {
                cRes.body = Buffer.concat(chunks);
                // console.log(cRes.body + '');

                res.end();
            });
        });

        // cReq.on('error', function(e) {
        //     console.log('E', arguments);
        // });

        if (req.method === 'POST') {
            cReq.write(req.body);
        }

        cReq.end();
    });
});

proxy.on('connect', function(req, clientSocket, head) {
    console.log('CONNECT', req.url);

    var parsedUrl = url.parse('http://' + req.url);
    // console.log(parsedUrl);
    var srvSocket = net.connect(parsedUrl.port, parsedUrl.hostname, function() {
    // var srvSocket = net.connect(3001, 'localhost', function() {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
            'Proxy-agent: reekoheek-proxy\r\n' +
            '\r\n');


        srvSocket.write(head);
        srvSocket.pipe(clientSocket);
        clientSocket.pipe(srvSocket);
    });
});

// now that proxy is running
proxy.listen(3000);

var options = {
    key: fs.readFileSync('cert/server.key'),
    cert: fs.readFileSync('cert/server.crt')
};
var server = https.createServer(options, function(req, res) {
    console.log('HTTPS', req.method, req.url);
    // console.log(req.headers);

    var chunks = [];
    req.on('data', function(chunk) {
        chunks.push(chunk);
    });

    req.on('end', function() {
        req.body = Buffer.concat(chunks);

        var parsed = url.parse(req.url);

        var options = {
            // host: req.headers.host,
            hostname: req.headers.host,
            // port: 443,
            method: req.method,
            path: parsed.path,
            headers: req.headers
            // localAddress: null,
            // socketPath: null,
            // auth: null,
            // agent: null,
        };

        var cReq = https.request(options, function(cRes) {

            res.writeHead(cRes.statusCode, cRes.headers);

            var chunks = [];
            cRes.on('data', function(chunk) {
                chunks.push(chunk);

                res.write(chunk);
            });

            cRes.on('end', function() {
                cRes.body = Buffer.concat(chunks);

                res.end();
            });
        });

        // cReq.on('error', function(e) {
        //     console.log('E', arguments);
        // });

        if (req.method === 'POST') {
            cReq.write(req.body);
        }

        cReq.end();
    });
});

server.listen(3001);