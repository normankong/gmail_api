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
        // Parse Message for delivery
        for (let i = 0; i < octList.length; i++) {

            let bank = octList[i];
            let body = textParser.parseMessage(text, bank.head, bank.tail);
            if (body == null) continue;

            let debitAccount = textParser.parseMessage(body, bank.acctHead, bank.acctTail);
            let payee = textParser.parseMessage(body, bank.payeeHead, bank.payeeTail);
            let debitAmount = textParser.parseMessage(body, bank.amtHead, bank.amtTail);

            let result = {
                code: "000",
                type: "OCT",
                bank: bank.name,
                payee: payee,
                debitAmount: debitAmount,
                debitAccount: debitAccount
                //,raw: text
            }
            return result;
        }
        return null;
    }

    app.parseICT = function (text) {

        // Parse Message for delivery
        for (let i = 0; i < ictList.length; i++) {

            let bank = ictList[i];
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



// ICT List
var ictList = [];
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
ictList.push(bank);

// OCT List
var octList = [];
var bank = {
    name: "HSBC",
    head: "debited your account according to your payment instruction. Please see the details below: ",
    tail: "Please log on to HSBC Internet Banking, HSBC Mobile Banking or contact our customer service hotline 22333322 for details.",

    payeeHead: "Payee Proxy ID: ",
    payeeTail: "<br><br></font>",

    acctHead: "Account no. debited: ",
    acctTail: "<br><br></font>",

    amtHead: "Payment amount: ",
    amtTail: "<br><br></font>"
}
octList.push(bank);


var stmtList = [];
var stmt = {
    name: "HSBC",
    head: "eAdvice for your account(s):<br></font><br><font style=\"font-family:arial; font-size:12px;\">",
    tail: "<br><br>"
}
stmtList.push(stmt)