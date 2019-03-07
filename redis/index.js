var redis = require("redis"),
    client = redis.createClient("18311", "redis-18311.c1.ap-southeast-1-1.ec2.cloud.redislabs.com",
{
    "auth_pass" : "DbRq8vzHdhai04n2FeFqRXTDcqlZJdPg"
});
    // nconf.get('redisPort') || '6379',
    // nconf.get('redisHost') || '127.0.0.1',
    // {
    //   'auth_pass': nconf.get('redisKey'),
    //   'return_buffers': true
    // }

// if you'd like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });

client.on("error", function (err) {
    console.log("Error " + err);
});

// client.hset("normankong@gmail.com", "access_token", "@#$%^&*%$#@#$%^&*(", redis.print);
// client.hset("normankongcasual@gmail.com", "access_token", "12313131", redis.print);
// client.hset("normankongjunk@gmail.com", "access_token", "aaaaaa", redis.print);
let key= "normankong@gmail.com";
client.hkeys(key, function (err, replies) {
    console.log(replies.length + " replies:");
    replies.forEach(function (reply, i) {
        console.log("    " + i + ": " + reply);
        client.hget(key, reply, redis.print)
    });
    client.quit();
});

client.flushdb( function (err, succeeded) {
    console.log(succeeded); // will be true if successfull
});
// client.set("string key", "string val", redis.print);
// client.hset("hash key", "hashtest 2aaa", "some value1", redis.print);
// client.hset("hash key", "hashtest 3aaa", "some value2", redis.print);
// client.hset("hash key", "hashtest 4aaa", "some value3", redis.print);
// client.hset("hash key", "hashtest 1aaa", "some value4", redis.print);

// client.hset(["hash key", "hashtest 2", "some other value"], redis.print);
// client.hkeys("hash key", function (err, replies) {
//     console.log(replies.length + " replies:");
//     replies.forEach(function (reply, i) {
//         console.log("    " + i + ": " + reply);
//     });
//     client.quit();
// });