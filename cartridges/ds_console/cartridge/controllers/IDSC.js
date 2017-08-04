'use strict';

var Transaction = require('dw/system/Transaction');

/* extra variables */

/**
 * Main function which will perform the executing custom code.
 */
function show() {
	
	/**
	 * Don't allow to run this code on Production!
	 */
	if (dw.system.System.PRODUCTION_SYSTEM == dw.system.System.instanceType || (request.httpMethod.toLowerCase() == 'post' && !dw.web.CSRFProtection.validateRequest())) {
		response.redirect(dw.web.URLUtils.https('Home-Show'));
		return response;
	}
	
	// get the basket
	var basket = null;
	try {
		let _basket = dw.system.Pipelet('GetBasket').execute({
			Create: false
		});
		if (!empty(_basket) && _basket.result == PIPELET_NEXT) {
			basket = _basket.Basket;
		}
	} catch (e) {
		//this.customError.push(e.message);
	}
	
	Transaction.begin();
	var console = new (require('~/cartridge/scripts/utils/Console.ds'))(basket);
	if (!empty(console.customError)) {
		Transaction.rollback();
	} else {
		Transaction.commit();
	}
	
	dw.template.ISML.renderTemplate('console_c', {
		CustomCode: console.customCode,
		Result: console.output,
		CustomError: console.customError,
		ContinueURL: dw.web.URLUtils.https('IDSC-Show')
	});
}
show.public = true;

/* Web exposed methods */

/** Renders the IDSC start node.
 * @see {@link module:controllers/IDSC~show} */
exports.Show = show;