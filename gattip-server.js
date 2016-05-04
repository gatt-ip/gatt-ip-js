function GattIpServer() {

    if (typeof process === 'object' && process + '' === '[object process]') {
        C = require("./constants.js").C;
        Peripheral = require("./peripheral.js").Peripheral;
        WebSocket = require('websocket').w3cwebsocket;
    }

    var server;
    this.state = C.kUnknown;
    this.peripherals = {};

    this.init = function(url, callback) {
        if (callback) this.oninit = callback;

        this.socket = new WebSocket(url);

        this.socket.onopen = function() {
            this.initWithServer(this.socket);
            if (this.oninit) {
                this.oninit();
            }
        }.bind(this);
    };

    this.initWithServer = function(_server) {
        server = _server;

        if (!server.send) {
            throw Error('server must implement the send method');
        }
        server.onmessage = this.processMessage.bind(this);

        if (!server.onclose) {
            server.onclose = function() {
                console.log('socket is closed')
            };
        }
        if (!server.onerror) {
            server.onerror = function(error) {
                console.log('socket is onerror, onerror' + error);
            };
        }
        if (!server.error) {
            server.onerror = function(error) {
                console.log('socket is error, error' + error);
            };
        }
    };

    this.processMessage = function(mesg) {
        var message = JSON.parse(mesg.data);
        var params, peripheral, service, characteristic, descriptor, gObject;

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

        if (message.error) {
            this.sendErrorResponse(undefined, message.method, C.kInvalidRequest, 'Error in the Request');
            return;
        }

        var cookie = { id: message.id, session_id: message.session_id };

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
                this.configureRequest(cookie, message.params);
                break;
            case C.kScanForPeripherals:
                this.scanRequest(cookie, message.params[C.kScanOptionAllowDuplicatesKey], message.params[C.kServiceUUIDs]);
                break;
            case C.kStopScanning:
                this.stopScanRequest(cookie, message.params);
                break;
            case C.kConnect:
                try {
                    gObject = this.getObjects(cookie, 'P', message.params[C.kPeripheralUUID], message.params[C.kServiceUUID], message.params[C.kCharacteristicUUID], message.params[C.kDescriptorUUID]);
                    this.connectRequest(cookie, gObject.peripheral);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kDisconnect:
                try {
                    gObject = this.getObjects(cookie, 'P', message.params[C.kPeripheralUUID], message.params[C.kServiceUUID], message.params[C.kCharacteristicUUID], message.params[C.kDescriptorUUID]);
                    this.disconnectRequest(cookie, gObject.peripheral);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kCentralState:
                this.centralStateRequest(cookie, message.params);
                break;
            case C.kGetServices:
                try {
                    gObject = this.getObjects(cookie, 'P', message.params[C.kPeripheralUUID], message.params[C.kServiceUUID], message.params[C.kCharacteristicUUID], message.params[C.kDescriptorUUID]);
                    gObject.peripheral.discoverServicesRequest(cookie);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kGetIncludedServices:
                console.log("kGetIncludedServices event"); //TODO
                break;
            case C.kInvalidatedServices:
                console.log("kInvalidatedServices event"); //TODO
                break;
            case C.kGetCharacteristics:
                try {
                    gObject = this.getObjects(cookie, 'S', message.params[C.kPeripheralUUID], message.params[C.kServiceUUID], message.params[C.kCharacteristicUUID], message.params[C.kDescriptorUUID]);
                    gObject.service.discoverCharacteristicsRequest(cookie);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kGetDescriptors:
                try {
                    gObject = this.getObjects(cookie, 'C', message.params[C.kPeripheralUUID], message.params[C.kServiceUUID], message.params[C.kCharacteristicUUID], message.params[C.kDescriptorUUID]);
                    gObject.characteristic.discoverDescriptorsRequest(cookie);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kGetCharacteristicValue:
                try {
                    gObject = this.getObjects(cookie, 'C', message.params[C.kPeripheralUUID], message.params[C.kServiceUUID], message.params[C.kCharacteristicUUID], message.params[C.kDescriptorUUID]);
                    gObject.characteristic.readCharacteristicValueRequest(cookie, message.params);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kWriteCharacteristicValue:
                try {
                    gObject = this.getObjects(cookie, 'C', message.params[C.kPeripheralUUID], message.params[C.kServiceUUID], message.params[C.kCharacteristicUUID], message.params[C.kDescriptorUUID]);
                    gObject.characteristic.writeCharacteristicValueRequest(cookie, message.params);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kSetValueNotification:
                try {
                    gObject = this.getObjects(cookie, 'C', message.params[C.kPeripheralUUID], message.params[C.kServiceUUID], message.params[C.kCharacteristicUUID], message.params[C.kDescriptorUUID]);
                    gObject.characteristic.isNotifying = message.params[C.kValue];
                    gObject.characteristic.enableNotificationsRequest(cookie, message.params);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kGetDescriptorValue:
                try {
                    gObject = this.getObjects(cookie, 'D', message.params[C.kPeripheralUUID], message.params[C.kServiceUUID], message.params[C.kCharacteristicUUID], message.params[C.kDescriptorUUID]);
                    gObject.descriptor.readDescriptorValueRequest(cookie, message.params);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kWriteDescriptorValue:
                try {
                    gObject = this.getObjects(cookie, 'D', message.params[C.kPeripheralUUID], message.params[C.kServiceUUID], message.params[C.kCharacteristicUUID], message.params[C.kDescriptorUUID]);
                    gObject.descriptor.writeDescriptorValueRequest(cookie, message.params);
                } catch (ex) {
                    console.error(ex);
                }
                break;

            default:
                console.log('invalid request' + message.method);
                this.sendErrorResponse(cookie, message.method, C.kInvalidRequest, 'Request not handled by server');
                return;
        }
        this.message = message;
    };


    this.getObjects = function(cookie, type, peripheralUUID, serviceUUID, characteristicUUID, descriptorUUID) {

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
                        this.sendErrorResponse(cookie, message.method, C.kErrorDescriptorNotFound, 'Descriptor not found');
                        throw Error('Descriptor not found');
                    }
                } else {
                    this.sendErrorResponse(cookie, message.method, C.kErrorCharacteristicNotFound, 'Characteristic not found');
                    throw Error('Characteristic not found');
                }
            } else {
                this.sendErrorResponse(cookie, message.method, C.kErrorServiceNotFound, 'Service not found');
                throw Error('Service not found');
            }
        } else {
            this.sendErrorResponse(cookie, message.method, C.kErrorPeripheralNotFound, 'Peripheral not found');
            throw Error('Peripheral not found');
        }

    };

    this.sendErrorResponse = function(cookie, method, errorId, errMessage) {
        var error = {};
        params = {};
        error[C.kCode] = errorId;
        error[C.kMessageField] = errMessage;
        params[C.kError] = error;
        this.write(method, undefined, cookie, error);
    };

    this.authenticate = function(token) {
        this.send(JSON.stringify({
            type: C.authenticate,
            access_token: token
        }));
    };

    this.configureRequest = function() {
        console.error('configureRequest method not implemented by server');
    };

    this.configureResponse = function(cookie, error) {
        if (!error) {
            this.write(C.kConfigure, undefined, cookie);
        } else {
            this.sendErrorResponse(cookie, C.kConfigure, error);
        }
    };

    this.centralStateRequest = function() {
        console.error('centralStateRequest method not implemented by server');
    };

    this.centralStateResponse = function(cookie, state, error) {
        if (!error) {
            params = {};
            params[C.kState] = state;
            this.write(C.kCentralState, params, cookie);
        } else {
            this.write(C.kCentralState, params, cookie, error);
        }
    };

    this.scanRequest = function() {
        console.error('scanRequest method not implemented by server');
    };

    function arrayAsHex(array, pretty) {
        var ret = (pretty ? '0x' : '');
        for (var i in array) {
            var value = (array[i] & 0xFF).toString(16);
            if (value.length == 1) {
                value = '0' + value;
            }
            ret += value;
        }
        return ret;
    }

    function dec2hex(d) {
        var hex = Number(d).toString(16);
        while (hex.length < 2) {
            hex = '0' + hex;
        }
        return hex;
    }

    function isEmpty(obj) {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop))
                return false;
        }

        return JSON.stringify(obj) === JSON.stringify({});
    }

    this.scanResponse = function(cookie, name, uuid, addr, rssi, txPwr, serviceUUIDs, mfrData, svcData) {
        params = {};
        var manufactData;
        var serviceData;

        if (!isEmpty(mfrData)) {
            manufactData = {};
            for (var mk in mfrData) {
                var mkey = mk.toUpperCase();
                manufactData[mkey] = arrayAsHex(mfrData[mk]).toUpperCase();
            }
        }
        if (!isEmpty(svcData)) {
            serviceData = {};
            for (var sk in svcData) {
                var skey = sk.toUpperCase();
                serviceData[skey] = arrayAsHex(svcData[sk]).toUpperCase();
            }
        }

        params[C.kPeripheralName] = name;
        params[C.kPeripheralUUID] = uuid;
        params[C.kPeripheralBtAddress] = addr;
        params[C.kRSSIkey] = rssi;
        params[C.kCBAdvertisementDataTxPowerLevel] = txPwr;
        params[C.kCBAdvertisementDataServiceUUIDsKey] = ((serviceUUIDs && serviceUUIDs.length > 0) ? serviceUUIDs : undefined);
        params[C.kCBAdvertisementDataManufacturerDataKey] = manufactData;
        params[C.kCBAdvertisementDataServiceDataKey] = serviceData;

        this.write(C.kScanForPeripherals, params, cookie);
    };

    this.stopScanRequest = function() {
        console.error('stopScanRequest method not implemented by server');
    };

    this.stopScanResponse = function(cookie, error) {
        if (!error) {
            this.write(C.kStopScanning, undefined, cookie);
        } else {
            this.sendErrorResponse(cookie, C.kStopScanning, error);
        }

    };

    this.connectRequest = function() {
        console.error('connectRequest method not implemented by server');
    };

    this.connectResponse = function(cookie, peripheral, error) {
        var peripheral_db = {};
        peripheral_db[C.kPeripheralUUID] = peripheral.uuid;
        peripheral_db[C.kPeripheralName] = peripheral.name;

        var service_db = {};
        service_db = getServiceJsonFromPeripheralObject(peripheral);
        peripheral_db[C.kServices] = service_db;

        if (!error) {
            this.write(C.kConnect, peripheral_db, cookie);
        } else {
            this.sendErrorResponse(cookie, C.kConnect, error);
        }
    };

    this.disconnectRequest = function() {
        console.error('disconnectRequest method not implemented by server');
    };

    this.disconnectResponse = function(peripheral, error) {
        if (!error) {
            params = {};
            params[C.kPeripheralUUID] = peripheral.uuid;
            params[C.kPeripheralName] = peripheral.name;

            this.write(C.kDisconnect, params);
        } else {
            this.write(C.kDisconnect, error);
        }
    };

    this.write = function(result, params, cookie, error) {
        var mesg = {};
        mesg.jsonrpc = "2.0";
        mesg.result = result;
        mesg.params = params;
        mesg.error = error;
        if (cookie) {
            mesg.id = cookie.id;
            mesg.session_id = cookie.session_id;
        }
        this.send(JSON.stringify(mesg));
    };

    this.send = function(mesg) {
        if (!server) {
            this.onerror("not connected");
            return;
        }
        if (server.readyState !== 1) {
            console.log('Socket is CLOSED');
            return;
        }
        server.send(mesg);
    };

    this.close = function(callback) {
        if (server) {
            server.close();
        }
    };

    function getServiceJsonFromPeripheralObject(myPeripheral) {
        var service_db = {};

        if (myPeripheral && myPeripheral.services) {
            for (var uuid in myPeripheral.services) {
                var temp_service = {};
                temp_service[C.kServiceUUID] = uuid;
                temp_service[C.kIsPrimaryKey] = myPeripheral.services[uuid].isPrimary;
                temp_service[C.kCharacteristics] = getCharacteristicJsonFromServiceObject(myPeripheral.services[uuid]);

                service_db[uuid] = temp_service;
            }
        }

        return service_db;
    }

    function getCharacteristicJsonFromServiceObject(myService) {
        var characteristic_db = {};

        if (myService && myService.characteristics) {
            for (var uuid in myService.characteristics) {
                var temp_characteristic = {};
                temp_characteristic[C.kCharacteristicUUID] = uuid;
                temp_characteristic[C.kValue] = myService.characteristics[uuid].value;
                temp_characteristic[C.kProperties] = myService.characteristics[uuid].properties;
                temp_characteristic[C.kIsNotifying] = myService.characteristics[uuid].isNotifying;
                temp_characteristic[C.kDescriptors] = getDescriptorJsonFromCharacteristicObject(myService.characteristics[uuid]);

                characteristic_db[uuid] = temp_characteristic;
            }
        }

        return characteristic_db;
    }

    function getDescriptorJsonFromCharacteristicObject(myCharacteristic) {
        var descriptor_db = {};

        if (myCharacteristic && myCharacteristic.descriptors) {
            for (var uuid in myCharacteristic.descriptors) {
                var temp_descriptor = {};
                temp_descriptor[C.kDescriptorUUID] = uuid;
                temp_descriptor[C.kValue] = myCharacteristic.descriptors[uuid].value;
                temp_descriptor[C.kProperties] = myCharacteristic.descriptors[uuid].properties;
                temp_descriptor[C.kIsNotifying] = myCharacteristic.descriptors[uuid].isNotifying;

                descriptor_db[uuid] = temp_descriptor;
            }
        }

        return descriptor_db;
    }

    this.addPeripheral = function(name, uuid, addr, rssi, txPower, serviceUUIDs, addata, serviceData) {
        var peripheral = new Peripheral(this, name, uuid, addr, rssi, txPower, serviceUUIDs, addata, serviceData);
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


if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== 'undefined')) {
    exports.GattIpServer = GattIpServer;
}
