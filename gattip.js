function GATTIP() {

    if (typeof process === 'object' && process + '' === '[object process]') {
        C = require("./constants.js").C;
        Peripheral = require("./peripheral.js").Peripheral;
        WebSocket = require('websocket').w3cwebsocket;
    }

    var client;
    this.peripherals = {};

    this.init = function(url, callback) {

        if (callback) this.oninit = callback;

        this.socket = new WebSocket(url);

        this.socket.onopen = function() {
            this.initWithClient(this.socket);
            if (this.oninit) {
                this.oninit();
            }
        }.bind(this);
    };

    this.initWithClient = function(_client) {
        this.state = C.kUnknown;
        client = _client;
        client.onmessage = this.processMessage.bind(this);
    };

    this.processMessage = function(mesg) {
        var response = JSON.parse(mesg.data);
        var peripheral, service, characteristic, descriptor, gObject = {};

        switch (response.result) {
            case C.kConfigure:
                this.onconfigure(response.params, response.error);
                break;
            case C.kScanForPeripherals:
                if (response.params && response.params[C.kPeripheralUUID])
                    peripheral = this.peripherals[response.params[C.kPeripheralUUID]];
                if (peripheral) {
                    peripheral.updatePeripheral(response.params[C.kPeripheralName],
                        response.params[C.kPeripheralBtAddress],
                        response.params[C.kRSSIkey],
                        response.params[C.kCBAdvertisementDataTxPowerLevel],
                        response.params[C.kCBAdvertisementDataServiceUUIDsKey],
                        response.params[C.kCBAdvertisementDataManufacturerDataKey],
                        response.params[C.kCBAdvertisementDataServiceDataKey],
                        response.params[C.kAdvertisementDataKey],
                        response.params[C.kScanRecord]);
                } else {
                    peripheral = new Peripheral(this,
                        response.params[C.kPeripheralName],
                        response.params[C.kPeripheralUUID],
                        response.params[C.kPeripheralBtAddress],
                        response.params[C.kRSSIkey],
                        response.params[C.kCBAdvertisementDataTxPowerLevel],
                        response.params[C.kCBAdvertisementDataServiceUUIDsKey],
                        response.params[C.kCBAdvertisementDataManufacturerDataKey],
                        response.params[C.kCBAdvertisementDataServiceDataKey],
                        response.params[C.kAdvertisementDataKey],
                        response.params[C.kScanRecord]);

                    this.peripherals[response.params[C.kPeripheralUUID]] = peripheral;
                }
                this.onscan(peripheral, response.error);
                break;
            case C.kStopScanning:
                this.onstopScan(response.error);
                break;
            case C.kConnect:
                if (response.params && response.params[C.kPeripheralUUID])
                    peripheral = this.peripherals[response.params[C.kPeripheralUUID]];
                if (!response.error) {
                    if (peripheral) {
                        peripheral.ondiscoverServices(response.params, response.error);
                        for (var suuid in response.params[C.kServices]) {
                            service = peripheral.services[suuid];
                            if (service) {
                                service.ondiscoverCharacteristics(response.params[C.kServices][suuid], response.error);
                                for (var cuuid in service.characteristics) {
                                    characteristic = service.characteristics[cuuid];
                                    if (characteristic) {
                                        characteristic.ondiscoverDescriptors(response.params[C.kServices][service.uuid][C.kCharacteristics][cuuid], response.error);
                                    } else {
                                        this.onerror("Characteristic not found");
                                    }
                                }
                            } else {
                                this.onerror("Service not found");
                            }
                        }
                        peripheral.onconnect();
                    } else {
                        this.onerror("Peripheral not found");
                    }
                } else {
                    if (peripheral)
                        peripheral.onconnect(response.error);
                }
                this.onconnect(peripheral, response.error);
                break;
            case C.kDisconnect:
                if (response.params) {
                    gObject = this.getObjects('P', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                    if (gObject.peripheral) {
                        gObject.peripheral.ondisconnect(response.error);
                    }
                }
                this.ondisconnect(gObject.peripheral, response.error);
                break;
            case C.kCentralState:
                this.state = response.params[C.kState];
                this.onstate(response.params[C.kState], response.error);
                break;
            case C.kGetServices:
                if (response.params) {
                    gObject = this.getObjects('P', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                    if (gObject.peripheral) {
                        gObject.peripheral.ondiscoverServices(response.params, response.error);
                    }
                }
                this.ondiscoverServices(gObject.peripheral, response.error);
                break;
            case C.kGetCharacteristics:
                if (response.params) {
                    gObject = this.getObjects('S', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                    if (gObject.service) {
                        gObject.service.ondiscoverCharacteristics(response.params, response.error);
                    }
                }
                this.ondiscoverCharacteristics(gObject.peripheral, gObject.service, response.error);
                break;
            case C.kGetDescriptors:
                if (response.params) {
                    gObject = this.getObjects('C', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                    if (gObject.characteristic) {
                        gObject.characteristic.ondiscoverDescriptors(response.params, response.error);
                    }
                }
                this.ondiscoverDescriptors(gObject.peripheral, gObject.service, gObject.characteristic, response.error);
                break;
            case C.kGetCharacteristicValue:
                if (response.params) {
                    gObject = this.getObjects('C', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                    if (gObject.characteristic) {
                        gObject.characteristic.onread(response.params, response.error);
                    }
                }
                this.onupdateValue(gObject.peripheral, gObject.service, gObject.characteristic, response.error);
                break;
            case C.kWriteCharacteristicValue:
                if (response.params) {
                    gObject = this.getObjects('C', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                    if (gObject.characteristic) {
                        gObject.characteristic.onwrite(response.params, response.error);
                    }
                }
                this.onwriteValue(gObject.peripheral, gObject.service, gObject.characteristic, response.error);
                break;
            case C.kSetValueNotification:
                if (response.params) {
                    gObject = this.getObjects('C', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                    if (gObject.characteristic) {
                        gObject.characteristic.isNotifying = response.params[C.kIsNotifying];
                        gObject.characteristic.value = response.params[C.kValue];
                    }
                }
                this.onupdateValue(gObject.peripheral, gObject.service, gObject.characteristic, response.error);
                break;
            case C.kGetDescriptorValue:
                if (response.params) {
                    gObject = this.getObjects('D', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                    if (gObject.descriptor) {
                        gObject.descriptor.onread(response.params, response.error);
                    }
                }
                this.ondescriptorRead(gObject.peripheral, gObject.service, gObject.characteristic, gObject.descriptor, response.error);
                break;
            case C.kWriteDescriptorValue:
                if (response.params) {
                    gObject = this.getObjects('D', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                    if (gObject.descriptor) {
                        gObject.descriptor.onwrite(response.params, response.error);
                    }
                }
                this.ondescriptorWrite(gObject.peripheral, gObject.service, gObject.characteristic, gObject.descriptor, response.error);
                break;
            case C.kGetRSSI:
                if (response.params) {
                    gObject = this.getObjects('P', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                    if (gObject.peripheral) {
                        gObject.peripheral.name = response.params[C.kPeripheralName];
                        gObject.peripheral.rssi = response.params[C.kRSSIkey];
                    }
                }
                this.onupdateRSSI(gObject.peripheral, response.error);
                break;
            case C.kPeripheralNameUpdate:
                if (response.params) {
                    gObject = this.getObjects('P', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                    if (gObject.peripheral) {
                        gObject.peripheral.name = response.params[C.kPeripheralName];
                        gObject.peripheral.rssi = response.params[C.kRSSIkey];
                    }
                }
                this.onupdateRSSI(gObject.peripheral, response.error);
                break;
            case C.kMessage:
                this.onMessage(response.params, response.error);
                break;
            default:
                this.onerror('invalid response');

                this.message = response;
        }
    };

    this.getObjects = function(type, peripheralUUID, serviceUUID, characteristicUUID, descriptorUUID) {

        var resultObj = {};

        resultObj.peripheral = this.peripherals[peripheralUUID];
        if (resultObj.peripheral) {
            if (type === 'P') {
                return resultObj;
            }
            resultObj.service = resultObj.peripheral.services[serviceUUID];
            if (resultObj.service) {
                if (type === 'S') {
                    return resultObj;
                }
                resultObj.characteristic = resultObj.service.characteristics[characteristicUUID];
                if (resultObj.characteristic) {
                    if (type === 'C') {
                        return resultObj;
                    }
                    resultObj.descriptor = resultObj.characteristic.descriptors[descriptorUUID];
                    if (resultObj.descriptor) {
                        if (type === 'D') {
                            return resultObj;
                        } else {
                            console.log('getObjects: Type is not mentioned');
                        }
                    } else {
                        this.onerror('Descriptor not found');
                    }
                } else {
                    this.onerror('Characteristic not found');
                }
            } else {
                this.onerror('Service not found');
            }
        } else {
            this.onerror('Peripheral not found');
        }
        return resultObj;
    };

    this.oninit = function(params) {};

    this.configure = function(pwrAlert, centralID, callback) {
        if (callback) this.onconfigure = callback;

        var params = {};
        params[C.kShowPowerAlert] = pwrAlert;
        params[C.kIdentifierKey] = centralID;
        this.write(C.kConfigure, params);
    };

    this.onconfigure = function(params) {};

    this.scan = function(scanDuplicates, services, callback) {
        if (callback) this.onscan = callback;
        this.peripherals = {};
        var params = {};
        params[C.kScanOptionAllowDuplicatesKey] = scanDuplicates;
        params[C.kServiceUUIDs] = services;
        this.write(C.kScanForPeripherals, params);
    };

    this.onscan = function(params) {};

    this.stopScan = function(callback) {
        if (callback) this.onscan = callback;

        var params = {};
        this.write(C.kStopScanning, params);
    };

    this.onstopScan = function(params) {};

    this.centralState = function() {
        var params = {};
        this.write(C.kCentralState, params);
    };

    this.onstate = function(state) {};

    this.onerror = function(err_msg) {
        console.log(err_msg);
    };

    this.close = function(callback) {
        if (client) {
            client.close();
        }
    };

    this.onclose = function(params, error) {};

    this.onconnect = function(params) {};
    this.ondisconnect = function(params) {};
    this.ondiscoverServices = function(params) {};
    this.ondiscoverCharacteristics = function(params) {};
    this.ondiscoverDescriptors = function(params) {};
    this.onupdateValue = function(params) {};
    this.onwriteValue = function(params) {};
    this.onupdateRSSI = function(peripheral) {};
    this.onMessage = function(params) {};
    this.ondescriptorRead = function(peripheral, service, characteristic, descriptor, error) {};
    this.ondescriptorWrite = function(peripheral, service, characteristic, descriptor, error) {};

    this.write = function(method, params, id) {
        var mesg = {};
        mesg.jsonrpc = "2.0";
        mesg.method = method;
        mesg.params = params;
        mesg.id = C.id.toString();
        C.id += 1;
        this.send(JSON.stringify(mesg));
    };

    this.send = function(mesg) {
        if (!client) {
            this.onerror("not connected");
            return;
        }
        if (client.readyState !== 1) {
            console.log('Socket is CLOSED');
            return;
        }
        client.send(mesg);
    };
}

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== 'undefined')) {
    exports.GATTIP = GATTIP;
}
