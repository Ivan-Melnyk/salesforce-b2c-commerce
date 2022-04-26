/* eslint no-underscore-dangle: 0, no-new-func: 0 */

module.exports = {
    /**
     * @description Output string
     */
    _output: '',

    // _sfccTypes: {
    //     'dw.util.Collection': {
    //         type: dw.util.Collection,
    //         display: 'dw.util.Collection',
    //         show: function (value) { return '[' + value.length + ']'; }
    //     },
    //     'dw.value.Money': { type: dw.value.Money, display: 'dw.value.Money', show: function (value) { return value; } },
    //     'dw.catalog.Product': { type: dw.catalog.Product, display: 'dw.catalog.Product' },
    //     'dw.order.Order': { type: dw.order.Order, display: 'dw.order.Order' },
    //     Date: { type: Date, display: 'Date', show: function (value) { return value.toString(); } }
    // },

    _template: {
        error: ('<b><span style="color:#f00;">{{key}}</span> : '
        + '<span style="color:#f00;">ERROR</span> = '
        + '<span style="color:#f00;">{{value}}</span></b>'),
        sfccType: '{{key}} ({{type}}): {{{value}}}',
        type: '{{key}} ({{type}}): {{value}}',
        value: '{{type}}: {{value}}',
        null: 'object: null',
        boolean: 'boolean: {{boolean}}'
    },

    _trace: function (dumpVar) {
        if (module.exports._output && module.exports._output.length > 1) {
            module.exports._output += '\n';
        }
        module.exports._output += ('"' + String(dumpVar).replace(/"/g, '&quot;') + '"');
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
            // Object.keys(module.exports._sfccTypes).forEach(function (di) {
            //     if (value instanceof module.exports._sfccTypes[di].type) {
            //         sfccType = module.exports._sfccTypes[di];
            //     }
            // });
            // if (sfccType) {
            //     out += module.exports._template.sfccType
            //         .replace('{{key}}', key)
            //         .replace('{{type}}', sfccType.display)
            //         .replace('{{value}}', ('show' in sfccType ? (sfccType.show(value) + ' ') : ''));
            //     return;
            // }
            out += module.exports._template.value
                .replace('{{type}}', '  ' + key)
                .replace('{{value}}', function () {
                    var _return = (['string', 'function'].indexOf(typeof value) >= 0 ? '"' : '');
                    if (value === null) {
                        _return += 'null';
                    } else {
                        _return += String(value);
                    }
                    _return += (['string', 'function'].indexOf(typeof value) >= 0 ? '"' : '');
                    return _return;
                });
        });
        if (out.length > 1) {
            out = ('\n' + out + '\n');
        }
        return out;
    },

    /**
     * @description Performs variable dump
     * @param {object} dumpVar can be anything, the variable which should be printed
     */
    _debug: function (dumpVar) {
        if (module.exports._output && module.exports._output.length > 1) {
            module.exports._output += '\n';
        }
        // if it's null
        if (dumpVar === null) {
            module.exports._output += module.exports._template.null;
        // if its' boolean
        } else if (typeof dumpVar === 'boolean') {
            module.exports._output += module.exports._template.boolean
                .replace('{{boolean}}', String(dumpVar));
        // if it's not an object
        } else if (!dumpVar || typeof dumpVar !== 'object') {
            module.exports._output += module.exports._template.value
                .replace('{{type}}', (typeof dumpVar))
                .replace('{{value}}', function () {
                    return (['string', 'function'].indexOf(typeof dumpVar) >= 0 ? '"' : '')
                        + String(dumpVar)
                        + (['string', 'function'].indexOf(typeof dumpVar) >= 0 ? '"' : '');
                });
        } else {
            module.exports._output += module.exports._template.value
                .replace('{{type}}', (typeof dumpVar))
                .replace('{{value}}', '{' + module.exports._print(dumpVar) + '}');
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
