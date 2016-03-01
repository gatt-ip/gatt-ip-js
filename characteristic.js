function Characteristic(gattip, peripheral, service, uuid) {
    if (typeof process === 'object' && process + '' === '[object process]') {
        C = require("./constants.js").C;
        Descriptor = require("./discriptor.js").Descriptor;
    }

    var _gattip = gattip;
    var _peripheral = peripheral;
    var _service = service;

    this.uuid = uuid;
    this.descriptors = {};
    this.properties = {};
    this.value = '';
    this.characteristicName = '';
    this.isNotifying = false;

    Object.size = function (obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };

    if (peripheral.characteristicNames && peripheral.characteristicNames[uuid]) {
        var uuidObj = peripheral.characteristicNames[uuid];
        if (uuidObj !== undefined && uuidObj !== null) {
            this.characteristicName = uuidObj.name;
        }
    }


    this.discoverDescriptors = function (callback) {
        if (callback) this.ondiscoverDescriptors = callback;

        if (this.descriptors && Object.size(this.descriptors) > 0) {
            _gattip.ondiscoverDescriptors(_peripheral, _service, this);
        } else {
            var params = {};
            params[C.kPeripheralUUID] = _peripheral.uuid;
            params[C.kServiceUUID] = _service.uuid;
            params[C.kCharacteristicUUID] = this.uuid;
            _gattip.write(C.kGetDescriptors, params);
        }
    };

    this.ondiscoverDescriptors = function (params) {
        for (var index in params[C.kDescriptors]) {
            var descriptorUUID = params[C.kDescriptors][index][C.kDescriptorUUID];
            var descriptor = this.descriptors[descriptorUUID];
            if (!descriptor) {
                descriptor = new Descriptor(_gattip, _peripheral, _service, this, descriptorUUID);
            }
            
            var props = params[C.kDescriptors][index][C.kProperties];
            for (var apindex in C.AllProperties) {
                descriptor.properties[C.AllProperties[apindex]] = {
                    enabled: (props >> apindex) & 1,
                    name: C.AllProperties[apindex]
                };
            }

            this.descriptors[descriptorUUID] = descriptor;
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

    this.discoverDescriptorsRequest = function () {
        if(_gattip.discoverDescriptorsRequest){
            _gattip.discoverDescriptorsRequest(_peripheral, _service, this);
        }else{
            throw Error('discoverDescriptorsRequest method not implemented by server');
        }
    };

    this.discoverDescriptorsResponse = function (error) {
        if(!error){
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
        }else{
            _gattip.write(C.kGetCharacteristics, kError32603, error);
        }        
    };

    this.readCharacteristicValueRequest = function (params) {
        _gattip.readCharacteristicValueRequest(_peripheral, _service, this);
    };

    this.writeCharacteristicValueRequest = function (params) {
        _gattip.writeCharacteristicValueRequest(_peripheral, _service, this, params[C.kValue]);
    };

    this.enableNotificationsRequest = function (params) {
        _gattip.enableNotificationsRequest(_peripheral, _service, this, params[C.kValue]);
    };

    this.respondToReadRequest = function (error) {

        if (error) {
            this.sendErrorResponse(C.kGetCharacteristicValue, C.kError32603, 'Failed to read the Characteristic value');
        } else {
            params = {};
            params[C.kPeripheralUUID] = _peripheral.uuid;
            params[C.kServiceUUID] = _service.uuid;
            params[C.kCharacteristicUUID] = this.uuid;
            params[C.kValue] = this.value;
            params[C.kIsNotifying] = this.isNotifying;

            _gattip.write(C.kGetCharacteristicValue, params);
        }
    };

    this.respondToWriteRequest = function (error) {

        if (error) {
            this.sendErrorResponse(C.kWriteCharacteristicValue, C.kError32603, 'Failed to write the Characteristic value');
        } else {
            params = {};
            params[C.kPeripheralUUID] = _peripheral.uuid;
            params[C.kServiceUUID] = _service.uuid;
            params[C.kCharacteristicUUID] = this.uuid;
            params[C.kValue] = this.value;

            _gattip.write(C.kWriteCharacteristicValue, params);
        }
    };

     function respondNotify(self) {

         params = {};
         params[C.kPeripheralUUID] = _peripheral.uuid;
         params[C.kServiceUUID] = _service.uuid;
         params[C.kCharacteristicUUID] = self.uuid;
         params[C.kIsNotifying] = self.isNotifying;
         params[C.kValue] = self.value;

         _gattip.write(C.kSetValueNotification, params);
    }

    this.respondWithNotification = function (value) {
        this.value = value;
        respondNotify(this);
    };

    this.respondToChangeNotification = function (isNotifying) {
        this.isNotifying = isNotifying;
        respondNotify(this);
    };

    this.addDescriptor = function (descriptorUUID) {
        var descriptor = new Descriptor(_gattip, _peripheral, _service, this, descriptorUUID);
        this.descriptors[descriptor.uuid] = descriptor;

        return descriptor;
    };

    this.updateValue = function (value) {
        this.value = value;
        return this;
    };

    this.updateProperties = function (properties) {
        this.properties = properties;
        return this;
    };

}

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== 'undefined')) {
    exports.Characteristic = Characteristic;
}
