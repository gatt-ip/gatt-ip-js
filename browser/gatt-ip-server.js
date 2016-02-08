function GattIpServer() {

    if (typeof process === 'object' && process + '' === '[object process]') {
        C = require("./constants.js").C;
        Peripheral = require("./peripheral.js").Peripheral;
        WebSocket = require('websocket').w3cwebsocket;
    }

    var server;
    this.state = C.kUnknown;
    this.peripherals = {};
    this.peripheral_db = {};
    
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
        this.peripheral_db = {};
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

function Peripheral(gattip, name, uuid, addr, rssi, addata, scanData) {
    var path = "lib/gatt-ip-js/browser/"; // Replace the path to json configuration file.

    if (typeof process === 'object' && process + '' === '[object process]') {
        C = require("./constants.js").C;
        Service = require("./service.js").Service;
    }

    var _gattip = gattip;
    this.name = name;
    this.uuid = uuid;
    this.advertisementData = addata;
    this.scanData = scanData;
    this.serviceUUIDs = {};
    if (addata)this.rawAdvertisingData = addata[C.kRawAdvertisementData];
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

    Object.size = function (obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };

    //parse advertising data
    this.advdata = new Array();
    if (this.rawAdvertisingData) {
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

    this.connect = function (callback) {
        if (callback) this.onconnect = callback;

        $.getJSON(path + "bleServices.json", function(res) {
            self.serviceNames = res;
        });

        $.getJSON(path + "bleCharacteristics.json", function (res) {
            self.characteristicNames = res;
        });

        $.getJSON(path + "bleDescriptors.json", function (res) {
            self.descriptorNames = res;
        });

        var params = {};
        params[C.kPeripheralUUID] = this.uuid;
        _gattip.write(C.kConnect, params);
    };

    this.onconnect = function (error) {
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

        if (!error) {
            this.isConnected = true;
        }
    };

    this.disconnect = function (callback) {
        if (callback) this.onconnect = callback;

        var params = {};
        params[C.kPeripheralUUID] = this.uuid;
        _gattip.write(C.kDisconnect, params);
    };

    this.ondisconnect = function (error) {
        if (!error) {
            console.log(this.name + ' disconnected');
            this.isConnected = false;
        }
    };

    this.discoverServices = function (callback) {
        if (callback) this.ondiscoverServices = callback;

        if (this.services && Object.size(this.services) > 0) {
            _gattip.ondiscoverServices(this);
        } else {
            var params = {};
            params[C.kPeripheralUUID] = this.uuid;
            _gattip.write(C.kGetServices, params);
        }
    };

    this.ondiscoverServices = function (params) {
        for (var index in params[C.kServices]) {
            var serviceUUID = params[C.kServices][index][C.kServiceUUID];
            var service = this.services[serviceUUID];
            if (!service) {
                service = new Service(_gattip, this, serviceUUID);
            }
            this.services[serviceUUID] = service;
        }
    };

    this.updateRSSI = function (callback) {
        if (callback) this.onupdateRSSI = callback;

        var params = {};
        params[C.kPeripheralUUID] = this.uuid;

        _gattip.write(C.kGetRSSI, params);
    };

    this.onupdateRSSI = function (params) {
        console.log("kGetRSSI event"); //TODO
    };

    this.discoverServicesRequest = function () {
        if(_gattip.discoverServicesRequest){
            _gattip.discoverServicesRequest(this);
        }else{
            throw Error('discoverServicesRequest method not implemented by server');
        }
    };

    this.discoverServicesResponse = function (error) {
        if(!error){
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
        }else{
            _gattip.write(C.kGetServices, kError32603, error);
        }
    };

    this.addService = function (serviceUUID) {
        var service = new Service(_gattip, this, serviceUUID);
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
        C = require("./constants.js").C;
        Characteristic = require("./characteristic.js").Characteristic;
    }

    var _gattip = gattip;
    var _peripheral = peripheral;

    this.uuid = uuid;
    this.isPrimary = true; //TODO: read from remote
    this.characteristics = {};
    this.includedServices = {};
    this.serviceName = '';

    Object.size = function (obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };

    if (peripheral.serviceNames && peripheral.serviceNames[uuid]) {
        var uuidObj = peripheral.serviceNames[uuid];
        if (uuidObj !== undefined && uuidObj !== null) {
            this.serviceName = uuidObj.name;
        }
    }

    this.discoverIncludedServices = function (callback) {
    };

    this.ondiscoverIncludedServices = function (error) {
    };

    this.discoverCharacteristics = function (callback) {
        if (callback) this.ondiscoverCharacteristics = callback;

        if (this.characteristics && Object.size(this.characteristics) > 0) {
            _gattip.ondiscoverCharacteristics(_peripheral, this);
        } else {
            var params = {};
            params[C.kPeripheralUUID] = _peripheral.uuid;
            params[C.kServiceUUID] = this.uuid;

            _gattip.write(C.kGetCharacteristics, params);
        }
    };

    this.ondiscoverCharacteristics = function (params) {
        for (var index in params[C.kCharacteristics]) {
            var characteristicUUID = params[C.kCharacteristics][index][C.kCharacteristicUUID];
            var characteristic = this.characteristics[characteristicUUID];
            if (!characteristic) {
                characteristic = new Characteristic(_gattip, _peripheral, this, characteristicUUID);
            }
            this.characteristics[characteristicUUID] = characteristic;

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

    this.discoverCharacteristicsRequest = function () {
        if(_gattip.discoverCharacteristicsRequest){
            _gattip.discoverCharacteristicsRequest(_peripheral, this);
        }else{
            throw Error('discoverCharacteristicsRequest method not implemented by server');
        }
    };

    this.discoverCharacteristicsResponse = function (error) {
        if(!error){
            params = {};
            var charsArray = [];

            for (var uuid in this.characteristics) {
                var obj = {};
                obj[C.kCharacteristicUUID] = this.characteristics[uuid].uuid;
                obj[C.kProperties] = (this.characteristics[uuid].properties) ? this.characteristics[uuid].properties : '';
                obj[C.kValue] = this.characteristics[uuid].value;
                obj[C.kIsNotifying] = this.characteristics[uuid].isNotifying;
                charsArray.push(obj);
            }
            params[C.kCharacteristics] = charsArray;
            params[C.kPeripheralUUID] = _peripheral.uuid;
            params[C.kServiceUUID] = this.uuid;

            _gattip.write(C.kGetCharacteristics, params);
        }else{
            _gattip.write(C.kGetCharacteristics, kError32603, error);
        }        
    };

    this.addCharacteristic = function (characteristicUUID) {
        var characteristic = new Characteristic(_gattip, _peripheral, this, characteristicUUID);
        this.characteristics[characteristic.uuid] = characteristic;

        return characteristic;
    };
}

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== "undefined")) {
    exports.Service = Service;
}


function Characteristic(gattip, peripheral, service, uuid) {
    if (typeof process === 'object' && process + '' === '[object process]') {
        C = require("./constants.js").C;
        Descriptor = require("./discriptor.js").Descriptor;
    }

    var _gattip = gattip;
    var _peripheral = peripheral;
    var _service = service;

    this.uuid = uuid;
    this.descriptors = {};
    this.properties = {};
    this.value = '';
    this.characteristicName = '';
    this.isNotifying = false;

    Object.size = function (obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };

    if (peripheral.characteristicNames && peripheral.characteristicNames[uuid]) {
        var uuidObj = peripheral.characteristicNames[uuid];
        if (uuidObj !== undefined && uuidObj !== null) {
            this.characteristicName = uuidObj.name;
        }
    }


    this.discoverDescriptors = function (callback) {
        if (callback) this.ondiscoverDescriptors = callback;

        if (this.descriptors && Object.size(this.descriptors) > 0) {
            _gattip.ondiscoverDescriptors(_peripheral, _service, this);
        } else {
            var params = {};
            params[C.kPeripheralUUID] = _peripheral.uuid;
            params[C.kServiceUUID] = _service.uuid;
            params[C.kCharacteristicUUID] = this.uuid;
            _gattip.write(C.kGetDescriptors, params);
        }
    };

    this.ondiscoverDescriptors = function (params) {
        for (var index in params[C.kDescriptors]) {
            var descriptorUUID = params[C.kDescriptors][index][C.kDescriptorUUID];
            var descriptor = this.descriptors[descriptorUUID];
            if (!descriptor) {
                descriptor = new Descriptor(_gattip, _peripheral, _service, this, descriptorUUID);
            }
            this.descriptors[descriptorUUID] = descriptor;
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

    this.discoverDescriptorsRequest = function () {
        if(_gattip.discoverDescriptorsRequest){
            _gattip.discoverDescriptorsRequest(_peripheral, _service, this);
        }else{
            throw Error('discoverDescriptorsRequest method not implemented by server');
        }
    };

    this.discoverDescriptorsResponse = function (error) {
        if(!error){
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
        }else{
            _gattip.write(C.kGetCharacteristics, kError32603, error);
        }        
    };

    this.readCharacteristicValueRequest = function (params) {
        _gattip.readCharacteristicValueRequest(_peripheral, _service, this);
    };

    this.writeCharacteristicValueRequest = function (params) {
        _gattip.writeCharacteristicValueRequest(_peripheral, _service, this, params[C.kValue]);
    };

    this.enableNotificationsRequest = function (params) {
        _gattip.enableNotificationsRequest(_peripheral, _service, this, params[C.kValue]);
    };

    this.respondToReadRequest = function (peripheral, service, characteristic, error) {

        if (error) {
            this.errorRequest(C.kGetCharacteristicValue);
        } else {
            params = {};
            params[C.kPeripheralUUID] = peripheral.uuid;
            params[C.kServiceUUID] = service.uuid;
            params[C.kCharacteristicUUID] = characteristic.uuid;
            params[C.kValue] = characteristic.value;

            _gattip.write(C.kGetCharacteristicValue, params);
        }
    };

    this.respondToWriteRequest = function (peripheral, service, characteristic, value, error) {

        if (error) {
            this.errorRequest(C.kWriteCharacteristicValue);
        } else {
            params = {};
            params[C.kPeripheralUUID] = peripheral.uuid;
            params[C.kServiceUUID] = service.uuid;
            params[C.kCharacteristicUUID] = characteristic.uuid;
            params[C.kValue] = value;

            _gattip.write(C.kWriteCharacteristicValue, params);
        }
    };

    this.respondNotify = function (peripheral, service, characteristic, isNotifying, error) {
        params = {};
        params[C.kPeripheralUUID] = peripheral.uuid;
        params[C.kServiceUUID] = service.uuid;
        params[C.kCharacteristicUUID] = characteristic.uuid;
        params[C.kIsNotifying] = isNotifying;
        params[C.kValue] = isNotifying;

        _gattip.write(C.kSetValueNotification, params);
    };

    this.addDescriptor = function (descriptorUUID) {
        var descriptor = new Descriptor(_gattip, _peripheral, _service, this, descriptorUUID);
        this.descriptors[descriptor.uuid] = descriptor;

        return descriptor;
    };

    this.updateValue = function (value) {
        this.value = value;
        return this;
    };

    this.updateProperties = function (properties) {
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
    this.descriptorName = '';
    this.properties = {};
    this.isNotifying = false;

    if (peripheral.descriptorNames && peripheral.descriptorNames[uuid]) {
        var uuidObj = peripheral.descriptorNames[uuid];
        if (uuidObj !== undefined && uuidObj !== null) {
            this.descriptorName = uuidObj.name;
        }
    }

    this.updateValue = function (value) {
        this.value = value;
        return this;
    };

    this.updateProperties = function (properties) {
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
    kErrorPeripheralNotFound: "-32001",
    kErrorServiceNotFound: "-32002",
    kErrorCharacteristicNotFound: "-32003",
    kErrorDescriptorNotFound: "-32004",
    kErrorPeripheralStateIsNotValid: "-32005",
    kErrorNoServiceSpecified: "-32006",
    kErrorNoPeripheralIdentiferSpecified: "-32007",
    kErrorStateRestorationNotValid: "-32008",
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