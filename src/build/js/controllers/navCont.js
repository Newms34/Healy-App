app.controller('nav-cont',function($scope,$http,$state, $log, userFact){
    $scope.currState = 'dash';
	$scope.logout = function() {
        bulmabox.confirm('Logout','Are you sure you wish to logout?', function(resp) {
            if (!resp || resp == null) {
                return true;
            } else {
               userFact.logout().then(function(r) {
                    $log.debug('b4 logout usr removl, parent scope is',$scope.$parent.user);
                    $scope.$parent.user=null;
                    $log.debug('and now its',$scope.$parent.user);
                    $state.go('appSimp.login');
                });
            }
        });
    };
    $log.debug('USER ON NAVBAR',$scope.$parent && $scope.$parent.user);
    $scope.navEls = [{
        st:'dash',
        icon:'user-circle',
        protected:false,
        text:'Profile'
    },{
        st:'match',
        icon:'users',
        protected:false,
        text:'Match'
    },{
        st:'mentor',
        icon:'graduation-cap',
        protected:false,
        text:'Mentoring'
    },{
        st:'vote',
        icon:'check-square',
        protected:false,
        text:'Voting'
    },{
        st:'mail',
        icon:'envelope',
        protected:false,
        text:'Mailbox'
    },{
        st:'mod',
        icon:'cogs',
        protected:true,
        text:'Mod Controls'
    },{
        st:'help',
        icon:'question-circle',
        protected:true,
        text:'Help'
    }];
    $scope.goState = s =>{
        $scope.currState = s;
        $state.go('app.'+s);
    };
    $scope.mobActive=false;
});