function Descriptor(gattip, peripheral, service, characteristic, uuid) {
    var _gattip = gattip;
    var _peripheral = peripheral;
    var _service = service;
    var _characteristic = characteristic;
    this.uuid = uuid;
    this.value = "";
    this.descriptorName = '';
    this.properties = {};
    this.isNotifying = false;

    if (peripheral.descriptorNames && peripheral.descriptorNames[uuid]) {
        var uuidObj = peripheral.descriptorNames[uuid];
        if (uuidObj !== undefined && uuidObj !== null) {
            this.descriptorName = uuidObj.name;
        }
    }

    this.updateValue = function (value) {
        this.value = value;
        return this;
    };

    this.updateProperties = function (properties) {
        this.properties = properties;
        return this;
    };

    this.read = function (callback) {
        if (callback) this.onread = callback;
        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = _characteristic.uuid;
        params[C.kDescriptorUUID] = this.uuid
        _gattip.write(C.kGetDescriptorValue, params);
    };

    this.onread = function (params) {
        _characteristic.characteristicName = params[C.kValue];
        this.isNotifying = params[C.kIsNotifying];
        this.value = params[C.kValue];
    };

    this.readDescriptorValueRequest = function (params) {
        if(_gattip.readDescriptorValueRequest){
            _gattip.readDescriptorValueRequest(_peripheral, _service, _characteristic, this);
        }else{
            throw Error('readDescriptorValueRequest method not implemented by server');
        }
    };

    this.writeDescriptorValueRequest = function (params) {
        if(_gattip.writeDescriptorValueRequest){
            _gattip.writeDescriptorValueRequest(_peripheral, _service, _characteristic, this, params[C.kValue]);
        }else{
            throw Error('writeDescriptorValueRequest method not implemented by server');
        }        
    };

    this.respondToReadDescriptorValueRequest = function (error) {

        if (error) {
            this.errorRequest(C.kGetDescriptorValue);
        } else {
            params = {};
            params[C.kPeripheralUUID] = _peripheral.uuid;
            params[C.kServiceUUID] = _service.uuid;
            params[C.kCharacteristicUUID] = _characteristic.uuid;
            params[C.kDescriptorUUID] = this.uuid;
            params[C.kValue] = this.value;
            params[C.kIsNotifying] = this.isNotifying;

            _gattip.write(C.kGetDescriptorValue, params);
        }
    };

    this.respondToWriteDescriptorValueRequest = function (error) {

        if (error) {
            this.errorRequest(C.kWriteDescriptorValue);
        } else {
            params = {};
            params[C.kPeripheralUUID] = _peripheral.uuid;
            params[C.kServiceUUID] = _service.uuid;
            params[C.kCharacteristicUUID] = _characteristic.uuid;
            params[C.kDescriptorUUID] = this.uuid;
            params[C.kValue] = this.value;

            _gattip.write(C.kWriteDescriptorValue, params);
        }
    };


}

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== 'undefined')) {
    exports.Descriptor = Descriptor;
}

