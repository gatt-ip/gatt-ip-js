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
                        peripheral = new Peripheral(this,
                            response.params[kPeripheralName],
                            response.params[kPeripheralUUID],
                            response.params[kAdvertisementDataKey],
                            response.params[kScanRecord],
                            response.params[kRSSIkey],
                            response.params[kPeripheralBtAddress]);
                        this.peripherals[response.params[kPeripheralUUID]] = peripheral;
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
        mesg.id = GATTIP.id.toString();
        GATTIP.id += 1;
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
        this.advdata = new Array();
        if (this.rawAdvertisingData.length % 2 == 0) {
            for (var i = 0; i < this.rawAdvertisingData.length; i = i + 2) {
                this.advdata[i / 2] = this.rawAdvertisingData.charAt(i) + this.rawAdvertisingData.charAt(i + 1);
            }
        } else {
            for (var i = 0; i < this.rawAdvertisingData.length; i++) {
                this.advdata[i] = this.rawAdvertisingData.charAt(2 * i) + this.rawAdvertisingData.charAt(2 * i + 1);
            }
        }

        do {
            if (this.advdata[1] == GATTIP.kGAP_ADTYPE_FLAGS) {
                getDiscoverable(this);
            } else if (this.advdata[1] == GATTIP.kGAP_ADTYPE_POWER_LEVEL) {
                getTXLevel(this);
            } else if (this.advdata[1] == GATTIP.kGAP_ADTYPE_INCOMPLETE_16BIT_SERVICEUUID || this.advdata[1] == GATTIP.kGAP_ADTYPE_COMPLETE_16BIT_SERVICEUUID) {
                getServiceUUIDs(this);
            } else if (this.advdata[1] == GATTIP.kGAP_ADTYPE_INCOMPLETE_32BIT_SERVICEUUID || this.advdata[1] == GATTIP.kGAP_ADTYPE_COMPLETE_32BIT_SERVICEUUID) {
                getServiceUUIDs(this);
            } else if (this.advdata[1] == GATTIP.kGAP_ADTYPE_INCOMPLETE_128BIT_SERVICEUUID || this.advdata[1] == GATTIP.kGAP_ADTYPE_COMPLETE_128BIT_SERVICEUUID) {
                get128bitServiceUUIDs(this);
            } else if (this.advdata[1] == GATTIP.kGAP_ADTYPE_MANUFACTURER_SPECIFIC) {
                getManufacturerData(this);
            } else if(this.advdata[1] == GATTIP.kGAP_ADTYPE_16BIT_SERVICE_DATA) {
                getServiceData(this);
            } else if (this.advdata[1] == "00") {
                this.advdata.splice(0, 1);
            } else {
                var advdataLength = parseInt(this.advdata[0], 16);
                this.advdata.splice(0, advdataLength + 1);
            }
            if (this.advdata.length == 0)
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

    function getDiscoverable(peripheral) {
        var advdataLength = parseInt(peripheral.advdata[0], 16);
        if (parseInt(peripheral.advdata[2], 16) >= 1) {
            peripheral.discoverable = "true";
        } else
            peripheral.discoverable = "false";
        peripheral.advdata.splice(0, advdataLength + 1);
    }
    
    function getTXLevel(peripheral) {
        var advdataLength = parseInt(peripheral.advdata[0], 16);
        peripheral.txpowerLevel = parseInt(peripheral.advdata[2]);
        peripheral.advdata.splice(0, advdataLength + 1);
    }
    
    function getManufacturerData(peripheral) {
        var advdataLength = parseInt(peripheral.advdata[0], 16);
        for (var k = 2; k <= advdataLength; k++) {
            peripheral.manufacturerData += peripheral.advdata[k];
        }
        peripheral.advdata.splice(0, advdataLength + 1);
    }
    function getServiceUUIDs(peripheral) {
        var advdataLength = parseInt(peripheral.advdata[0], 16);
        var reverseUUID = '';
        for (var i = advdataLength; i >= 2; i--) {
            reverseUUID += peripheral.advdata[i];
        }
        peripheral.serviceUUIDs[0] = reverseUUID;
        peripheral.advdata.splice(0, advdataLength + 1);
    }
    
    function get128bitServiceUUIDs(peripheral) {
        var advdataLength = parseInt(peripheral.advdata[0], 16);
        var reverseUUID = '';
        for (var i = advdataLength; i >= 2; i--) {
            reverseUUID += peripheral.advdata[i];
            if (i == 14 || i == 12 || i == 10 || i == 8) {
                reverseUUID += "-";
            }
        }
        peripheral.serviceUUIDs[0] = reverseUUID;
        peripheral.advdata.splice(0, advdataLength + 1);
    }
    
    function getServiceData(peripheral) {
        var advdataLength = parseInt(peripheral.advdata[0],16);
        var eddystoneServiceUUID = '';
        for(var i = 3; i >= 2; i--) {
            eddystoneServiceUUID += peripheral.advdata[i];
        }
        if(eddystoneServiceUUID == 'FEAA') {
            if(parseInt(peripheral.advdata[4],16) == 0) {
                getUID(peripheral);
            } else if(parseInt(peripheral.advdata[4],16) == 16) {
                getURL(peripheral);
            } else if(parseInt(peripheral.advdata[4],16) == 32){
                getTLM(peripheral);
            }
        }
        peripheral.advdata.splice(0, advdataLength+1);
    }
    
    function getUID(peripheral) {
        peripheral.frameType = 'UID';
        peripheral.nameSpace = '';
        peripheral.instanceID = '';
        peripheral.txpowerLevel = parseInt(peripheral.advdata[5], 16);
        for(var i = 6; i < 16; i++) {
            peripheral.nameSpace += peripheral.advdata[i];
        }
        for(var i = 16; i < 22; i++) {
            peripheral.instanceID += peripheral.advdata[i];
        }
        peripheral.reserved = peripheral.advdata[22];
        peripheral.reserved += peripheral.advdata[23];
    }
    
    function getURL(peripheral) {
        peripheral.frameType = 'URL';
        peripheral.txpowerLevel = parseInt(peripheral.advdata[5]);
        for(var protocol in GATTIP.AllProtocols) {
            if(advdata[6] == protocol)
                peripheral.url = GATTIP.AllProtocols[protocol];
        }
        for(var i = 7; i < advdataLength; i++) {
            peripheral.url += String.fromCharCode(parseInt(peripheral.advdata[i], 16));
        }
        for(var domain in GATTIP.AllDomains) {
            if(peripheral.advdata[advdataLength] == domain)
                peripheral.url += GATTIP.AllDomains[domain];
        }
    }
    
    function getTLM(peripheral) {
        peripheral.frameType = 'TLM';
        peripheral.advPacketCount = '';
        peripheral.timeInterval = '';
        peripheral.batteryVoltage = '';
        peripheral.eddyVersion = parseInt(peripheral.advdata[5],16);
        for(var i = 6; i <  8; i++) {
            peripheral.batteryVoltage += peripheral.advdata[i];
        }
        peripheral.batteryVoltage = parseInt(peripheral.batteryVoltage, 16);
        peripheral.temperature = Math.ceil(parseInt(peripheral.advdata[8],16));
        peripheral.temperature += '.';
        var temp = Math.ceil(((1/256) *parseInt(peripheral.advdata[9],16)));
        if(temp.length > 2)
            peripheral.temperature += temp.toString().substring(0, 2);
        else
            peripheral.temperature += temp;
        for(var i = 10; i < 14; i++) {
            peripheral.advPacketCount += peripheral.advdata[i];
        }
        peripheral.advPacketCount = parseInt(peripheral.advPacketCount, 16);
        for(var i = 14; i < 18; i++) {
            peripheral.timeInterval += peripheral.advdata[i];
        }
        peripheral.timeInterval = Math.ceil(parseInt(peripheral.timeInterval, 16) * 0.1);
        peripheral.timePeriod = '';
        if(peripheral.timeInterval >= 60)  {
            var days = Math.floor(peripheral.timeInterval / 86400);
            if(days > 0) {
                peripheral.timePeriod += days < 10 ? days+'day ' : days+'days ';
                peripheral.timeInterval -= days*24*60*60;
            }
            var hours = Math.floor(peripheral.timeInterval / 3600);
            if(hours > 0) {
                peripheral.timePeriod += hours < 10 ? '0'+hours+':' : hours+':';
                peripheral.timeInterval -= hours*60*60;
            } else
                peripheral.timePeriod += '00:';
            var min = Math.floor(peripheral.timeInterval / 60);
            if(min > 0) {
                peripheral.timePeriod += min < 10 ? '0'+min+':' : min+':';
                peripheral.timeInterval -= min*60;
                peripheral.timePeriod += peripheral.timeInterval < 10 ? '0'+peripheral.timeInterval : peripheral.timeInterval;
                peripheral.timePeriod += ' secs';
                peripheral.timeInterval = 0;
            } else {
                peripheral.timePeriod += '00:'+peripheral.timeInterval;
                peripheral.timeInterval = 0;
            }
        } else if(peripheral.timeInterval > 0 && peripheral.timeInterval < 60) {
            peripheral.timePeriod += peripheral.timeInterval < 10 ? '00:00:0'+peripheral.timeInterval : '00:00:'+peripheral.timeInterval;
            peripheral.timePeriod += ' secs';
        }
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
    var kError              =   "error";
    var kCode               =   "code";
    var kMessageField       =   "message";
    var kResult             =   "result";
    var kIdField            =   "id";

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

GATTIP.kGAP_ADTYPE_FLAGS                         =   "01";
GATTIP.kGAP_ADTYPE_INCOMPLETE_16BIT_SERVICEUUID  =   "02";
GATTIP.kGAP_ADTYPE_COMPLETE_16BIT_SERVICEUUID    =   "03";
GATTIP.kGAP_ADTYPE_INCOMPLETE_32BIT_SERVICEUUID  =   "04";
GATTIP.kGAP_ADTYPE_COMPLETE_32BIT_SERVICEUUID    =   "05";
GATTIP.kGAP_ADTYPE_INCOMPLETE_128BIT_SERVICEUUID =   "06";
GATTIP.kGAP_ADTYPE_COMPLETE_128BIT_SERVICEUUID   =   "07";
GATTIP.kGAP_ADTYPE_POWER_LEVEL                   =   "0A";
GATTIP.kGAP_ADTYPE_MANUFACTURER_SPECIFIC         =   "FF";
GATTIP.kGAP_ADTYPE_16BIT_SERVICE_DATA            =   "16";

GATTIP.id = 1;


GATTIP.AllProperties = ["Broadcast", "Read", "WriteWithoutResponse", "Write", "Notify", "Indicate", "AuthenticatedSignedWrites", "ExtendedProperties", "NotifyEncryptionRequired", "IndicateEncryptionRequired"];