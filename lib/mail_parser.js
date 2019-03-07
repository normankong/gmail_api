require('dotenv').config();

let textParser = require("./text_parser.js");

function createApplication() {

    let app = {};

    app.init = function () {}

    app.parseSTM = function (text) {
        text = text.replace(/[\t\n]+/g, '');
        // Parse Message for delivery
        for (let i = 0; i < stmtList.length; i++) {

            let bank = stmtList[i];
            let body = textParser.parseMessage(text, bank.head, bank.tail);
            if (body == null) continue;

            let result = {
                code: "000",
                type: "STM",
                bank: bank.name,
                acct: body
            }
            return result;
        }
        return null;
    }

    app.parseOCT = function (text) {
        return null;
    }

    app.parseICT = function (text) {

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
                type: "ICT",
                bank: bank.name,
                payer: payer,
                creditAmount: creditAmount,
                creditAccount: creditAccount
                //,raw: text
            }
            return result;
        }

        return null;
    }

    return app;
}

exports = module.exports = createApplication;



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


var stmtList = [];
var stmt = {
    name: "HSBC",
    head: "eAdvice for your account(s):<br></font><br><font style=\"font-family:arial; font-size:12px;\">",
    tail: "<br><br>"
}
stmtList.push(stmt)