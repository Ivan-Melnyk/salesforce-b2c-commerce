/* eslint no-underscore-dangle: 0, no-new-func: 0 */

module.exports = {
    /**
     * @description Output string
     */
    _output: '',

    _sfccTypes: {
        'dw.util.Collection': {
            type: dw.util.Collection,
            display: 'dw.util.Collection',
            show: function (value) { return '[' + value.length + ']'; }
        },
        'dw.value.Money': { type: dw.value.Money, display: 'dw.value.Money', show: function (value) { return value; } },
        'dw.catalog.Product': { type: dw.catalog.Product, display: 'dw.catalog.Product' },
        'dw.order.Order': { type: dw.order.Order, display: 'dw.order.Order' },
        Date: { type: Date, display: 'Date', show: function (value) { return value.toString(); } }
    },

    _template: {
        error: ('<b><span style="color:#f00;">{{key}}</span> : '
        + '<span style="color:#f00;">ERROR</span> = '
        + '<span style="color:#f00;">{{value}}</span></b>'),
        sfccType: ('<span style="color:#800;">{{key}}</span> : '
        + '<span style="color:#050;">{{type}}</span> { {{value}}}'),
        type: ('<span style="color:#666;">{{key}}</span> : '
        + '<span style="color:#0A0;">{{type}}</span> = '
        + '<span style="color:#00A;">{{value}}</span>')
    },

    _trace: function (dumpVar) {
        if (module.exports._output && module.exports._output.length > 1) {
            module.exports._output += '\n';
        }
        module.exports._output += String(dumpVar);
    },

    /**
     * @description This helper iterates the properties of the given object and prints it out
     * @param {object} printVar can be anything, the object which should be displayed
     * @returns {string} printed output
     */
    _print: function (printVar) {
        var out = '';
        Object.keys(printVar).forEach(function (key) {
            var value = null;
            var error = false;
            var sfccType;
            try {
                value = printVar[key];
            } catch (e) {
                error = true;
                value = e.message;
            }
            if (out && out.length > 1) {
                out += '\n';
            }
            if (error) {
                out += module.exports._template.error.replace('{{key}}', key).replace('{{value}}', value);
                return;
            }
            if (typeof value === 'function') {
                out += module.exports._template.sfccType
                    .replace('{{key}}', key)
                    .replace('{{type}}', 'function')
                    .replace('{{value}}', '');
                return;
            }
            Object.keys(module.exports._sfccTypes).forEach(function (di) {
                if (value instanceof module.exports._sfccTypes[di].type) {
                    sfccType = module.exports._sfccTypes[di];
                }
            });
            if (sfccType) {
                out += module.exports._template.sfccType
                    .replace('{{key}}', key)
                    .replace('{{type}}', sfccType.display)
                    .replace('{{value}}', ('show' in sfccType ? (sfccType.show(value) + ' ') : ''));
                return;
            }
            out += module.exports._template.type
                .replace('{{key}}', key)
                .replace('{{type}}', (typeof value))
                .replace('{{value}}', (value === null ? 'null' : typeof value));
        });
        return out;
    },

    /**
     * @description Performs variable dump
     * @param {object} dumpVar can be anything, the variable which should be printed
     */
    _debug: function (dumpVar) {
        if (module.exports._output && module.exports._output.length > 1) {
            module.exports._output += '\n\n';
        }
        // if it's not an object
        if (!dumpVar || typeof dumpVar !== 'object') {
            module.exports._output += '<span style="color:#0C0;">';
            module.exports._output += (dumpVar === null ? 'null' : (typeof dumpVar));
            module.exports._output += '</span>: ' + String(dumpVar);
        } else {
            module.exports._output += module.exports._print(dumpVar);
        }
    },

    /**
     * @description Transforms input console code and executes in fully custom scope,
     * so no local variables (within execute function) are available,
     * and in try catch block for better error tracing.
     * @param {string} consoleCode input console code
     * @returns {object} result object with 2 properties: output, error
     */
    execute: function (consoleCode) {
        var code = consoleCode
            .replace(/eval[\s]{0,}\(/g, 'new Function(')
            .replace(/(out\.print|print|console.log|trace)[\s]{0,}\(/g, 'module.exports._trace(')
            .replace(/debug[\s]{0,}\(/g, 'module.exports._debug(');
        var result = {
            output: '',
            error: ''
        };
        try {
            (new Function(code)).call(this);
            result.output = this._output;
        } catch (error) {
            result.error = [];
            Object.keys(error).forEach(function (key) {
                result.error.push([key, error[key]].join(': '));
            });
            result.error = result.error.join('\n');
        }
        return result;
    }
};
