var C = require('./lib/constants.js').C;
var helper = require('./lib/message-helper');
var advDataParser = require('./lib/message-advdata-parser');
var ee = require("./lib/event-emitter");
var serviceTable = require("./lib/service-table");
var Service = require("./service").Service;


function Stream(gattip, objectId) {
    ee.instantiateEmitter(this);
    var self = this;

    this._objectId = objectId;

    this.getObjectId = function () {
        return self._objectId;
    };


    // REQUESTS =================================================

    this.writeData = function (callback, data) {
        helper.requireHexValue('writeData', 'data', data);
        var params = {};
        params[C.kObjectId] = self._objectId;
        params[C.kVal] = data;
        gattip.request(C.kWriteStreamData, params, callback, function (params) {
            gattip.fulfill(callback, self);
        });
    };

    this.closeStream = function (callback) {
        var params = {};
        params[C.kObjectId] = self._objectId;
        gattip.request(C.kCloseStream, params, callback, function (params) {
            gattip.fulfill(callback, self);
        });
    };
    // INDICATIONS ==============================================

    this.handleDataIndication = function (params) {
        self.emit('streamData', self, params[C.kValue]);
    };

    this.handleClosedIndication = function (params) {
        self.emit('streamClosed', self);
    };

    // SERVER RESPONSES/INDICATIONS  ============================

    this.indicateStreamData = function (data) {
        helper.requireHexValue('indicateStreamData', 'data', data);
        var params = {};
        params[C.kObjectId] = self._objectId;
        params[C.kVal] = data;
        gattip.sendIndications(C.kStreamDataIndication, params);
    };

    this.writeDataResponse = function (cookie) {
        var params = {};
        params[C.kObjectId] = self._objectId;
        cookie.result = C.kWriteStreamData;
        gattip.respond(cookie, params);
    };

    this.closeStreamResponse = function(cookie){
        var params = {};
        params[C.kObjectId] = self._objectId;
        cookie.result = C.kCloseStream;
        gattip.respond(cookie, params);
    };
}

ee.makeEmitter(Stream);

module.exports.Stream = Stream;



