/**
 * @module object
 */

/**
 * Deep copies all all object properties from source to target
 *
 * @param {object} target The target object which should be extended
 * @param {object} source The object for extension
 * @returns {object}
 */
exports.extend = function (target, source) {
    var cSource;
    if (!target) {
        return source;
    }

    for (var i = 1; i < arguments.length; i++) {
        cSource = arguments[i];
        for (var prop in cSource) {
            // recurse for non-API objects
            if (cSource[prop] && (typeof cSource[prop] === 'object') && !cSource[prop].class) {
                target[prop] = this.extend(target[prop], cSource[prop]);
            } else {
                target[prop] = cSource[prop];
            }
        }
    }

    return target;
};

/**
 * Access given properties of an object recursively
 *
 * @param {object} object The object
 * @param {string} propertyString The property string, i.e. 'data.myValue.prop1'
 * @return {object} The value of the given property or undefined
 * @example
 * var prop1 = require('~/object').resolve(obj, 'data.myValue.prop1')
 * @returns {object}
 */
exports.resolve = function (object, propertyString) {
    var result = object;
    var propPath = propertyString.split('.');

    propPath.forEach(function (prop) {
        if (result && prop in result) {
            result = result[prop];
        } else {
            result = undefined;
        }
    });
    return result;
};

/**
 * Returns an array containing all object values
 *
 * @param {object} object
 * @returns {Array}
 */
exports.values = function (object) {
    return !object ? [] : Object.keys(object).map(function (key) {
        return object[key];
    });
};

/**
 * A shortcut for native static method "keys" of "Object" class
 *
 * @param {object} object
 * @returns {Array}
 */
exports.keys = function (object) {
    return object ? Object.keys(object) : [];
};

/**
 * Convert the given object to a HashMap object
 *
 * @param object {object}
 * @returns {dw.util.HashMap} all the data which will be used in mail template.
 */
exports.toHashMap = function (object) {
    var HashMap = require('dw/util/HashMap');
    var hashmap = new HashMap();
    for (var key in object) {
        if (Object.property.hasOwnProperty.call(object, key)) {
            hashmap.put(key, object[key]);
        }
    }
    return hashmap;
};

/**
 * Convert the given Map to a plain object
 *
 * @param map {dw.util.Map}
 * @returns {object} all the data which will be used in mail template.
 */
exports.fromHashMap = function (map) {
    var object = {};
    var entrySet = map.entrySet();
    for (var entry in entrySet) {
        if (Object.prototype.hasOwnProperty.call(entrySet, entry)) {
            object[entry.key] = entry.value;
        }
    }
    return object;
};
