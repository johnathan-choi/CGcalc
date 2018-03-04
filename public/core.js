// public/core.js


function getDateTime(date, mode){ //turns dates legible
    var month = date.getMonth()+1;
        if (month - 10 < 0){
            month = "0" + month;
        }
    var day = date.getDate();
        if (day - 10 < 0){
            day = "0" + day;
        }
    var hours = date.getHours();
        if (hours - 10 < 0){
            hours = "0" + hours;
        }
    var minutes = date.getMinutes();
        if (minutes - 10 < 0){
            minutes = "0" + minutes;
        }
    if (mode == "date"){ // YYYY/MM/DD
        return date.getFullYear() + "/" + month + "/" + day;
    }
    else if (mode == "time"){ // HH:MM
        return hours + ":" + minutes;
    }
    else{ // YYYY/MM/DD HH:MM
        return date.getFullYear() + "/" + month + "/" + day + " " + hours + ":" + minutes;
    }
    
}


var app = angular.module('cgcalc', ['ngFileUpload']);


app.controller('indexPage', ['$scope', 'Upload', '$http', '$window', function($scope, Upload, $http, $window){
    $scope.currTime = getDateTime(new Date());
    $scope.loading = true;
    $scope.dlButton = true;

    $scope.submitSS = function(doc){
        $scope.currTime = getDateTime(new Date());
        $scope.loading = false;
        $scope.clicked = true;

        function keepAlive(){
            $http.get('/api/time').then(function(response){
                $scope.currTime = response.data;
            });
        }
        var timeCheck = setInterval(function(){keepAlive();}, 10*1000);

        $scope.doc.upload = Upload.upload({
            url: "/api/doc",
            file: $scope.doc
        }).then(function(response){
            clearInterval(timeCheck);
            $scope.loading = true;
            $scope.result = response.data;
            $scope.dlButton = false;
        });
    };
}]);

