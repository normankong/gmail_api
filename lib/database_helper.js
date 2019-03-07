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

    app.init();

    return app;
}

exports = module.exports = createApplication;