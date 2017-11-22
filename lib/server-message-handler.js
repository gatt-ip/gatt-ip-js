var C = require('./constants.js').C;
var ee = require('./event-emitter');
var helper = require('./message-helper');

function ServerMessageHandler(gattip, gateway) {
    ee.instantiateEmitter(this);
    var self = this;

    this.processMessage = function (message) {
        var obj;

        if ((typeof message === 'undefined') || (!message)) {
            console.warn("Got unknown message from client", mesg.data);
            return;
        }

        if (message.error) {
            console.warn('Error in the Request', mesg.error);
            return;
        }

        // MESSAGE IS VALID

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

        var cookie = {original:message};
        var p = message.params;

        function getObject() {
            var objId = p[C.kObjectId];
            var retObj;
            if (typeof objId != 'string') {
                self.sendErrorResponse(cookie, 400, 'Object ID is required');
                throw new Error('Object ID is required');
            }

            retObj = gateway.getObject(objId);
            if (typeof retObj != 'object') {
                self.sendErrorResponse(cookie, 404, 'Object with ID ' +  objId + ' not found');
                throw new Error('Object with ID ' +  objId + ' not found');
            }
            return retObj;
        }
        function getObjects(type) {
            var peripheralUUID = p[C.kPeripheralUUID];
            var resultObj = {};

            resultObj.peripheral = gateway.getPeripheral(peripheralUUID);
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
                            self.sendErrorResponse(cookie, 404, 'Descriptor not found in the service database');
                            throw new Error('Descriptor not found');
                        }
                    } else {
                        self.sendErrorResponse(cookie, 404, 'Characteristic not found in the service database');
                        throw new Error('Characteristic not found');
                    }
                } else {
                    self.sendErrorResponse(cookie, 404, 'Service not found in the service database');
                    throw new Error('Service not found');
                }
            } else {
                self.sendErrorResponse(cookie, 404, 'Peripheral not found in the service database');
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
                    self.emit('writeCharacteristic', cookie, obj.peripheral.uuid, obj.service.uuid, obj.characteristic.uuid, p[C.kValue]);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kSetValueNotification:
                try {
                    obj = getObjects('c', cookie);
                    self.emit('enableNotifications', cookie, obj.peripheral.uuid, obj.service.uuid, obj.characteristic.uuid, p[C.kIsNotifying]);
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
            case C.kOpenStream:
                try {
                    self.emit('openStream', cookie, p[C.kObjectId], {speed:p[C.kSpeed], force:p[C.kForce]});
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kCloseStream:
                try {
                    obj = getObject();
                    self.emit('closeStream', cookie, obj);
                } catch (ex) {
                    console.error(ex);
                }
                break;
            case C.kWriteStreamData:
                try {
                    obj = getObject();
                    self.emit('writeStreamData', cookie, obj, p[C.kVal]);
                } catch (ex) {
                    console.error(ex);
                }
                break;

            default:
                console.log('invalid request: ' + message.method);
                self.sendErrorResponse(cookie, C.kInvalidRequest, 'Request not handled by server');
                return;
        }
    };

    self.sendErrorResponse = function (cookie, errorId, errMessage) {
        var mesg = {}, error = {};
        error[C.kCode] = errorId;
        error[C.kMessageField] = errMessage;
        mesg[C.kError] = error;
        if(cookie && cookie.original) {
            mesg.result = cookie.original.method
            mesg[C.kMessageId] = cookie.original.id;
            mesg[C.kSessionId] = cookie.original.session_id;
        }
        gattip.sendError(mesg);
    };

    self.configureResponse = function (cookie) {
        cookie.result = C.kConfigure;
        gattip.respond(cookie, {});
    };

    self.centralStateResponse = function (cookie, state) {
        var params = {};
        params[C.kState] = state;
        cookie.result = C.kCentralState;
        gattip.respond(cookie, params);
    };

    self.stopScanResponse = function (cookie) {
        cookie.result = C.kStopScanning;
        gattip.respond(cookie, {});
    };

    self.disconnectResponse = function (cookie, peripheral) {
        var params = {};
        params[C.kPeripheralUUID] = peripheral.uuid;
        params[C.kPeripheralName] = peripheral.name;

        cookie.result = C.kDisconnect;
        gattip.respond(cookie, params);
    };

    self.disconnectIndication = function (peripheral) {
        var params = {};
        params[C.kPeripheralUUID] = peripheral.uuid;
        params[C.kPeripheralName] = peripheral.name;

        gattip.sendIndications(C.kDisconnect, params);
    };

    self.scanResponse = function(cookie) {
        cookie.result = C.kScanForPeripherals;
        gattip.respond(cookie, {});
    };

    self.scanIndication = function(uuid, name, rssi, txPwr, serviceUUIDs, mfrData, svcData, isConnectable) {
        var params = {};
        var manufactData;
        var serviceData;

        if (!helper.isEmpty(mfrData)) {
            manufactData = {};
            for (var mk in mfrData) {
                if (mfrData.hasOwnProperty(mk)) {
                    var mkey = mk.toUpperCase();
                    var mData = mfrData[mk];
                    if ("string" === typeof mData) {
                        // this is a scan indication from proxy with existing peripheral
                        manufactData[mkey] = mData.toUpperCase();
                    } else {
                        // better be an array
                        manufactData[mkey] = helper.arrayAsHex(mData).toUpperCase();
                    }
                }
            }
        }
        if (!helper.isEmpty(svcData)) {
            serviceData = {};
            for (var sk in svcData) {
                if (svcData.hasOwnProperty(sk)) {
                    var skey = sk.toUpperCase();
                    var sData = svcData[sk];
                    if ("string" === typeof sData) {
                        serviceData[skey] = sData.toUpperCase();
                    } else {
                        // better be an array
                        serviceData[skey] = helper.arrayAsHex(sData).toUpperCase();
                    }
                }
            }
        }

        params[C.kPeripheralName] = name;
        params[C.kPeripheralUUID] = uuid;
        params[C.kRSSIkey] = rssi;
        params[C.kCBAdvertisementDataTxPowerLevel] = txPwr;
        params[C.kCBAdvertisementDataIsConnectable] = isConnectable;
        params[C.kCBAdvertisementDataServiceUUIDsKey] = ((serviceUUIDs && serviceUUIDs.length > 0) ? serviceUUIDs : undefined);
        params[C.kCBAdvertisementDataManufacturerDataKey] = manufactData;
        params[C.kCBAdvertisementDataServiceDataKey] = serviceData;

        gattip.sendIndications(C.kScanForPeripherals, params);
    };

    self.openStreamResponse = function (cookie, streamObjectId) {
        var params = {};
        params[C.kObjectId] = streamObjectId;
        cookie.result = C.kOpenStream;
        gattip.respond(cookie, params);
    };

    self.closeStreamResponse = function (cookie, streamObjectId) {
        var params = {};
        params[C.kObjectId] = streamObjectId;
        cookie.result = C.kCloseStream;
        gattip.respond(cookie, params);
    };

}

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

ee.makeEmitter(ServerMessageHandler);
module.exports.ServerMessageHandler = ServerMessageHandler;
