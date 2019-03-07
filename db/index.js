require('dotenv').config();
const mysql = require('mysql');

const connectionName = process.env.SQL_CONNECTION;
const dbUsername = process.env.SQL_USERNAME;
const dbPassword = process.env.SQL_PASSWORD;
const dbName = process.env.SQL_DBNAME;

const mysqlConfig = {
    connectionLimit: 1,
    user: dbUsername,
    password: dbPassword,
    database: dbName,
};
if (process.env.NODE_ENV === 'production') {
    mysqlConfig.socketPath = `/cloudsql/${connectionName}`;
}

// Connection pools reuse connections between invocations,
// and handle dropped or expired connections automatically.
let mysqlPool;

exports.distinct = (req, res) => {

    if (req.body.data == null) {
        res.end(JSON.stringify({
            code: "999",
            message: "Missing params"
        }));
    }

    if (!mysqlPool) {
        mysqlPool = mysql.createPool(mysqlConfig);
    }

    const distinctFun = msgId => {
        return new Promise((resolve, reject) => {
            var statement = `INSERT INTO checking (msgid) VALUES (?)`;
            mysqlPool.query(
                statement, [
                    [msgId]
                ],
                (err, rows, fields) => {
                    console.log(err);
                    if (err) resolve("999");
                    else resolve("000");
                }
            );
        });
    };

    // Recurrsive function to check uniqueness
    let proceed = function (msgIdList, resultList) {
        if (msgIdList.length == 0) {
            res.send(JSON.stringify({
                code: "000",
                data: resultList
            }));
            return;
        }

        let msgId = msgIdList.shift();
        console.log(`Checking : ${msgId}`);
        distinctFun(msgId).then(code => {

            if (code == "000")
                resultList.push(msgId);

            // Check list
            return proceed(msgIdList, resultList);
        })
    }

    // Proceed the Checking    
    let msgIdList = req.body.data;
    return proceed(msgIdList, []);
};



// exports.mysqlDemo = (req, res) => {
//     // Initialize the pool lazily, in case SQL access isn't needed for this
//     // GCF instance. Doing so minimizes the number of active SQL connections,
//     // which helps keep your GCF instances under SQL connection limits.
//     if (!mysqlPool) {
//         mysqlPool = mysql.createPool(mysqlConfig);
//     }

//     mysqlPool.query('SELECT * from checking', (err, results) => {
//         if (err) {
//             console.error(err);
//             res.status(500).send(err);
//         } else {
//             res.send(JSON.stringify(results));
//         }
//     });

// };