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

        var socket = new WebSocket(url);

        socket.onopen = function() {
            this.initWithClient(socket);
            if (this.oninit) {
                this.oninit();
            }
        }.bind(this);
    };

    this.initWithClient = function(_client) {
        this.state = C.kUnknown;
        client = _client;
        client.onmessage = this.processMessage.bind(this);
    }

    this.processMessage = function(mesg) {
        var response = JSON.parse(mesg.data);
        var peripheral, service, characteristic, descriptor, gObject;

        switch (response.result) {
            case C.kConfigure:
                this.onconfigure(response.params, response.error);
                break;
            case C.kScanForPeripherals:
                if (response.params && response.params[C.kPeripheralUUID])
                    peripheral = this.peripherals[response.params[C.kPeripheralUUID]];
                if (!response.error) {
                    peripheral = new Peripheral(this,
                        response.params[C.kPeripheralName],
                        response.params[C.kPeripheralUUID],
                        response.params[C.kPeripheralBtAddress],
                        response.params[C.kRSSIkey],
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
                                        //To get the Characteristic name, reading the descriptor value
                                        for (var duuid in characteristic.descriptors) {
                                            descriptor = characteristic.descriptors[duuid];
                                            var charcNameDescUUID = '2901';
                                            if (descriptor && (duuid.indexOf(charcNameDescUUID) > -1) && descriptor.properties.Read) {
                                                descriptor.read();
                                            }
                                        }
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
                    if(peripheral)
                        peripheral.onconnect(response.error);
                }
                this.onconnect(peripheral, response.error);
                break;
            case C.kDisconnect:
                if (!response.error) {
                    try {
                        gObject = this.getObjects('P', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                        gObject.peripheral.ondisconnect(response.error);
                        this.ondisconnect(gObject.peripheral, response.error);
                    } catch (ex) {
                        this.onerror(ex);
                    }
                } else {
                    gObject = this.getObjects('P', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                    peripheral = (gObject && gObject.peripheral) ? (gObject.peripheral) : peripheral;
                    this.ondisconnect(peripheral, response.error);
                }
                break;
            case C.kCentralState:
                this.state = response.params[C.kState];
                this.onstate(response.params[C.kState], response.error);
                break;
            case C.kGetServices:
                if (!response.error) {
                    try {
                        gObject = this.getObjects('P', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                        gObject.peripheral.ondiscoverServices(response.params, response.error);
                        this.ondiscoverServices(gObject.peripheral, response.error);
                    } catch (ex) {
                        this.onerror(ex);
                    }
                } else {
                    this.ondiscoverServices(peripheral, response.error);
                }
                break;
            case C.kGetCharacteristics:
                if (!response.error) {
                    try {
                        gObject = this.getObjects('S', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                        gObject.service.ondiscoverCharacteristics(response.params, response.error);
                        this.ondiscoverCharacteristics(gObject.peripheral, gObject.service, response.error);
                    } catch (ex) {
                        this.onerror(ex);
                    }
                } else {
                    this.ondiscoverCharacteristics(peripheral, service, response.error);
                }
                break;
            case C.kGetDescriptors:
                if (!response.error) {
                    try {
                        gObject = this.getObjects('C', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                        gObject.characteristic.ondiscoverDescriptors(response.params, response.error);
                        this.ondiscoverDescriptors(gObject.peripheral, gObject.service, gObject.characteristic, response.error);
                    } catch (ex) {
                        this.onerror(ex);
                    }
                } else {
                    this.ondiscoverDescriptors(peripheral, service, characteristic, response.error);
                }
                break;
            case C.kGetCharacteristicValue:
                if (!response.error) {
                    try {
                        gObject = this.getObjects('C', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                        gObject.characteristic.onread(response.params, response.error);
                        this.onupdateValue(gObject.peripheral, gObject.service, gObject.characteristic, response.error);
                    } catch (ex) {
                        this.onerror(ex);
                    }
                } else {
                    this.onupdateValue(peripheral, service, characteristic, response.error);
                }
                break;
            case C.kWriteCharacteristicValue:
                if (!response.error) {
                    try {
                        gObject = this.getObjects('C', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                        gObject.characteristic.onwrite(response.params, response.error);
                        this.onwriteValue(gObject.peripheral, gObject.service, gObject.characteristic, response.error);
                    } catch (ex) {
                        this.onerror(ex);
                    }
                } else {
                    this.onwriteValue(peripheral, service, characteristic, response.error);
                }
                break;
            case C.kSetValueNotification:
                if (!response.error) {
                    try {
                        gObject = this.getObjects('C', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                        gObject.characteristic.isNotifying = response.params[C.kIsNotifying];
                        gObject.characteristic.value = response.params[C.kValue];
                        this.onupdateValue(gObject.peripheral, gObject.service, gObject.characteristic, response.error);
                    } catch (ex) {
                        this.onerror(ex);
                    }
                } else {
                    this.onupdateValue(peripheral, service, characteristic, response.error);
                }
                break;
            case C.kGetDescriptorValue:
                if (!response.error) {
                    try {
                        gObject = this.getObjects('D', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                        gObject.descriptor.onread(response.params, response.error);
                        this.onDescriptorRead(gObject.peripheral, gObject.service, gObject.characteristic, gObject.descriptor, response.error);
                    } catch (ex) {
                        this.onerror(ex);
                    }
                } else {
                    this.onDescriptorRead(peripheral, service, characteristic, descriptor, response.error);
                }
                break;
            case C.kGetRSSI:
                gObject = this.getObjects('P', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                if (!response.error) {
                    try {
                        gObject.peripheral.name = response.params[C.kPeripheralName];
                        gObject.peripheral.rssi = response.params[C.kRSSIkey];
                        this.onupdateRSSI(gObject.peripheral, response.error);
                    } catch (ex) {
                        this.onerror(ex);
                    }
                } else {
                    this.onupdateRSSI(peripheral, response.error);
                }
                break;
            case C.kPeripheralNameUpdate:
                gObject = this.getObjects('P', response.params[C.kPeripheralUUID], response.params[C.kServiceUUID], response.params[C.kCharacteristicUUID], response.params[C.kDescriptorUUID]);
                if (!response.error) {
                    try {
                        gObject.peripheral.name = response.params[C.kPeripheralName];
                        gObject.peripheral.rssi = response.params[C.kRSSIkey];
                        this.onupdateRSSI(gObject.peripheral, response.error);
                    } catch (ex) {
                        this.onerror(ex);
                    }
                } else {
                    this.onupdateRSSI(peripheral, response.error);
                }
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
                        return resultObj;
                    } else {
                        throw Error('Descriptor not found');
                    }
                } else {
                    throw Error('Characteristic not found');
                }
            } else {
                throw Error('Service not found');
            }
        } else {
            throw Error('Peripheral not found');
        }

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

    this.onupdateRSSI = function(peripheral) {};

    this.onerror = function(err_msg) {
        console.log(err_msg);
    };

    this.close = function(callback) {
        if (client) {
            client.close();
        }
    };

    this.onclose = function(params, error) {};

    this.onDescriptorRead = function(peripheral, service, characteristic, descriptor, error) {};

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

        client.send(mesg);
    };
}

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== 'undefined')) {
    exports.GATTIP = GATTIP;
}