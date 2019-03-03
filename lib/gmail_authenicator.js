require('dotenv').config();

const TOPIC_NAME = process.env.TOPIC_NAME;
const GMAIL_MAIL_ADDRESS = process.env.GMAIL_MAIL_ADDRESS;
const TOKEN_PATH = process.env.GMAIL_TOKEN_PATH;
const OAUTH_CREDENTIALS = process.env.OAUTH_CREDENTIALS;

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
    var code = req.body.code;
    if (code == null) res.end("Bad request");

    console.log("Code : " + code);

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
        // Store the token to disk for later program executions
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
          if (err) return console.error(err);
          console.log('Token stored to', TOKEN_PATH);

          // Return OK
          res.end(JSON.stringify({
            code: "000",
            message: "Token saved successfully"
          }))
        });

      });
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

  return app;
}



exports = module.exports = createApplication;