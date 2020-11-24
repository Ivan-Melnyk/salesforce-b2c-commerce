/**
 * This is a limited collection of decorators (based on standard SGJC guard.js) for functions which performs several security checks.
 * They can be combined with each other to configure the necessary constraints for a function that is exposed to the Internet.
 *
 * @module guard
 *
 * @example
 * <caption>Example of an Console controller</caption>
 * function show() {
 *     // shows script editor page
 * }
 *
 * // allow only GET and POST requests via HTTPS
 * exports.Show = require('~/guard').ensure(['get', 'post', 'https'], show);
 */

/**
 * Performs a protocol switch for the URL of the current request to HTTPS. Responds with a redirect to the client.
 *
 * @returns {boolean} false, if switching is not possible (for example, because its a POST request)
 */
function switchToHttps() {
    if (request.httpMethod !== 'GET') {
        // switching is not possible, send error 403 (forbidden)
        response.sendError(403);
        return false;
    }
    var url = 'https://' + request.httpHost + request.httpPath;
    if (request.httpQueryString) {
        url += '?' + request.httpQueryString;
    }
    response.redirect(url);
    return true;
}

/**
 * Exposes the given action to be accessible from the web. The action gets a property which marks it as exposed. This
 * property is checked by the platform.
 *
 * @param {Function} action action
 * @returns {Function} function
 */
function expose(action) {
    action.public = true;
    return action;
}

/**
 * This function should be used to secure public endpoints by applying a set of predefined filters.
 *
 * @param {string[]} filters The filters which need to be passed to access the page
 * @param {Function} action  The action which represents the resource to show
 * @param {object}   params  Additional parameters which are passed to all filters and the action
 * @see module:guard~Filters
 * @see module:guard
 * @returns {object} Object
 */
function ensure(filters, action, params) {
    var CSRFProtection = require('dw/web/CSRFProtection');
    var Filters = {
        // Action must be accessed via HTTPS
        https: function () { return request.isHttpSecure(); },
        // Action must be accessed via HTTP
        http: function () { return !this.https(); },
        // Action must be accessed via a GET request
        get: function () { return request.httpMethod === 'GET'; },
        // Action must be accessed via a POST request
        post: function () { return request.httpMethod === 'POST'; },
        // Action must only be accessed authenticated csutomers
        loggedIn: function () { return customer.authenticated; },
        // Action must only be used as remote include
        include: function () {
            // the main request will be something like kjhNd1UlX_80AgAK-0-00, all includes
            // have incremented trailing counters
            return request.httpHeaders['x-is-requestid'].indexOf('-0-00') === -1;
        },
        csrf: function () {
            return CSRFProtection.validateRequest();
        }
    };
    return expose(function (args) {
        var error;
        var filtersPassed = true;
        var errors = [];
        params = require('~/cartridge/scripts/object').extend(params, args);
        for (var i = 0; i < filters.length; i++) {
            filtersPassed = Filters[filters[i]].apply(Filters);
            if (filtersPassed && filters.length === 1 && filters[0] === 'https') {
                filtersPassed = (Filters.get.apply(Filters) || Filters.post.apply(Filters));
            }
            if (!filtersPassed) {
                errors.push(filters[i]);
                if (filters[i] === 'https') {
                    error = switchToHttps;
                }
                break;
            }
        }
        if (!error) {
            error = function () {
                throw new Error('Guard(s) ' + errors.join('|') + ' did not match the incoming request.');
            };
        }
        if (filtersPassed) {
            return action(params);
        } else {
            return error(params);
        }
    });
}

/*
 * Module exports
 */
/** @see module:guard~expose */
exports.all = expose;

/**
 * Use this method to combine different filters, typically this is used to secure methods when exporting
 * them as publicly avaiblable endpoints in controllers.
 *
 * @example
 * // allow only GET requests for the Show endpoint
 * exports.Show = require('~/guard').ensure(['get'],show);
 *
 * // allow only POST requests via HTTPS for the Find endpoint
 * exports.Find = require('~/guard').ensure(['post','https'],find);
 *
 * // allow only logged in customer via HTTPS for the Profile endpoint
 * exports.Profile = require('~/guard').ensure(['https','loggedIn'],profile);
 */
exports.ensure = ensure;
