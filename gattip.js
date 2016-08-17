var ee = require("./lib/event-emitter");
var InternalError = require("./errors").InternalError;
var ApplicationError = require("./errors").ApplicationError;
var GatewayError = require("./errors").GatewayError;
var MessageHandler = require("./lib/message-handler").MessageHandler;
var MessageProcessor = require('./lib/message-processor').MessageProcessor;
var Gateway = require("./gateway").Gateway;
var helper = require('./lib/message-helper');
var ServerMessageHandler = require("./lib/server-message-handler").ServerMessageHandler;

var NODE_CLIENT_SOCKET_CONFIG = {
    keepalive:true,
    dropConnectionOnKeepaliveTimeout:true,
    keepaliveInterval:10000, // ping every 10 seconds
    keepaliveGracePeriod:10000 // time out if pong is not received after 10 seconds
};

function GATTIP() {
    ee.instantiateEmitter(this);


    this.traceEnabled = false;
    var self = this;
    var stream;
    var processor;
    var mh;
    var smh;
    var gateway;
    this.getGateway = function() {
        return gateway;
    };

    this.traceMessage = function(message, prefix) {
        if (self.traceEnabled) {
            if ('object' == typeof message) {
                message = JSON.stringify(message);
            }
            console.log(prefix? prefix : "", message);
        }
    };

    function sendError(err) {
        self.emit('error', err);
    }

    this.getServerMessageHandler = function() {
        if(!smh) {
            sendError(new GatewayError("Server Message Handler is not Ready"));
        }
        return smh;
    };

    /** callback handling helpers */
    this.fulfill = function (cb, arg1, arg2, arg3, arg4, arg5) {
        if (typeof cb == 'object' && typeof cb.fulfill == 'function') {
            cb.fulfill(arg1, arg2, arg3, arg4, arg5);
        } else if (typeof cb == 'function') {
            cb(arg1, arg2, arg3, arg4, arg5);
        } // else no callback needed.
    };
    this.reject = function (cb, error) {
        if (typeof cb == 'object' && typeof cb.reject == 'function') {
            cb.reject(error);
        } else {
            sendError(error);
        }
    };

    function guardedProcessMessage(doParse, message, handlerFunc) {
        try {
            if (doParse) {
                message = JSON.parse(message);
            }
            handlerFunc(message);
        } catch (error) {
            sendError(error);
        }
    }

    /**
     * Opens a connection to the gateway, given the configuration parameters
     * @param config
     *  url: WebSocket URL to open. This or stream is required to issue an open()
     *  stream: Stream object implementing send() and close(), onMessage()
     */
    this.open = function (config) {
        var gw = new Gateway(this, config.scanFilters);
        processor = new MessageProcessor(this);
        mh = new MessageHandler(this, gw);
        smh = new ServerMessageHandler(this, gw);

        function waitReady(config) {
            if (config.isServer) {
                processor.on('request', function (message) {
                    self.traceMessage(message, '<req:');
                    guardedProcessMessage(false, message, smh.processMessage)
                });
                processor.on('indication', function (message) {
                    sendError(new ApplicationError("Received an indication on a server stream:" + JSON.stringify(message)));
                });
                gateway = gw;
                self.emit('ready', gw);
            } else {
                gw.configure(function () {
                    gw.centralState(function () {
                        if (!gw.isPoweredOn()) {
                            console.log('Bluetooth not power on :(');
                            self.emit('state', 'Bluetooth not power on');
                            var statePoll = setInterval(function() {
                                gw.centralState(function () {
                                    if (gw.isPoweredOn()) {
                                        clearInterval(statePoll);
                                        emitGateway();
                                    }
                                });
                            },500);
                        }else if(gw.isPoweredOn()){
                            emitGateway();
                        }
                    });
                });
            }
        }

        function emitGateway(){
            processor.on('indication', function (message) {
                self.traceMessage(message, '<ind:');
                guardedProcessMessage(false, message, mh.handleIndication)
            });
            processor.on('request', function (message) {
                sendError(new InternalError("Received a request on a client stream:" +  JSON.stringify(message)));
            });
            gateway = gw;
            self.emit('ready', gw);
        }

        function doOpen(config) {
            if (config.token) {
                gw._authenticate(function () {
                    waitReady(config);
                }, config.token,
                config.version);
            } else {
                waitReady(config);
            }
        }

        if (config.trace === true) {
            self.traceEnabled = true;
        }
        if (config.url) {
            var WebSocket;
            if (typeof window == 'object') {
                WebSocket = window.WebSocket;
            } else {
                WebSocket = require('websocket').w3cwebsocket;
            }
            stream = new WebSocket(config.url, undefined, undefined, undefined, undefined, NODE_CLIENT_SOCKET_CONFIG);
            stream.onopen = function () {
                doOpen(config);
            };
            stream.onclose = function (error) {
                self.emit('onclose', error);
            };
            stream.onerror = function (error) {
                self.emit('onerror', error);
            };

        } else if (config.stream) {
            stream = config.stream;
            doOpen(config);
        } else {
            throw new ApplicationError("URL or stream implementing a socket interface is required");
        }

        stream.onmessage = function (streamMessage) {
            guardedProcessMessage(true, streamMessage.data, processor.onMessageReceived);
        };

        processor.on('response', function (message, ctxt) {
            self.traceMessage(message, '<rsp:');
            try {
                if (message.error) {
                    self.reject(ctxt.cb, new GatewayError(message.error));
                } else {
                    if (ctxt.handler) {
                        // handler is responsible to fulfill
                        ctxt.handler(message.params);
                    } else {
                        self.fulfill(ctxt.cb);
                    }
                }
            } catch (error) {
                self.reject(ctxt.cb, error);
            }
        });

        processor.on('error', function (error) {
            self.emit('error', error);
        });
    };

    this.close = function () {
        if (stream) {
            stream.close();
        }
    };


    // INTERNAL ONLY

    this.request = function (method, params, userCb, handler) {
        var ctxt = mh.createUserContext(method, params, userCb, handler);
        var msg = ctxt.originalMessage;
        processor.register(msg, ctxt);
        self.traceMessage(msg, '>req:');
        stream.send(JSON.stringify(msg));
    };

    this.respond = function (cookie, params) {
        var msg = mh.wrapResponse(cookie, params);
        self.traceMessage(msg, '>rsp:');
        stream.send(JSON.stringify(msg));
    };

    this.sendIndications = function (result, params){
        var mesg = {
            params: params,
            jsonrpc: "2.0"
        };
        mesg.result = result;
        mesg.params = params;
        self.traceMessage(mesg, '>rsp:');
        stream.send(JSON.stringify(mesg));
    };

    this.sendError = function (mesg){
        mesg.jsonrpc = "2.0";
        self.traceMessage(mesg, '>rsp:');
        stream.send(JSON.stringify(mesg));
    };
}


ee.makeEmitter(GATTIP);
module.exports.GATTIP = GATTIP;
