var helper = require('./lib/message-helper');
var Characteristic = require('./characteristic').Characteristic;

function Service(peripheral, uuid) {
    var self = this;
    var gattip = peripheral.gattip();
    var characteristics = {};

    helper.requireUUID('Service', 'uuid', uuid);
    this.uuid = uuid;
    this.type = 's';

    this.isPrimary = true; //TODO: read from remote
    // TODO: this.includedServices = {};

    this.peripheral = function () {
        return peripheral;
    };
    this.gattip = function () {
        return gattip;
    };
    this.getAllCharacteristics = function () {
        return characteristics;
    };
    this.findCharacteristic = function (uuid) {
        return characteristics[uuid];
    };
    this.addCharacteristicWithUUID = function (characteristicUUID, properties) {
        var characteristic = new Characteristic(self, characteristicUUID, properties);
        return characteristics[characteristicUUID] = characteristic;
    };

    this.addCharacteristic = function (characteristic) {
        characteristics[characteristic.uuid] = characteristic;
    };
}

exports.Service = Service;

