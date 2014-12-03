app.controller('servicelistController',['$scope','gattip',function($scope,gattip){

    $scope.gattip = gattip;
                                        
 	$scope.discoverCharacteristics = function(service) {
        service.discoverCharacteristics();
    };
     
    $scope.back = function() {
        if(gattip.currentPeripheral) gattip.currentPeripheral.disconnect();
        history.go(-1);
    };
                                        
    $scope.gotologview = function() {
        window.location = 'gatt-ip://logview';
    };

}]);