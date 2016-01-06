function GATTIPSERVER() {

    if (typeof process === 'object' && process + '' === '[object process]') {
        var consts = require("./constants.js");
        C = consts.C;
    }

    var server;
    this.state = C.kUnknown;
    this.peripherals = {};

    this.init = function (url, callback) {
        if(callback) this.oninit = callback;
        
        if (typeof WebSocket !== "undefined")
            var socket = new WebSocket(url);
        
        if(!socket && (typeof process === 'object' && process + '' === '[object process]')){
            WebSocket = require("ws");
            socket = new WebSocket(url);
        }
        
        socket.onopen = function () {
            this.initWithServer(socket);
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
                console.log('socket is onerror, onerror'+error);
            };
        }
        if (!server.error) {
            server.onerror = function (error) {
                console.log('socket is error, error'+error);
            };
        }
    };

    this.processMessage = function (mesg) {
        var message = JSON.parse(mesg.data);
        var params, peripheral, service, characteristic;

        if ( (typeof message === 'undefined') || (!message) ){
            params = {};
            params[C.kCode] = C.kInvalidRequest;;
            this.write(C.kError, params);
            return;
        }
        
        if(message.result && message.result == C.kMessage){
            this.onauthenticate(message.params, message.error);
            return;
        }

        switch (message.method) {
            case C.kConfigure:
                if(!this.configureRequest){
                    throw Error('configureRequest method not implemented by server');                    
                }
                this.configureRequest(message.params, message.error);
                break;
            case C.kScanForPeripherals:
                if(!this.scanRequest){
                    throw Error('scanRequest method not implemented by server');                    
                }
                this.scanRequest(message.params, message.error);
                break;
            case C.kStopScanning:
                if(!this.stopScanRequest){
                    throw Error('stopScanRequest method not implemented by server');                    
                }
                this.stopScanRequest(message.params, message.error);
                break;
            case C.kConnect:
                if(!this.connectRequest){
                    throw Error('connectRequest method not implemented by server');                    
                }
                peripheral = this.peripherals[message.params[C.kPeripheralUUID]];
                if(peripheral)
                    this.connectRequest(peripheral, message.error);
                break;
            case C.kDisconnect:
                if(!this.disconnectRequest){
                    throw Error('disconnectRequest method not implemented by server');                    
                }
                peripheral = this.peripherals[message.params[C.kPeripheralUUID]];
                if(peripheral)
                    this.disconnectRequest(peripheral, message.error);
                break;
            case C.kCentralState:
                if(!this.centralStateRequest){
                    throw Error('centralStateRequest method not implemented by server');                    
                }
                this.centralStateRequest(message.params, message.error);
                break;
            case C.kGetServices:
                if (message.params && message.params[C.kPeripheralUUID])
                        peripheral = this.peripherals[message.params[C.kPeripheralUUID]];
                    if (!message.error) {
                        if (!peripheral) {
                            console.log("unknown peripheral");
                            this.invalidParameters(message.method, C.kError32001);
                        } else {
                            this.discoverServicesRequest(peripheral, message.error);
                        }
                    } else {
                        this.invalidParameters(message.method, C.kInvalidRequest);
                    }
                break;
            case C.kGetIncludedServices:
                console.log("kGetIncludedServices event"); //TODO
                break;
            case C.kInvalidatedServices:
                console.log("kInvalidatedServices event"); //TODO
                break;                
            case C.kGetCharacteristics:
                if (message.params && message.params[C.kPeripheralUUID]){
                        peripheral = this.peripherals[message.params[C.kPeripheralUUID]];
                    if (!peripheral) {
                        console.log("unknown peripheral");
                        this.invalidParameters(message.method, C.kError32001);
                    } else {
                        service = peripheral.services[message.params[C.kServiceUUID]];
                        if(service){
                            this.discoverCharacteristicsRequest(peripheral, service, message.error);
                        } else {
                            console.log("unknown service");
                            this.invalidParameters(message.method, C.kError32002);
                        }
                    }
                }
                break;
            case C.kGetDescriptors:
                if (message.params && message.params[C.kPeripheralUUID]){
                        peripheral = this.peripherals[message.params[C.kPeripheralUUID]];
                    if (!peripheral) {
                        console.log("unknown peripheral");
                        this.invalidParameters(message.method, C.kError32001);
                    } else {
                        service = peripheral.services[message.params[C.kServiceUUID]];
                        if (service) {
                            characteristic = service.characteristics[message.params[C.kCharacteristicUUID]];
                            if(characteristic){
                                characteristic.discoverDescriptorsRequest(message.params, message.error);
                            } else {
                                console.log("unknown characteristic");
                            this.invalidParameters(message.method, C.kError32003);
                            }
                        } else {
                            console.log("unknown service");
                            this.invalidParameters(message.method, C.kError32002);
                        }
                    }
                }
                break;
            case C.kGetCharacteristicValue:
                if (message.params && message.params[C.kPeripheralUUID]){
                        peripheral = this.peripherals[message.params[C.kPeripheralUUID]];
                    if (!peripheral) {
                        console.log("unknown peripheral");
                        this.invalidParameters(message.method, C.kError32001);
                    } else {
                        service = peripheral.services[message.params[C.kServiceUUID]];
                        if (service) {
                            characteristic = service.characteristics[message.params[C.kCharacteristicUUID]];
                            if(characteristic){
                                characteristic.readRequest(message.params, message.error);
                            } else {
                                console.log("unknown characteristic");
                            this.invalidParameters(message.method, C.kError32003);
                            }
                        } else {
                            console.log("unknown service");
                            this.invalidParameters(message.method, C.kError32002);
                        }
                    }
                }
                break;
            case C.kWriteCharacteristicValue:
                if (message.params && message.params[C.kPeripheralUUID]){
                        peripheral = this.peripherals[message.params[C.kPeripheralUUID]];
                    if (!peripheral) {
                        console.log("unknown peripheral");
                            this.invalidParameters(message.method, C.kError32001);
                    } else {
                        service = peripheral.services[message.params[C.kServiceUUID]];
                        if (service) {
                            characteristic = service.characteristics[message.params[C.kCharacteristicUUID]];
                            if (characteristic) {
                                characteristic.writeRequest(message.params, message.error);
                            } else {
                                console.log("unknown characteristic");
                            this.invalidParameters(message.method, C.kError32003);
                            }
                        } else {
                            console.log("unknown service");
                            this.invalidParameters(message.method, C.kError32002);
                        }
                    }
                }
                break;
            case C.kSetValueNotification:
                if (message.params && message.params[C.kPeripheralUUID]){
                        peripheral = this.peripherals[message.params[C.kPeripheralUUID]];
                    if (!peripheral) {
                        console.log("unknown peripheral");
                            this.invalidParameters(message.method, C.kError32001);
                    } else {
                        service = peripheral.services[message.params[C.kServiceUUID]];
                        if (service) {
                            characteristic = service.characteristics[message.params[C.kCharacteristicUUID]];
                            if (characteristic) {
                                characteristic.isNotifying = message.params[C.kValue];
                                characteristic.notifyRequest(message.params, message.error);
                            }else{
                            this.invalidParameters(message.method, C.kError32003);
                            }
                        } else {
                            console.log("unknown service");
                            this.invalidParameters(message.method, C.kError32002);
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

        }
    };

    this.invalidParameters = function(method, errorId) {
        var error = {}, params = {};
        error[kIdField] = errorId;
        params[kError] = error;
        this.write(method, params);        
    };

    this.authenticate = function(token){
        this.send(JSON.stringify({
            type: C.authenticate,
            access_token: token
        }));
    };

    this.configureResponse = function(params) {
        this.write(C.kConfigure);
    };

    this.centralStateResponse = function(aparams) {
        params = {};
        mparams[C.kState] = aparams.state;
        this.write(C.kCentralState, params);
    };

    this.scanResponse = function(params) {
        for (var uuid in this.peripherals) {
            params = {};

            var advData = {};
            advData[C.kRawAdvertisementData] = this.peripherals[uuid].advertisementData;
            params[C.kPeripheralName] = this.peripherals[uuid].name;
            params[C.kPeripheralUUID] = this.peripherals[uuid].uuid;
            params[C.kPeripheralBtAddress] = this.peripherals[uuid].addr;
            params[C.kAdvertisementDataKey] = advData;
            params[C.kRSSIkey] = this.peripherals[uuid].rssi;

            this.write(C.kScanForPeripherals, params);
        }        
    };

    this.stopScanResponse = function(params, error){
        this.write(C.kStopScanning);
    };

    this.connectResponse = function(peripheral, error){
        params = {};
        params[C.kPeripheralUUID] = peripheral.uuid;
        params[C.kPeripheralName] = peripheral.name;

        this.write(C.kConnect, params);        
    };

    this.disconnectResponse = function(peripheral, error){
        params = {};
        params[C.kPeripheralUUID] = peripheral.uuid;
        params[C.kPeripheralName] = peripheral.name;

        this.write(C.kDisconnect, params);        
    };

    this.write = function(result, params, id) {
        var mesg = {};
        mesg.jsonrpc = "2.0";
        mesg.result = result;
        mesg.params = params;
        mesg.id = C.id.toString();
        C.id += 1;
        this.send(JSON.stringify(mesg));
    };

    this.send = function(mesg) {
        if (!server) {
            this.onerror("not connected");
            return;
        }
        server.send(mesg);
    };

    this.close = function(callback) {
        if (server) {
            server.close();
        }
    };

    this.addPeripheral = function(name, uuid, addata, scanData, rssi, addr) {
        var peripheral;

        if(typeof process === 'object' && process + '' === '[object process]'){
            var p = require("./peripheral.js"); 
            peripheral = new p.Peripheral(this, name, uuid, addata, scanData, rssi, addr);
        }else{
            peripheral = new Peripheral(this, name, uuid, addata, scanData, rssi, addr);
        }
        this.peripherals[peripheral.uuid] = peripheral;

        return peripheral;
    };

    /* The following define the flags that are valid with the SecurityProperties */
    this.GATM_SECURITY_PROPERTIES_NO_SECURITY = 0x00000000
    this.GATM_SECURITY_PROPERTIES_UNAUTHENTICATED_ENCRYPTION_WRITE = 0x00000001
    this.GATM_SECURITY_PROPERTIES_AUTHENTICATED_ENCRYPTION_WRITE = 0x00000002
    this.GATM_SECURITY_PROPERTIES_UNAUTHENTICATED_ENCRYPTION_READ = 0x00000004
    this.GATM_SECURITY_PROPERTIES_AUTHENTICATED_ENCRYPTION_READ = 0x00000008
    this.GATM_SECURITY_PROPERTIES_UNAUTHENTICATED_SIGNED_WRITES = 0x00000010
    this.GATM_SECURITY_PROPERTIES_AUTHENTICATED_SIGNED_WRITES = 0x00000020

    /* The following define the flags that are valid with the CharacteristicProperties */
    this.GATM_CHARACTERISTIC_PROPERTIES_BROADCAST = 0x00000001
    this.GATM_CHARACTERISTIC_PROPERTIES_READ = 0x00000002
    this.GATM_CHARACTERISTIC_PROPERTIES_WRITE_WO_RESP = 0x00000004
    this.GATM_CHARACTERISTIC_PROPERTIES_WRITE = 0x00000008
    this.GATM_CHARACTERISTIC_PROPERTIES_NOTIFY = 0x00000010
    this.GATM_CHARACTERISTIC_PROPERTIES_INDICATE = 0x00000020
    this.GATM_CHARACTERISTIC_PROPERTIES_AUTHENTICATED_SIGNED_WRITES = 0x00000040
    this.GATM_CHARACTERISTIC_PROPERTIES_EXT_PROPERTIES = 0x00000080

    /* The following define the flags that are valid with the DescriptorProperties */
    this.GATM_DESCRIPTOR_PROPERTIES_READ = 0x00000001
    this.GATM_DESCRIPTOR_PROPERTIES_WRITE = 0x00000002

}


if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== "undefined")) {
    exports.GATTIPSERVER = GATTIPSERVER;
}
