var ee = require('./event-emitter');
var C = require('./constants').C;
var ApplicationError = require('./../errors').ApplicationError;

var id = 1;

var hackAlert1Sent = false;
var hackAlert2Sent = false;

function MessageContext(processor, msg, userContext, timeoutMs) {
    this.msg = msg;
    this.userContext = userContext;
    if ('undefined' == typeof msg.id) {
        msg.id = Number(id++).toString();
    }
    this.id = msg.id;
    if (!timeoutMs) {
        timeoutMs = C.DEFAULT_MESSAGE_TIMEOUT_MS;
    }
    var self = this;
    this.timeout = setTimeout(function () {
            delete self.timeout;
            console.warn("Timeout occurred for message", JSON.stringify(msg));
            processor.emit('error', new ApplicationError("Timed out : "+ JSON.stringify(msg)), self.userContext.cb);
        },
        timeoutMs
    );

}

function MessageProcessor() {
    ee.instantiateEmitter(this);
    var self = this;
    var pendingMessages = {};


    /**
     *     Registers a message with ID and callback into the message queue so that we can correspond it when we get the callback and and then invoke the callback
     * @param msg Message to send
     * @param userContext an arbitrary context that will be stored and returned when the response is received
     * @param timeoutMs Optional timeout for the message response to be received
     * @returns {*}
     */
    this.register = function (msg, userContext, timeoutMs) {
        if (Object.keys(pendingMessages).length > C.MAX_PENDING_MESSAGES) {
            throw new ApplicationError("Message queue is full", msg);
        }
        var entry = new MessageContext(self, msg, userContext, timeoutMs);
        pendingMessages[entry.id] = entry;
        return entry.msg;
    };

    this.hasMessage = function (msgId) {
        var entry = pendingMessages['' + msgId];
        return !!entry;
    };

    this.onMessageReceived = function (msg) {
        var entry;
        if (msg.params && msg.params.id) {
            console.warn("HACK ALERT: ID is in params!?!");
            msg.id = msg.params.id;
        }
        if (msg.id) {
            entry = pendingMessages['' + msg.id];
        }
        if (!entry) {
            if (!msg.id) {
                if (msg.result == C.kMessage) {
                    if (!hackAlert1Sent) {
                        hackAlert1Sent = true;
                        console.warn("HACK ALERT: Hacking the authenticate message");
                    }
                    msg.id = '1';
                    entry = pendingMessages['1'];
                } else {
                    self.emit('indication', msg);
                    return;
                }
            } else {
                if (msg.result == C.kScanForPeripherals && msg.params && msg.params.bb) {
                    if (!hackAlert2Sent) {
                        hackAlert2Sent = true;
                        console.warn("HACK ALERT: Scan response has an ID");
                    }
                    self.emit('indication', msg);
                    return;
                }
                self.emit('request', msg);
                return;
            }
        }
        if (entry.timeout) {
            clearTimeout(entry.timeout);
        }
        delete pendingMessages[msg.id];
        self.emit('response', msg, entry.userContext, entry.msg);
    };
}

ee.makeEmitter(MessageProcessor);
module.exports.MessageProcessor = MessageProcessor;
