var C = require('./constants').C;
var helper = require('./message-helper');
var InternalError = require('./../errors').InternalError;
var ApplicationError = require('./../errors').ApplicationError;

module.exports.MessageHandler = function (gattip, gateway) {
    var self = this;

    this.createUserContext = function (method, params, userCallback, handler) {
        var mesg = {
            method: method,
            params: params,
            jsonrpc: "2.0"
        };
        return {originalMessage: mesg, cb:userCallback, handler:handler};
    };
    this.wrapResponse = function (cookie, params) {
        var mesg = {
            params: params,
            jsonrpc: "2.0"
        };
        helper.requireAndPopulateFieldsFromCookie('wrapResponse', cookie, mesg);
        console.log('Wrote', JSON.stringify(params));
        return mesg;
    };

    this.handleIndication = function (response) {
        if (response.error) {
            throw new ApplicationError(JSON.stringify(response));
        }

        var params = response.params;
        switch (response.result) {
            case C.kScanForPeripherals:
                var peripheral = gateway.handleScanIndication(params);
                break;
            case C.kDisconnect:
                (function () {
                    helper.requireFields('Disconnect indication', params, [C.kPeripheralUUID]);
                    var peripheral = gateway.getPeripheral(params[C.kPeripheralUUID]);
                    if (peripheral) {
                        peripheral.handleDisconnectIndication(peripheral);
                    } else {
                        console.warn("Received disconnect indication for an unknown peripheral with UUID", params[C.kPeripheralUUID]);
                    }
                })();
                break;
            case C.kSetValueNotification:
                (function () {
                    helper.requireFields('Disconnect indication', params, [C.kPeripheralUUID]);
                    var peripheral = gateway.getPeripheral(params[C.kPeripheralUUID]);
                    if (peripheral) {
                        helper.requireFields('Value notification', params, [C.kPeripheralUUID, C.kServiceUUID, C.kCharacteristicUUID, C.kValue]);
                        var objs = gateway.getObjectsFromMessage('c', response.params);
                        objs.characteristic.handleValueNotification(params);
                    } else {
                        console.warn("Received value notification for an unknown peripheral with UUID", params[C.kPeripheralUUID]);
                    }
                })();
                break;
            default:
                (function () {
                    throw new InternalError('Unknown indication received from the gateway:', JSON.stringify(response));
                })();
                break;
        }
    };
};