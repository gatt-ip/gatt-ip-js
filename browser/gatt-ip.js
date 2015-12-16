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
function Peripheral(gattip, name, uuid, addata, scanData, rssi, addr) {
    var path = "lib/gatt-ip-js/browser/"; // Replace the path to json configuration file.

    if (typeof process === 'object' && process + '' === '[object process]') {
        var consts = require("./constants.js");
        C = consts.C;
    }

    var _gattip = gattip;
    this.name = name;
    this.uuid = uuid;
    this.advertisementData = addata;
    this.scanData = scanData;
    this.serviceUUIDs = {};
    this.rawAdvertisingData = addata[C.kRawAdvertisementData];
    this.manufacturerData = '';
    this.rssi = rssi;
    this.addr = addr;
    this.isConnected = false;
    this.services = {};

    this.serviceNames;
    this.characteristicNames;
    this.descriptorNames;

    var self = this;

    var flag = true;

    //parse advertising data
    this.advdata = new Array();
    if(this.rawAdvertisingData){
        if (this.rawAdvertisingData.length % 2 === 0) {
            for (var i = 0; i < this.rawAdvertisingData.length; i = i + 2) {
                this.advdata[i / 2] = this.rawAdvertisingData.charAt(i) + this.rawAdvertisingData.charAt(i + 1);
            }
        } else {
            for (var j = 0; j < this.rawAdvertisingData.length; j++) {
                this.advdata[j] = this.rawAdvertisingData.charAt(2 * j) + this.rawAdvertisingData.charAt(2 * j + 1);
            }
        }
    }

    do {
        if (this.advdata[1] == C.kGAP_ADTYPE_FLAGS) {
            getDiscoverable(this);
        } else if (this.advdata[1] == C.kGAP_ADTYPE_POWER_LEVEL) {
            getTXLevel(this);
        } else if (this.advdata[1] == C.kGAP_ADTYPE_INCOMPLETE_16BIT_SERVICEUUID || this.advdata[1] == C.kGAP_ADTYPE_COMPLETE_16BIT_SERVICEUUID) {
            getServiceUUIDs(this);
        } else if (this.advdata[1] == C.kGAP_ADTYPE_INCOMPLETE_32BIT_SERVICEUUID || this.advdata[1] == C.kGAP_ADTYPE_COMPLETE_32BIT_SERVICEUUID) {
            getServiceUUIDs(this);
        } else if (this.advdata[1] == C.kGAP_ADTYPE_INCOMPLETE_128BIT_SERVICEUUID || this.advdata[1] == C.kGAP_ADTYPE_COMPLETE_128BIT_SERVICEUUID) {
            get128bitServiceUUIDs(this);
        } else if (this.advdata[1] == C.kGAP_ADTYPE_MANUFACTURER_SPECIFIC) {
            getManufacturerData(this);
        } else if (this.advdata[1] == C.kGAP_ADTYPE_16BIT_SERVICE_DATA) {
            getServiceData(this);
        } else if (this.advdata[1] == "00") {
            this.advdata.splice(0, 1);
        } else {
            var advdataLength = parseInt(this.advdata[0], 16);
            this.advdata.splice(0, advdataLength + 1);
        }
        if (this.advdata.length === 0)
            flag = false;
    } while (flag);

    this.connect = function(callback) {
        if (callback) this.onconnect = callback;

        var params = {};
        params[C.kPeripheralUUID] = this.uuid;
        _gattip.write(C.kConnect, params);
    };

    this.onconnect = function(error) {
        /*if (typeof $ === 'undefined') {
            $ = {
                getJSON : function (path, callback) {
                    var f = module.filename;
                    var load = f.substring(0, f.lastIndexOf('/')) + '/../../' + path;
                    var json = require(load);
                    callback(json);
                }
            }
        }*/
        $.getJSON(path + "bleServices.json", function(res) {
            self.serviceNames = res;
        });
        $.getJSON(path + "bleCharacteristics.json", function(res) {
            self.characteristicNames = res;
        });
        $.getJSON(path + "bleDescriptors.json", function(res) {
            self.descriptorNames = res;
        });
        if (!error) {
            this.isConnected = true;
        }
    };

    this.disconnect = function(callback) {
        if (callback) this.onconnect = callback;

        var params = {};
        params[C.kPeripheralUUID] = this.uuid;
        _gattip.write(C.kDisconnect, params);
    };

    this.ondisconnect = function(deviceName, error) {
        if (!error) {
            console.log(deviceName + ' disconnected');
            this.isConnected = false;
        }
    };

    this.discoverServices = function(callback) {
        if (callback) this.ondiscoverServices = callback;

        var params = {};
        params[C.kPeripheralUUID] = this.uuid;
        _gattip.write(C.kGetServices, params);
    };

    this.ondiscoverServices = function(params) {
        for (var index in params[C.kServices]) {
            var serviceUUID = params[C.kServices][index][C.kServiceUUID];
            var service = this.services[serviceUUID];
            if (!service) {
                if (typeof process === 'object' && process + '' === '[object process]') {
                    var s = require("./service.js");
                    service = new s.Service(_gattip, this, serviceUUID);
                } else {
                    service = new Service(_gattip, this, serviceUUID);
                }

                // service = new Service(_gattip, this, serviceUUID);
                this.services[serviceUUID] = service;
            }
        }

    };

    this.updateRSSI = function(callback) {
        if (callback) this.onupdateRSSI = callback;

        var params = {};
        params[C.kPeripheralUUID] = this.uuid;

        _gattip.write(C.kGetRSSI, params);
    };

    this.onupdateRSSI = function(params) {
        console.log("kGetRSSI event"); //TODO
    };

    this.discoverServicesRequest = function(params, error) {
        params = {};
        var servicesArray = [];

        for (var uuid in this.services) {
            var obj = {};
            obj[C.kServiceUUID] = this.services[uuid].uuid;
            obj[C.kIsPrimaryKey] = this.services[uuid].isPrimary;
            servicesArray.push(obj);
        }
        params[C.kServices] = servicesArray;
        params[C.kPeripheralUUID] = this.uuid;
        _gattip.write(C.kGetServices, params);
    };

    this.addService = function(serviceUUID) {
        var service;

        if (typeof process === 'object' && process + '' === '[object process]') {
            var s = require("./service.js");
            service = new s.Service(_gattip, this, serviceUUID);
        } else {
            service = new Service(_gattip, this, serviceUUID);
        }
        this.services[service.uuid] = service;

        return service;
    };


    function getDiscoverable(peripheral) {
        var discoverableDataLength = parseInt(peripheral.advdata[0], 16);
        if (parseInt(peripheral.advdata[2], 16) >= 1) {
            peripheral.discoverable = "true";
        } else
            peripheral.discoverable = "false";
        peripheral.advdata.splice(0, discoverableDataLength + 1);
    }

    function getTXLevel(peripheral) {
        var txlevelDataLength = parseInt(peripheral.advdata[0], 16);
        peripheral.txpowerLevel = parseInt(peripheral.advdata[2]);
        peripheral.advdata.splice(0, txlevelDataLength + 1);
    }

    function getManufacturerData(peripheral) {
        var manufacturerDataLength = parseInt(peripheral.advdata[0], 16);
        for (var k = 2; k <= manufacturerDataLength; k++) {
            peripheral.manufacturerData += peripheral.advdata[k];
        }
        peripheral.advdata.splice(0, manufacturerDataLength + 1);
    }

    function getServiceUUIDs(peripheral) {
        var service16bitDataLength = parseInt(peripheral.advdata[0], 16);
        var reverse16bitUUID = '';
        for (var i = service16bitDataLength; i >= 2; i--) {
            reverse16bitUUID += peripheral.advdata[i];
        }
        peripheral.serviceUUIDs[0] = reverse16bitUUID;
        peripheral.advdata.splice(0, service16bitDataLength + 1);
    }

    function get128bitServiceUUIDs(peripheral) {
        var service128bitDataLength = parseInt(peripheral.advdata[0], 16);
        var reverse128bitUUID = '';
        for (var i = service128bitDataLength; i >= 2; i--) {
            reverse128bitUUID += peripheral.advdata[i];
            if (i == 14 || i == 12 || i == 10 || i == 8) {
                reverse128bitUUID += "-";
            }
        }
        peripheral.serviceUUIDs[0] = reverse128bitUUID;
        peripheral.advdata.splice(0, service128bitDataLength + 1);
    }

    function getServiceData(peripheral) {
        var serviceDataLength = parseInt(peripheral.advdata[0], 16);
        var eddystoneServiceUUID = '';
        for (var i = 3; i >= 2; i--) {
            eddystoneServiceUUID += peripheral.advdata[i];
        }
        if (eddystoneServiceUUID == 'FEAA') {
            if (parseInt(peripheral.advdata[4], 16) === 0) {
                getUID(peripheral);
            } else if (parseInt(peripheral.advdata[4], 16) == 16) {
                getURL(peripheral);
            } else if (parseInt(peripheral.advdata[4], 16) == 32) {
                getTLM(peripheral);
            }
        }
        peripheral.advdata.splice(0, serviceDataLength + 1);
    }

    function getUID(peripheral) {
        peripheral.frameType = 'UID';
        peripheral.nameSpace = '';
        peripheral.instanceID = '';
        peripheral.txpowerLevel = parseInt(peripheral.advdata[5], 16);
        for (var i = 6; i < 16; i++) {
            peripheral.nameSpace += peripheral.advdata[i];
        }
        for (var j = 16; j < 22; j++) {
            peripheral.instanceID += peripheral.advdata[j];
        }
        peripheral.reserved = peripheral.advdata[22];
        peripheral.reserved += peripheral.advdata[23];
    }

    function getURL(peripheral) {
        peripheral.frameType = 'URL';
        peripheral.txpowerLevel = parseInt(peripheral.advdata[5]);
        for (var protocol in C.AllProtocols) {
            if (advdata[6] == protocol)
                peripheral.url = C.AllProtocols[protocol];
        }
        for (var i = 7; i < advdataLength; i++) {
            peripheral.url += String.fromCharCode(parseInt(peripheral.advdata[i], 16));
        }
        for (var domain in C.AllDomains) {
            if (peripheral.advdata[advdataLength] == domain)
                peripheral.url += C.AllDomains[domain];
        }
    }

    function getTLM(peripheral) {
        peripheral.frameType = 'TLM';
        peripheral.advPacketCount = '';
        peripheral.timeInterval = '';
        peripheral.batteryVoltage = '';
        peripheral.eddyVersion = parseInt(peripheral.advdata[5], 16);
        for (var i = 6; i < 8; i++) {
            peripheral.batteryVoltage += peripheral.advdata[i];
        }
        peripheral.batteryVoltage = parseInt(peripheral.batteryVoltage, 16);
        peripheral.temperature = Math.ceil(parseInt(peripheral.advdata[8], 16));
        peripheral.temperature += '.';
        var temp = Math.ceil(((1 / 256) * parseInt(peripheral.advdata[9], 16)));
        if (temp.length > 2)
            peripheral.temperature += temp.toString().substring(0, 2);
        else
            peripheral.temperature += temp;
        for (var j = 10; j < 14; j++) {
            peripheral.advPacketCount += peripheral.advdata[j];
        }
        peripheral.advPacketCount = parseInt(peripheral.advPacketCount, 16);
        for (var k = 14; k < 18; k++) {
            peripheral.timeInterval += peripheral.advdata[k];
        }
        peripheral.timeInterval = Math.ceil(parseInt(peripheral.timeInterval, 16) * 0.1);
        peripheral.timePeriod = '';
        if (peripheral.timeInterval >= 60) {
            var days = Math.floor(peripheral.timeInterval / 86400);
            if (days > 0) {
                peripheral.timePeriod += days < 10 ? days + 'day ' : days + 'days ';
                peripheral.timeInterval -= days * 24 * 60 * 60;
            }
            var hours = Math.floor(peripheral.timeInterval / 3600);
            if (hours > 0) {
                peripheral.timePeriod += hours < 10 ? '0' + hours + ':' : hours + ':';
                peripheral.timeInterval -= hours * 60 * 60;
            } else
                peripheral.timePeriod += '00:';
            var min = Math.floor(peripheral.timeInterval / 60);
            if (min > 0) {
                peripheral.timePeriod += min < 10 ? '0' + min + ':' : min + ':';
                peripheral.timeInterval -= min * 60;
                peripheral.timePeriod += peripheral.timeInterval < 10 ? '0' + peripheral.timeInterval : peripheral.timeInterval;
                peripheral.timePeriod += ' secs';
                peripheral.timeInterval = 0;
            } else {
                peripheral.timePeriod += '00:' + peripheral.timeInterval;
                peripheral.timeInterval = 0;
            }
        } else if (peripheral.timeInterval > 0 && peripheral.timeInterval < 60) {
            peripheral.timePeriod += peripheral.timeInterval < 10 ? '00:00:0' + peripheral.timeInterval : '00:00:' + peripheral.timeInterval;
            peripheral.timePeriod += ' secs';
        }
    }
    
}

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== "undefined")) {
    exports.Peripheral = Peripheral;
}


function Service(gattip, peripheral, uuid) {

    if (typeof process === 'object' && process + '' === '[object process]') {
        var consts = require("./constants.js");
        C = consts.C;
    }

    var _gattip = gattip;
    var _peripheral = peripheral;

    this.uuid = uuid;
    this.isPrimary = true; //TODO: read from remote
    this.characteristics = {};
    this.includedServices = {}; 
       
    if (uuid.length === 4) {
        if (peripheral.serviceNames) {
            var uuidObj = peripheral.serviceNames[uuid];
            if (uuidObj !== undefined && uuidObj !== null) {
                this.serviceName = uuidObj.name;
            } else
                this.serviceName = uuid;
        } else
            this.serviceName = uuid;
    } else
        this.serviceName = uuid;


    this.discoverIncludedServices = function(callback) {};

    this.ondiscoverIncludedServices = function(error) {};

    this.discoverCharacteristics = function(callback) {
        if (callback) this.ondiscoverCharacteristics = callback;

        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = this.uuid;
        _gattip.write(C.kGetCharacteristics, params);
    };

    this.ondiscoverCharacteristics = function(params) {
        for (var index in params[C.kCharacteristics]) {
            var characteristicUUID = params[C.kCharacteristics][index][C.kCharacteristicUUID];
            var characteristic = this.characteristics[characteristicUUID];
            if (!characteristic) {
                if(typeof process === 'object' && process+'' === '[object process]') {
                    var c = require("./characteristic.js");
                    characteristic = new c.Characteristic(_gattip, _peripheral, this, characteristicUUID);
                } else {
                    characteristic = new Characteristic(_gattip, _peripheral, this, characteristicUUID);
                }
                this.characteristics[characteristicUUID] = characteristic;
            }
            characteristic.value = params[C.kCharacteristics][index][C.kValue];

            var props = params[C.kCharacteristics][index][C.kProperties];
            for (var apindex in C.AllProperties) {
                characteristic.properties[C.AllProperties[apindex]] = {
                    enabled: (props >> apindex) & 1,
                    name: C.AllProperties[apindex]
                };
            }

            characteristic.isNotifying = params[C.kCharacteristics][index][C.kIsNotifying];
        }
    };

    this.discoverCharacteristicsRequest = function(params, error) {
        params = {};
        var charsArray = [];

        for (var uuid in this.characteristics) {
            var obj = {};
            obj[C.kCharacteristicUUID] = this.characteristics[uuid].uuid;
            obj[C.kProperties] = (this.characteristics[uuid].properties) ? this.characteristics[uuid].properties.toString() : '';
            obj[C.kValue] = this.characteristics[uuid].value;
            obj[C.kIsNotifying] = this.characteristics[uuid].isNotifying;
            charsArray.push(obj);
        }
        params[C.kCharacteristics] = charsArray;
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = this.uuid;

        _gattip.write(C.kGetCharacteristics, params);
    };

    this.addCharacteristic = function(characteristicUUID) {
        var characteristic;

        if(typeof process === 'object' && process+'' === '[object process]') {
            var c = require("./characteristic.js");
            characteristic = new c.Characteristic(_gattip, _peripheral, this, characteristicUUID);
        } else {
            characteristic = new Characteristic(_gattip, _peripheral, this, characteristicUUID);
        }        
        this.characteristics[characteristic.uuid] = characteristic;
        
        return characteristic;
    };
}

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== "undefined")) {
    exports.Service = Service;
}


function Characteristic(gattip, peripheral, service, uuid) {    
    if (typeof process === 'object' && process + '' === '[object process]') {
        var consts = require("./constants.js");
        C = consts.C;
    }

    var _gattip = gattip;
    var _peripheral = peripheral;
    var _service = service;

    this.uuid = uuid;
    this.descriptors = {};
    this.properties = {};
    this.value = {};
    this.isNotifying = false;
    
    if (uuid.length === 4) {
        if (peripheral.characteristicNames) {
            var uuidObj = peripheral.characteristicNames[uuid];
            if (uuidObj !== undefined && uuidObj !== null) {
                this.characteristicName = uuidObj.name;
            } else
                this.characteristicName = uuid;
        } else
            this.characteristicName = uuid;
    } else
        this.characteristicName = uuid;


    this.discoverDescriptors = function (callback) {
        if (callback) this.ondiscoverDescriptors = callback;
        
        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = this.uuid;
        _gattip.write(C.kGetDescriptors, params);
    };
    
    this.ondiscoverDescriptors = function (params) {
        for (var index in params[C.kDescriptors]) {
            var descriptorUUID = params[C.kDescriptors][index][C.kDescriptorUUID];
            var descriptor = this.descriptors[descriptorUUID];
            if (!descriptor) {
                if(typeof process === 'object' && process+'' === '[object process]') {
                    var desc = require("./discriptor.js");
                    descriptor = new desc.Descriptor(_gattip, _peripheral, _service, this, descriptorUUID);
                } else {
                    descriptor = new Descriptor(_gattip, _peripheral, _service, this, descriptorUUID);
                }
                this.descriptors[descriptorUUID] = descriptor;
            }
        }
    };
    
    this.read = function (callback) {
        if (callback) this.onread = callback;            
        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = this.uuid;
        _gattip.write(C.kGetCharacteristicValue, params);
    };
    
    this.onread = function (params) {
        this.isNotifying = params[C.kIsNotifying];
        this.value = params[C.kValue];
    };
    
    this.write = function (data, callback) {
        var restype;
        if (this.properties["WriteWithoutResponse"].enabled == 1 || this.properties["Indicate"].enabled == 1) {
            restype = C.kWriteWithoutResponse;
        } else {
            restype = C.kWriteResponse;
        }
        this.writeWithResType(data, restype, callback);
    };
    
    this.writeWithResType = function (data, restype, callback) {
        if (callback) this.onread = callback;
        
        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = this.uuid;
        params[C.kValue] = data;
        params[C.kWriteType] = restype;
        _gattip.write(C.kWriteCharacteristicValue, params);
    };
    
    this.onwrite = function (params, error) {
    };
    
    this.notify = function (value, callback) {
        if (callback) this.onread = callback;
        
        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = this.uuid;
        params[C.kValue] = value;
        this.isNotifying = value;
        
        _gattip.write(C.kSetValueNotification, params);
    };
    
    this.indicate = function (callback) {
        if (callback) this.onread = callback;
        
        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = this.uuid;
        
        _gattip.write(C.kGetCharacteristicValue, params);
    };
    
    this.broadcast = function (callback) {
        if (callback) this.onread = callback;
        
        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = this.uuid;
        
        _gattip.write(C.kGetCharacteristicValue, params);
    };

    this.discoverDescriptorsRequest = function(params, error) {
        params = {};
        var discArray = [];

        for (var uuid in this.descriptors) {
            var obj = {};
            obj[C.kDescriptorUUID] = this.descriptors[uuid].uuid;
            obj[C.kProperties] = this.descriptors[uuid].properties;
            obj[C.kValue] = this.descriptors[uuid].value;
            obj[C.kIsNotifying] = this.descriptors[uuid].isNotifying;
            discArray.push(obj);
        }
        params[C.kDescriptors] = discArray;
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = this.uuid;

        _gattip.write(C.kGetDescriptors, params);
    };

    this.readRequest = function(params, error) {
        _gattip.readRequest(_peripheral, _service, this, error);
    };

    this.writeRequest = function(params, error) {
        this.value = params[C.kValue];
        _gattip.writeRequest(_peripheral, _service, this, this.value, error);
    };

    this.notifyRequest = function(params, error) {
        this.isNotifying = params[C.kValue];
        _gattip.respondNotify(_peripheral, _service, this, this.isNotifying, error);
    };

    this.addDescriptor = function(descriptorUUID) {
        var descriptor;

        if(typeof process === 'object' && process+'' === '[object process]') {
            var desc = require("./discriptor.js");
            descriptor = new desc.Descriptor(_gattip, _peripheral, _service, this, descriptorUUID);
        } else {
            descriptor = new Descriptor(_gattip, _peripheral, _service, this, descriptorUUID);
        }
        this.descriptors[descriptor.uuid] = descriptor;

        return descriptor;
    };

    this.updateValue = function(value) {
        this.value = value;
        return this;
    };

    this.updateProperties = function(properties) {
        this.properties = properties;
        return this;
    };

}

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== "undefined")) {
    exports.Characteristic = Characteristic;
}

function Descriptor(gattip, peripheral, service, characteristic, uuid) {
    var _gattip = gattip;
    var _peripheral = peripheral;
    var _service = service;
    var _characteristic = characteristic;
    this.uuid = uuid;
    this.value = "";
    this.properties = {};
    this.isNotifying = false;

    if (uuid.length === 4) {
        if (peripheral.descriptorNames) {
            var uuidObj = peripheral.descriptorNames[uuid];
            if (uuidObj !== undefined && uuidObj !== null) {
                this.descriptorName = uuidObj.name;
            } else
                this.descriptorName = uuid;
        } else
            this.descriptorName = uuid;
    } else
        this.descriptorName = uuid;

    this.updateValue = function(value) {
        this.value = value;
        return this;
    };

    this.updateProperties = function(properties) {
        this.properties = properties;
        return this;
    };

}

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== "undefined")) {
    exports.Descriptor = Descriptor;
}


var C = {
    kError: "error",
    kCode: "code",
    kMessageField: "message",
    kResult: "result",
    kIdField: "id",
    kConfigure: "aa",
    kScanForPeripherals: "ab",
    kStopScanning: "ac",
    kConnect: "ad",
    kDisconnect: "ae",
    kCentralState: "af",
    kGetConnectedPeripherals: "ag",
    kGetPerhipheralsWithServices: "ah",
    kGetPerhipheralsWithIdentifiers: "ai",
    kGetServices: "ak",
    kGetIncludedServices: "al",
    kGetCharacteristics: "am",
    kGetDescriptors: "an",
    kGetCharacteristicValue: "ao",
    kGetDescriptorValue: "ap",
    kWriteCharacteristicValue: "aq",
    kWriteDescriptorValue: "ar",
    kSetValueNotification: "as",
    kGetPeripheralState: "at",
    kGetRSSI: "au",
    kInvalidatedServices: "av",
    kPeripheralNameUpdate: "aw",
    kMessage: "zz",
    kCentralUUID: "ba",
    kPeripheralUUID: "bb",
    kPeripheralName: "bc",
    kPeripheralUUIDs: "bd",
    kServiceUUID: "be",
    kServiceUUIDs: "bf",
    kPeripherals: "bg",
    kIncludedServiceUUIDs: "bh",
    kCharacteristicUUID: "bi",
    kCharacteristicUUIDs: "bj",
    kDescriptorUUID: "bk",
    kServices: "bl",
    kCharacteristics: "bm",
    kDescriptors: "bn",
    kProperties: "bo",
    kValue: "bp",
    kState: "bq",
    kStateInfo: "br",
    kStateField: "bs",
    kWriteType: "bt",
    kRSSIkey: "bu",
    kIsPrimaryKey: "bv",
    kIsBroadcasted: "bw",
    kIsNotifying: "bx",
    kShowPowerAlert: "by",
    kIdentifierKey: "bz",
    kScanOptionAllowDuplicatesKey: "b0",
    kScanOptionSolicitedServiceUUIDs: "b1",
    kAdvertisementDataKey: "b2",
    kCBAdvertisementDataManufacturerDataKey: "b3",
    kCBAdvertisementDataServiceUUIDsKey: "b4",
    kCBAdvertisementDataServiceDataKey: "b5",
    kCBAdvertisementDataOverflowServiceUUIDsKey: "b6",
    kCBAdvertisementDataSolicitedServiceUUIDsKey: "b7",
    kCBAdvertisementDataIsConnectable: "b8",
    kCBAdvertisementDataTxPowerLevel: "b9",
    kPeripheralBtAddress: "c1",
    kRawAdvertisementData: "c2",
    kScanRecord: "c3",
    kCBCentralManagerRestoredStatePeripheralsKey: "da",
    kCBCentralManagerRestoredStateScanServicesKey: "db",
    kWriteWithResponse: "cc",
    kWriteWithoutResponse: "cd",
    kNotifyOnConnection: "ce",
    kNotifyOnDisconnection: "cf",
    kNotifyOnNotification: "cg",
    kDisconnected: "ch",
    kConnecting: "ci",
    kConnected: "cj",
    kUnknown: "ck",
    kResetting: "cl",
    kUnsupported: "cm",
    kUnauthorized: "cn",
    kPoweredOff: "co",
    kPoweredOn: "cp",
    kError32001: "-32001",
    kError32002: "-32002",
    kError32003: "-32003",
    kError32004: "-32004",
    kError32005: "-32005",
    kError32006: "-32006",
    kError32007: "-32007",
    kError32008: "-32008",
    kInvalidRequest: "-32600",
    kMethodNotFound: "-32601",
    kInvalidParams: "-32602",
    kError32603: "-32603",
    kParseError: "-32700",
    kGAP_ADTYPE_FLAGS: "01",
    kGAP_ADTYPE_INCOMPLETE_16BIT_SERVICEUUID: "02",
    kGAP_ADTYPE_COMPLETE_16BIT_SERVICEUUID: "03",
    kGAP_ADTYPE_INCOMPLETE_32BIT_SERVICEUUID: "04",
    kGAP_ADTYPE_COMPLETE_32BIT_SERVICEUUID: "05",
    kGAP_ADTYPE_INCOMPLETE_128BIT_SERVICEUUID: "06",
    kGAP_ADTYPE_COMPLETE_128BIT_SERVICEUUID: "07",
    kGAP_ADTYPE_POWER_LEVEL: "0A",
    kGAP_ADTYPE_MANUFACTURER_SPECIFIC: "FF",
    kGAP_ADTYPE_16BIT_SERVICE_DATA: "16",
    id: 1,
    authenticate: 'authenticate',
    AllProperties: ["Broadcast", "Read", "WriteWithoutResponse", "Write", "Notify", "Indicate", "AuthenticatedSignedWrites", "ExtendedProperties", "NotifyEncryptionRequired", "IndicateEncryptionRequired"]
}

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== "undefined")) {
    exports.C = C;
}