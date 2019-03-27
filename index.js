require('dotenv').config();

var gmailAuthenicator = require("./lib/gmail_authenicator.js");
var gmailFetcher = require("./lib/gmail_fetcher.js");
var gmailNotifier = require("./lib/gmail_notifier.js");
let authHelper = require("./lib/auth_helper.js");
let cacheHelper = require("./lib/cache_helper.js");

let util = require("util");

function generateToken(opts) {

  console.log("Generate Token");
  if (opts.req.body.emailAddress == null) return opts.res.end("Bad request");

  let myToken = authHelper().generateToken(opts.req.body.emailAddress);
  opts.res.json({
    code: "000",
    token: myToken
  });
  return;
}

/**
 * Verify JWT Token
 */
function verifyToken(opts) {

  console.log("Verify Token");
  if (opts.req.headers.authorization == null || opts.req.body.emailAddress == null) {
    console.log("Missing parameter");
    opts.res.status(401).json({
      code: "000",
      message: "Bad Request",
      auth: (opts.req.headers.authorization == null),
      email: (opts.req.body.emailAddress == null)
    });
    return false;
  }

  // Use the Authorization Header to proceed the verification
  let token = opts.req.headers.authorization;
  let emailAddress = opts.req.body.emailAddress;
  if (authHelper().verifyToken(token, emailAddress)) {
    return true;
  } else {
    opts.res.status(401).json({
      code: "401",
      message: "Unauthorized"
    });
    return false;
  }
}

/**
 * Generate Token Request
 */
exports.generate = (req, res) => {
  console.log("Generate Token");
  var opts = {
    req: req,
    res: res
  }

  generateToken(opts);
}


/**
 * Stop Watch Mail request
 */
exports.stopWatch = (req, res) => {
  console.log("Stop watch Email Web Request");
  var opts = {
    req: req,
    res: res
  }

  if (verifyToken(opts)) gmailAuthenicator().proceedServiceCall(gmailAuthenicator().stopWatch, opts);
}
/**
 * Watch Mail request
 */
exports.watch = (req, res) => {
  console.log("Watch Email Web Request");
  var opts = {
    req: req,
    res: res
  }

  if (verifyToken(opts)) gmailAuthenicator().proceedServiceCall(gmailAuthenicator().subscribeWatch, opts);
}

/**
 * Authorization request
 */
exports.auth = (req, res) => {
  console.log("Authorization Request");

  var opts = {
    req: req,
    res: res
  }
  if (verifyToken(opts)) gmailAuthenicator().authMail(opts);
}

/**
 * List Message request
 */
exports.list = (req, res) => {
  console.log("List Email Web Request");
  var opts = {
    req: req,
    res: res
  }
  if (verifyToken(opts)) gmailAuthenicator().proceedServiceCall(gmailFetcher().list, opts);
}

/**
 * Get Mail request
 */
exports.get = (req, res) => {
  console.log("Get Email Request");
  var opts = {
    req: req,
    res: res
  }
  if (verifyToken(opts)) gmailAuthenicator().proceedServiceCall(gmailFetcher().get, opts);
}

/**
 * Modify Mail request
 */
exports.modify = (req, res) => {
  console.log("Modify Email Request");
  var opts = {
    req: req,
    res: res
  }
  if (verifyToken(opts)) gmailAuthenicator().proceedServiceCall(gmailFetcher().modify, opts);
}

/**
 * Get Profile 
 */
exports.getProfile = (req, res) => {
  console.log("Get Profile Request");
  var opts = {
    req: req,
    res: res
  }
  if (verifyToken(opts)) gmailAuthenicator().proceedServiceCall(gmailFetcher().getProfile, opts);
}


/**
 * HTTP Simulate Mail Notify Request (Chain API)
 */
exports.notify = (req, res) => {
  console.log("Notify Email Request");
  var opts = {
    req: req,
    res: res
  }
  gmailNotifier().notify(opts);
}

/**
 * Background Cloud Function to be triggered by Google Pub Sub
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} callback The callback function.
 */
exports.listen = (event, callback) => {

  console.log("Incoming new message");
  //console.log(util.inspect(event, {showHidden: false, depth: null}));

  const pubsubMessage = event.data;
  const data = JSON.parse(Buffer.from(pubsubMessage.data, 'base64').toString());

  gmailNotifier().listen(event, data);

  callback();
};

/**
 * Background Cloud Function to be triggered by Google Pub Sub
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} callback The callback function.
 */
exports.topicWatch = (event, callback) => {

  console.log("Incoming new message");
  //console.log(util.inspect(event, {showHidden: false, depth: null}));

  const pubsubMessage = event.data;
  const data = JSON.parse(Buffer.from(pubsubMessage.data, 'base64').toString());

  // Prepare the Data object (Simulate to HTTP)
  event.req = {
    body: {
      emailAddress: data.emailAddress
    }
  }
  event.res = {
    end: console.log
  };

  // Skip JWT Checking
  gmailAuthenicator().proceedServiceCall(gmailAuthenicator().subscribeWatch, event);

  callback();
};

/**
 * Retrieve Cache Mapping List
 */
exports.getMapping = (req, res) => {
  console.log("Retrieve Cache List");
  var opts = {
    req: req,
    res: res
  }

  // Skip JWT Checking
  cacheHelper().getMapping("name", opts);
}

/**
 * Put Cache Mapping List
 */
exports.putMapping = (req, res) => {
  console.log("Put Cache List");
  var opts = {
    req: req,
    res: res
  }

  if (verifyToken(opts)) cacheHelper().putMapping("name", opts);
}

/**
 * Del Cache Mapping List
 */
exports.delMapping = (req, res) => {
  console.log("Put Cache List");
  var opts = {
    req: req,
    res: res
  }

  if (verifyToken(opts)) cacheHelper().delMapping("name", opts);
}