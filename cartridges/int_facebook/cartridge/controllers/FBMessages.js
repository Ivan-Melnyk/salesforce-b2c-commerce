'use strict';

/* API includes */
var HTTPClient	= require("dw/net/HTTPClient");
var StringUtils	= require("dw/util/StringUtils");
var Calendar	= require("dw/util/Calendar");
var URLUtils	= require("dw/web/URLUtils");

var logger = require("dw/system/Logger").getLogger("FACEBOOK_MESSAGES","facebook_messages");

/* Script Modules */
var app = require('/app_storefront_controllers/cartridge/scripts/app');
var guard = require('/app_storefront_controllers/cartridge/scripts/guard');

// configs from facebook application page
var VERIFY_TOKEN = "VERIFY_TOKEN";
var ACCESS_TOKEN = "ACCESS_TOKEN";
var API_VERSION = "2.8";
var APP_ID = "APP_ID";
var APP_SECRET = "APP_SECRET";
var PAGE_ID = "PAGE_ID";
var SEND_API_VERSION = "2.6";
var SEND_API_URL = "https://graph.facebook.com/v2.6/me/messages?access_token=";

function webhook () {
	try {
		var params = request.httpParameterMap;
		
		// log the request input
		logger.debug("Request Details: {0}", _getRequestDetails());
		
		// process normal messaging events
		if (request.httpHeaders['x-is-request_method'] == "POST") {
			return processEvent();
		}
		
		// check for authorize
		if (params.isParameterSubmitted("authorize")) {
			return processAuthorize();
		}
		
		// check the test request from Facebook
		var writer = response.getWriter();
		if (params.isParameterSubmitted("hub.verify_token") && !empty(params['hub.verify_token'].stringValue) && params['hub.verify_token'].stringValue == VERIFY_TOKEN) {
			writer.print(params['hub.challenge'].stringValue);
		} else {
			response.setStatus(403);
			writer.print('Failed validation. Make sure the validation tokens match.');
		}
	} catch (e) {
		var message = ["\r\nFBMessages.js.Error: " + e.message, 'fileName: ' + e.fileName, 'lineNumber: ' + e.lineNumber].join("\r\n\t ")
		logger.fatal(message);
		response.getWriter().print('Error, something goes wrong! Details: '+message);
	}
}

function _getRequestDetails () {
	var _details = "\r\n################### HEADERS/PARAMETERS ###################";
	
	// httpHeaders
	var _headers = request.httpHeaders;
	_details += "\r\nrequest_method : "+_headers['x-is-request_method'];
	_details += "\r\naccept : "+_headers['accept'];
	if (_headers['x-is-request_method'] == "POST") {
		_details += "\r\ncontent-type : "+_headers['content-type'];
		_details += "\r\ncontent-length : "+_headers['content-length'];
	}
	
	var params = request.httpParameterMap;
	for each (let _param in params.getParameterNames().toArray()) {
		_details += "\r\n"+_param+" : "+params[_param].value;
	}
	if (request.httpHeaders['x-is-request_method'] == 'POST') {
		_details += "\r\nbody : "+params.getRequestBodyAsString();
	}
	
	_details += "\r\n################# END HEADERS/PARAMETERS #################";
	return _details;
}

function processEvent () {
	var data = JSON.parse(request.httpParameterMap.getRequestBodyAsString());
	
	// Make sure this is a page subscription
	if (data.object != 'page') return;
	
	// Iterate over each entry
	// There may be multiple if batched
	for each (let pageEntry in data.entry) {
		let pageID = pageEntry.id;
		let timeOfEvent = pageEntry.time;
		
		// Iterate over each messaging event
		for each (let messagingEvent in pageEntry.messaging) {
			if ('message' in messagingEvent) {
				// received Message
				receivedMessage(messagingEvent);
			} else if ('read' in messagingEvent) {
				// received Read
				receivedMessageRead(messagingEvent);
			} else if ('optin' in messagingEvent) {
				// received Authentication
				receivedAuthentication(messagingEvent);
			} else if ('delivery' in messagingEvent) {
				// received Delivery
				receivedDeliveryConfirmation(messagingEvent);
			} else if ('postback' in messagingEvent) {
				// received Postback
				receivedPostback(messagingEvent);
			} else if ('account_linking' in messagingEvent) {
				// received Account_linking
				receivedAccountLink(messagingEvent);
			} else {
				logger.debug("Webhook received unknown messagingEvent: {0}", messagingEvent);
			}
		}
	}
}

/*
 * This path is used for account linking. The account linking call-to-action
 * (sendAccountLinking) is pointed to this URL. 
 * 
 */
function processAuthorize () {
	var params = request.httpParameterMap;
	var accountLinkingToken = params['account_linking_token'].stringValue;//req.query.account_linking_token;
	var redirectURI = params['redirect_uri'].stringValue;//req.query.redirect_uri;
	
	// Authorization Code should be generated per user by the developer. This will 
	// be passed to the Account Linking callback.
	var authCode = "1234567890";
	
	// Redirect users to this URI on successful login
	var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;
	
	app.getView({
		accountLinkingToken: accountLinkingToken,
		redirectURI: redirectURI,
		redirectURISuccess: redirectURISuccess
	}).render('authorize');
	
	/*res.render('authorize', {
		accountLinkingToken: accountLinkingToken,
		redirectURI: redirectURI,
		redirectURISuccess: redirectURISuccess
	});*/
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message' 
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some 
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've 
 * created. If we receive a message with an attachment (image, video, audio), 
 * then we'll simply confirm that we've received the attachment.
 * 
 */
function receivedMessage(event) {
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	var timeOfMessage = StringUtils.formatCalendar(new Calendar(new Date(event.timestamp)), "yyyy-MM-dd H:mm:ss");
	var message = event.message;
	
	logger.debug("Received message for user {0} and page {1} at {2} with message: {3}", senderID, recipientID, timeOfMessage, JSON.stringify(message));
	
	var isEcho = message.is_echo;
	var messageId = message.mid;
	var appId = message.app_id;
	var metadata = message.metadata;
	
	// You may get a text or attachment but not both
	var messageText = message.text;
	var messageAttachments = message.attachments;
	var quickReply = message.quick_reply;
	
	if (isEcho) {
		// Just logging message echoes to console
		logger.debug("Received echo for message {0} and app {1} with metadata {2}", messageId, appId, metadata);
		return;
	} else if (quickReply) {
		let quickReplyPayload = quickReply.payload;
		logger.debug("Quick reply for message {0} with payload {1}", messageId, quickReplyPayload);
		
		let payload = null;
		try {
			payload = JSON.parse(quickReplyPayload);
		} catch (e) {}
		
		if (!empty(payload) && typeof(payload) == 'object') {
			if (!empty(continueConversation(senderID, payload))) {
				return;
			}
		} else {
			sendTextMessage(senderID, "Quick reply tapped. payloads: "+quickReplyPayload);
		}
		return;
	}
	
	if (messageText) {
		// If we receive a text message, check to see if it matches any special
		// keywords and send back the corresponding example. Otherwise, just echo
		// the text we received.
		
		let _messageText = String(messageText).toLowerCase();
		let _payload = null;
		// 
		for each (let key in ['search','find','product','looking for']) {
			if (_messageText.indexOf(key) != -1) {
				_payload = "SEARCH_PRODUCT";
				let productQuery = _messageText.replace(key, '');
				if (/[a-z0-9]{3,}/i.test(productQuery)) {
					if (!empty(continueConversation(senderID, _payload, StringUtils.trim(productQuery)))) {
						return;
					}
					break;
				}
			}
		}
		
		if (!empty(_payload) && _payload == "SEARCH_PRODUCT") {
			sendTextMessage(senderID, "Sorry, I can't find any product by your query '"+(_messageText.replace(/(search|find|product|looking\sfor)/g, ''))+"'");
			return;
		}
		
		switch (String(messageText).toLowerCase()) {
			case 'hi':
			case 'hello':
			case 'are you there?':
			case '?':
				continueConversation(senderID);
				break;
			case 'image':
				sendImageMessage(senderID);
				break;
			case 'gif':
				sendGifMessage(senderID);
				break;
			case 'audio':
				sendAudioMessage(senderID);
				break;
			case 'video':
				sendVideoMessage(senderID);
				break;
			case 'file':
				sendFileMessage(senderID);
				break;
			case 'button':
				sendButtonMessage(senderID);
				break;
			case 'generic':
				sendGenericMessage(senderID);
				break;
			case 'receipt':
				sendReceiptMessage(senderID);
				break;
			case 'quick reply':
				sendQuickReply(senderID);
				break;
			case 'read receipt':
				sendReadReceipt(senderID);
				break;
			case 'typing on':
				sendTypingOn(senderID);
				break;
			case 'typing off':
				sendTypingOff(senderID);
				break;
			case 'account linking':
				sendAccountLinking(senderID);
				break;
			default:
				sendTextMessage(senderID, messageText);
		}
	} else if (messageAttachments) {
		sendTextMessage(senderID, "Message with attachment received");
	}
}

/*
 * Send an image using the Send API.
 *
 */
function sendImageMessage(recipientId) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "image",
				payload: {
					url: URLUtils.absStatic(URLUtils.CONTEXT_LIBRARY, 'SiteGenesisSharedLibrary', '/images/homepage/car-dresses.jpg').toString()
				}
			}
		}
	};

	callSendAPI(messageData);
}

/*
 * Send a Gif using the Send API.
 *
 */
function sendGifMessage (recipientId) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "image",
				payload: {
					url: "https://p.fod4.com/p/media/b808431fbb/m8YD3waBSPCsYzvwLDcj_donald%20trump%20electrocuted.gif"
				}
			}
		}
	};
	
	callSendAPI(messageData);
}

/*
 * Send audio using the Send API.
 *
 */
function sendAudioMessage (recipientId) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "audio",
				payload: {
					url: "https://sampleswap.org/mp3/artist/5101/Peppy--The-Firing-Squad_YMXB-160.mp3"
				}
			}
		}
	};
	
	callSendAPI(messageData);
}

/*
 * Send a video using the Send API.
 *
 */
function sendVideoMessage (recipientId) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "video",
				payload: {
					url: "https://vimeo.com/78961286"
				}
			}
		}
	};
	
	callSendAPI(messageData);
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage (recipientId, messageText) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			text: messageText,
			metadata: "DEVELOPER_DEFINED_METADATA"
		}
	};
	
	callSendAPI(messageData);
}

/*
 * Send a file using the Send API.
 *
 */
function sendFileMessage (recipientId) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "file",
				payload: {
					url: "https://wordpress.org/plugins/about/readme.txt"
				}
			}
		}
	};
	
	callSendAPI(messageData);
}

/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "template",
				payload: {
					template_type: "button",
					text: "This is test text",
					buttons:[{
						type: "web_url",
						title: "Open Web URL",
						url: URLUtils.home().toString()//"https://www.oculus.com/en-us/rift/"
					}, {
						type: "postback",
						title: "Trigger Postback",
						payload: "DEVELOPER_DEFINED_PAYLOAD"
					}, {
						type: "phone_number",
						title: "Call Phone Number",
						payload: "+16505551234"
					}]
				}
			}
		}
	};

	callSendAPI(messageData);
}

/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendGenericMessage (recipientId) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "template",
				payload: {
					template_type: "generic",
					elements: [{
						title: "rift",
						subtitle: "Next-generation virtual reality",
						item_url: "https://www.oculus.com/en-us/rift/",
						image_url: "https://batinna.files.wordpress.com/2013/12/rift-game.png",
						buttons: [{
							type: "web_url",
							url: "https://www.oculus.com/en-us/rift/",
							title: "Open Web URL"
						}, {
							type: "postback",
							title: "Call Postback",
							payload: "Payload for first bubble",
						}],
					}, {
						title: "touch",
						subtitle: "Your Hands, Now in VR",
						item_url: "https://www.oculus.com/en-us/touch/",
						image_url: "https://upload.wikimedia.org/wikipedia/en/d/de/Pay_By_Touch_logo.png",
						buttons: [{
							type: "web_url",
							url: "https://www.oculus.com/en-us/touch/",
							title: "Open Web URL"
						}, {
							type: "postback",
							title: "Call Postback",
							payload: "Payload for second bubble",
						}]
					}]
				}
			}
		}
	};

	callSendAPI(messageData);
}

function sendProductRefinementsMessage (recipientId, payload) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			text: "Please select one of the values",
			quick_replies: []
		}
	};
	
	var searchModel = new dw.catalog.ProductSearchModel();
	searchModel.setOrderableProductsOnly(true);
	searchModel.setRecursiveCategorySearch(true);
	searchModel.setSearchPhrase(payload.searchPhrase);
	if ('value' in payload && !empty(payload.value)) {
		switch (payload.refinement) {
			case "categoryRefinement":
				searchModel.setCategoryID(payload.value);
				break;
			case "priceRefinement":
				
		}
		if (payload.refinement == "categoryRefinement") {
			searchModel.setCategoryID(payload.value);
		} else if (payload.refinement == "priceRefinement" && !empty(payload.valueFrom) && !empty(payload.valueTo)) {
			searchModel.setPriceMin(payload.valueFrom);
			searchModel.setPriceMax(payload.valueTo);
		} else if (payload.refinement == "attributeRefinement" && !empty(payload.attributeID)) {
			searchModel.setRefinementValues(payload.attributeID, payload.value);
		}
	}
	searchModel.search();
	
	if ('value' in payload && !empty(payload.value)) {
		if (searchModel.count > 0) {
			sendProductsMessage(recipientId, searchModel.getProductSearchHits().asList(0, 5));
		} else {
			messageData.message.text = "Sorry, we can't find any product with your parameters. Shell we go 1 step back?";
			let _payload = {"payload":"SEARCH_PRODUCT_BY","searchPhrase":payload.searchPhrase,"refinement":payload.refinement,"attributeID":payload.attributeID};
			messageData.message.quick_replies = [{
				"content_type":"text",
				"title":"Back",
				"payload":JSON.stringify(_payload)
			}];
		}
	} else {
	
		for each (let ref in searchModel.refinements.refinementDefinitions) {
			if (
				(ref.categoryRefinement && payload.refinement == "categoryRefinement")
				|| (ref.priceRefinement && payload.refinement == "priceRefinement")
				|| (ref.attributeRefinement && payload.refinement == "attributeRefinement")
			) {
				for each (let refValue in searchModel.refinements.getRefinementValues(ref)) {
					let _payload = {"payload":"SEARCH_PRODUCT_BY","searchPhrase":payload.searchPhrase,"refinement":payload.refinement,"attributeID":payload.attributeID,"value":refValue.value};
					if (payload.refinement == "priceRefinement") {
						_payload.value = {"valueFrom": refValue.valueFrom, "valueTo":refValue.valueTo, "value":refValue.value};
					}
					messageData.message.quick_replies.push({
						"content_type":"text",
						"title":refValue.displayValue+" ("+refValue.hitCount+")",
						"payload":JSON.stringify(_payload)
					});
				}
				break;
			}
		}
		
		callSendAPI(messageData);
	}
}

function sendFoundProductsMessage (recipientId, productSearchModel) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			text: ("We found "+productSearchModel.count+" products by your query '"+productSearchModel.searchPhrase+"', we can filter it by:"),
			quick_replies: []
		}
	};
	
	for each (let ref in productSearchModel.refinements.refinementDefinitions) {
		let refType = refName = refAttr = null;
		let _payload = {"payload":"SEARCH_PRODUCT_BY","searchPhrase":productSearchModel.searchPhrase,"refinement":null,"attributeID":null};
		//let foundValues = productSearchModel.refinements.getAllRefinementValues(ref).length;
		let foundValues = productSearchModel.refinements.getRefinementValues(ref).length;
		if (ref.categoryRefinement) {
			refType = "categoryRefinement";
			refName = "Category ("+foundValues+")";
		} else if (ref.priceRefinement) {
			refType = "priceRefinement";
			refName = "Price ("+foundValues+")";
		} else if (ref.attributeRefinement) {
			refType = "attributeRefinement";
			refAttr = ref.attributeID;
			refName = refAttr+" ("+foundValues+")";
		}
		_payload.refinement = refType;
		_payload.attributeID = refAttr;
		messageData.message.quick_replies.push({
			"content_type":"text",
			"title":refName,
			"payload":JSON.stringify(_payload)
		});
	}

	callSendAPI(messageData);
}

function sendProductsMessage (recipientId, productHits) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "template",
				payload: {
					template_type: "generic",
					elements: []
				}
			}
		}
	};
	
	// set the products
	for each (let productHit in productHits.toArray()) {
		let product = productHit.product;
		let element = {
			title: product.name,
			subtitle: product.shortDescription.getMarkup(),
			item_url: URLUtils.https('Product-Show', 'pid', product.ID).toString(),
			buttons: [{
				type: "web_url",
				url: URLUtils.https('Product-Show', 'pid', product.ID).toString(),
				title: "Open in eShop"
			}]
		};
		let image = product.getImage('large', 0);
		if (!empty(image) && !empty(image.httpsURL)) {
			element.image_url = image.httpsURL.toString();
		}
		messageData.message.attachment.payload.elements.push(element);
	}
	
	callSendAPI(messageData);
}

/*
 * Send a receipt message using the Send API.
 *
 */
function sendReceiptMessage (recipientId) {
	// Generate a random receipt ID as the API requires a unique ID
	var receiptId = "order" + Math.floor(Math.random()*1000);

	var messageData = {
		recipient: {
			id: recipientId
		},
		message:{
			attachment: {
				type: "template",
				payload: {
					template_type: "receipt",
					recipient_name: "Peter Chang",
					order_number: receiptId,
					currency: "USD",
					payment_method: "Visa 1234",
					timestamp: "1428444852", 
					elements: [{
						title: "Oculus Rift",
						subtitle: "Includes: headset, sensor, remote",
						quantity: 1,
						price: 599.00,
						currency: "USD",
						image_url: "https://dbvc4uanumi2d.cloudfront.net/cdn/4.5.24/wp-content/themes/oculus/img/order/dk2-product.jpg"
					}, {
						title: "Samsung Gear VR",
						subtitle: "Frost White",
						quantity: 1,
						price: 99.99,
						currency: "USD",
						image_url: "https://cdn2.pcadvisor.co.uk/cmsdata/features/3529642/Samsung-Gear-VR-release-date-3.jpg"
					}],
					address: {
						street_1: "1 Hacker Way",
						street_2: "",
						city: "Menlo Park",
						postal_code: "94025",
						state: "CA",
						country: "US"
					},
					summary: {
						subtotal: 698.99,
						shipping_cost: 20.00,
						total_tax: 57.67,
						total_cost: 626.66
					},
					adjustments: [{
						name: "New Customer Discount",
						amount: -50
					}, {
						name: "$100 Off Coupon",
						amount: -100
					}]
				}
			}
		}
	};

	callSendAPI(messageData);
}

/*
 * Send a message with Quick Reply buttons.
 *
 */
function sendQuickReply (recipientId) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			text: "What's your favorite movie genre?",
			quick_replies: [
				{
					"content_type":"text",
					"title":"Action",
					"payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
				},
				{
					"content_type":"text",
					"title":"Comedy",
					"payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
				},
				{
					"content_type":"text",
					"title":"Drama",
					"payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
				}
			]
		}
	};

	callSendAPI(messageData);
}

/*
 * Send a read receipt to indicate the message has been read
 *
 */
function sendReadReceipt (recipientId) {
	logger.debug("Sending a read receipt to mark message as seen");

	var messageData = {
		recipient: {
			id: recipientId
		},
		sender_action: "mark_seen"
	};

	callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn (recipientId) {
	logger.debug("Turning typing indicator on");

	var messageData = {
		recipient: {
			id: recipientId
		},
		sender_action: "typing_on"
	};

	callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff (recipientId) {
	logger.debug("Turning typing indicator off");

	var messageData = {
		recipient: {
			id: recipientId
		},
		sender_action: "typing_off"
	};

	callSendAPI(messageData);
}

/*
 * Send a message with the account linking call-to-action
 *
 */
function sendAccountLinking (recipientId) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "template",
				payload: {
					template_type: "button",
					text: "Welcome. Link your account.",
					buttons:[{
						type: "account_link",
						url: URLUtils.https("FBMessages-Webhook", "authorize", "1").toString()
					}]
				}
			}
		}
	};

	callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll 
 * get the message id in a response 
 *
 */
function callSendAPI(messageData) {
	var sendAPIClient = new HTTPClient();
	sendAPIClient.open("POST", SEND_API_URL+ACCESS_TOKEN);
	sendAPIClient.setRequestHeader("Content-Type", "application/json");
	sendAPIClient.setTimeout(30000); // 30 seconds
	sendAPIClient.send(JSON.stringify(messageData), "UTF-8");
	
	// handle response
	var statusCode = sendAPIClient.getStatusCode();
	var statusMessage = sendAPIClient.getStatusMessage();
	var body = sendAPIClient.getText("UTF-8");
	if (statusCode == 200) {
		let bodyJSON = JSON.parse(body);
		let recipientId = bodyJSON.recipient_id;
		let messageId = bodyJSON.message_id;
		
		if (messageId) {
			logger.debug("Successfully sent message with id {0} to recipient {1}", messageId, recipientId);
		} else {
			logger.debug("Successfully called Send API for recipient {0}", recipientId);
		}
	} else {
		logger.error("Failed calling Send API. ststua_code: {0}, status_message: {1}, Error: {2}", statusCode, statusMessage, getErrorMessage(body));
	}
}
/**
 * Gets the error message
 * Code		Subcode		Message
 * // Internal Errors
 * 1200		---			Temporary send message failure. Please try again later.
 * // Limit Errors
 * 4		2018022		Too many send requests to phone numbers
 * 100		2018109		Attachment size exceeds allowable limit
 * 613		---			Calls to this API have exceeded the rate limit
 * // Bad Parameter Errors
 * 100		---			Invalid fbid.
 * 100		2018001		No matching user found
 * // Access Token Errors
 * 190		---			Invalid OAuth access token.
 * // Permission Errors
 * 10		2018065		This message is sent outside of allowed window. You need page_messaging_subscriptions permission to be able to do it.
 * 10		2018108		This Person Cannot Receive Messages: This person isn't receiving messages from you right now.
 * 200		1545041		Message Not Sent: This person isn't receiving messages from you right now.
 * 200		2018028		Cannot message users who are not admins, developers or testers of the app until pages_messaging permission is reviewed and the app is live.
 * 200		2018027		Cannot message users who are not admins, developers or testers of the app until pages_messaging_phone_number permission is reviewed and the app is live.
 * 200		2018021		Requires phone matching access fee to be paid by this page unless the recipient user is an admin, developer, or tester of the app.
 * // Account-Linking Errors
 * 10303	---			Invalid account_linking_token
 * 
 * @param body
 */
function getErrorMessage (body) {
	var body = null;
	try {
		body = JSON.parse(body);
	} catch (e) {
		return "Unknown error!";
	}
	
	if (!empty(body) && typeof(body) == 'object' && 'error' in body && !empty(body.error)) {
		let message = "";
		if ('message' in body.error && !empty(body.error.message)) {
			message += body.error.message;
		}
		if ('code' in body.error && !empty(body.error.code)) {
			message += ("Code: "+body.error.code);
		}
		if ('error_subcode' in body.error && !empty(body.error.error_subcode)) {
			message += (", subcode: "+body.error.error_subcode);
		}
		if ('type' in body.error && !empty(body.error.type)) {
			message += (", type: "+body.error.type);
		}
		if ('fbtrace_id' in body.error && !empty(body.error.fbtrace_id)) {
			message += (", fbtrace_id: "+body.error.fbtrace_id);
		}
		if (empty(message) || message.length == 0) {
			message = "Unknown error!";
		}
		return message;
	} else {
		return "Unknown error!";
	}
}

function continueConversation (senderID, payload, query) {
	if (typeof(payload) == 'undefined' || payload == "USER_DEFINED_PAYLOAD") {
		// send a first entry point message
		sendTextMessage(senderID, "Welcome to our shop! What do you want to find?" +
				"\r\nFor a quick reply you can use commands:" +
				"\r\nimage - to display a sample image" +
				"\r\naudio - to display sample of audio" +
				"\r\nvideo - to display a sample of video" +
				"\r\nfile - to display a link to the sample text file" +
				"\r\nbutton - to display a sample of button" +
				"\r\nquick reply - to display a quick reply buttons" +
				"\r\ngeneric - to display a generic template, or how the products of the shop can looks like" +
				"\r\nreceipt - to display a receipt of order example, or how the order detail can looks like");
		return true;
	} else if (typeof(payload) != 'undefined' && !empty(payload)) {
		if (payload == "SEARCH_PRODUCT" && typeof(query) != 'undefined' && !empty(query)) {
			sendTypingOn(senderID);
			// search products and return it in generic template
			var productSearchModel = new dw.catalog.ProductSearchModel();
			productSearchModel.setOrderableProductsOnly(true);
			productSearchModel.setRecursiveCategorySearch(true);
			productSearchModel.setSearchPhrase(query);
			productSearchModel.search();
			
			if (productSearchModel.count == 1) {
				sendProductsMessage(senderID, productSearchModel.getProductSearchHits().asList());
				return true;
			} else if (productSearchModel.count > 0) {
				sendFoundProductsMessage(senderID, productSearchModel, payload);
				return true;
			} else {
				return null;
			}
		} else if ('payload' in payload && payload.payload == "SEARCH_PRODUCT_BY") {
			sendProductRefinementsMessage(senderID, payload);
		}
	}
}

/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 * 
 */
function receivedMessageRead (event) {
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	
	// All messages before watermark (a timestamp) or sequence have been seen.
	var watermark = event.read.watermark;
	var sequenceNumber = event.read.seq;
	
	logger.debug("Received message read event for watermark {0} and sequence number {1}", watermark, sequenceNumber);
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to 
 * Messenger" plugin, it is the 'data-ref' field. Read more at 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication (event) {
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	var timeOfAuth = StringUtils.formatCalendar(new Calendar(new Date(event.timestamp)), "yyyy-MM-dd H:mm:ss");
	
	// The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
	// The developer can set this to an arbitrary value to associate the 
	// authentication callback with the 'Send to Messenger' click event. This is
	// a way to do account linking when the user clicks the 'Send to Messenger'
	// plugin.
	var passThroughParam = event.optin.ref;
	
	logger.debug("Received authentication for user {0} and page {1} with pass through param '{2}' at {3}", senderID, recipientID, passThroughParam, timeOfAuth);
	
	// When an authentication is received, we'll send a message back to the sender
	// to let them know it was successful.
	sendTextMessage(senderID, "Authentication successful");
}

/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about 
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation (event) {
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	var delivery = event.delivery;
	var messageIDs = delivery.mids;
	var watermark = delivery.watermark;
	var sequenceNumber = delivery.seq;
	
	if (messageIDs) {
		for each (let messageID in messageIDs) {
			logger.debug("Received delivery confirmation for message ID: {0}", messageID);
		}
	}
	
	logger.debug("All message before {0} were delivered.", watermark);
}

/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */
function receivedPostback (event) {
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	var timeOfPostback = StringUtils.formatCalendar(new Calendar(new Date(event.timestamp)), "yyyy-MM-dd H:mm:ss");
	
	// The 'payload' param is a developer-defined field which is set in a postback
	// button for Structured Messages.
	var payload = event.postback.payload;
	
	logger.debug("Received postback for user {0} and page {1} with payload {2} at {3}", senderID, recipientID, payload, timeOfPostback);
	
	// When a postback is called, we'll send a message back to the sender to
	// let them know it was successful
	
	if (payload == "USER_DEFINED_PAYLOAD") {
		continueConversation(senderID, payload);
	} else {
		sendTextMessage(senderID, "Postback called. payload = "+payload);
	}
}

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 * 
 */
function receivedAccountLink (event) {
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	
	var status = event.account_linking.status;
	var authCode = event.account_linking.authorization_code;
	
	logger.debug("Received account link event with for user {0} with status {1} and auth code {2}", senderID, status, authCode);
}

/* Web exposed methods */

/** Renders the webhook point of messenger.
 * @see {@link module:controllers/FBMessages~webhook} */
exports.Webhook = guard.ensure(['https'], webhook);