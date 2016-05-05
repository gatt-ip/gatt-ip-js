function Peripheral(gattip, name, uuid, addr, rssi, txPwr, serviceUUIDs, mfrData, serviceData, addata, scanData) {
    var path = "lib/gatt-ip-js/browser/"; // Replace the path to json configuration file.

    if (typeof process === 'object' && process + '' === '[object process]') {
        C = require("./constants.js").C;
        Service = require("./service.js").Service;
    }

    var _gattip = gattip;
    this.uuid = uuid;
    this.manufacturerData = {};
    this.serviceData = {};
    this.serviceUUIDs = [];
    this.services = {};
    this.isConnected = false;
    var self = this;

    this.serviceNames;
    this.characteristicNames;
    this.descriptorNames;

    Object.size = function(obj) {
        var size = 0,
            key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };

    function pushUnique(array, item) {
        if (array.indexOf(item) == -1) {
            array.push(item);
            return true;
        }
        return false;
    }

    this.updatePeripheral = function(name, addr, rssi, txPwr, serviceUUIDs, mfrData, serviceData, addata, scanData) {
        this.init(name, addr, rssi, txPwr, serviceUUIDs, mfrData, serviceData, addata, scanData);
    }

    this.init = function(name, addr, rssi, txPwr, serviceUUIDs, mfrData, serviceData, addata, scanData) {

        var flag = true;

        this.name = name;
        this.addr = addr;
        this.rssi = rssi;
        this.txpowerLevel = txPwr;

        this.advertisementData = addata;
        this.scanData = scanData;
        if (addata) this.rawAdvertisingData = addata[C.kRawAdvertisementData];

        //parse advertising data
        this.advdata = new Array();
        if (typeof this.rawAdvertisingData !== 'undefined') {

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

        if ((typeof mfrData != 'undefined') && (Object.prototype.toString.call(mfrData) === '[object Object]')) {
            if (this.manufacturerData && Object.size(this.manufacturerData) > 0) {
                for (var mfrId in mfrData) {
                    this.manufacturerData[mfrId] = mfrData[mfrId];
                }
            } else {
                this.manufacturerData = mfrData;
            }
        }

        if ((typeof serviceData != 'undefined') && (Object.prototype.toString.call(serviceData) === '[object Object]')) {
            if (this.serviceData && Object.size(this.serviceData) > 0) {
                for (var serUUID in serviceData) {
                    this.serviceData[serUUID] = serviceData[serUUID];
                }
            } else {
                this.serviceData = serviceData;
            }
        }

        if ((typeof serviceUUIDs != 'undefined') && (Object.prototype.toString.call(serviceUUIDs) === '[object Array]')) {
            if (this.serviceUUIDs && this.serviceUUIDs.length > 0) {
                for (var id = 0; id < serviceUUIDs.length; id++) {
                    pushUnique(this.serviceUUIDs, serviceUUIDs[id]);
                }
            } else {
                this.serviceUUIDs = serviceUUIDs;
            }
        }

    };

    this.init(name, addr, rssi, txPwr, serviceUUIDs, mfrData, serviceData, addata, scanData);

    this.getManufacturerDataById = function(mfrId) {
        if ('number' === typeof mfrId) {
            mfrId = '' + Number(mfrId).toString(16);
            var prefix = '';
            for (var i = mfrId.length; i < 4; i++) {
                prefix += '0';
            }
            mfrId = prefix + mfrId;
        }
        return this.manufacturerData[mfrId];;
    };

    this.getServiceDataByUUID = function(serviceUUID) {
        return this.serviceData[serviceUUID];;
    };

    this.connect = function(callback) {
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

    this.onconnect = function(error) {
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

    this.ondisconnect = function(error) {
        if (!error) {
            console.log(this.name + ' disconnected');
            this.isConnected = false;
        }
    };

    this.discoverServices = function(callback) {
        if (callback) this.ondiscoverServices = callback;

        if (this.services && Object.size(this.services) > 0) {
            _gattip.ondiscoverServices(this);
        } else {
            var params = {};
            params[C.kPeripheralUUID] = this.uuid;
            _gattip.write(C.kGetServices, params);
        }
    };

    this.ondiscoverServices = function(params) {
        for (var index in params[C.kServices]) {
            var serviceUUID = params[C.kServices][index][C.kServiceUUID];
            var service = this.services[serviceUUID];
            if (!service) {
                service = new Service(_gattip, this, serviceUUID);
            }
            this.services[serviceUUID] = service;
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

    this.discoverServicesRequest = function(cookie) {
        if (_gattip.discoverServicesRequest) {
            _gattip.discoverServicesRequest(cookie, this);
        } else {
            throw Error('discoverServicesRequest method not implemented by server');
        }
    };

    this.discoverServicesResponse = function(cookie, error) {
        if (!error) {
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
        } else {
            _gattip.sendErrorResponse(cookie, C.kGetServices, kError32603, error);
        }
    };

    this.addService = function(serviceUUID) {
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
        if (manufacturerDataLength > 2) {
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
