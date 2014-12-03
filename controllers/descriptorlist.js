app.controller('descriptorlistController',['$scope','gattip',function($scope,gattip){

    $scope.gattip = gattip;
                  
    var util = Util();
                 
    $scope.readformat = 0;
    $scope.writeformat = 0;

    $scope.$watch('gattip.currentCharacteristic.value', updateCurrentValue);
                                           
    $scope.changeFormat = updateCurrentValue;

    function updateCurrentValue() {
        switch($scope.readformat) {
            case "1":
                $scope.currentValue = util.hex2a(gattip.currentCharacteristic.value);
                break;
            case "2":
                $scope.currentValue = util.hex2dec(gattip.currentCharacteristic.value);
                break;
            case "3":
                $scope.currentValue = util.hex2b(gattip.currentCharacteristic.value);
                break;
            default:
                $scope.currentValue = gattip.currentCharacteristic.value;
                break;
        }
    }
                                           
    $scope.writeValue = function() {
        var writeTemp = '';
        switch($scope.writeformat) {
            case "1":
                writeTemp = util.a2hex($scope.inputs);
                break;
            case "2":
                writeTemp = util.dec2hex($scope.inputs);
                break;
            case "3":
                writeTemp = $scope.inputs;//TODO
                break;
            default:
                writeTemp = $scope.inputs;
            break;
        }

        gattip.currentCharacteristic.write(writeTemp);
    };
                                           
    $scope.readAgain = function() {
        gattip.currentCharacteristic.read();
    };
	
	$scope.notify = function() {
        gattip.currentCharacteristic.notify(true);
    };
	
	$scope.stopNotify = function() {
        gattip.currentCharacteristic.notify(false);
    };

    $scope.back = function(){
        history.go(-1);
    };

    $scope.gotologview = function(){
        window.location = 'gatt-ip://logview';
    };
}]);