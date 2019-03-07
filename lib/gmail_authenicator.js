require('dotenv').config();

const TOPIC_NAME = process.env.TOPIC_NAME;
const GMAIL_MAIL_ADDRESS = process.env.GMAIL_MAIL_ADDRESS;
const OAUTH_CREDENTIALS = process.env.OAUTH_CREDENTIALS;

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

const fs = require('fs');
const {
  google
} = require('googleapis');

function createApplication() {
  var app = {};

  app.init = function () {}

  /**
   * Authorization
   */
  app.authMail = function (opts) {
    var req = opts.req;
    var res = opts.res;

    var code = req.body.code || req.query.code;
    var scope = req.body.scope || req.query.scope;
    if (code == null) res.end("Bad request Code");
    if (scope == null) res.end("Bad Request Scope");

    console.log(`Code : ${code} : ${scope}`);

    // Load client secrets from a local file.
    fs.readFile(OAUTH_CREDENTIALS, (err, content) => {
      if (err) return console.log('Error loading client secret file:', err);

      // Initialize the oAuth and set the credentials
      var credentials = JSON.parse(content);
      const {
        client_secret,
        client_id,
        redirect_uris
      } = credentials.installed;
      const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

      // Save Token
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return console.error('Error retrieving access token', err);

        oAuth2Client.setCredentials(token);
        // // Store the token to disk for later program executions
        // fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        //   if (err) return console.error(err);
        //   console.log('Token stored to', TOKEN_PATH);
        // });

        app.getProfile(oAuth2Client, opts, token);

      });
    });
  }

  app.getProfile = function (auth, opts, token) {
    let gmail = app.getGmail(auth);

    console.log("Trigger Get Profile");

    gmail.users.getProfile({
      userId: GMAIL_MAIL_ADDRESS,
      auth: auth
    }, function (err, xres) {
      if (err) {
        console.log(err);
        opts.res.end("FAIL");
      } else {

        // Save Token
        console.log(`Save Token to redis ${xres.data.emailAddress}`);
        let databaseHelper = app.getDatabaseHelper();
        databaseHelper.createProfile(xres.data.emailAddress, JSON.stringify(token));

        console.log("Return to client");
        opts.res.json({
          code: "000",
          data: xres.data
        });
      }
    });
  }

  /**
   * Watch Email Topic Notification
   */
  app.subscribeWatch = function (auth, opts) {
    console.log("Authorized Watch Email Web Request");
    const gmail = google.gmail({
      version: 'v1',
      auth
    });

    var options = {
      userId: GMAIL_MAIL_ADDRESS,
      resource: {
        labelIds: ['INBOX', 'UNREAD'],
        topicName: TOPIC_NAME
      }
    };

    gmail.users.watch(options, function (err, res) {
      if (err) {
        console.log("Error in watch", err);
        // doSomething here;
        opts.res.end(`Error in watch ${err}`)
        return;
      }

      console.log("Success subscribe to watch", res.data);

      res.data.code = "000";
      res.data.message = "subscription is completed";

      // Response to client
      opts.res.end(JSON.stringify(res.data));
    });
  }


  app.getGmail = function (auth) {
    const gmail = google.gmail({
      version: 'v1',
      auth
    });

    return gmail;
  }

  app.proceedServiceCall = function (callback, callbackParam) {
    var emailAddress = app.getEmailAddress(callbackParam);
    if (emailAddress == null || emailAddress == "") {
      callbackParam.res.json({
        code: "999",
        message: "Missing email"
      });
      return;
    }

    // Load client secrets from a local file.
    fs.readFile(OAUTH_CREDENTIALS, (err, content) => {
      if (err) return console.log('Error loading client secret file:', err);
      // Authorize a client with credentials, then call the Gmail API.
      app.authorize(JSON.parse(content), callback, callbackParam);
    });
  }

  app.getEmailAddress = function (opts) {
    return (opts.req.body.emailAddress);
  }

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   * @param {Object} credentials The authorization client credentials.
   * @param {function} callback The callback to call with the authorized client.
   * @param {Object} callbackParam The callback param to call with the authorized client.
   */
  app.authorize = function (credentials, callback, callbackParam) {
    const {
      client_secret,
      client_id,
      redirect_uris
    } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

    var emailAddress = app.getEmailAddress(callbackParam, "emailAddress");

    // Retrieve the Token and proceed the handling
    app.getDatabaseHelper().getToken(emailAddress).then((token) => {

      console.log(`Token : ${token}`)
      // Redirect to Authenication page
      if (token == null || token == "") return app.getNewToken(oAuth2Client, callbackParam);

      // Proceed Operation
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
  app.getNewToken = function (oAuth2Client, callbackParam) {

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
    res.json(result);
    return;
  }

  app.getDatabaseHelper = function () {
    let databaseHelper = require("./database_helper.js")();
    return databaseHelper;
  }


  return app;
}



exports = module.exports = createApplication;