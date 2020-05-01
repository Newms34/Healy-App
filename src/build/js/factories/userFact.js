app.factory('userFact', function($http,$log) {
    return {
        getUser: function() {
            return $http.get('/user/usrData').then(function(s) {
                $log.debug('getUser in fac says:', s);
                return s;
            });
        },
        newUser:function(o){
            return $http.post('/user/new',o).then(function(r){
                return r;
            });
        },
        login:function(o){
            return $http.put('/user/login',o).then(function(r){
                return r;
            });
        },
        logout:function(){
            return $http.get('/user/logout').then(function(r){
                return r;
            });
        },
        forgot:function(o){
            return $http.put('/user/forgot',o).then(function(r){
                return r;
            });
        },
        resetKey:function(k){
            return $http.get('/user/resetUsr?key='+o).then(function(r){
                return r;
            });
        },
        resetPwd:function(k){
            return $http.put('/user/resetPwd',o).then(function(r){
                return r;
            });
        },
        nameCheck:function(n){
            return $http.get('/user/nameOkay?name='+n).then(function(r){
                return r;
            });
        }
    };
});