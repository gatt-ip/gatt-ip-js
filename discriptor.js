function Descriptor(gattip, peripheral, service, characteristic, uuid) {
    var _gattip = gattip;
    var _peripheral = peripheral;
    var _service = service;
    var _characteristic = characteristic;
    this.uuid = uuid;
    this.value = "";
    this.properties = {};
    this.isNotifying = false;

    if (uuid.length === 4) {
        if (peripheral.descriptorNames) {
            var uuidObj = peripheral.descriptorNames[uuid];
            if (uuidObj !== undefined && uuidObj !== null) {
                this.descriptorName = uuidObj.name;
            } else
                this.descriptorName = uuid;
        } else
            this.descriptorName = uuid;
    } else
        this.descriptorName = uuid;

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
    exports.Descriptor = Descriptor;
}

