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

        var cookie = {id : message.id, session_id : message.session_id};

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


    this.getObjects = function (cookie, type, peripheralUUID, serviceUUID, characteristicUUID, descriptorUUID) {

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

    this.sendErrorResponse = function (cookie, method, errorId, errMessage) {
        var error = {};
        params = {};
        error[C.kCode] = errorId;
        error[C.kMessageField] = errMessage;
        params[C.kError] = error;
        this.write(method, undefined, cookie, error);
    };

    this.authenticate = function (token) {
        this.send(JSON.stringify({
            type: C.authenticate,
            access_token: token
        }));
    };

    this.configureRequest = function () {
        console.error('configureRequest method not implemented by server');
    };

    this.configureResponse = function (cookie, error) {
        if (!error) {
            this.write(C.kConfigure, undefined, cookie);
        } else {
            this.sendErrorResponse(cookie, C.kConfigure, error);
        }
    };

    this.centralStateRequest = function () {
        console.error('centralStateRequest method not implemented by server');
    };

    this.centralStateResponse = function (cookie, state, error) {
        if (!error) {
            params = {};
            params[C.kState] = state;
            this.write(C.kCentralState, params, cookie);
        } else {
            this.write(C.kCentralState, params, cookie, error);
        }
    };

    this.scanRequest = function () {
        console.error('scanRequest method not implemented by server');
    };

    function arrayAsHex (array, pretty) {
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
        for(var prop in obj) {
            if(obj.hasOwnProperty(prop))
                return false;
        }

        return JSON.stringify(obj) === JSON.stringify({});
    }

    this.scanResponse = function (cookie, name, uuid, addr, rssi, txPwr, serviceUUIDs, mfrData, svcData) {
        params = {};
        var manufactData;
        var serviceData;

        if(!isEmpty(mfrData)) {
            manufactData = {};
            for (var mk in mfrData) {
                var mkey = mk.toUpperCase();
                manufactData[mkey] = arrayAsHex(mfrData[mk]).toUpperCase();
            }
        }
        if(!isEmpty(svcData)) {
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

    this.stopScanRequest = function () {
        console.error('stopScanRequest method not implemented by server');
    };

    this.stopScanResponse = function (cookie, error) {
        if (!error) {
            this.write(C.kStopScanning, undefined, cookie);
        } else {
            this.sendErrorResponse(cookie, C.kStopScanning, error);
        }

    };

    this.connectRequest = function () {
        console.error('connectRequest method not implemented by server');
    };

    this.connectResponse = function (cookie, peripheral, error) {
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

    this.disconnectRequest = function () {
        console.error('disconnectRequest method not implemented by server');
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

    this.write = function (result, params, cookie, error) {
        var mesg = {};
        mesg.jsonrpc = "2.0";
        mesg.result = result;
        mesg.params = params;
        mesg.error = error;
        if(cookie){
            mesg.id = cookie.id;
            mesg.session_id = cookie.session_id;
        }
        this.send(JSON.stringify(mesg));
    };

    this.send = function (mesg) {
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

    this.close = function (callback) {
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

    this.addPeripheral = function (name, uuid, addr, rssi, txPower, serviceUUIDs, addata, serviceData) {
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
function Peripheral(gattip, name, uuid, addr, rssi,  txPwr, serviceUUIDs, mfrData, serviceData, addata, scanData)  {
    var path = "lib/gatt-ip-js/browser/"; // Replace the path to json configuration file.

    if (typeof process === 'object' && process + '' === '[object process]') {
        C = require("./constants.js").C;
        Service = require("./service.js").Service;
    }

    var _gattip = gattip; 
    this.manufacturerData = {};
    this.serviceData = {};
    this.serviceUUIDs = [];
    this.services = {}; 
    this.isConnected = false;
    var self = this;

    this.serviceNames;
    this.characteristicNames;
    this.descriptorNames;

    Object.size = function (obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };

    Array.prototype.pushUnique = function (item){
        if(this.indexOf(item) == -1) {
            this.push(item);
            return true;
        }
        return false;
    }

    this.updatePeripheral = function(gattip, name, uuid, addr, rssi,  txPwr, serviceUUIDs, mfrData, serviceData, addata, scanData){
        this.Constructor(gattip, name, uuid, addr, rssi,  txPwr, serviceUUIDs, mfrData, serviceData, addata, scanData);
    }

    this.Constructor = function(gattip, name, uuid, addr, rssi,  txPwr, serviceUUIDs, mfrData, serviceData, addata, scanData){
        
        var flag = true;
        _gattip = gattip;

        this.name = name;
        this.uuid = uuid;
        this.addr = addr;
        this.rssi = rssi;
        this.txpowerLevel = txPwr;

        this.advertisementData = addata;
        this.scanData = scanData;
        if (addata)this.rawAdvertisingData = addata[C.kRawAdvertisementData];

        //parse advertising data
        this.advdata = new Array();
        if(typeof this.rawAdvertisingData !== 'undefined') {

            if (this.rawAdvertisingData.length % 2 === 0) {
                for (var i = 0; i < this.rawAdvertisingData.length; i = i + 2) {
                    this.advdata[i / 2] = this.rawAdvertisingData.charAt(i) + this.rawAdvertisingData.charAt(i + 1);
                }
            } else {
                for (var j = 0; j < this.rawAdvertisingData.length; j++) {
                    this.advdata[j] = this.rawAdvertisingData.charAt(2 * j) + this.rawAdvertisingData.charAt(2 * j + 1);
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

        }

        if( (typeof mfrData != 'undefined') && (Object.prototype.toString.call( mfrData ) === '[object Object]')){
            if(this.manufacturerData && this.manufacturerData.size > 0){
                for(var mfrId in mfrData){
                    this.manufacturerData[mfrId] = mfrData[mfrId];
                }
            }else{
                this.manufacturerData = mfrData;
            }            
        }

        if( (typeof serviceData != 'undefined') && (Object.prototype.toString.call( serviceData ) === '[object Object]') ) {
            if(this.serviceData && this.serviceData.size > 0){            
                for(var serUUID in serviceData){
                    this.serviceData[serUUID] = serviceData[serUUID];
                }
            }else{
                this.serviceData = serviceData;
            }
        }

        if( (typeof serviceUUIDs != 'undefined') && (Object.prototype.toString.call( serviceUUIDs ) === '[object Array]') ){
            if(this.serviceUUIDs && this.serviceUUIDs.length > 0){
                for(var id = 0; id < serviceUUIDs.length; id++){
                    this.serviceUUIDs.pushUnique(serviceUUIDs[id]);
                }
            }else{
                this.serviceUUIDs = serviceUUIDs;
            }
        }

    };

   this.getManufacturerDataById = function(mfrId){
        if ('number' === typeof mfrId) {
            mfrId = '' + Number(mfrId).toString(16);
            var prefix = '';
            for (var i = mfrId.length; i < 4; i++) {
                prefix+='0';
            }
            mfrId = prefix + mfrId;
        }
        return this.manufacturerData[mfrId];;
    };

    this.getServiceDataByUUID = function(serviceUUID){
        return this.serviceData[serviceUUID];;
    };

    this.Constructor(gattip, name, uuid, addr, rssi,  txPwr, serviceUUIDs, mfrData, serviceData, addata, scanData);

    this.connect = function (callback) {
        if (callback) this.onconnect = callback;

        // TODO: Loading the JSON's for UUID names
        /* if (typeof $ === 'undefined') {
            $ = {
                getJSON : function (path, callback) {
                    var f = module.filename;
                    var load = f.substring(0, f.lastIndexOf('/')) + '/../../' + path;
                    var json = require(load);
                    callback(json);
                }
            }
        } */

        /* $.getJSON(path + "bleServices.json", function(res) {
            self.serviceNames = res;
            $.getJSON(path + "bleCharacteristics.json", function (res) {
                self.characteristicNames = res;
                $.getJSON(path + "bleDescriptors.json", function (res) {
                    self.descriptorNames = res;
                    
                });
            });
        }); */

        var params = {};
        params[C.kPeripheralUUID] = self.uuid;
        _gattip.write(C.kConnect, params);
    };

    this.onconnect = function (error) {
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

    this.discoverServicesRequest = function (cookie) {
        if(_gattip.discoverServicesRequest){
            _gattip.discoverServicesRequest(cookie, this);
        }else{
            throw Error('discoverServicesRequest method not implemented by server');
        }
    };

    this.discoverServicesResponse = function (cookie, error) {
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

            _gattip.write(C.kGetServices, params, cookie);
        }else{
            _gattip.sendErrorResponse(cookie, C.kGetServices, kError32603, error);
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
        if(manufacturerDataLength > 2){
            var mfrKey = peripheral.advdata[3] + peripheral.advdata[2];
            var mfrData = '';
            for (var k = 4; k <= manufacturerDataLength; k++) {
                mfrData += peripheral.advdata[k];
            }
            peripheral.manufacturerData[mfrKey] = mfrData;
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

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== 'undefined')) {
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

    this.discoverCharacteristicsRequest = function (cookie) {
        if(_gattip.discoverCharacteristicsRequest){
            _gattip.discoverCharacteristicsRequest(cookie, _peripheral, this);
        }else{
            throw Error('discoverCharacteristicsRequest method not implemented by server');
        }
    };

    this.discoverCharacteristicsResponse = function (cookie, error) {
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

            _gattip.write(C.kGetCharacteristics, params, cookie);
        }else{
            _gattip.sendErrorResponse(cookie, C.kGetCharacteristics, kError32603, error);
        }        
    };

    this.addCharacteristic = function (characteristicUUID) {
        var characteristic = new Characteristic(_gattip, _peripheral, this, characteristicUUID);
        this.characteristics[characteristic.uuid] = characteristic;

        return characteristic;
    };
}

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== 'undefined')) {
    exports.Service = Service;
}


function Characteristic(gattip, peripheral, service, uuid) {
    if (typeof process === 'object' && process + '' === '[object process]') {
        C = require("./constants.js").C;
        Descriptor = require("./descriptor.js").Descriptor;
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
        if(typeof params[C.kDescriptors] !== 'undefined'){
            for (var index in params[C.kDescriptors]) {
                var descriptorUUID = params[C.kDescriptors][index][C.kDescriptorUUID];
                var descriptor = this.descriptors[descriptorUUID];
                if (!descriptor) {
                    descriptor = new Descriptor(_gattip, _peripheral, _service, this, descriptorUUID);
                }
                
                var props = params[C.kDescriptors][index][C.kProperties];
                for (var apindex in C.AllProperties) {
                    descriptor.properties[C.AllProperties[apindex]] = {
                        enabled: (props >> apindex) & 1,
                        name: C.AllProperties[apindex]
                    };
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
        if (callback) this.onwrite = callback;

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

    this.discoverDescriptorsRequest = function (cookie) {
        if (_gattip.discoverDescriptorsRequest) {
            _gattip.discoverDescriptorsRequest(cookie, _peripheral, _service, this);
        } else {
            throw Error('discoverDescriptorsRequest method not implemented by server');
        }
    };

    this.discoverDescriptorsResponse = function (cookie, error) {
        if (!error) {
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

            _gattip.write(C.kGetDescriptors, params, cookie);
        } else {
            _gattip.sendErrorResponse(cookie, C.kGetCharacteristics, kError32603, error);
        }
    };

    this.readCharacteristicValueRequest = function (cookie, params) {
        if (_gattip.readCharacteristicValueRequest) {
            _gattip.readCharacteristicValueRequest(cookie, _peripheral, _service, this);
        } else {
            throw Error('readCharacteristicValueRequest method not implemented by server');
        }
    };

    this.writeCharacteristicValueRequest = function (cookie, params) {
        if (_gattip.writeCharacteristicValueRequest) {
            _gattip.writeCharacteristicValueRequest(cookie, _peripheral, _service, this, params[C.kValue]);
        } else {
            throw Error('writeCharacteristicValueRequest method not implemented by server');
        }
    };

    this.enableNotificationsRequest = function (cookie, params) {
        if (_gattip.enableNotificationsRequest) {
            _gattip.enableNotificationsRequest(cookie, _peripheral, _service, this, params[C.kValue]);
        } else {
            throw Error('enableNotificationsRequest method not implemented by server');
        }
    };

    this.respondToReadRequest = function (cookie, error) {

        if (error) {
            this.sendErrorResponse(cookie, C.kGetCharacteristicValue, C.kError32603, 'Failed to read the Characteristic value');
        } else {
            params = {};
            params[C.kPeripheralUUID] = _peripheral.uuid;
            params[C.kServiceUUID] = _service.uuid;
            params[C.kCharacteristicUUID] = this.uuid;
            params[C.kValue] = this.value;
            params[C.kIsNotifying] = this.isNotifying;

            _gattip.write(C.kGetCharacteristicValue, params, cookie);
        }
    };

    this.respondToWriteRequest = function (cookie, error) {

        if (error) {
            this.sendErrorResponse(cookie, C.kWriteCharacteristicValue, C.kError32603, 'Failed to write the Characteristic value');
        } else {
            params = {};
            params[C.kPeripheralUUID] = _peripheral.uuid;
            params[C.kServiceUUID] = _service.uuid;
            params[C.kCharacteristicUUID] = this.uuid;
            params[C.kValue] = this.value;

            _gattip.write(C.kWriteCharacteristicValue, params, cookie);
        }
    };

    function respondNotify(cookie, self) {

        params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = self.uuid;
        params[C.kIsNotifying] = self.isNotifying;
        params[C.kValue] = self.value;

        _gattip.write(C.kSetValueNotification, params, cookie);
    }

    this.respondWithNotification = function (cookie, value) {
        this.value = value;
        respondNotify(cookie, this);
    };

    this.respondToChangeNotification = function (cookie, isNotifying) {
        this.isNotifying = isNotifying;
        respondNotify(cookie, this);
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

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== 'undefined')) {
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

    this.read = function (callback) {
        if (callback) this.onread = callback;
        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = _characteristic.uuid;
        params[C.kDescriptorUUID] = this.uuid;
        _gattip.write(C.kGetDescriptorValue, params);
    };

    this.onread = function (params) {
        this.isNotifying = params[C.kIsNotifying];
        this.value = params[C.kValue];
    };

    this.write = function (data, callback) {
        if (callback) this.onwrite = callback;
        var params = {};
        params[C.kPeripheralUUID] = _peripheral.uuid;
        params[C.kServiceUUID] = _service.uuid;
        params[C.kCharacteristicUUID] = _characteristic.uuid;
        params[C.kDescriptorUUID] = this.uuid;
        params[C.kValue] = data;
        _gattip.write(C.kWriteDescriptorValue, params);
    };

    this.onwrite = function (params) {
    };

    this.readDescriptorValueRequest = function (cookie, params) {
        if (_gattip.readDescriptorValueRequest) {
            _gattip.readDescriptorValueRequest(cookie, _peripheral, _service, _characteristic, this);
        } else {
            throw Error('readDescriptorValueRequest method not implemented by server');
        }
    };

    this.writeDescriptorValueRequest = function (cookie, params) {
        if (_gattip.writeDescriptorValueRequest) {
            _gattip.writeDescriptorValueRequest(cookie, _peripheral, _service, _characteristic, this, params[C.kValue]);
        } else {
            throw Error('writeDescriptorValueRequest method not implemented by server');
        }
    };

    this.respondToReadDescriptorValueRequest = function (cookie, error) {

        if (error) {
            this.sendErrorResponse(cookie, C.kGetDescriptorValue, C.kError32603, 'Failed to read the descriptor value');
        } else {
            params = {};
            params[C.kPeripheralUUID] = _peripheral.uuid;
            params[C.kServiceUUID] = _service.uuid;
            params[C.kCharacteristicUUID] = _characteristic.uuid;
            params[C.kDescriptorUUID] = this.uuid;
            params[C.kValue] = this.value;
            params[C.kIsNotifying] = this.isNotifying;

            _gattip.write(C.kGetDescriptorValue, params, cookie);
        }
    };

    this.respondToWriteDescriptorValueRequest = function (cookie, error) {

        if (error) {
            this.sendErrorResponse(cookie, C.kWriteDescriptorValue, C.kError32603, 'Failed to write the descriptor value');
        } else {
            params = {};
            params[C.kPeripheralUUID] = _peripheral.uuid;
            params[C.kServiceUUID] = _service.uuid;
            params[C.kCharacteristicUUID] = _characteristic.uuid;
            params[C.kDescriptorUUID] = this.uuid;
            params[C.kValue] = this.value;

            _gattip.write(C.kWriteDescriptorValue, params, cookie);
        }
    };


}

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== 'undefined')) {
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
    kCBAdvertisementDataManufacturerDataKey: "mfr",
    kCBAdvertisementDataServiceUUIDsKey: "suu",
    kCBAdvertisementDataServiceDataKey: "sdt",
    kCBAdvertisementDataOverflowServiceUUIDsKey: "b6",
    kCBAdvertisementDataSolicitedServiceUUIDsKey: "b7",
    kCBAdvertisementDataIsConnectable: "b8",
    kCBAdvertisementDataTxPowerLevel: "txp",
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
};

if ((typeof process === 'object' && process + '' === '[object process]') && (typeof exports !== 'undefined')) {
    exports.C = C;
}