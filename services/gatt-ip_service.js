var url = "ws://localhost:6001";//default
//called from native side
function connectWithPort(port) {
    url = "ws://localhost:"+port;
    return url;
}

app.factory('gattip',
            ['$q', '$rootScope', '$location',
             function ($q, $rootScope, $location) {
                alert("Stop for debugger....");
             
                var util = Util();
             
                var g = new GATTIP();

                g.init(url);

                g.oninit = function(params, error){
                    g.configure(true);
                };

                g.onstate = function(error){
                    if(g.state === GATTIP.kPoweredOn) {
                        g.scan(true);
                    } else if(g.state === GATTIP.kPoweredOff) {
                        $rootScope.$apply(function () {
                            $location.path('/devicelist');
                            //TODO:update ui to show it is off
                        });
                    } else if(g.state === GATTIP.kUnsupported) {
                        alert("Bluetooth Low Energy is not supported with this device.");
                        //TODO:update ui to show it is not supported
                    } else {
                        //TODO:other error cases
                    }
                };

                g.onscan = function(peripheral, error) {
                    util.updatesignalimage(peripheral);
                    $rootScope.$apply();
                };

                g.onconnect = function(peripheral, error) {
                    g.currentPeripheral = peripheral;
                    peripheral.discoverServices();
                };
             
                g.ondisconnect = function(peripheral, error) {
                    g.currentPeripheral = null;
             
                    if(error && error.message) alert(error.message);
             
                    $rootScope.$apply(function () {
                        $location.path('/devicelist');
                    });
                };
             
                g.ondiscoverServices = function(peripheral, error) {
                    $rootScope.$apply(function () {
                        $location.path('/servicelist');
                    });
                };
             
                g.ondiscoverCharacteristics = function(peripheral, service, error) {
                    g.currentService = service;
                    $rootScope.$apply(function () {
                       $location.path('/characteristiclist');
                    });
                };

                g.ondiscoverDescriptors = function(peripheral, service, characteristic, error) {
                    g.currentCharacteristic = characteristic;
                    characteristic.read();
                    $rootScope.$apply(function () {
                        $location.path('/descriptorlist');
                    });
                };
             
                g.onupdateValue = function(peripheral, service, characteristic, error) {
                    $rootScope.$apply();
                };
             
                g.onwriteValue = function(peripheral, service, characteristic, error) {
                    $rootScope.$apply();
                };
             return g;
}]);
