app.controller('characteristiclistController',['$scope','gattip',function($scope,gattip){
	
    $scope.gattip = gattip;

    $scope.discoverDescriptors = function(characteristic) {
        characteristic.discoverDescriptors();
    };
	
    $scope.back = function() {
        history.go(-1);
    };
                                               
    $scope.gotologview = function() {
        window.location = 'gatt-ip://logview';
    };
}]);