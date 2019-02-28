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
  let app = {};

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
        let result = {
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
        let result = {
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

    // Prepare Parameter
    var msgList = opts.req.body.data.slice(0);
    let resultList = [];
    _getMail(auth, opts, msgList, resultList);
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

    if (opts.res != null) {
      opts.res.end(obj);
    } else {
      if (opts.context.eventType = "google.pubsub.topic.publish") { // Notify Bot
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

    let text = msgObj.message;

    // Parse Message for delivery
    for (let i = 0; i < bankList.length; i++) {

      let bank = bankList[i];
      let body = textParser.parseMessage(text, bank.head, bank.tail);
      if (body == null) continue;

      let payer = textParser.parseMessage(body, bank.payerHead, bank.payerTail);
      let creditAccount = textParser.parseMessage(body, bank.acctHead, bank.acctTail);
      let creditAmount = textParser.parseMessage(body, bank.amtHead, bank.amtTail);

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

    // List the Mail
    app.listMail()
      .then(listResp => {
        console.log(`Notify with Message ID List : ${listResp.data.data}`);

        // Send to Distinct List
        app.distinctMail(listResp.data)
          .then(distResp => {
            console.log(`Distinct List Result : ` + JSON.stringify(distResp.data));

            // Get Message List
            // var distResp = listResp;
            app.getMail(distResp.data)
              .then(mailResp => {
                //app.debug("Get mail result ", resp);
                app.send(opts, mailResp.data);
              })
          });
      });
  }

  app.listMail = function (opts) {

    console.log(`List message : ${process.env.GCF_LIST_URL}`);

    // Perform HTTP call
    return axios.get(process.env.GCF_LIST_URL)
      .then((response) => {
        console.log(`List Mail URL Response : ` + JSON.stringify(response.data));
        return response;
      });
  }

  /**
   * Distinct the List
   */
  app.distinctMail = function (data) {

    console.log(`Distinc List: ${process.env.GCF_DISTINCT_URL}`);
    console.log(`Distinc List Incoming Data : ` + JSON.stringify(data));

    let reqData = {
      data: data.data
    }

    console.log("Sending to distinct : " + JSON.stringify(reqData));

    // Perform HTTP Post
    return axios({
        method: "POST",
        url: process.env.GCF_DISTINCT_URL,
        headers: app.getRequestHeader(),
        data: reqData
      })
      .then(function (response) {
        console.log(`Distinc List Response : ` + JSON.stringify(response.data));
        return response;
      });
  }

  app.getMail = function (data) {

    console.log(`Get Mail : ${process.env.GCF_GET_URL}`);
    console.log(`Get Mail Incoming Data : ` + JSON.stringify(data));

    let reqData = {
      markAsRead: true,
      data: data.data
    }

    //Perform HTTP call
    return axios({
        method: "POST",
        url: process.env.GCF_GET_URL,
        headers: app.getRequestHeader(),
        data: reqData
      })
      .then(function (response) {
        console.log(`Get Mail Response Data ` + JSON.stringify(response.data));
        return response;
      });
  }

  /**
   * Notify Bot
   */
  app.notifyBot = function (data) {

    console.log(`Notify Bot: ${process.env.BOT_NOTIFY_URL}`);
    console.log(`Incoming Data ${data}`);

    // Perform HTTP Post
    return axios({
        method: "POST",
        url: process.env.BOT_NOTIFY_URL,
        headers: app.getRequestHeader(),
        data: data
      })
      .then(function (response) {
        console.log(`NotifyBot Response : ` + response.data);
        return response;
      });
  }



  // Append JSON Header
  app.getRequestHeader = function (header, contextType) {
    if (header == null) header = {};
    if (contextType == null) contextType = "application/json'";
    header.headers = {
      'Content-Type': contextType
    }
    return header;
  }

  return app;
}

exports = module.exports = createApplication;



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