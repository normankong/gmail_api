require('dotenv').config();

let axios = require("axios");
let databaseHelper = require("./database_helper.js");

function createApplication() {

    let app = {};

    app.init = function () {}

    app.notify = function (opts) {

        if (opts.req.body.emailAddress == "") return app.send("Bad request");

        let emailAddress = app.getEmailAddress(opts);
        console.log(`Application Notify : ` + app.getEmailAddress(opts));

        // Ensure token is available
        databaseHelper().getToken(emailAddress).then((token) => {

            console.log(`Retrieve token : ${token}`);
            if (token == "" || token == null) {
                return console.log("Invalid Token");
            }

            // List the Mail
            app.listMail(opts).then(listResp => {

                console.log(`Notify with Message ID List : ${listResp.data.data}`);

                // Send to Distinct List
                app.distinctMail(opts, listResp.data).then(distResp => {
                    console.log(`Distinct List Result : ` + JSON.stringify(distResp.data));

                    // Get Message List
                    // var distResp = listResp;
                    app.getMail(opts, distResp.data).then(mailResp => {

                        app.send(opts, mailResp.data);
                    })
                });
            });
        });
    }

    app.listMail = function (opts) {

        console.log(`List message : ${process.env.GCF_LIST_URL}`);
        console.log(`List Mail Incoming Data : ` + app.getEmailAddress(opts));
        let emailAddress = app.getEmailAddress(opts);

        let reqData = {
            emailAddress: emailAddress
        };

        // Perform HTTP Post
        return axios({
                method: "POST",
                url: process.env.GCF_LIST_URL,
                headers: app.getRequestHeader(),
                data: reqData
            })
            .then(function (response) {
                console.log(`List Mail URL Response : ` + JSON.stringify(response.data));
                return response;
            });
    }

    /**
     * Distinct the List
     */
    app.distinctMail = function (opts, data) {

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

    app.getMail = function (opts, data) {

        console.log(`Get Mail : ${process.env.GCF_GET_URL}`);
        console.log(`Get Mail Incoming Data : ` + JSON.stringify(data));
        let emailAddress = app.getEmailAddress(opts);

        let reqData = {
            emailAddress: emailAddress,
            markAsRead: true,
            data: data.data
        };

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

    app.send = function (opts, obj) {
        if (obj.constructor == Object || obj.constructor == Array) {
            obj = JSON.stringify(obj, null, 2);
        }
        console.log(`Response to client : ${obj}`);

        if (opts.res != null) {
            // Notify Web
            opts.res.end(obj);
        } else {
            // Notify Bot
            if (opts.context.eventType = "google.pubsub.topic.publish") { // Notify Bot
                app.notifyBot(obj);
            }
        }
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


    /**
     * Pass from Background Event
     */
    app.listen = function (event, data) {

        // Prepare the Data object (Simulate to HTTP)
        event.data = {
            emailAddress: data.emailAddress
        }
        // Notifiy Client
        app.notify(event);
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

    // Get Email Address
    app.getEmailAddress = function (opts) {
        return (opts.req.body.emailAddress);
    }

    return app;
}

exports = module.exports = createApplication;