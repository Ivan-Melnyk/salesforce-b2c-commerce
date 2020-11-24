var guard = require('~/cartridge/scripts/guard');

/**
 * Main function which will perform the executing custom code.
 */
function show() {
    var Transaction = require('dw/system/Transaction');
    var System = require('dw/system/System');
    var CSRFProtection = require('dw/web/CSRFProtection');
    var URLUtils = require('dw/web/URLUtils');
    var ISML = require('dw/template/ISML');
    var console = require('*/cartridge/scripts/console');

    // Don't allow to run this code on Production!
    if (
        (System.instanceType === System.PRODUCTION_SYSTEM)
        || (request.httpMethod === 'POST' && !CSRFProtection.validateRequest())
    ) {
        response.redirect(URLUtils.https('Home-Show'));
    } else {
        var consoleCode = (session.forms.console.code.getValue() || '');
        Transaction.begin();
        var consoleResult = console.execute(consoleCode);
        if (consoleResult.error) {
            Transaction.rollback();
        } else {
            Transaction.commit();
        }
        ISML.renderTemplate('console', {
            consoleResult: consoleResult,
            consoleForm: session.forms.console,
            tokenName: CSRFProtection.getTokenName(),
            tokenValue: CSRFProtection.generateToken(),
            continueUrl: URLUtils.httpsContinue().toString()
        });
    }
}

exports.Show = guard.ensure(['https'], show);
