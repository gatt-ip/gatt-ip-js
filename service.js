function Service(gattip, peripheral, uuid) {

    if (typeof process === 'object' && process + '' === '[object process]') {
        var consts = require("./constants.js");
        C = consts.C;
    }

    var _gattip = gattip;
    var _peripheral = peripheral;

    this.uuid = uuid;
    this.isPrimary = true; //TODO: read from remote
    this.characteristics = {};
    this.includedServices = {}; 
       
    if (uuid.length === 4) {
        if (peripheral.serviceNames) {
            var uuidObj = peripheral.serviceNames[uuid];
            if (uuidObj !== undefined && uuidObj !== null) {
                this.serviceName = uuidObj.name;
            } else
                this.serviceName = uuid;
        } else
            this.serviceName = uuid;
    } else
        this.serviceName = uuid;


    this.discoverIncludedServices = function(callback) {};

    this.ondiscoverIncludedServices = function(error) {};

    this.discoverCharacteristics = function(callback) {
        if (callback) this.ondiscoverCharacteristics = callback;

        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = this.uuid;
        _gattip.write(C.kGetCharacteristics, params);
    };

    this.ondiscoverCharacteristics = function(params) {
        for (var index in params[C.kCharacteristics]) {
            var characteristicUUID = params[C.kCharacteristics][index][C.kCharacteristicUUID];
            var characteristic = this.characteristics[characteristicUUID];
            if (!characteristic) {
                if(typeof process === 'object' && process+'' === '[object process]') {
                    var c = require("./characteristic.js");
                    characteristic = new c.Characteristic(_gattip, _peripheral, this, characteristicUUID);
                } else {
                    characteristic = new Characteristic(_gattip, _peripheral, this, characteristicUUID);
                }
                this.characteristics[characteristicUUID] = characteristic;
            }
            characteristic.value = params[C.kCharacteristics][index][C.kValue];

            var props = params[C.kCharacteristics][index][C.kProperties];
            for (var apindex in C.AllProperties) {
                characteristic.properties[C.AllProperties[apindex]] = {
                    enabled: (props >> apindex) & 1,
                    name: C.AllProperties[apindex]
                };
            }

            characteristic.isNotifying = params[C.kCharacteristics][index][C.kIsNotifying];
        }
    };

    this.discoverCharacteristicsRequest = function(params, error) {
        params = {};
        var charsArray = [];

        for (var uuid in this.characteristics) {
            var obj = {};
            obj[C.kCharacteristicUUID] = this.characteristics[uuid].uuid;
            obj[C.kProperties] = (this.characteristics[uuid].properties) ? this.characteristics[uuid].properties.toString() : '';
            obj[C.kValue] = this.characteristics[uuid].value;
            obj[C.kIsNotifying] = this.characteristics[uuid].isNotifying;
            charsArray.push(obj);
        }
        params[C.kCharacteristics] = charsArray;
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = this.uuid;

        _gattip.write(C.kGetCharacteristics, params);
    };

    this.addCharacteristic = function(characteristicUUID) {
        var characteristic;

        if(typeof process === 'object' && process+'' === '[object process]') {
            var c = require("./characteristic.js");
            characteristic = new c.Characteristic(_gattip, _peripheral, this, characteristicUUID);
        } else {
            characteristic = new Characteristic(_gattip, _peripheral, this, characteristicUUID);
        }        
        this.characteristics[characteristic.uuid] = characteristic;
        
        return characteristic;
    };
}

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== "undefined")) {
    exports.Service = Service;
}

