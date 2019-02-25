require('dotenv').config();
let textParser = require("./text_parser.js");
let axios = require("axios");

const util = require('util')

const GMAIL_MAIL_ADDRESS = process.env.GMAIL_MAIL_ADDRESS;
const GMAIL_FETCH_QUERY = process.env.GMAIL_FETCH_QUERY;
const GMAIL_FETCH_COUNT = process.env.GMAIL_FETCH_COUNT;

const {
  google
} = require('googleapis');


// Bank List
var bankList = [];
var bank = {
  name: "HSBC",
  head: "ve credited your account with a fund transfer. Please see the details below:",
  tail: "Please log on to HSBC Internet Banking, HSBC Mobile Banking or contact our customer service hotline 22333322 for details.",

  payerHead: "Payer: ",
  payerTail: "<br><br></font>",

  acctHead: "Account no. credited: ",
  acctTail: "<br><br></font><br>",

  amtHead: "Payment amount: ",
  amtTail: "<br><br></font>"
}
bankList.push(bank);


function createApplication() {
  var app = {};

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
        var result = {
          code: "409",
          message: "List mail return an error"
        }
        // Send Response to Client
        app.send(result);
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

      var result = {
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
        var result = {
          code: "409",
          message: "List mail return an error"
        }
        app.send(result);
        return;
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

    // Prepare call back function
    var getMail = function (auth, opts, msgList, resultList) {

      if (msgList.length == 0) {
        console.log("Fetch all message successfully");
        app.processMessage(auth, opts, resultList);
        return;
      }

      var gmail = app.getGmail(auth);
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
          var data = (res.data.payload.body.data)
          let buff = new Buffer(data, 'base64');
          let text = buff.toString('ascii');

          resultList.push({
            id: msgId,
            code: "000",
            message: text
          });
        }

        getMail(auth, opts, msgList, resultList)

      });
      return;
    }

    // Prepare Parameter
    var msgList = opts.req.body.data.slice(0);
    let resultList = [];
    getMail(auth, opts, msgList, resultList);
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
  // app.modify = function (auth, opts) {
  //   console.log("Modify Email Web Request");

  //   // Prepare call back function
  //   let modifyLabel = function (auth, opts, msgList, resultList) {

  //     if (msgList.length == 0) {
  //       // Return to Client
  //       let result = {
  //         code: "000",
  //         data: resultList
  //       };
  //       app.send(opts, result);
  //       return;
  //     }

  //     let gmail = app.getGmail(auth);
  //     let msgId = msgList.shift();

  //     gmail.users.messages.modify({
  //       'userId': GMAIL_MAIL_ADDRESS,
  //       'id': msgId,
  //       resource: {
  //         'addLabelIds': [],
  //         'removeLabelIds': ["UNREAD"]
  //       }
  //     }, (err, res) => {
  //       if (err) {
  //         resultList.push({
  //           id: msgId,
  //           code: "409",
  //           message: "Modify email fails",
  //           error: err
  //         });
  //       } else {
  //         resultList.push({
  //           id: msgId,
  //           code: "000"
  //         });
  //       }

  //       modifyLabel(auth, opts, msgList, resultList)

  //     });
  //     return;
  //   }

  //   // Prepare Parameter
  //   let resultList = [];
  //   var msgList = opts.req.body.data.slice(0);
  //   modifyLabel(auth, opts, msgList, resultList);
  // }

  app.send = function (opts, obj) {
    if (obj.constructor == Object || obj.constructor == Array) {
      obj = JSON.stringify(obj, null, 2);
    }
    console.log(`Response to client : ${obj}`);

    if (opts.res != null) {
      opts.res.end(obj);
    } else {
      if (opts.context.eventType = "google.pubsub.topic.publish") {// Notify Bot
        app.notifyBot(obj);
      }
    }
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

    var text = msgObj.message;

    // Parse Message for delivery
    for (var i = 0; i < bankList.length; i++) {

      var bank = bankList[i];
      var body = textParser.parseMessage(text, bank.head, bank.tail);
      if (body == null) continue;

      var payer = textParser.parseMessage(body, bank.payerHead, bank.payerTail);
      var creditAccount = textParser.parseMessage(body, bank.acctHead, bank.acctTail);
      var creditAmount = textParser.parseMessage(body, bank.amtHead, bank.amtTail);

      let result = {
        code: "000",
        bank: bank.name,
        payer: payer,
        creditAmount: creditAmount,
        creditAccount: creditAccount
        //,raw: text
      }

      return result;
    }

    // Return error object
    let result = {
      code: "410",
      message: `Message ${msgObj.id} do not contain any parsable bank message`,
      raw: msgObj.message
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

  app.listen = function (event, data) {
    if (data.emailAddress != GMAIL_MAIL_ADDRESS) console.error(`Incoming message is from a valid GMAIL address ${data.emailAddress}`);
    app.notify(event);
    return;
  }

  app.notify = function (opts) {
    app.listMessage()
      .then(data => {
        console.log(`Message ID List : ${data.data}`);

        if (data.data.length == 0) {
          app.send(opts, {
            code: "999",
            message: "No new message"
          });
          return;
        }

        var reqData = {
          data: data.data,
          markAsRead: true
        }
        console.log(`ReqData : ${reqData}`)

        // Trigger Get Message List
        app.getMail(reqData)
          .then(resp => {
            //app.debug("Get mail result ", resp);
            app.send(opts, resp.data);
          })
      });
  }

  app.listMessage = function (opts) {
    console.log(`List message : ${process.env.GCF_LIST_URL}`);
    return axios.get(process.env.GCF_LIST_URL)
      .then((response) => {
        console.log(`List Response : ${response.data.code}`);

        return response.data;
      });
  }

  app.getMail = function (data) {
    console.log(`Get Mail : ${process.env.GCF_GET_URL}`);
    var header = {
      headers: {
        'Content-Type': 'application/json',
      }
    };

    return axios({
        method: "POST",
        url: process.env.GCF_GET_URL,
        headers: header,
        data: data
      })
      .then(function (response) {
        console.log(`Response : ${response}`);
        return response;
      });
  }

  /**
   * Notify Bot
   */
  app.notifyBot = function (data) {
    console.log(`Notify Bot: ${process.env.BOT_NOTIFY_URL}`);
    console.log(`Incoming Data ${data}`);

    if (JSON.parse(data).code != "000")
    {
      console.log("No new message");
      return;
    }

    var header = {
      headers: {
        'Content-Type': 'application/json',
      }
    };

    return axios({
        method: "POST",
        url: process.env.BOT_NOTIFY_URL,
        headers: header,
        data: data
      })
      .then(function (response) {
        console.log(`Response : ` + response);
        return response;
      });
  }

  return app;
}

exports = module.exports = createApplication;