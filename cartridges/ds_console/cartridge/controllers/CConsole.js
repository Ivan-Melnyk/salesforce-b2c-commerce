var guard = require('~/cartridge/scripts/guard');

/**
 * Main function which will perform the executing custom code.
 */
function show() {
    var System = require('dw/system/System');
    var URLUtils = require('dw/web/URLUtils');
    var ISML = require('dw/template/ISML');
    var csrf = require('dw/web/CSRFProtection');
    // Don't allow to run this code on Production!
    if ((System.instanceType === System.PRODUCTION_SYSTEM)) {
        response.redirect(URLUtils.https('Home-Show'));
    } else {
        var Resource = require('dw/web/Resource');
        ISML.renderTemplate('console', {
            title: Resource.msg('title.jscc', 'console', null),
            consoleForm: session.forms.console,
            executeUrl: URLUtils.https('CConsole-Execute').toString(),
            csrf: { tokenName: csrf.tokenName, token: csrf.generateToken() }
        });
    }
}

function execute() {
    var System = require('dw/system/System');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var console = require('*/cartridge/scripts/console');
    var consoleForm;
    var consoleCode;
    var consoleResult;

    if ((System.instanceType === System.PRODUCTION_SYSTEM)) {
        response.redirect(URLUtils.https('Home-Show'));
    } else {
        consoleForm = session.forms.console;
        consoleCode = (consoleForm.code.htmlValue || '');
        Transaction.begin();
        consoleResult = console.execute(consoleCode);
        if (consoleResult.error) {
            Transaction.rollback();
        } else {
            Transaction.commit();
        }
        response.setContentType('application/json');
        response.getWriter().print(JSON.stringify({
            success: true,
            consoleResult: consoleResult
        }));
    }
}

exports.Show = guard.ensure(['https'], show);
exports.Execute = guard.ensure(['https', 'post'], execute);
