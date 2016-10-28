# express-request-logs

Configurable Express middleware for logging HTTP requests using Winston backend.

## Installation

	$ npm install express-request-logs

## Example

### Simple usage

	const express = require('express'),
		winston = require('winston'),
		requestLogger = require('express-request-logs');
	
	const winstonLogger = new (winston.Logger)(
			transports: [new (winston.transports.Console)()]
		);
		
	const app = express();
    
    app.use(requestLogger.create(winstonLogger));

This will produce logs similar to:

	info: HTTP remoteIP=127.0.0.1, status=200, method=GET, responseTime=12ms, url=/, userAgent=Chrome 54.0.2840 / Mac OS X 10.11.6
	
### Custom format and plugins example

	app.use(requestLogger.create(winstonLogger, {
		plugins: {
			user: ({req, res, startTime}) => req.user ? req.user.name : null
		},
		format: ({user, remoteIP, method, url, responseTime}) =>
			`HTTP ${user ? user + '@' : ''}${remoteIP} ${method} ${url} took=${responseTime}`
	}));

This will produce logs similar to:

	info: HTTP karol@127.0.0.1 GET / took=11ms

## API

	requestLogger.create(winstonLogger, options);

Where options are one of:

* format - *function(object.<string, string>)|array* - A function which will transform fields provided by plugins into a log string. When called with array it will enable given fields.

	```
	options.format = function(fields) { return 'ip=' + fields['ip']; };
	options.format = ['remoteIP', 'status', 'method', 'responseTime', 'url'];
	```

* plugins - *object.<string, function({req: object, res: object, startDate: Date})>* - User defined plugins

	```
	options.plugins = {
		user: function(env) {
			return env.req.user ? env.req.user.name : null;
		}
	}
	```

* severity - *function({req: object, res: object, startDate: Date})* - Enables user to customize Winston logging severity based on request environment

	```
	options.severity = function(env) {
		if (res.statusCode < 400)
			return 'info';
	
		if (res.statusCode < 500)
			return 'warn';
	
		return 'error';
	}
	```

## Shipped plugins

* remoteIP - client IP address

* status - HTTP status

* method - request HTTP method

* responseTime - time consumed while processing request

* url - request url (with query params)

* userAgent - user agent information

## Author

Karol Maciaszek <karol@maciaszek.pl>

## License

(The MIT License)

Copyright (c) 2016 Karol Maciaszek <karol@maciaszek.pl>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
