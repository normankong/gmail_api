require('dotenv').config();

let mailParser = require("./mail_parser.js");
const axios = require('axios');


const util = require('util')

const GMAIL_MAIL_ADDRESS = process.env.GMAIL_MAIL_ADDRESS;
const GMAIL_FETCH_QUERY = process.env.GMAIL_FETCH_QUERY;
const GMAIL_FETCH_COUNT = process.env.GMAIL_FETCH_COUNT;

const {
  google
} = require('googleapis');


function createApplication() {
  let app = {};
  let parser = null;

  app.init = function () {}

  /**
   * List Email Request
   */
  app.list = function (auth, opts) {
    console.log("List Email Web Request");
    const gmail = google.gmail({
      version: 'v1',
      auth
    });

    let resultList = [];
    gmail.users.messages.list({
      'userId': GMAIL_MAIL_ADDRESS,
      'q': GMAIL_FETCH_QUERY,
      'maxResults': GMAIL_FETCH_COUNT
    }, (err, res) => {
      if (err) {
        console.log('List mail returned an error: ', err);

        // Send Response to Client        
        app.send(app.getErrorResponse("409", "List mail return an error"));
        return;
      }

      // Create a virtual list
      if (res.data.messages == null) {
        console.log("Create a virtual list");
        res.data.messages = [];
      }
      console.log(`Message Size : ${res.data.messages.length} : ${res.data.messages.map(msg => msg.id)}`);

      resultList = resultList.concat(res.data.messages.map(msg => msg.id));

      app.listNextPage(gmail, auth, opts, resultList, res.data.nextPageToken);

    });
  }

  /**
   * List Next Page 
   */
  app.listNextPage = function (gmail, auth, opts, resultList, nextPageToken) {

    console.log("List Mesage Next Request");

    // List Message Completed Successfully
    if (nextPageToken == null) {

      let result = {
        code: "000",
        message: "List message sucessfully",
        data: resultList
      }

      // Send Response to Client
      app.send(opts, result);
      return;
    }


    // List Next Mail with Page Token
    gmail.users.messages.list({
      'userId': GMAIL_MAIL_ADDRESS,
      'q': GMAIL_FETCH_QUERY,
      'pageToken': nextPageToken,
      'maxResults': GMAIL_FETCH_COUNT
    }, (err, res) => {
      if (err) {
        return app.send(app.getErrorResponse("409", "List mail return an error"));
      }

      // Concat Result if return is not null
      if (res.data.messages != null) {
        console.log(`Message Size : ${res.data.messages.length} : ${res.data.messages.map(msg => msg.id)}`);
        resultList = resultList.concat(res.data.messages.map(msg => msg.id));
      }

      // Process Next Page
      app.listNextPage(gmail, auth, opts, resultList, res.data.nextPageToken);

    });
  }

  /**
   * Get Email Request
   */
  app.get = function (auth, opts) {



    console.log("Get Email Web Request " + opts.req.body);
    console.log(opts.req.body.data)

    if (opts.req.body.data.length === 0) return app.send(opts, app.getErrorResponse("417", "No new message"));

    // Prepare call back function
    let _getMail = function (auth, opts, msgList, resultList) {

      if (msgList.length == 0) {
        console.log("Fetch all message successfully");
        app.processMessage(auth, opts, resultList);
        return;
      }

      let gmail = app.getGmail(auth);
      let msgId = msgList.shift();

      gmail.users.messages.get({
        'userId': GMAIL_MAIL_ADDRESS,
        'id': msgId
      }, (err, res) => {
        if (err) {
          resultList.push({
            id: msgId,
            code: "409",
            message: "The Check Mail returned an error",
            error: err
          });
        } else {
          let data = (res.data.payload.body.data)
          let buff = new Buffer(data, 'base64');
          let text = buff.toString('ascii');

          resultList.push({
            id: msgId,
            code: "000",
            message: text
          });
        }

        _getMail(auth, opts, msgList, resultList)

      });
      return;
    }

    // Generate Local Cache
    console.log("Trigger Cache URL : " + process.env.GCF_CACHE_URL)
    axios.get(process.env.GCF_CACHE_URL)
      .then(response => {
        console.log(response.data.data);
        parser = mailParser(response.data.data);
        
        // Once cache is updated, trigger the Get Message recursively
        var msgList = opts.req.body.data.slice(0);
        let resultList = [];
        _getMail(auth, opts, msgList, resultList);

      })
      .catch(error => {
        console.log(error);
      });
  }


  app.getProfile = function (auth, opts) {
    let gmail = app.getGmail(auth);

    gmail.users.getProfile({
      userId: GMAIL_MAIL_ADDRESS
    }, function (err, res) {
      if (err) {
        console.log(err);
        opts.res.end("FAIL");
      } else {
        console.log(res);
        opts.res.json({
          code: "000",
          data: res.data
        });
      }
    });
  }

  app.processMessage = function (auth, opts, messageList) {

    let resultList = [];
    for (let i = 0; i < messageList.length; i++) {
      let result = null;
      let msgObj = messageList[i];
      if (msgObj.code != "000") {
        result = msgObj;
      } else {
        result = app.parseMessage(msgObj);
      }
      resultList.push(result);
    }

    // Return to Client
    var result = {
      code: "000",
      data: resultList
    };

    app.send(opts, result);

    // Mark Read quietly
    console.log(`opts.req.body.markAsRead : ${opts.req.body.markAsRead}`);
    if (opts.req.body.markAsRead) {
      app.modify(auth, opts, true);
    }
  }

  app.modify = function (auth, opts, isSilence) {
    console.log(`Modify Email Web Request : ${isSilence}`);

    if (isSilence == null) isSilence = false;

    let result = null;
    let gmail = app.getGmail(auth);
    gmail.users.messages.batchModify({
      'userId': GMAIL_MAIL_ADDRESS,
      resource: {
        'ids': opts.req.body.data,
        'addLabelIds': [],
        'removeLabelIds': ["UNREAD"]
      }
    }, (err, res) => {

      if (err) {
        result = {
          code: "409",
          message: "Modify email fails",
          error: err
        };
      } else {
        result = {
          code: "000"
        };
      }

      // Silence Mode
      if (isSilence) return console.log("Quitely mark all message as read" + JSON.stringify(result, null, 2));

      app.send(opts, result);
    });
  }

  app.send = function (opts, obj) {
    if (obj.constructor == Object || obj.constructor == Array) {
      obj = JSON.stringify(obj, null, 2);
    }
    console.log(`Response to client : ${obj}`);
    opts.res.end(obj);
  }

  app.debug = function (msg, obj) {
    console.log(msg);
    console.log(util.inspect(obj, {
      showHidden: false,
      depth: null
    }));
  }

  /**
   * Parse the Message based on the Predefine Email template
   * @param {The email content} text 
   */
  app.parseMessage = function (msgObj) {

    let raw = msgObj.message;
    let message = null;
    message = message || parser.parseICT(raw);
    message = message || parser.parseOCT(raw);
    message = message || parser.parseSTM(raw);

    if (message != null) return message;

    // Return error object
    let result = {
      code: "410",
      message: `Message ${msgObj.id} do not contain any parsable bank message`,
      raw: raw
    };

    return result;
  }

  app.getGmail = function (auth) {
    const gmail = google.gmail({
      version: 'v1',
      auth
    });

    return gmail;
  }

  // Format Error Response
  app.getErrorResponse = function (code, message, raw) {
    let response = {
      code: code,
      message: message,
      raw: raw
    }
    return response;
  }

  app.init();

  return app;
}

exports = module.exports = createApplication;