function GATTIP() {

    if (typeof process === 'object' && process + '' === '[object process]') {
        var consts = require("./constants.js");
        C = consts.C;
    }

    var client;
    this.state = C.kUnknown;
    this.peripherals = {};

    this.init = function(url, callback) {
        if (callback) this.oninit = callback;

        if (typeof WebSocket !== "undefined")
            var socket = new WebSocket(url);

        if (!socket && (typeof process === 'object' && process + '' === '[object process]')) {
            WebSocket = require("ws");
            socket = new WebSocket(url);
        }

        socket.onopen = function() {
            this.initWithClient(socket);
            if (this.oninit) {
                this.oninit();
            }
        }.bind(this);
    };

    this.initWithClient = function(_client) {
        client = _client;
        client.onmessage = this.processMessage.bind(this);
    }

    this.processMessage = function(mesg) {
        var response = JSON.parse(mesg.data);
        var peripheral, service, characteristic;

        switch (response.result) {
            case C.kConfigure:
                this.onconfigure(response.params, response.error);
                break;
            case C.kScanForPeripherals:
                if (response.params && response.params[C.kPeripheralUUID])
                    peripheral = this.peripherals[response.params[C.kPeripheralUUID]];
                if (!response.error) {
                    if(typeof process === 'object' && process + '' === '[object process]'){
                        var p = require("./peripheral.js"); 
                        peripheral = new p.Peripheral(this,
                            response.params[C.kPeripheralName],
                            response.params[C.kPeripheralUUID],
                            response.params[C.kAdvertisementDataKey],
                            response.params[C.kScanRecord],
                            response.params[C.kRSSIkey],
                            response.params[C.kPeripheralBtAddress]);
                    }else{
                        peripheral = new Peripheral(this,
                            response.params[C.kPeripheralName],
                            response.params[C.kPeripheralUUID],
                            response.params[C.kAdvertisementDataKey],
                            response.params[C.kScanRecord],
                            response.params[C.kRSSIkey],
                            response.params[C.kPeripheralBtAddress]);
                    }

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
                    if (!peripheral) {
                        console.log("unknown peripheral");
                    } else {
                        peripheral.onconnect(response.error);
                    }
                }
                this.onconnect(peripheral, response.error);
                break;
            case C.kDisconnect:
                if (response.params && response.params[C.kPeripheralUUID])
                    peripheral = this.peripherals[response.params[C.kPeripheralUUID]];
                if (!response.error) {
                    if (!peripheral) {
                        console.log("unknown peripheral");
                    } else {
                        peripheral.ondisconnect(response.error);
                    }
                }
                this.ondisconnect(peripheral, response.error);
                break;
            case C.kCentralState:
                this.state = response.params[C.kState];
                this.onstate(response.params[C.kState], response.error);
                break;
            case C.kGetServices:
                if (response.params && response.params[C.kPeripheralUUID])
                    peripheral = this.peripherals[response.params[C.kPeripheralUUID]];
                if (!response.error) {
                    if (!peripheral) {
                        console.log("unknown peripheral");
                    } else {
                        peripheral.ondiscoverServices(response.params, response.error);
                    }
                }
                this.ondiscoverServices(peripheral, response.error);
                break;
            case C.kGetCharacteristics:
                if (response.params && response.params[C.kPeripheralUUID])
                    peripheral = this.peripherals[response.params[C.kPeripheralUUID]];
                if (!response.error) {
                    if (!peripheral) {
                        console.log("unknown peripheral");
                    } else {
                        service = peripheral.services[response.params[C.kServiceUUID]];
                        service.ondiscoverCharacteristics(response.params, response.error);
                        this.ondiscoverCharacteristics(peripheral, service, response.error);
                    }
                } else
                    this.ondiscoverCharacteristics(peripheral, service, response.error);
                break;
            case C.kGetDescriptors:
                if (response.params && response.params[C.kPeripheralUUID])
                    peripheral = this.peripherals[response.params[C.kPeripheralUUID]];
                if (!response.error) {
                    if (!peripheral) {
                        console.log("unknown peripheral");
                    } else {
                        service = peripheral.services[response.params[C.kServiceUUID]];
                        if (service) {
                            characteristic = service.characteristics[response.params[C.kCharacteristicUUID]];
                            characteristic.ondiscoverDescriptors(response.params, response.error);
                        }
                        this.ondiscoverDescriptors(peripheral, service, characteristic, response.error);
                    }
                } else
                    this.ondiscoverDescriptors(peripheral, service, characteristic, response.error);
                break;
            case C.kGetCharacteristicValue:
                if (response.params && response.params[C.kPeripheralUUID])
                    peripheral = this.peripherals[response.params[C.kPeripheralUUID]];
                if (!response.error) {
                    if (!peripheral) {
                        console.log("unknown peripheral");
                    } else {
                        service = peripheral.services[response.params[C.kServiceUUID]];
                        if (service) {
                            characteristic = service.characteristics[response.params[C.kCharacteristicUUID]];
                            characteristic.onread(response.params, response.error);
                        }
                        this.onupdateValue(peripheral, service, characteristic, response.error);
                    }
                } else
                    this.onupdateValue(peripheral, service, characteristic, response.error);
                break;
            case C.kWriteCharacteristicValue:
                if (response.params && response.params[C.kPeripheralUUID])
                    peripheral = this.peripherals[response.params[C.kPeripheralUUID]];
                if (!response.error) {
                    if (!peripheral) {
                        console.log("unknown peripheral");
                    } else {
                        service = peripheral.services[response.params[C.kServiceUUID]];
                        if (service) {
                            characteristic = service.characteristics[response.params[C.kCharacteristicUUID]];
                            characteristic.onwrite(response.params, response.error);
                        }
                        this.onwriteValue(peripheral, service, characteristic, response.error);
                    }
                } else
                    this.onwriteValue(peripheral, service, characteristic, response.error);
                break;
            case C.kSetValueNotification:
                if (response.params && response.params[C.kPeripheralUUID])
                    peripheral = this.peripherals[response.params[C.kPeripheralUUID]];
                if (!response.error) {
                    if (!peripheral) {
                        console.log("unknown peripheral");
                    } else {
                        service = peripheral.services[response.params[C.kServiceUUID]];
                        if (service) {
                            characteristic = service.characteristics[response.params[C.kCharacteristicUUID]];
                            if (characteristic) {
                                characteristic.isNotifying = response.params[C.kIsNotifying];
                                characteristic.value = response.params[C.kValue];
                            }
                        }
                        this.onupdateValue(peripheral, service, characteristic, response.error);
                    }
                } else
                    this.onupdateValue(peripheral, service, characteristic, response.error);
                break;
            case C.kGetRSSI:
                if (response.params && response.params[C.kPeripheralUUID])
                    peripheral = this.peripherals[response.params[C.kPeripheralUUID]];
                if (!response.error) {
                    if (!peripheral) {
                        console.log("unknown peripheral");
                    } else {
                        peripheral.name = response.params[C.kPeripheralName];
                        peripheral.rssi = response.params[C.kRSSIkey];
                        this.onupdateRSSI(peripheral, response.error);
                    }
                } else
                    this.onupdateRSSI(peripheral, response.error);
                break;
            case C.kPeripheralNameUpdate:
                if (response.params && response.params[C.kPeripheralUUID])
                    peripheral = this.peripherals[response.params[C.kPeripheralUUID]];
                if (!response.error) {
                    if (!peripheral) {
                        console.log("unknown peripheral");
                    } else {
                        peripheral.name = response.params[C.kPeripheralName];
                        peripheral.rssi = response.params[C.kRSSIkey];
                        this.onupdateRSSI(peripheral, response.error);
                    }
                } else
                    this.onupdateRSSI(peripheral, response.error);
                break;
            case C.kMessage:
                this.onMessage(response.params, response.error);
                break;
            default:
                console.log('invalid response');
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

    this.onerror = function(params, error) {
        console.log('invalid parameters');
    };

    this.close = function(callback) {
        if (client) {
            client.close();
        }
    };

    this.onclose = function(params, error) {};

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

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== "undefined")) {
    exports.GATTIP = GATTIP;
}