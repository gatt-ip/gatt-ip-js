app.controller('devicelistController',['$scope','gattip',function($scope,gattip){

    $scope.gattip = gattip;
                                       
    $scope.connectPeripheral = function(peripheral) {
        peripheral.connect();
    };
                                       
    $scope.gotoremoteview = function() {
        window.location = 'gatt-ip://remoteview';
    };

    $scope.gotologview = function() {
        window.location = 'gatt-ip://logview';
    };
                                       
    //////////////////////////////
    // pull to refresh functionality start here
    $(document).ready(function(){
                                                         
        var contents      = $('.PullToRefresh');
        var refresh       = false;
        var track         = false;
        var doc           = document.documentElement;
        var startY;
        var top;
        var left;
        var page;
                                                         
        $.each(contents, function( index, currentElement ) {
            currentElement.addEventListener('touchstart', function(e) {
                $('.pull').hide();
                contentStartY = $('.iscroll-scroller').position().top;
                startY = e.touches[0].screenY;
                left = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
                top = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);
            });
                                                                
            currentElement.addEventListener('touchend', function(e) {
                $('.pull').html('Pull Down').hide();
                if(refresh) {
                    currentElement.style['-webkit-transition-duration'] = '.5s';
                    $scope.$apply(function () {
                        gattip.peripherals = {};
                    });
                                                                                                
                    gattip.scan(true);
                    currentElement.addEventListener('transitionEnd', removeTransition);
                    refresh = false;
                }
            });
            
            currentElement.addEventListener('touchmove', function(e) {
                e.preventDefault();
                if( contentStartY >= 0){
                    if(e.changedTouches[0].screenY - startY > 15){
                        $('.pull').html('Pull Down').show();
                    }
                    if(top === 0 && (e.changedTouches[0].screenY - startY > 80) && contentStartY >= 0 ){
                        $('.pull').html('Release to Refresh').show();
                        refresh = true;
                    }else{
                        refresh = false;
                        return false;
                    }
                }
            });
            
            var removeTransition = function() {
                content.style['-webkit-transition-duration'] = 0;
            };
        });
        document.addEventListener('touchend',function(){ $('.pull').html('Pull down').hide(); },false);
    });
    // PULL TO REFRESH ENDS HERE

}]);