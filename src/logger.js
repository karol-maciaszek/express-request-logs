const colors = require('colors'),
	useragent = require('useragent');

/**
 * Shipped plugins
 * @type {object.<string, function({req, res, startDate})>}
 */
const defaultPlugins = {
	'remoteIP': ({req}) => req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress,
	'status': ({res}) => {
		if (res.statusCode < 400)
			return String(res.statusCode).green;

		if (res.statusCode < 500)
			return String(res.statusCode).yellow;

		return String(res.statusCode).red;
	},
	'method': ({req}) => req.method,
	'responseTime': ({startDate}) => `${new Date() - startDate}ms`,
	'url': ({req}) => req.url,
	'userAgent': ({req}) => useragent.parse(req.headers['user-agent']).toString()
};

/**
 * Returns severity identifier based on response status.
 *
 * @param {object} req Express request object
 * @param {object} res Express response object
 * @returns {string}
 */
const defaultSeverity = function({req, res}) {
	if (res.statusCode < 400)
		return 'info';

	if (res.statusCode < 500)
		return 'warn';

	return 'error';
};

/**
 * Returns log line consisting of all available fields and prefixed with 'HTTP'
 *
 * @param {object.<string, string>} fields Computed fields
 * @returns {string}
 */
const defaultFormat = function(fields) {
	return 'HTTP ' + Object.keys(fields)
			.filter(key => fields[key] !== null)
			.map((key) => `${key}=${fields[key]}`)
			.join(', ');
};

/**
 * Default configuration
 * @type {{format: defaultFormat, severity: defaultSeverity, plugins: {}}}
 */
const defaultConfig = {
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
const create = function(winston, {format=defaultFormat, plugins={}, severity=defaultSeverity}=defaultConfig) {
	// merge default plugins with those defined by user
	plugins = Object.keys(defaultPlugins)
		.reduce((plugins, key) => {
			plugins[key] = defaultPlugins[key];
			return plugins;
		}, plugins);

	// convert format to function with specified fields enabled
	if (Array.isArray(format)) {
		const enabledFields = format;

		format = function(fields) {
			return 'HTTP ' + enabledFields.filter(key => fields[key] !== null)
					.map((key) => `${key}=${fields[key]}`)
					.join(', ');
		};
	}

	// middleware function
	return function(req, res, next) {
		const resEnd = res.end,
			startDate = new Date();

		// proxy response end method in order to run logger
		// code at the end of processing request
		res.end = function(chunk, encoding) {
			// run original response ending function
			resEnd.call(res, chunk, encoding);

			// request environment
			const env = {req, res, startDate};

			// compute fields values
			const fields = Object.keys(plugins)
				.reduce((fields, key) => {
					fields[key] = plugins[key](env);
					return fields;
				}, {});

			// push log line to winston
			winston.log(
				severity(env),
				format(fields)
			);
		};

		// continue request processing
		next();
	};
};

// api
module.exports = {create};
