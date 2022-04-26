var server = require('server');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var System = require('dw/system/System');
var URLUtils = require('dw/web/URLUtils');

/**
 * Main function which will perform the executing custom code.
 */
server.get(
    'Show',
    server.middleware.https,
    csrfProtection.generateToken,
    function (req, res, next) {
        // Don't allow to run this code on Production!
        if ((System.instanceType === System.PRODUCTION_SYSTEM)) {
            res.redirect(URLUtils.https('Home-Show'));
        } else {
            var Resource = require('dw/web/Resource');
            var consoleForm = server.forms.getForm('console');
            res.render('console', {
                title: Resource.msg('title.sfra', 'console', null),
                consoleForm: consoleForm.base,
                executeUrl: URLUtils.https('Console-Execute').toString()
            });
        }
        next();
    }
);

server.post(
    'Execute',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var Transaction = require('dw/system/Transaction');
        var console = require('*/cartridge/scripts/console');
        if ((System.instanceType === System.PRODUCTION_SYSTEM)) {
            res.redirect(URLUtils.https('Home-Show'));
        } else {
            var consoleForm = server.forms.getForm('console');
            var consoleCode = (consoleForm.code.htmlValue || '');
            Transaction.begin();
            var consoleResult = console.execute(consoleCode);
            if (consoleResult.error) {
                Transaction.rollback();
            } else {
                Transaction.commit();
            }
            res.json({
                success: true,
                consoleResult: consoleResult
            });
        }
        next();
    }
);

module.exports = server.exports();
