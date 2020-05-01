const socket = io(),
    app = angular.module('codementormatch-app', ['ui.router', 'ngAnimate', 'ngSanitize', 'ngMaterial', 'ngMessages']),
    resetApp = angular.module('reset-app', []);

const defaultPic = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHEAAACNCAIAAAAPTALlAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAANsSURBVHhe7dVRduIwEETR7GkWmK1HhMch9giw1dWyZNf9mZwM2F3vJ1//TM1N9dxUz0313FTPTfVGb/r9Fh8azIhNCbYTXx7AWE3JE8CDDjVEU3pI8egjHN+UBgl4QXdHNmV6Ml7W0WFNWdwFr+zlgKYM7Y7X5+vdlH0H4YhkXZuy7FCckqlfUzYNgIPSdGrKmmFwVo6LNi24LEGPpowYDMclSG/KgiFxotqlmxZcKZXblMMHxqFSiU25enicq+OmN1wsktWUYyfB0SJuesPRIilNuXQqnK7gpuB0BX1TbpwQA8Lc9IkBYW66wIYYcVNOmxYzYtx0gRkxbrrAjBhlU+6aHGMC3HSNMQFuusaYADddY0yAm64xJsBNK9jTStaUc06BSa3ctIJJrdy0gkmt3LSCSa3ctIJJrdy0gkmt3LSCSa3ctIJJrdy0gkmt3LSCSa3ctIJJrWRNCy6aH3tauekaYwLcdI0xAW66xpgAN11jTICbrjEmQNm04K5pMSPGTReYEeOmC8yIcdMFZsSImxZcNyEGhLnpEwPC9E0LbpwKpyu4KThdIaVpwaWT4GgRN73haBE3veFokaymBfcOj3N1EpsWXD0wDpVyU73cpgW3D4kT1dKbFiwYDMcl6NG0YMdIuCzBRZtyVo5OTQvWDICD0vRrWrDpUJySqWvTgmUH4YhkvZsW7OuO1+e7SlPe3cXl/kZxTaZOTRk0Bm5Kk96UHePhvgS5TTl/YBwqldWUk2fAxTopTTl2HtwtIm7KjXNiQ5iyKafNjCUxsqYcNT/2BGiacs5ZsKqVoCmHnAvbmkSbcsIZsXC/UFNefl7s3Km9Ka89O9bu0diUF14DmzdracqrroTl27jpJizfZndTXnI97N9gX1Mef1VU+GRHUx58bbR4y033ocVbW5vySNuQdVNTHmYPdHnBTVvQ5YXPTXmMLVGnxk0bUafmQ1MeYDU0+s+7pnzVXqPUkpuGUGrpZVO+ZJ/Q6w83jaLXH24qQLKHelM+a9tQ7cFNBaj2UGnKB20P2v1yUw3a/Vo35SO2HwXdVIiCbipEwVVT/tNa3TO6qdI9o5sq3TO6qVjJ+GzK7yymlHRTsVLSTcVKSZryC1NwUz031XNTPTfVuzXlRxNxUz031XNTPTfVc1M9N9VzU70v/jWV7+8ffZYE08zo+Y8AAAAASUVORK5CYII=';

Array.prototype.findUser = function (u) {
    for (var i = 0; i < this.length; i++) {
        if (this[i].user == u) {
            return i;
        }
    }
    return -1;
};
let hadDirect = false;
const dcRedirect = ['$location', '$q', '$injector', function ($location, $q, $injector, $http) {
    //if we get a 401 response, redirect to login
    let currLoc = '';
    return {
        request: function (config) {
            // $log.debug('STATE', $injector.get('$state'));
            currLoc = $location.path();
            return config;
        },
        requestError: function (rejection) {
            return $q.reject(rejection);
        },
        response: function (result) {
            return result;
        },
        responseError: function (response) {
            $log.debug('Something bad happened!', response, currLoc, $location.path());
            hadDirect = true;
            bulmabox.alert(`App Restarting`, `Hi! I've made some sort of change just now to make this app more awesome! Unfortunately, this also means I've needed to restart it. I'm gonna log you out now.`, function (r) {
                fetch('/user/logout')
                    .then(r => {
                        hadDirect = false;
                        $state.go('appSimp.login', {}, {
                            reload: true
                        });
                        return $q.reject(response);
                    });
            });
        }
    };
}];
app
    .constant('IsDevelopment', window.location.hostname === 'localhost')
    .config(['$stateProvider', '$urlRouterProvider', '$locationProvider', '$httpProvider', '$compileProvider', '$logProvider','IsDevelopment','$mdGestureProvider', function ($stateProvider, $urlRouterProvider, $locationProvider, $httpProvider, $compileProvider, $logProvider, IsDevelopment,$mdGestureProvider) {
        $locationProvider.html5Mode(true);
        $urlRouterProvider.otherwise('/404');
        $mdGestureProvider.skipClickHijack();
        $compileProvider.debugInfoEnabled(IsDevelopment);
        $logProvider.debugEnabled(IsDevelopment);
        if(IsDevelopment) console.log('-------------------------\nDebug mode enabled \n-------------------------');
        $stateProvider
            //the states
            //NORMAL states (auth'd)
            .state('app', {
                abstract: true,
                templateUrl: 'layouts/full.html'
            })
            .state('app.dash', {
                url: '/', //default route, if not 404
                templateUrl: 'components/dash.html'
            })
            .state('app.help', {
                url: '/help',
                templateUrl: 'components/help/help.html'
            })
            //SIMPLE (unauth'd: login, register, forgot, 404, 500,reset)
            .state('appSimp', {
                abstract: true,
                templateUrl: 'components/layout/simp.html'
            })
            .state('appSimp.login', {
                url: '/login',
                templateUrl: 'components/login.html'
            })
            .state('appSimp.register', {
                url: '/register',
                templateUrl: 'components/register.html'
            })
            //and finally, the error-handling routes!
            .state('appSimp.notfound', {
                url: '/404',
                templateUrl: 'components/alt/404.html'
            })
            .state('appSimp.err', {
                url: '/500',
                templateUrl: 'components/alt/500.html'
            });

        //provider stuff

        $httpProvider.interceptors.push(function ($q) {
            return {
                // optional method
                'request': function (config) {
                    // do something on success
                    return config;
                },

                // optional method
                'requestError': function (rejection) {
                    return $q.reject(rejection);
                },



                // optional method
                'response': function (response, $http) {
                    // do something on success
                    // $log.debug('RESPONSE INTERCEPTOR', response && response.data)
                    if (response && response.data && response.data == 'refresh') {
                        // console.log('need to refresh',socket,socket.to)
                        socket.emit('requestRefresh',{id:socket.id});
                    }
                    return response;
                },

                // optional method
                'responseError': function (rejection) {
                    // do something on error
                    return $q.reject(rejection);
                }
            };
        });
    }])
    .directive("changeReFocus", [function () {
        return {
            restrict: 'EA',
            scope: {
                changeFn: "&"
            },
            link: function (scope, element, attributes) {
                // const theFn = scope.changeFn();
                console.log('THE FUNCTION IS',scope.changeFn.toString());
                element.bind("change", function (changeEvent) {
                    // $log.debug('SCOPE',scope,'ELEMENT',element,'ATTRIBS',attributes,scope.changeFn)
                    scope.changeFn().then(r => {
                        element[0].focus();
                    });
                    // scope.theFn('HELLOTHERE');
                });
            }
            // controller:function($scope, $element, $attrs,){
            //     $log.debug('SCOPE',$scope,'EL',$element)
            // }
        };
    }])
    //the following are for file uploading and markdown conversion. I don't THINK we'll need em, but... eh
    .directive("fileread", ['$log',function ($log) {
        return {
            scope: {
                fileread: "="
            },
            link: function (scope, element, attributes) {
                element.bind("change", function (changeEvent) {
                    const reader = new FileReader(),
                        theFile = changeEvent.target.files[0],
                        tempName = theFile.name;
                    $log.debug('UPLOADING FILE', theFile);
                    reader.onload = function (loadEvent) {
                        let theURI = loadEvent.target.result;
                        $log.debug('URI before optional resize', theURI, theURI.length);
                        if (scope.$parent.needsResize) {
                            //needs to resize img (usually for avatar)
                            resizeDataUrl(scope, theURI, scope.$parent.needsResize, scope.$parent.needsResize, tempName);
                        } else {
                            $log.debug('APPLYING file to $parent', scope.$parent);
                            scope.$apply(function () {
                                if (scope.$parent && scope.$parent.$parent && scope.$parent.$parent.avas) {

                                    scope.$parent.$parent.loadingFile = false;
                                    scope.$parent.$parent.fileName = 'Loaded:' + tempName;
                                    scope.$parent.$parent.fileread = theURI;
                                } else {
                                    scope.$parent.loadingFile = false;
                                    scope.$parent.fileName = 'Loaded:' + tempName;
                                    scope.$parent.fileread = theURI;
                                }
                                if (scope.$parent.saveDataURI && typeof scope.$parent.saveDataURI == 'function') {
                                    scope.$parent.saveDataURI(dataURI);
                                }
                            });
                        }
                    };
                    if (!theFile) {
                        scope.$apply(function () {
                            scope.fileread = '';
                            scope.$parent.fileName = false;
                            scope.$parent.loadingFile = false;
                        });
                        return false;
                    }
                    if (theFile.size > 2500000) {
                        bulmabox.alert('File too Large', `Your file ${theFile.name} is larger than 2.5MB. Please upload a smaller file!`);
                        return false;
                    }
                    reader.readAsDataURL(theFile);
                });
            }
        };
    }])
    .directive("waitForData", [function () {
        return {
            restrict: 'A',
            // scope: {
            //     props: "="
            // },
            link: function (scope, element, attributes) {
                scope.wfdArr = attributes.waitForData.split(',').map(q => q.trim());
                const bgWait = document.createElement('div');
                bgWait.id = 'bg-wait';
                bgWait.innerHTML = 'Loading <div class="loady-spin"></div>';
                document.querySelector('body').append(bgWait);
                document.querySelector('#full-win').style.filter = "blur(9px)";
                let waiters = scope.wfdArr.map(function (q) {
                    // $log.debug('SCOPE HERE IS',scope)
                    const wfdIObj = {
                        fn: null,
                        name: q,
                        data: null
                    };
                    wfdIObj.fn = scope.$watch(q, function (nv, ov) {
                        wfdIObj.data = nv;
                        if (waiters.filter(a => !!a.data).length >= scope.wfdArr.length) {
                            waiters = [];//clear waiters so we're not polluting the scope;
                            document.querySelector('body').removeChild(document.querySelector('#bg-wait'));
                            document.querySelector('#full-win').style.filter = "none";
                        }
                    });
                    return wfdIObj;
                });
            }
        };
    }]);
    

String.prototype.titleCase = function () {
    return this.split(/\s/).map(t => t.slice(0, 1).toUpperCase() + t.slice(1).toLowerCase()).join(' ');
};

const resizeDataUrl = (scope, datas, wantedWidth, wantedHeight, tempName) => {
    // We create an image to receive the Data URI
    const img = document.createElement('img');

    // When the event "onload" is triggered we can resize the image.
    img.onload = function () {
        // We create a canvas and get its context.
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // We set the dimensions at the wanted size.
        canvas.width = wantedWidth;
        canvas.height = wantedHeight;

        // We resize the image with the canvas method drawImage();
        ctx.drawImage(this, 0, 0, wantedWidth, wantedHeight);

        const dataURI = canvas.toDataURL();
        scope.$apply(function () {
            scope.$parent.loadingFile = false;
            scope.$parent.fileName = 'Loaded:' + tempName;
            scope.fileread = dataURI;
            if (scope.$parent.saveDataURI && typeof scope.$parent.saveDataURI == 'function') {
                //only for avatar
                scope.$parent.saveDataURI(dataURI);
            }
        });
    };

    // We put the Data URI in the image's src attribute
    img.src = datas;
};

app.directive('postrenderAction', postrenderAction);

/* @ngInject */
function postrenderAction($timeout) {
    // ### Directive Interface
    // Defines base properties for the directive.
    const directive = {
        restrict: 'A',
        priority: 101,
        link: link
    };
    return directive;

    // ### Link Function
    // Provides functionality for the directive during the DOM building/data binding stage.
    function link(scope, element, attrs) {
        $timeout(function () {
            scope.$evalAsync(attrs.postrenderAction);
        }, 0);
    }
}