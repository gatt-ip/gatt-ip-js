var C = require("./lib/constants.js").C;
var helper = require('./lib/message-helper');
var ee = require("./lib/event-emitter");
var Descriptor = require("./descriptor").Descriptor;

// TODO: Errors if not connected
function Characteristic(service, uuid, props) {
    ee.instantiateEmitter(this);
    var self = this;
    var peripheral = service.peripheral();
    var gattip = peripheral.gattip();
    var descriptors = {};
    var properties = {};

    helper.requireUUID('Characteristic', 'uuid', uuid);
    this.uuid = uuid;
    if (!props) {
        props = {};
    }
    properties = props;
    this.type = 'c';

    //this.value = undefined;
    this.isNotifying = false;

    this.gattip = function () {
        return gattip;
    };
    this.peripheral = function () {
        return peripheral;
    };
    this.service = function () {
        return service;
    };
    this.getAllDescriptors = function () {
        return descriptors;
    };
    this.findDescriptor = function (uuid) {
        return descriptors[uuid];
    };
    this.addDescriptorWithUUID = function (descriptorUUID) {
        var descriptor = new Descriptor(self, descriptorUUID);
        return descriptors[descriptorUUID] = descriptor;
    };
    this.addDescriptor = function (descriptor) {
        return descriptors[descriptor.uuid] = descriptor;
    };
    // TODO: Explain properties
    this.hasProperty = function (type) {
        return (properties[type] && properties[type].enabled);
    };
    this.setProperty = function (type, value) {
        return (properties[type] = value);
    };
    this.allProperties = function () {
        return properties;
    };


    // REQUESTS =================================================

    this.readValue = function (callback) {
        var params = helper.populateParams(self);
        gattip.request(C.kGetCharacteristicValue, params, callback, function (params) {
            helper.requireFields('Value', params, [C.kValue], []);
            self.value = params[C.kValue];
            gattip.fulfill(callback, self, self.value);
        });
    };

    this.writeValue = function (callback, value) {
        helper.requireHexValue('writeValue', 'value', value);
        var params = helper.populateParams(self);
        params[C.kValue] = value;
        gattip.request(C.kWriteCharacteristicValue, params, callback, function (params) {
            self.value = value;
            gattip.fulfill(callback, self);
        });
    };

    this.enableNotifications = function (callback, isNotifying) {
        helper.requireBooleanValue('enableNotifications', 'isNotifying', isNotifying);
        var params = helper.populateParams(self);
        params[C.kIsNotifying] = isNotifying;
        gattip.request(C.kSetValueNotification, params, callback, function (params) {
            self.isNotifying = isNotifying;
            gattip.fulfill(callback, self, isNotifying);
        });
    };


    // INDICATIONS ==============================================

    this.handleValueNotification = function (params) {
        self.value = params[C.kValue];
        self.emit('valueChange', self, self.value);
    };


    // SERVER RESPONSES/INDICATIONS  ============================

    this.respondToReadRequest = function (cookie, value) {
        helper.requireHexValue('respondToReadRequest', 'value', value);
        var params = helper.populateParams(self);
        params[C.kValue] = value;
        cookie.result = C.kGetCharacteristicValue;
        gattip.respond(cookie, params);
    };

    this.respondToWriteRequest = function (cookie) {
        var params = helper.populateParams(self);
        cookie.result = C.kWriteCharacteristicValue;
        gattip.respond(cookie, params);
    };

    this.respondToChangeNotification = function (cookie, isNotifying) {
        var params = helper.populateParams(self);
        helper.requireBooleanValue('respondToChangeNotification', 'value', isNotifying);
        params[C.kIsNotifying] = isNotifying;
        this.isNotifying = isNotifying;
        cookie.result = C.kSetValueNotification;
        gattip.respond(cookie, params);
    };

    this.indicateValueChange = function (value) {
        helper.requireHexValue('writeValue', 'value', value);
        var params = helper.populateParams(self);
        params[C.kValue] = value;
        gattip.sendIndications(C.kSetValueNotification, params);
    };

}
ee.makeEmitter(Characteristic);

module.exports.Characteristic = Characteristic;
