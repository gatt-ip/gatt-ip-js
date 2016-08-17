var C = require("./lib/constants.js").C;
var helper = require('./lib/message-helper');

// TODO: Errors if not connected
function Descriptor(characteristic, uuid) {
    var self = this;
    var service = characteristic.service();
    var peripheral = service.peripheral();
    var gattip = peripheral.gattip();

    helper.requireUUID('Descriptor', 'uuid', uuid);
    this.uuid = uuid;
    this.type = 'd';

    //this.value = undefined;
    this.characteristic = function () {
        return characteristic;
    };
    this.service = function () {
        return service;
    };
    this.peripheral = function () {
        return peripheral;
    };
    this.gattip = function () {
        return gattip;
    };

    // REQUESTS =================================================

    this.readValue = function (callback) {
        var params = helper.populateParams(self);
        gattip.request(C.kGetDescriptorValue, params, callback, function (params) {
            helper.requireFields('readValue', params, [C.kValue], []);
            self.value = params[C.kValue];
            gattip.fulfill(callback, self, self.value);
        });
    };

    //TODO: Nake sure it's not longer than 20 bytes
    this.writeValue = function (callback, value) {
        var params = helper.populateParams(self);
        helper.requireHexValue('writeValue', 'value', value);
        gattip.request(C.kWriteDescriptorValue, params, callback, function (params) {
            self.value = value;
            gattip.fulfill(callback, self);
        });
    };


    // SERVER RESPONSES/INDICATIONS  ============================

    this.respondToReadRequest = function (cookie, value) {
        var params = helper.populateParams(self);
        helper.requireHexValue('respondToReadRequest', 'value', value);
        params[C.kValue] = value;
        gattip.respond(cookie, params);
    };

    this.respondToWriteRequest = function (cookie) {
        var params = helper.populateParams(self);
        gattip.respond(cookie, params);
    };
}


module.exports.Descriptor = Descriptor;

