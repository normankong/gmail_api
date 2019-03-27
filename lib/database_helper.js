require('dotenv').config();
let redis = require("redis");

const REDIS_PORT = process.env.REDIS_PORT;
const REDIS_HOST = process.env.REDIS_HOST
const REDIS_PASS = process.env.REDIS_PASS

let client = redis.createClient(REDIS_PORT, REDIS_HOST, {
    "auth_pass": REDIS_PASS
});

function createApplication() {
    let app = {};

    app.init = function () {}

    app.createProfile = function (emailAddress, token) {
        client.hset(emailAddress, "access_token", token, redis.print);
    }

    app.getToken = function (emailAddress, callback) {

        return new Promise((resolve, reject) => {
            client.hget(emailAddress, "access_token", (err, result) => resolve(result));
        });
    }

    app.del = function (name, callback) {
        client.del(name, callback);
    }

    app.push = function (name, json, callback) {
        client.rpush(name, json, callback);
    }

    app.getAll = function (name) {
        return new Promise((resolve, reject) => {
            client.lrange(name, 0, -1, (err, result) => resolve(result));
        });
    }

    app.init();

    return app;
}

exports = module.exports = createApplication;

// let data = require("../mapping.json");

// let result = data.accData.concat(data.ictData).concat(data.octData)

// for (let i = 0; i < result.length; i++) {
//     let json = result[i]
//     console.log(json)
//     createApplication().push("name", JSON.stringify(json), function (err, reply) {
//         console.log(reply);

//     });
// }