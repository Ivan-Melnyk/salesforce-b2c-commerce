var server = require('server');

/**
 * Main function which will perform the executing custom code.
 */
server.use('Show', function (req, res, next) {
    var System = require('dw/system/System');
    var CSRFProtection = require('dw/web/CSRFProtection');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var console = require('*/cartridge/scripts/console');
    // Don't allow to run this code on Production!
    if (
        (System.instanceType === System.PRODUCTION_SYSTEM)
        || (!(req.httpMethod === 'POST') && !(req.httpMethod === 'GET'))
        || (req.httpMethod === 'POST' && !CSRFProtection.validateRequest())
        || !req.https
    ) {
        res.redirect(URLUtils.https('Home-Show'));
    } else {
        var consoleForm = server.forms.getForm('console');
        var consoleCode = (consoleForm.code.value || '');
        Transaction.begin();
        var consoleResult = console.execute(consoleCode);
        if (consoleResult.error) {
            Transaction.rollback();
        } else {
            Transaction.commit();
        }
        res.render('console', {
            consoleResult: consoleResult,
            consoleForm: consoleForm.base,
            tokenName: CSRFProtection.getTokenName(),
            tokenValue: CSRFProtection.generateToken(),
            continueUrl: URLUtils.httpsContinue().toString()
        });
    }
    next();
});

module.exports = server.exports();
