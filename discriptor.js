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

}

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== "undefined")) {
    exports.Descriptor = Descriptor;
}

