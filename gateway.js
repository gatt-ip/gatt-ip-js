var C = require('./lib/constants').C;
var helper = require('./lib/message-helper');
var Peripheral = require('./peripheral').Peripheral;
var InternalError = require('./errors').InternalError;
var ApplicationError = require('./errors').ApplicationError;
var ee = require("./lib/event-emitter");

function Gateway(gattip, scanFilters) {
    ee.instantiateEmitter(this);
    var self = this;
    var peripherals = {};
    var state;

    this.isScanning = false;

    this.isPoweredOn = function () {
        return self.state == C.kPoweredOn;
    };

    // REQUESTS =================================================
    this._authenticate = function (callback, token, version) {
        var params = {};
        params[C.kDeviceAccessToken] = token;
        params[C.kGetVersionInfo] = version;
        gattip.request(C.kOpen, params, callback, function (params) {
            if (params.isAuthenticated === true) {
                gattip.fulfill(callback, self);
            } else {
                console.warn('HACK ALERT: Proxy is supposed to respond with normal error');
                throw new GatewayError({error:'Auth error'});
            }
        });
    };

    this.scan = function (callback, scanOptions) {
        var params = {};
        if (scanOptions) {
            if ('boolean' == typeof scanOptions.scanDuplicates) {
                params[C.kScanOptionAllowDuplicatesKey] = scanOptions.scanDuplicates;
            }
            if ('object' == typeof scanOptions.services) {
                params[C.kServiceUUIDs] = scanOptions.services;
            }
        }

        gattip.request(C.kScanForPeripherals, params, callback, function (params) {
            self.isScanning = true;
            gattip.fulfill(callback, self);
        });
    };

    // TODO: Unregister all on scan event handlers
    this.stopScan = function (callback) {
        gattip.request(C.kStopScanning, {}, callback, function (params) {
            self.isScanning = false;
            gattip.fulfill(callback, self);
        });
    };

    this.centralState = function (callback) {
        var params = {};

        gattip.request(C.kCentralState, {}, callback, function (params) {
            self.state = params[C.kState];
            gattip.fulfill(callback, self);
        });
    };

    this.configure = function (callback, pwrAlert, centralID) {
        var params = {};
        if (typeof pwrAlert != 'undefined') {
            params[C.kShowPowerAlert] = pwrAlert;
        }
        if (typeof centralID != 'undefined') {
            params[C.kIdentifierKey] = centralID;
        }

        gattip.request(C.kConfigure, {}, callback, function (params) {
            gattip.fulfill(callback, self);
        });
    };

    //

    this.handleScanIndication = function(params) {
        var peripheralUUID = params[C.kPeripheralUUID];
        if (!peripheralUUID) {
            throw new InternalError('Peripheral UUID is not availabvle');
        }
        if (scanFilters && scanFilters.uuids) {
            for (var i in scanFilters.uuids) {
                var uuid = scanFilters.uuids[i];
                if (uuid && uuid.length) {
                    if (uuid != peripheralUUID) {
                        return;
                    }
                }
            }
        }

        var peripheral = self.getPeripheral(peripheralUUID);
        if (!peripheral) {
            peripheral = self.addPeripheral(new Peripheral(
                gattip,
                peripheralUUID,
                params[C.kPeripheralName],
                params[C.kRSSIkey],
                params[C.kCBAdvertisementDataTxPowerLevel],
                params[C.kCBAdvertisementDataServiceUUIDsKey],
                params[C.kCBAdvertisementDataManufacturerDataKey],
                params[C.kCBAdvertisementDataServiceDataKey],
                params[C.kAdvertisementDataKey],
                params[C.kScanRecord])
            );
        } else {
            peripheral._updateFromScanData(
                params[C.kPeripheralName],
                params[C.kRSSIkey],
                params[C.kCBAdvertisementDataTxPowerLevel],
                params[C.kCBAdvertisementDataServiceUUIDsKey],
                params[C.kCBAdvertisementDataManufacturerDataKey],
                params[C.kCBAdvertisementDataServiceDataKey],
                params[C.kAdvertisementDataKey],
                params[C.kScanRecord]
            );
        }
        self.emit('scan', peripheral);

    };

    // PERIPHERAL MANAGEMENT ETC. ======================================

    this.addPeripheralWithValues = function (uuid, name, RSSI, txPwr, serviceUUIDs, mfrData, scvData) {
        if (!uuid) {
            throw new InternalError('Attempting to add an empty peripheral');
        }
        var peripheral = self.addPeripheral(new Peripheral(gattip, uuid, name, RSSI, txPwr, serviceUUIDs, mfrData, scvData));
        peripherals[uuid] = peripheral;
        return peripheral;
    };

    this.addPeripheral = function (peripheral) {
        if (!peripheral || !peripheral.uuid) {
            throw new InternalError('Attempting to add an empty peripheral');
        }
        peripherals[peripheral.uuid] = peripheral;
        return peripheral;
    };

    this.removePeripheral = function (peripheral) {
        if (!peripheral || !peripheral.uuid) {
            throw new InternalError('Attempting to remove an empty peripheral');
        }
        delete peripherals[peripheral.uuid];
    };

    this.getPeripheral = function (peripheralUUID) {
        return peripherals[peripheralUUID];
    };

    this.getPeripheralOrDie = function (peripheralUUID) {
        var peripheral = peripherals[peripheralUUID];
        if (!peripheral) {
            throw new InternalError('Unable to find peripheral with UUID ' + peripheralUUID);
        }
        return peripheral;
    };

    this.getObjects = function(type, peripheralUUID, serviceUUID, characteristicUUID, descriptorUUID) {
        var resultObj = {};
        resultObj.peripheral = peripherals[peripheralUUID];
        if (resultObj.peripheral) {
            if (type === 'p') {
                return resultObj;
            }
            resultObj.service = resultObj.peripheral.findService(serviceUUID);
            if (resultObj.service) {
                if (type === 's') {
                    return resultObj;
                }
                resultObj.characteristic = resultObj.service.findCharacteristic(characteristicUUID);
                if (resultObj.characteristic) {
                    if (type === 'c') {
                        return resultObj;
                    }
                    resultObj.descriptor = resultObj.characteristic.findDescriptor(descriptorUUID);
                    if (resultObj.descriptor) {
                        if (type === 'd') {
                            return resultObj;
                        } else {
                            throw new InternalError('_getObjects: Argument "type" is required');
                        }
                    } else {
                        throw new ApplicationError('Descriptor "'+ descriptorUUID + '" not found in the service table');
                    }
                } else {
                    throw new ApplicationError('Characteristic "'+ characteristicUUID + '" not found in the service table');
                }
            } else {
                throw new ApplicationError('Service "'+ serviceUUID + '" not found in the service table');
            }
        } else {
            throw new ApplicationError('Peripheral with id '+ peripheralUUID + ' not found');
        }
    };


    this.getObjectsFromMessage = function(type, params) {
        if (!params) {
            throw new InternalError("Message parameters are missing");
        }
        try {
            return self.getObjects(type, params[C.kPeripheralUUID], params[C.kServiceUUID], params[C.kCharacteristicUUID], params[C.kDescriptorUUID] );
        } catch (error) {
            throw new InternalError(error.message, error.detail);
        }
    };

}
ee.makeEmitter(Gateway);
module.exports.Gateway = Gateway;
