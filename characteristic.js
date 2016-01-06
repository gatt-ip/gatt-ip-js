function Characteristic(gattip, peripheral, service, uuid) {    
    if (typeof process === 'object' && process + '' === '[object process]') {
        var consts = require("./constants.js");
        C = consts.C;
    }

    var _gattip = gattip;
    var _peripheral = peripheral;
    var _service = service;

    this.uuid = uuid;
    this.descriptors = {};
    this.properties = {};
    this.value = '';
    this.isNotifying = false;
    
    if (uuid.length === 4) {
        if (peripheral.characteristicNames) {
            var uuidObj = peripheral.characteristicNames[uuid];
            if (uuidObj !== undefined && uuidObj !== null) {
                this.characteristicName = uuidObj.name;
            } else
                this.characteristicName = uuid;
        } else
            this.characteristicName = uuid;
    } else
        this.characteristicName = uuid;


    this.discoverDescriptors = function (callback) {
        if (callback) this.ondiscoverDescriptors = callback;
        
        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = this.uuid;
        _gattip.write(C.kGetDescriptors, params);
    };
    
    this.ondiscoverDescriptors = function (params) {
        for (var index in params[C.kDescriptors]) {
            var descriptorUUID = params[C.kDescriptors][index][C.kDescriptorUUID];
            var descriptor = this.descriptors[descriptorUUID];
            if (!descriptor) {
                if(typeof process === 'object' && process+'' === '[object process]') {
                    var desc = require("./discriptor.js");
                    descriptor = new desc.Descriptor(_gattip, _peripheral, _service, this, descriptorUUID);
                } else {
                    descriptor = new Descriptor(_gattip, _peripheral, _service, this, descriptorUUID);
                }
                this.descriptors[descriptorUUID] = descriptor;
            }
        }
    };
    
    this.read = function (callback) {
        if (callback) this.onread = callback;            
        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = this.uuid;
        _gattip.write(C.kGetCharacteristicValue, params);
    };
    
    this.onread = function (params) {
        this.isNotifying = params[C.kIsNotifying];
        this.value = params[C.kValue];
    };
    
    this.write = function (data, callback) {
        var restype;
        if (this.properties["WriteWithoutResponse"].enabled == 1 || this.properties["Indicate"].enabled == 1) {
            restype = C.kWriteWithoutResponse;
        } else {
            restype = C.kWriteResponse;
        }
        this.writeWithResType(data, restype, callback);
    };
    
    this.writeWithResType = function (data, restype, callback) {
        if (callback) this.onread = callback;
        
        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = this.uuid;
        params[C.kValue] = data;
        params[C.kWriteType] = restype;
        _gattip.write(C.kWriteCharacteristicValue, params);
    };
    
    this.onwrite = function (params, error) {
    };
    
    this.notify = function (value, callback) {
        if (callback) this.onread = callback;
        
        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = this.uuid;
        params[C.kValue] = value;
        this.isNotifying = value;
        
        _gattip.write(C.kSetValueNotification, params);
    };
    
    this.indicate = function (callback) {
        if (callback) this.onread = callback;
        
        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = this.uuid;
        
        _gattip.write(C.kGetCharacteristicValue, params);
    };
    
    this.broadcast = function (callback) {
        if (callback) this.onread = callback;
        
        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = this.uuid;
        
        _gattip.write(C.kGetCharacteristicValue, params);
    };

    this.discoverDescriptorsRequest = function(params, error) {
        params = {};
        var discArray = [];

        for (var uuid in this.descriptors) {
            var obj = {};
            obj[C.kDescriptorUUID] = this.descriptors[uuid].uuid;
            obj[C.kProperties] = this.descriptors[uuid].properties;
            obj[C.kValue] = this.descriptors[uuid].value;
            obj[C.kIsNotifying] = this.descriptors[uuid].isNotifying;
            discArray.push(obj);
        }
        params[C.kDescriptors] = discArray;
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = this.uuid;

        _gattip.write(C.kGetDescriptors, params);
    };

    this.readRequest = function(params, error) {
        _gattip.readRequest(_peripheral, _service, this, error);
    };

    this.writeRequest = function(params, error) {
        _gattip.writeRequest(_peripheral, _service, this, params[C.kValue], error);
    };

    this.notifyRequest = function(params, error) {
        _gattip.notifyRequest(_peripheral, _service, this, params[C.kValue], error);
    };

    this.respondToReadRequest = function(peripheral, service, characteristic, error){

        if(error){
            this.errorRequest(C.kGetCharacteristicValue);
        }else{
            params = {};
            params[C.kPeripheralUUID] = peripheral.uuid;
            params[C.kServiceUUID] = service.uuid;
            params[C.kCharacteristicUUID] = characteristic.uuid;        
            params[C.kValue] = characteristic.value;

            _gattip.write(C.kGetCharacteristicValue, params);
        }
    };

    this.respondToWriteRequest = function(peripheral, service, characteristic, value, error){

        if(error){
            this.errorRequest(C.kWriteCharacteristicValue);
        }else{
            params = {};
            params[C.kPeripheralUUID] = peripheral.uuid;
            params[C.kServiceUUID] = service.uuid;
            params[C.kCharacteristicUUID] = characteristic.uuid;        
            params[C.kValue] = value;

            _gattip.write(C.kWriteCharacteristicValue, params);
        }
    };

    this.respondNotify = function(peripheral, service, characteristic, isNotifying, error){
        params = {};
        params[C.kPeripheralUUID] = peripheral.uuid;
        params[C.kServiceUUID] = service.uuid;
        params[C.kCharacteristicUUID] = characteristic.uuid;
        params[C.kIsNotifying] = isNotifying;
        params[C.kValue] = isNotifying;

        _gattip.write(C.kSetValueNotification, params);
    };

    this.addDescriptor = function(descriptorUUID) {
        var descriptor;

        if(typeof process === 'object' && process+'' === '[object process]') {
            var desc = require("./discriptor.js");
            descriptor = new desc.Descriptor(_gattip, _peripheral, _service, this, descriptorUUID);
        } else {
            descriptor = new Descriptor(_gattip, _peripheral, _service, this, descriptorUUID);
        }
        this.descriptors[descriptor.uuid] = descriptor;

        return descriptor;
    };

    this.updateValue = function(value) {
        this.value = value;
        return this;
    };

    this.updateProperties = function(properties) {
        this.properties = properties;
        return this;
    };

}

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== "undefined")) {
    exports.Characteristic = Characteristic;
}
