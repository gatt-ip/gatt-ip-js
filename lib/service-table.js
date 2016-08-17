var C = require('./constants').C;
var Service = require('./../service').Service;
var Characteristic = require('./../characteristic').Characteristic;
var Descriptor = require('./../descriptor').Descriptor;

function parseDescriptorFromScanResponse(characteristic, params) {
    var duuid = params[C.kDescriptorUUID];

    var descriptor = characteristic.findDescriptor(duuid);
    if (!descriptor) {
        descriptor = new Descriptor(characteristic, duuid);
        characteristic.addDescriptor(descriptor);
    }

    descriptor.value = params[C.kValue];
}
function parseCharacteristicFromScanResponse(service, params) {
    var cuuid = params[C.kCharacteristicUUID];

    var characteristic = service.findCharacteristic(cuuid);
    if (!characteristic) {
        characteristic = new Characteristic(service, cuuid);
        service.addCharacteristic(characteristic);
    }

    characteristic.value = params[C.kValue];

    var cprops = params[C.kProperties];

    if (typeof cprops === 'object') {
        for (var flag in cprops) {
            characteristic.setProperty(
                flag,
                {
                    enabled: cprops[flag].enabled,
                    name: cprops[flag].name
                }
            );
        }
    } else {
        for (var apindex in C.AllProperties) {
            characteristic.setProperty(
                [C.AllProperties[apindex]],
                {
                    enabled: (cprops >> apindex) & 1,
                    name: C.AllProperties[apindex]
                }
            );
        }
    }
    characteristic.isNotifying = false;

    var descriptors = params[C.kDescriptors];
    if (descriptors) {
        for (var didx in descriptors) {
            var dparams = descriptors[didx];
            parseDescriptorFromScanResponse(characteristic, dparams);
        }
    }


}
function parseServiceFromScanResponse(peripheral, params) {
    var suuid = params[C.kServiceUUID];
    var service = peripheral.findService(suuid);
    if (!service) {
        service = new Service(peripheral, suuid);
        peripheral.addService(service);
    }

    var characteristics = params[C.kCharacteristics];
    if (characteristics) {
        for (var cidx in characteristics) {
            var cparams = characteristics[cidx];
            parseCharacteristicFromScanResponse(service, cparams);
        }
    }
}

module.exports.parseServiceRecord = function(peripheral, params) {
    var services = params[C.kServices];
    if (services) {
        for (var sidx in services) {
            var sparams = services[sidx];
            parseServiceFromScanResponse(peripheral, sparams)
        }
    }
};

//Parse the peripheral object & get the service DB.
function getDescriptorJsonFromCharacteristicObject(myCharacteristic) {
    var descriptor_db = {};

    if (myCharacteristic && myCharacteristic.getAllDescriptors()) {
        for (var uuid in myCharacteristic.getAllDescriptors()) {
            var temp_descriptor = {};
            temp_descriptor[C.kDescriptorUUID] = uuid;
            temp_descriptor[C.kValue] = myCharacteristic.findDescriptor(uuid).value;
            temp_descriptor[C.kProperties] = myCharacteristic.findDescriptor(uuid).properties;
            temp_descriptor[C.kIsNotifying] = myCharacteristic.findDescriptor(uuid).isNotifying;

            descriptor_db[uuid] = temp_descriptor;
        }
    }

    return descriptor_db;
}
function getCharacteristicJsonFromServiceObject(myService) {
    var characteristic_db = {};

    if (myService && myService.getAllCharacteristics()) {
        for (var uuid in myService.getAllCharacteristics()) {
            var temp_characteristic = {};
            temp_characteristic[C.kCharacteristicUUID] = uuid;
            temp_characteristic[C.kValue] = myService.findCharacteristic(uuid).value;
            temp_characteristic[C.kProperties] = myService.findCharacteristic(uuid).allProperties();
            temp_characteristic[C.kIsNotifying] = myService.findCharacteristic(uuid).isNotifying;
            temp_characteristic[C.kDescriptors] = getDescriptorJsonFromCharacteristicObject(myService.findCharacteristic(uuid));

            characteristic_db[uuid] = temp_characteristic;
        }
    }

    return characteristic_db;
}

module.exports.getServiceJsonFromPeripheralObject = function(myPeripheral) {
    var service_db = {};

    if (myPeripheral && myPeripheral.getAllServices()) {
        for (var uuid in myPeripheral.getAllServices()) {
            var temp_service = {};
            temp_service[C.kServiceUUID] = uuid;
            temp_service[C.kIsPrimaryKey] = myPeripheral.findService(uuid).isPrimary;
            temp_service[C.kCharacteristics] = getCharacteristicJsonFromServiceObject(myPeripheral.findService(uuid));

            service_db[uuid] = temp_service;
        }
    }

    return service_db;
};

