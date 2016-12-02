// jshint esnext: true

var promisify = function(fn) {
  'use strict';

  return function() {
    var args = Array.prototype.slice.call(arguments);

    return new Promise(function(resolve, reject) {
      args.push(function(err, res) {
        if (err) {
          return reject(err);
        }

        resolve(res);
      });

      fn.apply(null, args);
    });
  };
};

var http = require('http');
var co = require('co');
var superagent = require('superagent');
var path = require('path');
var mkdirp = promisify(require('mkdirp'));
var writeFile = promisify(require('fs').writeFile);
var readFile = promisify(require('fs').readFile);

var upstreamUrl = 'https://packagist.org';

var write = function *(code, res) {
  'use strict';
  var cacheFile = path.join('cache', code);
  yield mkdirp(path.dirname(cacheFile));
  yield writeFile(cacheFile, res.text);
};

var read = function *(code) {
  'use strict';
  try {
    var cacheFile = path.join('cache', code);
    return yield readFile(cacheFile);
  } catch(e) {
  }
};

var app = http.createServer(function(request, response) {
  'use strict';

  co(function *() {
    console.log(request.method, request.url);

    try {
      var text = yield* read(request.url);
      if (text) {
        response.end(text);
      } else if (request.url === '/downloads/') {
        var req = superagent
          .post(upstreamUrl + request.url);
        request.pipe(req);
        response.end();
      } else {
        var res = yield new Promise(function(resolve, reject) {
          superagent
            .get(upstreamUrl + request.url)
            .end(function(err, res) {
              if (err) {
                return reject(err);
              }
              resolve(res);
            });
        });

        yield* write(request.url, res);

        response.end(res.text);
      }
    } catch(e) {
      response.writeHead(500);
      response.end(JSON.stringify(err));
    }
  });
});

app.listen(4000);