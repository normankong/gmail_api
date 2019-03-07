'use strict';

function parseMessage(text, head, tail) {
    let headIndex = text.indexOf(head);
    if (headIndex != -1) {

        let body = text.substring(headIndex + head.length);
        let tailIndex = body.indexOf(tail);
        if (tailIndex != -1) {
            let result = body.substring(0, tailIndex);
            return result;
        }
    }
    return null;
}

function parseMessageList(text, head, tail) {
    var parseInternal = function (text, head, tail, resultList) {
        let headIndex = text.indexOf(head);
        if (headIndex != -1) {
            let body = text.substring(headIndex + head.length);
            let tailIndex = body.indexOf(tail);
            if (tailIndex != -1) {
                let result = body.substring(0, tailIndex);
                let residual = body.substring(tailIndex + tail.length);
                resultList.push(result);
                parseMessageList(residual, head, tail, resultList);
            }
        }
        return resultList;
    }
    return parseInternal(text, head, tail, []);
}

exports.parseMessage = parseMessage;
exports.parseMessageList = parseMessageList;