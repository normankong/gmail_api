require('dotenv').config();

let axios = require("axios");
let databaseHelper = require("./database_helper.js");
let authHelper = require("./auth_helper.js");

function createApplication() {

    let app = {};

    app.init = function () {}

    app.notify = function (opts) {

        if (opts.req.body.emailAddress == "") return app.send("Bad request");

        let emailAddress = app.getEmailAddress(opts);
        console.log(`Application Notify : ${emailAddress}`);

        let jwtToken = authHelper().generateToken(opts.req.body.emailAddress);
        console.log(`JwtToken : ${jwtToken}`);
        opts.jwtToken = jwtToken;

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
                headers: app.getRequestHeader(opts),
                data: reqData
            })
            .then(function (response) {
                console.log(`List Mail URL Response : ` + JSON.stringify(response.data));
                return response;
            }).catch(error => {
                console.log(error);
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
                headers: app.getRequestHeader(opts),
                data: reqData
            })
            .then(function (response) {
                console.log(`Distinc List Response : ` + JSON.stringify(response.data));
                return response;
            }).catch(error => {
                console.log(error);
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
                headers: app.getRequestHeader(opts),
                data: reqData
            })
            .then(function (response) {
                console.log(`Get Mail Response Data ` + JSON.stringify(response.data));
                return response;
            }).catch(error => {
                console.log(error);
            });
    }

    app.send = function (opts, obj) {

        // Notify Web
        if (opts.res != null) {
            if (obj.constructor == Object || obj.constructor == Array) {
                obj = JSON.stringify(obj, null, 2);
            }
            console.log(`Response to client : ${obj}`);
            
            opts.res.end(obj);
        } else {
            // Notify Bot
            if (opts.context.eventType = "google.pubsub.topic.publish") { // Notify Bot
                app.notifyBot(opts, obj);
            }
        }
    }

    /**
     * Notify Bot
     */
    app.notifyBot = function (opts, data) {

        console.log(`Notify Bot: ${process.env.BOT_NOTIFY_URL}`);
        console.log(`Notify Bot Incoming Data`, data);

        if (data.code != "000") return console.log("Skip sending as code != 000");

        // Perform HTTP Post
        return axios({
                method: "POST",
                url: process.env.BOT_NOTIFY_URL,
                headers: app.getRequestHeader(opts),
                data: data
            })
            .then(function (response) {
                console.log(`Notify Bot Response : `, response.data);
                return response;
            }).catch(error => {
                console.log("Error response :");
                console.log(error);
            });
    }


    /**
     * Pass from Background Event
     */
    app.listen = function (event, data) {

        // Prepare the Data object (Simulate to HTTP)
        event.req = {
            body: {
                emailAddress: data.emailAddress
            }
        }
        // Notifiy Client
        app.notify(event);
    }


    // Append JSON Header
    app.getRequestHeader = function (opts) {

        axios.defaults.headers.common['Authorization'] = opts.jwtToken;

        let header = {
            headers: {
                'Content-Type': "application/json"
            }
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