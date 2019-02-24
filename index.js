require('dotenv').config();

var gmailAuthenicator = require("./gmail_authenicator.js");
var gmailFetcher = require("./gmail_fetcher.js");

const util = require('util')
const fs = require('fs');

const {
  google
} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const TOKEN_PATH = process.env.GMAIL_TOKEN_PATH;
const OAUTH_CREDENTIALS = process.env.OAUTH_CREDENTIALS;


function proceedServiceCall(callback, callbackParam) {
  // Load client secrets from a local file.
  fs.readFile(OAUTH_CREDENTIALS, (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Gmail API.
    authorize(JSON.parse(content), callback, callbackParam);
  });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 * @param {Object} callbackParam The callback param to call with the authorized client.
 */
function authorize(credentials, callback, callbackParam) {
  const {
    client_secret,
    client_id,
    redirect_uris
  } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callbackParam);
    oAuth2Client.setCredentials(JSON.parse(token));
    if (callback != null) callback(oAuth2Client, callbackParam);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callbackParam The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callbackParam) {

  // Get the Authorization Email
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  // Send back to Client
  var result = {
    code: "401",
    message: "Authorization is required",
    authUrl: authUrl
  }

  var res = callbackParam.res;
  res.end(JSON.stringify(result));

  return;
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
  proceedServiceCall(gmailAuthenicator().subscribeWatch, opts);
}

/**
 * Authorization request
 */
exports.auth = (req, res) => {
  console.log("Authorization Request");
  gmailAuthenicator().authMail({
    req: req,
    res: res
  });
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
  proceedServiceCall(gmailFetcher().list, opts);
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
  proceedServiceCall(gmailFetcher().get, opts);
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
  proceedServiceCall(gmailFetcher().modify, opts);
}

/**
 * Notify Request (Chain API)
 */
exports.notify = (req, res) => {
  console.log("Notify Email Request");
  var opts = {
    req: req,
    res: res
  }
  gmailFetcher().notify(opts);
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
    
  gmailFetcher().listen(event, data);

  callback();
};