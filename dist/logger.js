'use strict';

var colors = require('colors'),
    useragent = require('useragent');

/**
 * Shipped plugins
 * @type {object.<string, function({req, res, startDate})>}
 */
var defaultPlugins = {
	'remoteIP': function remoteIP(_ref) {
		var req = _ref.req;
		return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
	},
	'status': function status(_ref2) {
		var res = _ref2.res;

		if (res.statusCode < 400) return String(res.statusCode).green;

		if (res.statusCode < 500) return String(res.statusCode).yellow;

		return String(res.statusCode).red;
	},
	'method': function method(_ref3) {
		var req = _ref3.req;
		return req.method;
	},
	'responseTime': function responseTime(_ref4) {
		var startDate = _ref4.startDate;
		return new Date() - startDate + 'ms';
	},
	'url': function url(_ref5) {
		var req = _ref5.req;
		return req.url;
	},
	'userAgent': function userAgent(_ref6) {
		var req = _ref6.req;
		return useragent.parse(req.headers['user-agent']).toString();
	}
};

/**
 * Returns severity identifier based on response status.
 *
 * @param {object} req Express request object
 * @param {object} res Express response object
 * @returns {string}
 */
var defaultSeverity = function defaultSeverity(_ref7) {
	var req = _ref7.req,
	    res = _ref7.res;

	if (res.statusCode < 400) return 'info';

	if (res.statusCode < 500) return 'warn';

	return 'error';
};

/**
 * Returns log line consisting of all available fields and prefixed with 'HTTP'
 *
 * @param {object.<string, string>} fields Computed fields
 * @returns {string}
 */
var defaultFormat = function defaultFormat(fields) {
	return 'HTTP ' + Object.keys(fields).filter(function (key) {
		return fields[key] !== null;
	}).map(function (key) {
		return key + '=' + fields[key];
	}).join(', ');
};

/**
 * Default configuration
 * @type {{format: defaultFormat, severity: defaultSeverity, plugins: {}}}
 */
var defaultConfig = {
	format: defaultFormat,
	severity: defaultSeverity,
	plugins: {}
};

/**
 * Creates Express Request logging middleware.
 *
 * @param {object} winston Configured Winston instance
 * @param {function(object.<string, string>)|array} format Custom formatting function
 * @param {object.<string, function>} plugins USer defined plugins
 * @param {function(object, object):string} severity Returns severity label based on request and response objects
 * @returns {function}
 */
var create = function create(winston) {
	var _ref8 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultConfig,
	    _ref8$format = _ref8.format,
	    format = _ref8$format === undefined ? defaultFormat : _ref8$format,
	    _ref8$plugins = _ref8.plugins,
	    plugins = _ref8$plugins === undefined ? {} : _ref8$plugins,
	    _ref8$severity = _ref8.severity,
	    severity = _ref8$severity === undefined ? defaultSeverity : _ref8$severity;

	// merge default plugins with those defined by user
	plugins = Object.keys(defaultPlugins).reduce(function (plugins, key) {
		plugins[key] = defaultPlugins[key];
		return plugins;
	}, plugins);

	// convert format to function with specified fields enabled
	if (Array.isArray(format)) {
		(function () {
			var enabledFields = format;

			format = function format(fields) {
				return 'HTTP ' + enabledFields.filter(function (key) {
					return fields[key] !== null;
				}).map(function (key) {
					return key + '=' + fields[key];
				}).join(', ');
			};
		})();
	}

	// middleware function
	return function (req, res, next) {
		var resEnd = res.end,
		    startDate = new Date();

		// proxy response end method in order to run logger
		// code at the end of processing request
		res.end = function (chunk, encoding) {
			// run original response ending function
			resEnd.call(res, chunk, encoding);

			// request environment
			var env = { req: req, res: res, startDate: startDate };

			// compute fields values
			var fields = Object.keys(plugins).reduce(function (fields, key) {
				fields[key] = plugins[key](env);
				return fields;
			}, {});

			// push log line to winston
			winston.log(severity(env), format(fields));
		};

		// continue request processing
		next();
	};
};

// api
module.exports = { create: create };