function GattIpServer() {

    if (typeof process === 'object' && process + '' === '[object process]') {
        C = require("./constants.js").C;
        Peripheral = require("./peripheral.js").Peripheral;
        WebSocket = require('websocket').w3cwebsocket;
    }

    var server;
    this.state = C.kUnknown;
    this.peripherals = {};

    this.init = function (url, callback) {
        if (callback) this.oninit = callback;

        this.socket = new WebSocket(url);

        this.socket.onopen = function () {
            this.initWithServer(this.socket);
            if (this.oninit) {
                this.oninit();
            }
        }.bind(this);
    };

    this.initWithServer = function (_server) {
        server = _server;

        if (!server.send) {
            throw Error('server must implement the send method');
        }
        server.onmessage = this.processMessage.bind(this);

        if (!server.onclose) {
            server.onclose = function () {
                console.log('socket is closed')
            };
        }
        if (!server.onerror) {
            server.onerror = function (error) {
                console.log('socket is onerror, onerror' + error);
            };
        }
        if (!server.error) {
            server.onerror = function (error) {
                console.log('socket is error, error' + error);
            };
        }
    };

    this.processMessage = function (mesg) {
        var message = JSON.parse(mesg.data);
        var params, peripheral, service, characteristic;

        if ((typeof message === 'undefined') || (!message)) {
            params = {};
            params[C.kCode] = C.kInvalidRequest;
            this.write(C.kError, params);
            return;
        }

        if (message.result && message.result == C.kMessage) {
            this.onauthenticate(message.params, message.error);
            return;
        }

        //TODO: It is better to remove the devices, if length is going to infinite, based on like recently used..
        //TODO: General comment - you should not be tracking peripherals/services/etc.
        //  Burden the gateway to do this and respond accordingly TO YOU with appropriate error
        //  Each gateway/stack tracks peripherals/services/etc. so you don't have to
        //TODO: General comment - ensure that the library can deal with blank strings and arrays that are nulls or undefined.
        // Address/convert missing values accordingly
        //TODO: General comment - The purpose of this module is to parse AND VERIFY each argument passed to it in order to protect
        // both sides -- the client and the server -- from the other misbehaving, but not going too far to ensure
        // that correct messages are sent in correct sequence. You are stateless, and you don't care if a client wants to connect to an undiscovered
        // service
        // You should do minimal message integrity checks. Examples that this code fails at:
        //      - Address in connect request is blank - server crashes
        //      - Scan response data is sent as an array from the server - client crashes because it expects a hex string
        //TODO: Ensure that no message sent by the client can crash you. This is also a hack attack vector, so you ought to not crash on bad messages

        //TODO: Consider putting this in an associative array, rather than a switch
        switch (message.method) {
            case C.kConfigure:
                // TODO: Extract this check. It's the same as all of the ones below
                if (!this.configureRequest) {
                    throw Error('configureRequest method not implemented by server');
                }
                //TODO: scanRequest(whaterver the arguments are - power on? .. what else?), no error - there can be no error
                this.configureRequest(message.params, message.error);
                break;
            case C.kScanForPeripherals:
                // TODO: Extract this check. It's the same as all of the ones below
                if (!this.scanRequest) {
                    throw Error('scanRequest method not implemented by server');
                }
                if (message.error) {
                    this.sendErrorResponse(message.method, C.kInvalidRequest);
                } else {
                    this.scanRequest(message.params);
                }
                this.scanRequest(message.params, message.error);
                break;
            case C.kStopScanning:
                // TODO: Extract this check. It's the same as all of the ones below
                if (!this.stopScanRequest) {
                    throw Error('stopScanRequest method not implemented by server');
                }
                if (message.error) {
                    this.sendErrorResponse(message.method, C.kInvalidRequest);
                } else {
                    this.stopScanRequest(message.params);
                }
                break;
            case C.kConnect:
                if (!this.connectRequest) {
                    throw Error('connectRequest method not implemented by server');
                }
                peripheral = this.peripherals[message.params[C.kPeripheralUUID]];
                if (message.error) {
                    this.sendErrorResponse(message.method, C.kInvalidRequest);
                } else if (peripheral) {
                    this.connectRequest(peripheral);
                } else {
                    this.sendErrorResponse(message.method, C.kErrorPeripheralNotFound);
                }
                break;
            case C.kDisconnect:
                // TODO: Extract this check. It's the same as all of the ones below
                if (!this.disconnectRequest) {
                    throw Error('disconnectRequest method not implemented by server');
                }
                peripheral = this.peripherals[message.params[C.kPeripheralUUID]];
                if (message.error) {
                    this.sendErrorResponse(message.method, C.kInvalidRequest);
                } else if (peripheral) {
                    this.disconnectRequest(peripheral);
                } else {
                    this.sendErrorResponse(message.method, C.kErrorPeripheralNotFound);
                }
                break;
            case C.kCentralState:
                // TODO: Extract this check. It's the same as all of the ones below
                if (!this.centralStateRequest) {
                    throw Error('centralStateRequest method not implemented by server');
                }
                if (message.error) {
                    this.sendErrorResponse(message.method, C.kInvalidRequest);
                } else {
                    this.centralStateRequest(message.params);
                }
                break;
            case C.kGetServices:
                if (message.params && message.params[C.kPeripheralUUID])
                    peripheral = this.peripherals[message.params[C.kPeripheralUUID]];
                if (!message.error) {
                    if (peripheral) {
                        peripheral.discoverServicesRequest();
                    } else {
                        this.sendErrorResponse(message.method, C.kErrorPeripheralNotFound);                        
                    }
                } else {
                    this.sendErrorResponse(message.method, C.kInvalidRequest);
                }
                break;
            case C.kGetIncludedServices:
                console.log("kGetIncludedServices event"); //TODO
                break;
            case C.kInvalidatedServices:
                console.log("kInvalidatedServices event"); //TODO
                break;
            case C.kGetCharacteristics:
                if (message.params && message.params[C.kPeripheralUUID]) {
                    peripheral = this.peripherals[message.params[C.kPeripheralUUID]];
                    if (!peripheral) {
                        this.sendErrorResponse(message.method, C.kErrorPeripheralNotFound);
                    } else {
                        service = peripheral.services[message.params[C.kServiceUUID]];
                        if (service) {
                            service.discoverCharacteristicsRequest();
                        } else {
                            this.sendErrorResponse(message.method, C.kErrorServiceNotFound);
                        }
                    }
                }
                break;
            case C.kGetDescriptors:
                if (message.params && message.params[C.kPeripheralUUID]) {
                    peripheral = this.peripherals[message.params[C.kPeripheralUUID]];
                    if (!peripheral) {
                        this.sendErrorResponse(message.method, C.kErrorPeripheralNotFound);
                    } else {
                        service = peripheral.services[message.params[C.kServiceUUID]];
                        if (service) {
                            characteristic = service.characteristics[message.params[C.kCharacteristicUUID]];
                            if (characteristic) {
                                characteristic.discoverDescriptorsRequest();
                            } else {
                                this.sendErrorResponse(message.method, C.kErrorCharacteristicNotFound);
                            }
                        } else {
                            this.sendErrorResponse(message.method, C.kErrorServiceNotFound);
                        }
                    }
                }
                break;
            case C.kGetCharacteristicValue:
                if (message.params && message.params[C.kPeripheralUUID]) {
                    peripheral = this.peripherals[message.params[C.kPeripheralUUID]];
                    if (!peripheral) {
                        this.sendErrorResponse(message.method, C.kErrorPeripheralNotFound);
                    } else {
                        service = peripheral.services[message.params[C.kServiceUUID]];
                        if (service) {
                            characteristic = service.characteristics[message.params[C.kCharacteristicUUID]];
                            if (characteristic) {
                                characteristic.readCharacteristicValueRequest(message.params);
                            } else {
                                this.sendErrorResponse(message.method, C.kErrorCharacteristicNotFound);
                            }
                        } else {
                            this.sendErrorResponse(message.method, C.kErrorServiceNotFound);
                        }
                    }
                }
                break;
            case C.kWriteCharacteristicValue:
                if (message.params && message.params[C.kPeripheralUUID]) {
                    peripheral = this.peripherals[message.params[C.kPeripheralUUID]];
                    if (!peripheral) {
                        this.sendErrorResponse(message.method, C.kErrorPeripheralNotFound);
                    } else {
                        service = peripheral.services[message.params[C.kServiceUUID]];
                        if (service) {
                            characteristic = service.characteristics[message.params[C.kCharacteristicUUID]];
                            if (characteristic) {
                                characteristic.writeCharacteristicValueRequest(message.params);
                            } else {
                                this.sendErrorResponse(message.method, C.kErrorCharacteristicNotFound);
                            }
                        } else {
                            this.sendErrorResponse(message.method, C.kErrorServiceNotFound);
                        }
                    }
                }
                break;
            case C.kSetValueNotification:
                if (message.params && message.params[C.kPeripheralUUID]) {
                    peripheral = this.peripherals[message.params[C.kPeripheralUUID]];
                    if (!peripheral) {
                        this.sendErrorResponse(message.method, C.kErrorPeripheralNotFound);
                    } else {
                        service = peripheral.services[message.params[C.kServiceUUID]];
                        if (service) {
                            characteristic = service.characteristics[message.params[C.kCharacteristicUUID]];
                            if (characteristic) {
                                characteristic.isNotifying = message.params[C.kValue];
                                characteristic.enableNotificationsRequest(message.params);
                            } else {
                                this.sendErrorResponse(message.method, C.kErrorCharacteristicNotFound);
                            }
                        } else {
                            this.sendErrorResponse(message.method, C.kErrorServiceNotFound);
                        }
                    }
                }
                break;
            case C.kGetDescriptorValue:
                console.log("kGetDescriptorValue event"); //TODO
                break;
            case C.kWriteDescriptorValue:
                console.log("kWriteDescriptorValue event"); //TODO
                break;

            default:
                console.log('invalid request');
                return;
        }
        this.message = message;
    };

    this.sendErrorResponse = function (method, errorId, errMessage) {
        var error = {},
            params = {};
        error[C.kIdField] = errorId;
        error[C.kMessageField] = errMessage;        
        params[C.kError] = error;
        this.write(method, params);
    };

    this.authenticate = function (token) {
        this.send(JSON.stringify({
            type: C.authenticate,
            access_token: token
        }));
    };

    this.configureResponse = function (error) {
        if (!error) {
            this.write(C.kConfigure);
        } else {
            this.write(C.kConfigure, error);
        }
    };

    this.centralStateResponse = function (state, error) {
        if (!error) {
            params = {};
            params[C.kState] = state;
            this.write(C.kCentralState, params);
        } else {
            this.write(C.kCentralState, error);
        }
    };

    this.scanResponse = function (name, uuid, addr, rssi, advertisementData, manufacturerData) {
        params = {};
        var advData = {};

        advData[C.kRawAdvertisementData] = advertisementData;
        params[C.kPeripheralName] = name;
        params[C.kPeripheralUUID] = uuid;
        params[C.kPeripheralBtAddress] = addr;
        params[C.kRSSIkey] = rssi;
        params[C.kAdvertisementDataKey] = advData;
        params[C.kScanRecord] = manufacturerData;

        this.write(C.kScanForPeripherals, params);
    };

    this.stopScanResponse = function (error) {
        if (!error) {
            this.write(C.kStopScanning);
        } else {
            this.write(C.kStopScanning, error);
        }

    };

    this.connectResponse = function (peripheral, error) {
        this.peripheral_db[C.kPeripheralUUID] = peripheral.uuid;
        this.peripheral_db[C.kPeripheralName] = peripheral.name;

        var service_db = getServiceJsonFromPeripheralObject(peripheral);
        this.peripheral_db[C.kServices] = service_db;

        if (!error) {
            this.write(C.kConnect, this.peripheral_db);
        } else {
            this.write(C.kConnect, error);
        }
    };

    this.disconnectResponse = function (peripheral, error) {
        if (!error) {
            params = {};
            params[C.kPeripheralUUID] = peripheral.uuid;
            params[C.kPeripheralName] = peripheral.name;

            this.write(C.kDisconnect, params);
        } else {
            this.write(C.kDisconnect, error);
        }
    };

    this.write = function (result, params, id) {
        var mesg = {};
        mesg.jsonrpc = "2.0";
        mesg.result = result;
        mesg.params = params;
        mesg.id = C.id.toString();
        C.id += 1;
        this.send(JSON.stringify(mesg));
    };

    this.send = function (mesg) {
        if (!server) {
            this.onerror("not connected");
            return;
        }
        server.send(mesg);
    };

    this.close = function (callback) {
        if (server) {
            server.close();
        }
    };

    function getServiceJsonFromPeripheralObject(myPeripheral){
        var service_db = {};

        if(myPeripheral && myPeripheral.services){
            for(var uuid in myPeripheral.services){
                var temp_service = {};
                temp_service[C.kServiceUUID] = uuid;
                temp_service[C.kIsPrimaryKey] = myPeripheral.services[uuid].isPrimary;
                temp_service[C.kServices] = getCharacteristicJsonFromServiceObject(myPeripheral.services[uuid]);

                service_db[uuid] = temp_service;            
            }
        }

        return service_db;
    }

    function getCharacteristicJsonFromServiceObject(myService){
        var characteristic_json = {}, characteristic_db = {};

        if(myService && myService.characteristics){
            for(var uuid in myService.characteristics){
                var temp_characteristic = {};
                temp_characteristic[C.kCharacteristicUUID] = uuid;
                temp_characteristic[C.kValue] = myService.characteristics[uuid].value;
                temp_characteristic[C.kProperties] = myService.characteristics[uuid].properties;
                temp_characteristic[C.kIsNotifying] = myService.characteristics[uuid].isNotifying;
                temp_characteristic[C.kDescriptors] = getDescriptorJsonFromCharacteristicObject(myService.characteristics[uuid]);

                characteristic_db[uuid] = temp_characteristic;
            }
        }
        characteristic_json[C.kCharacteristics] = characteristic_db;

        return characteristic_json;
    }

    function getDescriptorJsonFromCharacteristicObject(myCharacteristic){
        var descriptor_json = {}, descriptor_db = {};

        if(myCharacteristic && myCharacteristic.descriptors){
            for(var uuid in myCharacteristic.descriptors){
                var temp_descriptor = {};
                temp_descriptor[C.kDescriptorUUID] = uuid;
                temp_descriptor[C.kValue] = myCharacteristic.descriptors[uuid].value;
                temp_descriptor[C.kProperties] = myCharacteristic.descriptors[uuid].properties;

                descriptor_db[uuid] = temp_descriptor;
            }
        }
        descriptor_json[C.kDescriptors] = descriptor_db;

        return descriptor_json;        
    }

    this.addPeripheral = function (name, uuid, addr, rssi, addata, scanData) {
        var peripheral = new Peripheral(this, name, uuid, addr, rssi, addata, scanData);
        this.peripherals[peripheral.uuid] = peripheral;

        return peripheral;
    };

    /* The following define the flags that are valid with the SecurityProperties */
    this.GATM_SECURITY_PROPERTIES_NO_SECURITY = 0x00000000;
    this.GATM_SECURITY_PROPERTIES_UNAUTHENTICATED_ENCRYPTION_WRITE = 0x00000001;
    this.GATM_SECURITY_PROPERTIES_AUTHENTICATED_ENCRYPTION_WRITE = 0x00000002;
    this.GATM_SECURITY_PROPERTIES_UNAUTHENTICATED_ENCRYPTION_READ = 0x00000004;
    this.GATM_SECURITY_PROPERTIES_AUTHENTICATED_ENCRYPTION_READ = 0x00000008;
    this.GATM_SECURITY_PROPERTIES_UNAUTHENTICATED_SIGNED_WRITES = 0x00000010;
    this.GATM_SECURITY_PROPERTIES_AUTHENTICATED_SIGNED_WRITES = 0x00000020;

    /* The following define the flags that are valid with the CharacteristicProperties */
    this.GATM_CHARACTERISTIC_PROPERTIES_BROADCAST = 0x00000001;
    this.GATM_CHARACTERISTIC_PROPERTIES_READ = 0x00000002;
    this.GATM_CHARACTERISTIC_PROPERTIES_WRITE_WO_RESP = 0x00000004;
    this.GATM_CHARACTERISTIC_PROPERTIES_WRITE = 0x00000008;
    this.GATM_CHARACTERISTIC_PROPERTIES_NOTIFY = 0x00000010;
    this.GATM_CHARACTERISTIC_PROPERTIES_INDICATE = 0x00000020;
    this.GATM_CHARACTERISTIC_PROPERTIES_AUTHENTICATED_SIGNED_WRITES = 0x00000040;
    this.GATM_CHARACTERISTIC_PROPERTIES_EXT_PROPERTIES = 0x00000080;

    /* The following define the flags that are valid with the DescriptorProperties */
    this.GATM_DESCRIPTOR_PROPERTIES_READ = 0x00000001;
    this.GATM_DESCRIPTOR_PROPERTIES_WRITE = 0x00000002;

}


if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== "undefined")) {
    exports.GattIpServer = GattIpServer;
}
