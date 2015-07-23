function GATTIP() {

    var _socket;
    this.state = GATTIP.kUnknown;
    this.peripherals = {};
    var serviceNames;
    var characteristicNames;
    var descriptorNames;
    var path = "lib/gatt-ip-js/"; // Replace the path to json configuration file.


    this.init = function(server, callback) {
        if (callback) this.oninit = callback;

        _socket = new WebSocket(server);

        _socket.onopen = function() {
            this.oninit();
        }.bind(this);

        _socket.onclose = function(mesg) {}.bind(this);

        _socket.onerror = function(mesg) {}.bind(this);

        _socket.onmessage = function(mesg) {
            var response = JSON.parse(mesg.data);
            var peripheral, service, characteristic;

            switch (response.result) {
                case kConfigure:
                    this.onconfigure(response.params, response.error);
                    break;
                case kScanForPeripherals:
                    if (response.params && response.params[kPeripheralUUID])
                        peripheral = this.peripherals[response.params[kPeripheralUUID]];
                    if (!response.error) {

                        if (!peripheral) {
                            peripheral = new Peripheral(this,
                                response.params[kPeripheralName],
                                response.params[kPeripheralUUID],
                                response.params[kAdvertisementDataKey],
                                response.params[kScanRecord],
                                response.params[kRSSIkey],
                                response.params[kPeripheralBtAddress]);
                            this.peripherals[response.params[kPeripheralUUID]] = peripheral;
                        } else {
                            peripheral.name = response.params[kPeripheralName];
                            peripheral.uuid = response.params[kPeripheralUUID];
                            peripheral.advertisement = response.params[kAdvertisementDataKey];
                            peripheral.scanData = response.params[kScanRecord];
                            peripheral.rssi = response.params[kRSSIkey];
                            peripheral.addr = response.params[kPeripheralBtAddress];
                        }
                    }
                    this.onscan(peripheral, response.error);
                    break;
                case kStopScanning:
                    this.onstopScan(response.error);
                    break;
                case kConnect:
                    if (response.params && response.params[kPeripheralUUID])
                        peripheral = this.peripherals[response.params[kPeripheralUUID]];
                    if (!response.error) {
                        if (!peripheral) {
                            console.log("unknown peripheral");
                        } else {
                            peripheral.onconnect(response.error);
                        }
                    }
                    this.onconnect(peripheral, response.error);
                    break;
                case kDisconnect:
                    if (response.params && response.params[kPeripheralUUID])
                        peripheral = this.peripherals[response.params[kPeripheralUUID]];
                    if (!response.error) {
                        if (!peripheral) {
                            console.log("unknown peripheral");
                        } else {
                            peripheral.ondisconnect(response.error);
                        }
                    }
                    this.ondisconnect(peripheral, response.error);
                    break;
                case kCentralState:
                    this.state = response.params[kState];
                    this.onstate(response.params[kState], response.error);
                    break;
                case kGetConnectedPeripherals:
                    console.log("kGetConnectedPeripherals event"); //TODO
                    break;
                case kGetPerhipheralsWithServices:
                    console.log("kGetPerhipheralsWithServices event"); //TODO
                    break;
                case kGetPerhipheralsWithIdentifiers:
                    console.log("kGetPerhipheralsWithIdentifiers event"); //TODO
                    break;
                case kGetServices:
                    if (response.params && response.params[kPeripheralUUID])
                        peripheral = this.peripherals[response.params[kPeripheralUUID]];
                    if (!response.error) {
                        if (!peripheral) {
                            console.log("unknown peripheral");
                        } else {
                            peripheral.ondiscoverServices(response.params, response.error);
                        }
                    }
                    this.ondiscoverServices(peripheral, response.error);
                    break;
                case kGetIncludedServices:
                    console.log("kGetIncludedServices event"); //TODO
                    break;
                case kGetCharacteristics:
                    if (response.params && response.params[kPeripheralUUID])
                        peripheral = this.peripherals[response.params[kPeripheralUUID]];
                    if (!response.error) {
                        if (!peripheral) {
                            console.log("unknown peripheral");
                        } else {
                            service = peripheral.services[response.params[kServiceUUID]];
                            service.ondiscoverCharacteristics(response.params, response.error);
                            this.ondiscoverCharacteristics(peripheral, service, response.error);
                        }
                    } else
                        this.ondiscoverCharacteristics(peripheral, service, response.error);
                    break;
                case kGetDescriptors:
                    if (response.params && response.params[kPeripheralUUID])
                        peripheral = this.peripherals[response.params[kPeripheralUUID]];
                    if (!response.error) {
                        if (!peripheral) {
                            console.log("unknown peripheral");
                        } else {
                            service = peripheral.services[response.params[kServiceUUID]];
                            if (service) {
                                characteristic = service.characteristics[response.params[kCharacteristicUUID]];
                                characteristic.ondiscoverDescriptors(response.params, response.error);
                            }
                            this.ondiscoverDescriptors(peripheral, service, characteristic, response.error);
                        }
                    } else
                        this.ondiscoverDescriptors(peripheral, service, characteristic, response.error);
                    break;
                case kGetCharacteristicValue:
                    if (response.params && response.params[kPeripheralUUID])
                        peripheral = this.peripherals[response.params[kPeripheralUUID]];
                    if (!response.error) {
                        if (!peripheral) {
                            console.log("unknown peripheral");
                        } else {
                            service = peripheral.services[response.params[kServiceUUID]];
                            if (service) {
                                characteristic = service.characteristics[response.params[kCharacteristicUUID]];
                                characteristic.onread(response.params, response.error);
                            }
                            this.onupdateValue(peripheral, service, characteristic, response.error);
                        }
                    } else
                        this.onupdateValue(peripheral, service, characteristic, response.error);
                    break;
                case kGetDescriptorValue:
                    console.log("kGetDescriptorValue event"); //TODO
                    break;
                case kWriteCharacteristicValue:
                    if (response.params && response.params[kPeripheralUUID])
                        peripheral = this.peripherals[response.params[kPeripheralUUID]];
                    if (!response.error) {
                        if (!peripheral) {
                            console.log("unknown peripheral");
                        } else {
                            service = peripheral.services[response.params[kServiceUUID]];
                            if (service) {
                                characteristic = service.characteristics[response.params[kCharacteristicUUID]];
                                characteristic.onwrite(response.params, response.error);
                            }
                            this.onwriteValue(peripheral, service, characteristic, response.error);
                        }
                    } else
                        this.onwriteValue(peripheral, service, characteristic, response.error);
                    break;
                case kWriteDescriptorValue:
                    console.log("kWriteDescriptorValue event"); //TODO
                    break;
                case kSetValueNotification:
                    if (response.params && response.params[kPeripheralUUID])
                        peripheral = this.peripherals[response.params[kPeripheralUUID]];
                    if (!response.error) {
                        if (!peripheral) {
                            console.log("unknown peripheral");
                        } else {
                            service = peripheral.services[response.params[kServiceUUID]];
                            if (service) {
                                characteristic = service.characteristics[response.params[kCharacteristicUUID]];
                                if (characteristic) {
                                    characteristic.isNotifying = response.params[kIsNotifying];
                                    characteristic.value = response.params[kValue];
                                }
                            }
                            this.onupdateValue(peripheral, service, characteristic, response.error);
                        }
                    } else
                        this.onupdateValue(peripheral, service, characteristic, response.error);
                    break;
                case kGetPeripheralState:
                    console.log("kGetPeripheralState event"); //TODO
                    break;
                case kGetRSSI:
                    if (response.params && response.params[kPeripheralUUID])
                        peripheral = this.peripherals[response.params[kPeripheralUUID]];
                    if (!response.error) {
                        if (!peripheral) {
                            console.log("unknown peripheral");
                        } else {
                            peripheral.name = response.params[kPeripheralName];
                            peripheral.rssi = response.params[kRSSIkey];
                            this.onupdateRSSI(peripheral, response.error);
                        }
                    } else
                        this.onupdateRSSI(peripheral, response.error);
                    break;
                case kInvalidatedServices:
                    console.log("kInvalidatedServices event"); //TODO
                    break;
                case kPeripheralNameUpdate:
                    if (response.params && response.params[kPeripheralUUID])
                        peripheral = this.peripherals[response.params[kPeripheralUUID]];
                    if (!response.error) {
                        if (!peripheral) {
                            console.log("unknown peripheral");
                        } else {
                            peripheral.name = response.params[kPeripheralName];
                            peripheral.rssi = response.params[kRSSIkey];
                            this.onupdateRSSI(peripheral, response.error);
                        }
                    } else
                        this.onupdateRSSI(peripheral, response.error);
                    break;
                case kMessage:
                    this.onMessage(response.params, response.error);
                    break;
                default:
                    console.log('invalid response');
            }
        }.bind(this);
    };

    this.oninit = function(params, error) {};

    this.configure = function(pwrAlert, centralID, callback) {
        if (callback) this.onconfigure = callback;

        var params = {};
        params[kShowPowerAlert] = pwrAlert;
        params[kIdentifierKey] = centralID;

        this.write(kConfigure, params);
    };

    this.onconfigure = function(params, error) {};

    this.scan = function(scanDuplicates, services, callback) {
        if (callback) this.onscan = callback;
        this.peripherals = {};
        //TODO: validate params, check for array
        var params = {};
        params[kScanOptionAllowDuplicatesKey] = scanDuplicates;
        params[kServiceUUIDs] = services;

        this.write(kScanForPeripherals, params);
    };

    this.onscan = function(params, error) {};

    this.stopScan = function(callback) {
        if (callback) this.onscan = callback;

        var params = {};

        this.write(kStopScanning, params);
    };

    this.onstopScan = function(params, error) {};

    this.onstate = function(state, error) {};

    this.onupdateRSSI = function(peripheral, error) {};

    this.onerror = function(params, error) {
        console.log('invalid parameters');
    };

    this.close = function(callback) {
        if (_socket) {
            _socket.close();
        }
    };

    this.onclose = function(params, error) {};

    this.write = function(method, params, id) {
        var mesg = {};
        mesg.jsonrpc = "2.0";
        mesg.method = method;
        mesg.params = params;
        mesg.id = id;

        this.send(JSON.stringify(mesg));
    };

    this.send = function(mesg) {
        if (!_socket) {
            this.onerror("not connected");
            return;
        }

        _socket.send(mesg);
    };

    function Peripheral(gattip, name, uuid, addata, scanData, rssi, addr) {
        var _gattip = gattip;
        this.name = name;
        this.uuid = uuid;
        this.advertisementData = addata;
        this.scanData = scanData;
        this.serviceUUIDs = {};
        this.rawAdvertisingData = addata[kRawAdvertisementData];
        this.manufacturerData = '';
        this.rssi = rssi;
        this.addr = addr;
        this.isConnected = false;
        this.services = {};
        var flag = true;
        //parse advertising data
        var advdata = new Array();
        if (this.rawAdvertisingData.length % 2 == 0) {
            for (var i = 0; i < this.rawAdvertisingData.length; i = i + 2) {
                advdata[i / 2] = this.rawAdvertisingData.charAt(i) + this.rawAdvertisingData.charAt(i + 1);
            }
        } else {
            for (var i = 0; i < this.rawAdvertisingData.length; i++) {
                advdata[i] = this.rawAdvertisingData.charAt(2 * i) + this.rawAdvertisingData.charAt(2 * i + 1);
            }
        }

        do {
            if (advdata[1] == GATTIP.GAP_ADTYPE_FLAGS) {
                var advdataLength = parseInt(advdata[0], 16);
                if (parseInt(advdata[2], 16) >= 1) {
                    this.discoverable = "true";
                } else
                    this.discoverable = "false";
                advdata.splice(0, advdataLength + 1);
            } else if (advdata[1] == GATTIP.GAP_ADTYPE_POWER_LEVEL) {
                var advdataLength = parseInt(advdata[0], 16);
                this.txpowerLevel = parseInt(advdata[2]);
                advdata.splice(0, advdataLength + 1);
            } else if (advdata[1] == GATTIP.GAP_ADTYPE_INCOMPLETE_16BIT_SERVICEUUID || advdata[1] == GATTIP.GAP_ADTYPE_COMPLETE_16BIT_SERVICEUUID) {
                var advdataLength = parseInt(advdata[0], 16);
                var reverseUUID = '';
                for (var i = advdataLength; i >= 2; i--) {
                    reverseUUID += advdata[i];
                }
                this.serviceUUIDs[0] = reverseUUID;
                advdata.splice(0, advdataLength + 1);
            } else if (advdata[1] == GATTIP.GAP_ADTYPE_INCOMPLETE_32BIT_SERVICEUUID || advdata[1] == GATTIP.GAP_ADTYPE_COMPLETE_32BIT_SERVICEUUID) {
                var advdataLength = parseInt(advdata[0], 16);
                var reverseUUID = '';
                for (var i = advdataLength; i >= 2; i--) {
                    reverseUUID += advdata[i];
                }
                this.serviceUUIDs[0] = reverseUUID;
                advdata.splice(0, advdataLength + 1);
            } else if (advdata[1] == GATTIP.GAP_ADTYPE_INCOMPLETE_128BIT_SERVICEUUID || advdata[1] == GATTIP.GAP_ADTYPE_COMPLETE_128BIT_SERVICEUUID) {
                var advdataLength = parseInt(advdata[0], 16);
                var reverseUUID = '';
                for (var i = advdataLength; i >= 2; i--) {
                    reverseUUID += advdata[i];
                    if (i == 14 || i == 12 || i == 10 || i == 8) {
                        reverseUUID += "-";
                    }
                }

                this.serviceUUIDs[0] = reverseUUID;
                advdata.splice(0, advdataLength + 1);
            } else if (advdata[1] == GATTIP.GAP_ADTYPE_MANUFACTURER_SPECIFIC) {
                var advdataLength = parseInt(advdata[0], 16);
                for (var k = 2; k <= advdataLength; k++) {
                    this.manufacturerData += advdata[k];
                }
                advdata.splice(0, advdataLength + 1);
            } else if (advdata[1] == "00") {
                advdata.splice(0, 1);
            } else {
                var advdataLength = parseInt(advdata[0], 16);
                advdata.splice(0, advdataLength + 1);
            }
            if (advdata.length == 0)
                flag = false;
        } while (flag);

        this.connect = function(callback) {
            if (callback) this.onconnect = callback;

            var params = {};
            params[kPeripheralUUID] = this.uuid;

            _gattip.write(kConnect, params);
        };

        this.onconnect = function(error) {
            $.getJSON(path + "bleServices.json", function(res) {
                serviceNames = res;
            });
            $.getJSON(path + "bleCharacteristics.json", function(res) {
                characteristicNames = res;
            });
            $.getJSON(path + "bleDescriptors.json", function(res) {
                descriptorNames = res;
            });

            this.isConnected = true;
        };

        this.disconnect = function(callback) {
            if (callback) this.onconnect = callback;

            var params = {};
            params[kPeripheralUUID] = this.uuid;

            _gattip.write(kDisconnect, params);
        };

        this.ondisconnect = function(error) {
            this.isConnected = false;
        };

        this.discoverServices = function(callback) {
            if (callback) this.ondiscoverServices = callback;

            var params = {};
            params[kPeripheralUUID] = this.uuid;

            _gattip.write(kGetServices, params);
        };

        this.ondiscoverServices = function(params, error) {
            for (var index in params[kServices]) {
                var serviceUUID = params[kServices][index][kServiceUUID];
                var service = this.services[serviceUUID];
                if (!service) {
                    service = new Service(_gattip, this, serviceUUID);
                    this.services[serviceUUID] = service;
                }
            }
        };

        this.updateRSSI = function(callback) {
            if (callback) this.onupdateRSSI = callback;

            var params = {};
            params[kPeripheralUUID] = this.uuid;

            _gattip.write(kGetRSSI, params);
        };

        this.onupdateRSSI = function(params, error) {
            console.log("kGetRSSI event"); //TODO
        };
    }

    function Service(gattip, peripheral, uuid) {
        var _gattip = gattip;
        var _peripheral = peripheral;
        this.uuid = uuid;

        if (uuid.length === 4) {
            if (serviceNames) {
                var uuidObj = serviceNames[uuid];
                if (uuidObj != null) {
                    this.serviceName = uuidObj["name"];
                } else
                    this.serviceName = uuid;
            } else
                this.serviceName = uuid;
        } else
            this.serviceName = uuid;
        this.isPrimary = true; //TODO: read from remote
        this.characteristics = {};
        this.includedServices = {};

        this.discoverIncludedServices = function(callback) {};

        this.ondiscoverIncludedServices = function(error) {};

        this.discoverCharacteristics = function(callback) {
            if (callback) this.ondiscoverCharacteristics = callback;

            var params = {};
            params[kPeripheralUUID] = _peripheral.uuid;
            params[kServiceUUID] = this.uuid;

            _gattip.write(kGetCharacteristics, params);
        };

        this.ondiscoverCharacteristics = function(params, error) {
            for (var index in params[kCharacteristics]) {
                var characteristicUUID = params[kCharacteristics][index][kCharacteristicUUID];
                var characteristic = this.characteristics[characteristicUUID];
                if (!characteristic) {
                    characteristic = new Characteristic(_gattip, _peripheral, this, characteristicUUID);
                    this.characteristics[characteristicUUID] = characteristic;
                }
                characteristic.value = params[kCharacteristics][index][kValue];

                var props = params[kCharacteristics][index][kProperties];
                for (var apindex in GATTIP.AllProperties) {
                    characteristic.properties[apindex] = {
                        enabled: (props >> apindex) & 1,
                        name: GATTIP.AllProperties[apindex]
                    };
                }

                characteristic.isNotifying = params[kCharacteristics][index][kIsNotifying];
            }
        };
    }

    function Characteristic(gattip, peripheral, service, uuid) {
        var _gattip = gattip;
        var _peripheral = peripheral;
        var _service = service;
        this.uuid = uuid;

        if (uuid.length === 4) {
            if (characteristicNames) {
                var uuidObj = characteristicNames[uuid];
                if (uuidObj != null) {
                    this.characteristicName = uuidObj["name"];
                } else
                    this.characteristicName = uuid;
            } else
                this.characteristicName = uuid;
        } else
            this.characteristicName = uuid;
        this.descriptors = {};
        this.properties = {};
        this.value = {};
        this.isNotifying = false;

        this.discoverDescriptors = function(callback) {
            if (callback) this.ondiscoverDescriptors = callback;

            var params = {};
            params[kPeripheralUUID] = _peripheral.uuid;
            params[kServiceUUID] = _service.uuid;
            params[kCharacteristicUUID] = this.uuid;

            _gattip.write(kGetDescriptors, params);
        };

        this.ondiscoverDescriptors = function(params, error) {
            for (var index in params[kDescriptors]) {
                var descriptorUUID = params[kDescriptors][index][kDescriptorUUID];
                var descriptor = this.descriptors[descriptorUUID];
                if (!descriptor) {
                    descriptor = new Descriptor(_gattip, _peripheral, _service, this, descriptorUUID);
                    this.descriptors[descriptorUUID] = descriptor;
                }
            }
        };

        this.read = function(callback) {
            if (callback) this.onread = callback;

            var params = {};
            params[kPeripheralUUID] = _peripheral.uuid;
            params[kServiceUUID] = _service.uuid;
            params[kCharacteristicUUID] = this.uuid;

            _gattip.write(kGetCharacteristicValue, params);
        };

        this.onread = function(params, error) {
            this.isNotifying = params[kIsNotifying];
            this.value = params[kValue];
        };

        this.write = function(data, callback) {
            var restype;
            if (this.properties[2].enabled == 1 || this.properties[5].enabled == 1) {
                restype = GATTIP.kWriteWithoutResponse;
            } else {
                restype = GATTIP.kWriteResponse;
            }
            this.writeWithResType(data, restype, callback);
        };

        this.writeWithResType = function(data, restype, callback) {
            if (callback) this.onread = callback;

            var params = {};
            params[kPeripheralUUID] = _peripheral.uuid;
            params[kServiceUUID] = _service.uuid;
            params[kCharacteristicUUID] = this.uuid;
            params[kValue] = data;
            params[kWriteType] = restype;

            _gattip.write(kWriteCharacteristicValue, params);
        };

        this.onwrite = function(params, error) {};

        this.notify = function(value, callback) {
            if (callback) this.onread = callback;

            var params = {};
            params[kPeripheralUUID] = _peripheral.uuid;
            params[kServiceUUID] = _service.uuid;
            params[kCharacteristicUUID] = this.uuid;
            params[kValue] = value;
            this.isNotifying = value;

            _gattip.write(kSetValueNotification, params);
        };

        this.indicate = function(callback) {
            if (callback) this.onread = callback;

            var params = {};
            params[kPeripheralUUID] = _peripheral.uuid;
            params[kServiceUUID] = _service.uuid;
            params[kCharacteristicUUID] = this.uuid;

            _gattip.write(kGetCharacteristicValue, params);
        };

        this.broadcast = function(callback) {
            if (callback) this.onread = callback;

            var params = {};
            params[kPeripheralUUID] = _peripheral.uuid;
            params[kServiceUUID] = _service.uuid;
            params[kCharacteristicUUID] = this.uuid;

            _gattip.write(kGetCharacteristicValue, params);
        };
    }

    function Descriptor(gattip, peripheral, service, characteristic, uuid) {
        var _gattip = gattip;
        var _peripheral = peripheral;
        var _service = service;
        var _characteristic = characteristic;
        this.uuid = uuid;

        if (uuid.length === 4) {
            if (descriptorNames) {
                var uuidObj = descriptorNames[uuid];
                if (uuidObj != null) {
                    this.descriptorName = uuidObj["name"];
                } else
                    this.descriptorName = uuid;
            } else
                this.descriptorName = uuid;
        } else
            this.descriptorName = uuid;
        this.value = "";
    }

    //-------------------------------------- GATT-IP Constants ----------------------------------------
    var kError          =   "error";
    var kCode           =   "code";
    var kMessageField   =   "message";
    var kResult         =   "result";
    var kIdField        =   "id";

    //-------------------------------------- Methods ----------------------------------------
    //Central Methods
    var kConfigure                      =   "aa";
    var kScanForPeripherals             =   "ab";
    var kStopScanning                   =   "ac";
    var kConnect                        =   "ad";
    var kDisconnect                     =   "ae";
    var kCentralState                   =   "af";
    var kGetConnectedPeripherals        =   "ag";
    var kGetPerhipheralsWithServices    =   "ah";
    var kGetPerhipheralsWithIdentifiers =   "ai";

    //Peripheral Methods
    var kGetServices                =   "ak";
    var kGetIncludedServices        =   "al";
    var kGetCharacteristics         =   "am";
    var kGetDescriptors             =   "an";
    var kGetCharacteristicValue     =   "ao";
    var kGetDescriptorValue         =   "ap";
    var kWriteCharacteristicValue   =   "aq";
    var kWriteDescriptorValue       =   "ar";
    var kSetValueNotification       =   "as";
    var kGetPeripheralState         =   "at";
    var kGetRSSI                    =   "au";
    var kInvalidatedServices        =   "av";
    var kPeripheralNameUpdate       =   "aw";
    var kMessage                    =   "zz";

    //-------------------------------------- Keys ----------------------------------------
    var kCentralUUID            =   "ba";
    var kPeripheralUUID         =   "bb";
    var kPeripheralName         =   "bc";
    var kPeripheralUUIDs        =   "bd";
    var kServiceUUID            =   "be";
    var kServiceUUIDs           =   "bf";
    var kPeripherals            =   "bg";
    var kIncludedServiceUUIDs   =   "bh";
    var kCharacteristicUUID     =   "bi";
    var kCharacteristicUUIDs    =   "bj";
    var kDescriptorUUID         =   "bk";
    var kServices               =   "bl";
    var kCharacteristics        =   "bm";
    var kDescriptors            =   "bn";
    var kProperties             =   "bo";
    var kValue                  =   "bp";
    var kState                  =   "bq";
    var kStateInfo              =   "br";
    var kStateField             =   "bs";
    var kWriteType              =   "bt";

    var kRSSIkey                =   "bu";
    var kIsPrimaryKey           =   "bv";
    var kIsBroadcasted          =    "bw";
    var kIsNotifying            =   "bx";

    var kShowPowerAlert                     =   "by";
    var kIdentifierKey                      =   "bz";
    var kScanOptionAllowDuplicatesKey       =   "b0";
    var kScanOptionSolicitedServiceUUIDs    =   "b1";

    //Advertisment Data for Peripheral Keys
    var kAdvertisementDataKey                           =   "b2";
    var kCBAdvertisementDataManufacturerDataKey         =   "b3";
    var kCBAdvertisementDataServiceUUIDsKey             =   "b4";
    var kCBAdvertisementDataServiceDataKey              =   "b5";
    var kCBAdvertisementDataOverflowServiceUUIDsKey     =   "b6";
    var kCBAdvertisementDataSolicitedServiceUUIDsKey    =   "b7";
    var kCBAdvertisementDataIsConnectable               =   "b8";
    var kCBAdvertisementDataTxPowerLevel                =   "b9";
    var kPeripheralBtAddress                            =   "c1";
    var kRawAdvertisementData                           =   "c2";
    var kScanRecord                                     =   "c3";


    //Will Restore State Keys
    var kCBCentralManagerRestoredStatePeripheralsKey    = "da";
    var kCBCentralManagerRestoredStateScanServicesKey   = "db";

    var servicesdefs        = {};
    var characteristicdefs  = {};
    var unitdefs            = {};
}

//----------------------------------------- Values ------------------------------------------------
//Characteristic Write types
GATTIP.kWriteWithResponse       =   "cc";
GATTIP.kWriteWithoutResponse    =   "cd";
GATTIP.kNotifyOnConnection      =   "ce";
GATTIP.kNotifyOnDisconnection   =   "cf";
GATTIP.kNotifyOnNotification    =   "cg";

//Peripheral States
GATTIP.kDisconnected    =   "ch";
GATTIP.kConnecting      =   "ci";
GATTIP.kConnected       =   "cj";

//Centeral States
GATTIP.kUnknown         =   "ck";
GATTIP.kResetting       =   "cl";
GATTIP.kUnsupported     =   "cm";
GATTIP.kUnauthorized    =   "cn";
GATTIP.kPoweredOff      =   "co";
GATTIP.kPoweredOn       =   "cp";

//----------------------------------------- Errors ------------------------------------------------
GATTIP.kError32001 = "-32001"; //Peripheral not Found
GATTIP.kError32002 = "-32002"; //Service not found
GATTIP.kError32003 = "-32003"; //Characteristic Not Found
GATTIP.kError32004 = "-32004"; //Descriptor not found
GATTIP.kError32005 = "-32005"; //Peripheral State is Not valid(not Powered On)
GATTIP.kError32006 = "-32006"; //No Service Specified
GATTIP.kError32007 = "-32007"; //No Peripheral Identifer specified
GATTIP.kError32008 = "-32008"; //@State restoration is only allowed with "bluetooth-central" background mode enabled

GATTIP.kInvalidRequest      =   "-32600";
GATTIP.kMethodNotFound      =   "-32601";
GATTIP.kInvalidParams       =   "-32602";
GATTIP.kError32603          =   "-32603"; //generic error message
GATTIP.kParseError          =   "-32700";

GATTIP.GAP_ADTYPE_FLAGS                         =   "01";
GATTIP.GAP_ADTYPE_INCOMPLETE_16BIT_SERVICEUUID  =   "02";
GATTIP.GAP_ADTYPE_COMPLETE_16BIT_SERVICEUUID    =   "03";
GATTIP.GAP_ADTYPE_INCOMPLETE_32BIT_SERVICEUUID  =   "04";
GATTIP.GAP_ADTYPE_COMPLETE_32BIT_SERVICEUUID    =   "05";
GATTIP.GAP_ADTYPE_INCOMPLETE_128BIT_SERVICEUUID =   "06";
GATTIP.GAP_ADTYPE_COMPLETE_128BIT_SERVICEUUID   =   "07";
GATTIP.GAP_ADTYPE_POWER_LEVEL                   =   "0A";
GATTIP.GAP_ADTYPE_MANUFACTURER_SPECIFIC         =   "FF";

GATTIP.AllProperties = ["Broadcast", "Read", "WriteWithoutResponse", "Write", "Notify", "Indicate", "AuthenticatedSignedWrites", "ExtendedProperties", "NotifyEncryptionRequired", "IndicateEncryptionRequired"];