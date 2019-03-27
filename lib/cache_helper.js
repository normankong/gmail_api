require('dotenv').config();

let databaseHelper = require("./database_helper.js");

function createApplication() {

    let app = {};

    app.init = function () {}

    app.delMapping = function (name, opts) {
        databaseHelper().del(name, function (err, reply) {
            opts.res.json({
                code: "000",
                message: "Delete " + reply
            })
        });
    }

    app.getMapping = function (name, opts) {
        databaseHelper().getAll(name).then(x => {
            let result = x.join(",");
            result = `{ "data" : [${result}]}`;
            console.log(result);
            let json = JSON.parse(result);
            opts.res.json(json);
        });
    }

    app.putMapping = function (name, opts) {
        let data = opts.req.body.data;
        if (data === null) {
            return opts.res.status(401).json({
                code: "999",
                message: "Missing parameter"
            });
        }

        let json = JSON.stringify(data);
        databaseHelper().push(name, json, function (err, reply) {
            opts.res.json({
                code: "000",
                message: "Update " + reply
            })
        });
    }

    app.init();

    return app;
}

exports = module.exports = createApplication;