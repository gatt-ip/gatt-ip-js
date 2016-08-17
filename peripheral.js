var C = require('./lib/constants.js').C;
var helper = require('./lib/message-helper');
var advDataParser = require('./lib/message-advdata-parser');
var ee = require("./lib/event-emitter");
var serviceTable = require("./lib/service-table");
var Service = require("./service").Service;

function pushUnique(array, item) {
    if (array.indexOf(item) == -1) {
        array.push(item);
        return true;
    }
    return false;
}


// TODO: Errors if not connected
function Peripheral(gattip, uuid, name, rssi, addata, scanData) {
    ee.instantiateEmitter(this);
    var self = this;
    this.type = 'p';
    this.uuid = uuid;
    this.isConnected = false;
    var services = {};
    var manufacturerData = {};
    var serviceData = {};
    var serviceUUIDs = [];
    // constructor continues below
    this._updateFromScanData = function (name, rssi, txPwr, service_UUIDs, mfrData, svcData, addata, scanData) {
        this.name = name;
        this.rssi = rssi;
        this.txPowerLevel = txPwr;
        var advertisementData = addata;
        var scanData = scanData;

        if (mfrData) {
            for (var mfrId in mfrData) {
                manufacturerData[mfrId] = mfrData[mfrId];
            }
        }
        if (serviceData) {
            for (var serUUID in svcData) {
                serviceData[serUUID] = svcData[serUUID];
            }
        }
        if (service_UUIDs) {
            for (var sidx = 0; sidx < service_UUIDs.length; sidx++) {
                pushUnique(serviceUUIDs, service_UUIDs[sidx]);
            }
        }
        if (addata) {
            advDataParser.parseAdvArray(self, addata.c2);
        }

    };
    this.findService = function (uuid) {
        return services[uuid];
    };
    this.getMfrData = function (mfrId) {
        // id as hex string
        return manufacturerData[mfrId];
    };
    this.getSvcData = function (svcId) {
        // id as hex string
        return serviceData[svcId];
    };
    this.hasAdvertisedServiceUUID = function (serviceUUID) {
        return (serviceUUIDs.indexOf(serviceUUID) >= 0);
    };
    this.getAllServices = function () {
        return services;
    };
    this.getAllMfrData = function () {
        return manufacturerData;
    };
    this.getAllSvcData = function () {
        return serviceData;
    };
    this.getAllAdvertisedServiceUUIDs = function () {
        return serviceUUIDs;
    };
    this.addServiceWithUUID = function (serviceUUID) {
        var service = new Service(self, serviceUUID);
        return services[serviceUUID] = service;
    };
    this.addService = function (service) {
        return services[service.uuid] = service;
    };
    this.gattip = function () {
        return gattip;
    };


    // SERVER RESPONSES/INDICATIONS  ============================

    this.connectOnce = function (callback) {
        // TODO: Error if already connected
        var params = helper.populateParams(self);
        gattip.request(C.kConnect, params, callback, function (params) {
            serviceTable.parseServiceRecord(self, params);
            self.isConnected = true;
            gattip.fulfill(callback, self);
        });
    };


    /**
     * Attempts to connect to the peripheral
     * @param callback
     * @param config Optional object with numConnectAttempts. This value defaults to 3,
     * but may change to 1 in the future
     */
    this.connect = function (callback, config) {
        // TODO: Error if already connected

        var fullfillCb = (typeof callback == 'object' ? callback.fulfill : callback);

        var tries = 0;

        if (config && typeof config.numConnectAttempts == 'number') {
            tries = config.numConnectAttempts;
        }
        function tryConnect(error) {
            if (tries != 0) {
                console.log("Failed to connect. Error was", error, "Attempting", C.NUM_CONNECT_ATTEMPTS - tries, "more times");
            }
            tries++;
            if (tries <= C.NUM_CONNECT_ATTEMPTS) {
                self.connectOnce({fulfill: fullfillCb, reject: tryConnect});
            } else {
                gattip.reject(callback, error)
            }
        }

        tryConnect();
    };

    this.disconnect = function (callback) {
        // TODO: Error if not connected
        var params = helper.populateParams(self);
        gattip.request(C.kDisconnect, params, callback, function (params) {
            self.isConnected = false;
            gattip.fulfill(callback, self);
        });
    };

    this.respondToConnectRequest = function (cookie) {
        var peripheral_db = {};
        peripheral_db[C.kPeripheralUUID] = this.uuid;
        peripheral_db[C.kPeripheralName] = this.name;

        var service_db;
        service_db = serviceTable.getServiceJsonFromPeripheralObject(this);
        peripheral_db[C.kServices] = service_db;

        cookie.result = C.kConnect;
        gattip.respond(cookie, peripheral_db);
    };

    this.handleDisconnectIndication = function () {
        self.isConnected = false;
        self.emit('disconnected', self);
    };

    this._updateFromScanData(name, rssi, addata, scanData);
}

ee.makeEmitter(Peripheral);

module.exports.Peripheral = Peripheral;
