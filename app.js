var app = angular.module('GATT-IP', ['ngRoute']).config(function($routeProvider){

   $routeProvider.
   		when('/devicelist',{
		templateUrl:'views/devicelist.html',
		controller: 'devicelistController'
   });

   $routeProvider.
        when('/servicelist',{
        templateUrl:'views/servicelist.html',
        controller: 'servicelistController'
   });
                                                           
   $routeProvider.
        when('/characteristiclist',{
        templateUrl:'views/characteristiclist.html',
        controller: 'characteristiclistController'
   });
                                                           
   $routeProvider.
        when('/descriptorlist',{
        templateUrl:'views/descriptorlist.html',
        controller: 'descriptorlistController'
   });
                                                           
   $routeProvider.otherwise({redirectTo: '/devicelist'});
});
