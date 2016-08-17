var C = require('./constants.js').C;
var Peripheral = require("../peripheral.js").Peripheral;
var ee = require('./event-emitter');
function GattIpServer() {
    ee.instantiateEmitter(this);
    var self = this;

    var server;
    this.peripherals = {};

    this.init = function (url, callback) {
        if (callback) this.oninit = callback;

        if (typeof window !== 'object') {
            WebSocket = require('websocket').w3cwebsocket;
        }
        self.socket = new WebSocket(url);

        self.socket.onopen = function () {
            self.initWithServer(self.socket);
            if (self.oninit) {
                self.oninit();
            }
        }
    };

    this.initWithServer = function (_server) {
        server = _server;

        if (!server.send) {
            throw new Error('server must implement the send method');
        }
        server.onmessage = self.processMessage;

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
        try {
            var message = JSON.parse(mesg.data);
        } catch (err) {
            console.warn("Got unknown message from client", mesg.data, 'error was', err);
        }

        if ((typeof message === 'undefined') || (!message)) {
            console.warn("Got unknown message from client", mesg.data);
            return;
        }

        if (message.error) {
            console.warn('Error in the Request', mesg.error);
            return;
        }

        // MESSAGE IS VALID
        var obj;
        if (message.result && ( (message.result == C.kMessage) || (message.result == C.kAuthenticate) ) ){
            var authenticated = false;
            if (!message.error && typeof message.params == 'object' && message.params[C.kAuthenticate] === true) {
                authenticated = true;
            }
            self.emit('authenticated', authenticated);
            return;
        }
        if (message.method && message.method == C.kAuthenticate) {
            // this is so that clients can talk to us directly, bypassing the proxy. If someone has access to the port, they should authenticate?
            console.log("Client requested to authenticate with us. Allowing the client");
            var params = {};
            params[C.kAuthenticate] = true;
            var response = {};
            response.result = C.kAuthenticate;
            response.params = params;
            response[C.kIdField] = message[C.kIdField];
            response = JSON.stringify(response);
            self.send(response);
            return;
        }

        // TODO work out some more invalid message cases....

        var cookie = {id: message.id, session_id: message.session_id, method: message.method};
        var p = message.params;

        function getObjects(type) {
            var peripheralUUID = p[C.kPeripheralUUID];
            var resultObj = {};

            resultObj.peripheral = self.peripherals[peripheralUUID];
            if (resultObj.peripheral && resultObj.peripheral.uuid) {
                if (type === 'p') {
                    return resultObj;
                }
                var serviceUUID = p[C.kServiceUUID];
                resultObj.service = resultObj.peripheral.findService(serviceUUID);
                if (resultObj.service && resultObj.service.uuid) {
                    if (type === 's') {
                        return resultObj;
                    }
                    var characteristicUUID = p[C.kCharacteristicUUID];
                    resultObj.characteristic = resultObj.service.findCharacteristic(characteristicUUID);
                    if (resultObj.characteristic && resultObj.characteristic.uuid) {
                        if (type === 'c') {
                            return resultObj;
                        }
                        var descriptorUUID = p[C.kDescriptorUUID];
                        resultObj.descriptor = resultObj.characteristic.findDescriptor(descriptorUUID);
                        if (resultObj.descriptor && resultObj.descriptor.uuid) {
                            return resultObj;
                        } else {
                            self.sendErrorResponse(message.method, C.kErrorDescriptorNotFound, 'Descriptor not found in the service database');
                            throw new Error('Descriptor not found');
                        }
                    } else {
                        self.sendErrorResponse(message.method, C.kErrorCharacteristicNotFound, 'Characteristic not found in the service database');
                        throw new Error('Characteristic not found');
                    }
                } else {
                    self.sendErrorResponse(message.method, C.kErrorServiceNotFound, 'Service not found in the service database');
                    throw new Error('Service not found');
                }
            } else {
                self.sendErrorResponse(message.method, C.kErrorPeripheralNotFound, 'Peripheral not found in the service database');
                throw new Error('Peripheral not found');
            }
        }

        switch (message.method) {
            case C.kConfigure:
                self.emit('configure', cookie, p[C.kShowPowerAlert], p[C.kIdentifierKey]);
                break;
            case C.kScanForPeripherals:
                self.emit('scan', cookie, p[C.kScanOptionAllowDuplicatesKey], p[C.kServiceUUIDs]);
                break;
            case C.kStopScanning:
                self.emit('stopScan', cookie);
                break;
            case C.kCentralState:
                self.emit('getCentralState', cookie);
                break;
            case C.kConnect:
                try {
                    obj = getObjects('p');
                    self.emit('connect', cookie, obj.peripheral.uuid);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kDisconnect:
                try {
                    obj = getObjects('p');
                    self.emit('disconnect', cookie, obj.peripheral.uuid);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kGetCharacteristicValue:
                try {
                    obj = getObjects('c', cookie);
                    self.emit('readCharacteristic', cookie, obj.peripheral.uuid, obj.service.uuid, obj.characteristic.uuid);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kWriteCharacteristicValue:
                try {
                    obj = getObjects('c', cookie);
                    self.emit('writeCharacteristic', cookie, obj.peripheral.uuid, obj.service.uuid, obj.characteristic.uuid, message.params[C.kValue]);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kSetValueNotification:
                try {
                    obj = getObjects('c', cookie);
                    obj.characteristic.isNotifying = message.params[C.kValue];
                    self.emit('enableNotifications', cookie, obj.peripheral.uuid, obj.service.uuid, obj.characteristic.uuid, message.params[C.kIsNotifying]);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kGetDescriptorValue:
                try {
                    obj = getObjects('d', cookie);
                    self.emit('readDescriptor', cookie, obj.peripheral.uuid, obj.service.uuid, obj.characteristic.uuid, obj.descriptor.uuid);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kWriteDescriptorValue:
                try {
                    obj = getObjects('d', cookie);
                    self.emit('writeDescriptor', cookie, obj.peripheral.uuid, obj.service.uuid, obj.characteristic.uuid, obj.descriptor.uuid, message.params[C.kValue]);
                } catch (ex) {
                    console.error(ex);
                }
                break;

            default:
                console.log('invalid request' + message.method);
                self.sendErrorResponse(cookie, message.method, C.kInvalidRequest, 'Request not handled by server');
                return;
        }
    };

    this.sendErrorResponse = function (cookie, method, errorId, errMessage) {
        var error = {};
        params = {};
        error[C.kCode] = errorId;
        error[C.kMessageField] = errMessage;
        params[C.kError] = error;
        self.write(method, undefined, cookie, error);
    };

    this.authenticate = function(token, verInfo) {
        params = {};
        params[C.kDeviceAccessToken] = token;
        params[C.kGetVersionInfo] = verInfo;

        var message = {};
        message.method = C.kAuthenticate;
        message.params = params;
        message.id = C.id.toString();
        C.id += 1;

        this.send(JSON.stringify(message));
    };

    this.configureResponse = function (cookie, error) {
        if (!error) {
            self.write(C.kConfigure, undefined, cookie);
        } else {
            self.sendErrorResponse(cookie, C.kConfigure, undefined);
        }
    };

    this.centralStateResponse = function (cookie, state, error) {
        if (!error) {
            params = {};
            params[C.kState] = state;
            self.write(C.kCentralState, params, cookie);
        } else {
            self.sendErrorResponse(cookie, C.kCentralState, undefined);
        }
    };
    
    // g-server
    function iGotRequest(params) {
        self.emit('readCharacteristic', function(value) {
            transmitToWire(value);
        })
    }

    // linux gw
    function globalHandler() {
        gattipserver.on('readCharacteristic', function (callback) {
            callback(internalReadValue());
        })
    }

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

    this.scanResponse = function(cookie, uuid, name, rssi, txPwr, serviceUUIDs, mfrData, svcData) {
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
        params[C.kRSSIkey] = rssi;
        params[C.kCBAdvertisementDataTxPowerLevel] = txPwr;
        params[C.kCBAdvertisementDataServiceUUIDsKey] = ((serviceUUIDs && serviceUUIDs.length > 0) ? serviceUUIDs : undefined);
        params[C.kCBAdvertisementDataManufacturerDataKey] = manufactData;
        params[C.kCBAdvertisementDataServiceDataKey] = serviceData;

        self.write(C.kScanForPeripherals, params, cookie);
    };

    this.stopScanResponse = function (cookie, error) {
        if (!error) {
            self.write(C.kStopScanning, undefined, cookie);
        } else {
            this.sendErrorResponse(cookie, C.kStopScanning, error);
        }
    };

    this.connectResponse = function (cookie, peripheral, error) {
        var peripheral_db = {};
        peripheral_db[C.kPeripheralUUID] = peripheral.uuid;
        peripheral_db[C.kPeripheralName] = peripheral.name;

        var service_db = {};
        service_db = getServiceJsonFromPeripheralObject(peripheral);
        peripheral_db[C.kServices] = service_db;

        if (!error) {
            self.write(C.kConnect, peripheral_db, cookie);
        } else {
            self.sendErrorResponse(cookie, C.kConnect, error);
        }
    };

    this.disconnectResponse = function (cookie, peripheral, error) {
        if (!error) {
            params = {};
            params[C.kPeripheralUUID] = peripheral.uuid;
            params[C.kPeripheralName] = peripheral.name;

            self.write(C.kDisconnect, params);
        } else {
            self.sendErrorResponse(cookie, C.kDisconnect, error);
        }
    };

    this.write = function (result, params, cookie, error) {
        var mesg = {};
        mesg.jsonrpc = "2.0";
        mesg.result = result;
        mesg.params = params;
        mesg.error = error;
        if (cookie) {
            mesg.id = cookie.id;
            mesg.session_id = cookie.session_id;
        }

        self.send(JSON.stringify(mesg));
    };

    this.send = function (mesg) {
        if (!server) {
            self.onerror("not connected");
            return;
        }
        if (server.readyState !== 1) {
            console.log('Socket is CLOSED');
            return;
        }
        server.send(mesg);
    };

    this.close = function (callback) {
        if (server) {
            server.close();
        }
    };

    function getServiceJsonFromPeripheralObject(myPeripheral) {
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

    this.addPeripheral = function (uuid, name, rssi, addata, scanData) {
        var peripheral = new Peripheral(this, uuid, name, rssi, addata, scanData);
        self.peripherals[peripheral.uuid] = peripheral;

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


ee.makeEmitter(GattIpServer);

module.exports.GattIpServer = GattIpServer;
