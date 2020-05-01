app.controller('dash-cont', ($scope, $http, $q, userFact, $log, $sce) => {
    // $log.debug("Dashboard ctrl registered")
    $scope.refUsr = $scope.$parent.refUsr;

    $scope.refUsr();
    $scope.updateTopics = () => {
        // $log.debug('Would updoot topics here! Val we passed was',e)
        return $http.put('/user/interests', $scope.$parent.user.interests)
            .then(r => {
                // $scope.$parent.$refUsr();
            });
    };
    $scope.removeSkill = skt => {
        // $log.debug('USER WISHES TO REMOVE',skt)
        $http.delete('/user/interests?t=' + skt).then(r => {
            // $scope.$parent.$refUsr();
        });
    };
    $scope.debounceTimer = null;
    $scope.saveDebounce = (q) => {
        if (!!$scope.debounceTimer) {
            clearTimeout($scope.debounceTimer);
        }
        $scope.debounceTimer = setTimeout(function () {
            $scope.saveGeneral();
        }, 500);
    };
    $scope.saveGeneral = () => {
        //general save thing for pretty much everything BUT topics
        const dispName = $scope.user.displayName;
        $http.put('/user/profile', $scope.user).catch(r => {
            //do nuffin
            if (r.data == 'dupDisplay') {
                bulmabox.alert('Duplicate Name', `Sorry, but the name ${dispName} is already in use. Please use another name.`);
                // $scope.$parent.refUsr();
            }
        });
    };
    //avy stuff
    $scope.loadFile = (o) => {
        $log.debug('loadFile sez', o);
        $scope.loadingFile = true;
        const fr = new FileReader();
    };
    $scope.loadingFile = false;
    $scope.fileName = null;
    $scope.topicToAdd = '';
    $scope.needsResize = 200;//the max pic width
    $scope.saveDataURI = (d) => {
        // $log.debug('trying to update datauri to',d)
        $scope.user.avatar = d;
        $scope.saveGeneral();
    };

    // $scope.filterMe = (query) => {
    //     const lowercaseQuery = query.toLowerCase();
    //     // $log.debug('picked topics map', $scope.pickedTopics.map(q => q.value))
    //     if (!$scope.topicObjs) {
    //         return [];
    //     }
    //     $log.debug($scope.$parent.user.interests)
    //     let tops = $scope.topicObjs.filter(topic => {
    //         // $scope.$parent
    //         return (topic.value.indexOf(lowercaseQuery) > -1);
    //     });
    //     // $log.debug('tops', tops)
    //     return tops;
    // };
    $scope.hazTopic = t => {
        // does this topic already exist?
        return $scope.topicObjsAll && $scope.topicObjsAll.length && t && $scope.topicObjsAll.find(q => q.display == t);
    };
    $scope.doNewTopic = t => {
        // $log.debug('t',t)
        $scope.addInt.isNew = t;
        $scope.topicWasClicked = true;
    };
    $scope.refTopObjs = (cb) => {
        $http.get('/topic/topic', { headers: { 'Cache-Control': 'no-cache' } }).then(r => {
            $scope.topicObjsAll = r.data.map(q => {
                return { value: q.title.toLowerCase(), display: q.title, desc: q.desc };
            });
            $log.debug('All Topic Objs now:', $scope.topicObjsAll);
            $scope.topicObjs = angular.copy($scope.topicObjsAll);
            if (cb) {
                cb();
            }
        });
    };
    $scope.refTopObjs();
    $scope.toggleNewTopicDia = () => {
        if (!$scope.newTopic.show) {
            $scope.newTopic.title = $scope.topicToAdd;
            const menuShow = document.querySelector('.md-menu-showing'),
                mdVirt = document.querySelector('md-virtual-repeat-container');
            if (menuShow) {
                menuShow.classList.remove('md-menu-showing');
            }
            if (mdVirt) {
                mdVirt.classList.add('ng-hide');
            }
        }
        $scope.newTopic.show = !$scope.newTopic.show;
    };
    $scope.createSkill = () => {
        //add a COMPLETELY NEW topic
        const nt = { title: $scope.addInt.isNew, desc: $scope.addInt.newDesc };
        $log.debug(nt);
        //first, we reget ALL topics
        $http.get('/topic/all').then(r => {
            const hazTopicAlready = r.data.find(q => q.title.toLowerCase() == nt.title.toLowerCase());
            $log.debug('hazTopicAlready', hazTopicAlready);
            let removeNewSkill = false;
            if (!!hazTopicAlready && hazTopicAlready.votes.status == 2) {
                bulmabox.alert('Skill Unacceptable', `That skill has been voted to not be acceptable by the community. Please choose another skill name`);
                removeNewSkill = true;
            } else if (!!hazTopicAlready && hazTopicAlready.votes.status == 1) {
                bulmabox.alert('Skill Already Exists', `This skill already exists! Note that multiple skills with the same name are not permitted.`);
                removeNewSkill = true;
            } else if (!!hazTopicAlready && hazTopicAlready.votes.status === 0) {
                bulmabox.alert('Skill In Voting', `Oops! It looks like someone <i>just</i> submitted this skill. <br/> Unfortunately, because they entered it first, they get to pick a description. <br> Fortunately, you can still use the skill!`);
                $scope.addInt.newDesc = hazTopicAlready.desc;
                nt.desc = hazTopicAlready.desc;
                $scope.$parent.user.interests.push(nt);
                $scope.updateTopics();
            } else {
                //skill not already recorded ()
                $http.post('/topic/topic', nt)
                    .then(r => {
                        //do nothing. We refresh in the socket response, just so EVERYONE can no we added a topic.
                        socket.emit();
                        $scope.toggleNewTopicDia();
                    })
                    .catch(e => {
                        if (e.data == 'duplicate') {
                            bulmabox.alert('Duplicate Topic', `Hey! That topic already exists!`);
                        } else{

                            bulmabox.alert('Error Creating Topic', `There was some sort of error creating your new topic! Sorry!`);
                        }
                    });

            }
        });
        return false;
    };
    let alreadyAdded = false;
    $scope.addSkill = () => {
        //NOTE: this should ONLY be run if we're adding a new skill from already-existing 'library', NOT if we're creating a completely new skill

        const skList = $scope.$parent.user.interests;
        $log.debug('MAYBE adding', $scope.addInt, 'selectedTopic', $scope.selectedTopic, 'TO', skList, 'ALL TOPIC OBJS', $scope.topicObjsAll);

        if (!!$scope.addInt.isNew) {
            //COMPLETELY new topic.
            return false;
        }
        skList.push({
            lvl: $scope.addInt.lvl || 0,
            canTeach: $scope.addInt.canTeach,
            title: $scope.selectedTopic.display
        });
        $log.debug('pushed in existing topic, sklist now', skList);
        $scope.updateTopics().then(r => {
            $scope.refUsr();
        });
    };
    //add skill
    $scope.addInt = {
        title: null,
        show: false,
        lvl: 0,
        newDesc: null,
        canTeach: false,
        isNew: false,
    };
    $scope.addIntDial = (t) => {
        $scope.refTopObjs(function () {
            $scope.addInt = {
                title: t || null,
                show: true,
                lvl: 0,
                newDesc: null,
                canTeach: false,
                isNew: false
            };

        });
    };
    $scope.deFocusSkillSearch = () => {
        setTimeout(function () {
            const el = document.getElementFromPoint($scope.mouse.x, $scope.mouse.y);
            $log.debug('new focus', el);
        }, 1);
    };
    $scope.mouse = { x: 0, y: 0 };
    document.querySelector('#skill-search').addEventListener('mousemove', (e) => {
        $scope.mouse.x = e.clientX;
        $scope.mouse.y = e.clientY;
    });
    document.querySelector('#skill-search input').addEventListener('keyup', (e) => {
        // $log.debug(e)
        if (e.key == 'Escape') {
            // $log.debug('ESCAPE PRESSED')
            $scope.clearSkillSearchBox();
            $scope.$apply();
        }
    });
    $scope.skillSearchFilter = () => {
        if (!$scope.skillSearch) {
            return [];
        }
        // $log.debug('INCHRESTING INCHRESTS',$scope.$parent.user.interests)
        return $scope.topicObjs.filter(q => {
            // $log.debug($scope.$parent.user.interests.map(q=>q),$scope.topicObjs.map(s=>s.value.toLowerCase()))
            return q.value.includes($scope.skillSearch.toLowerCase()) && (!$scope.$parent.user || !$scope.$parent.user.interests || !$scope.$parent.user.interests.length || !$scope.$parent.user.interests.find(a => a.title.toLowerCase() == q.value.toLowerCase()));
        }).map(q => {
            q.displayHL = $sce.trustAsHtml(q.display.replace(new RegExp($scope.skillSearch, 'gi'), function (a, b, c) {
                // $log.debug('a',a,'b',b,'c',c)
                return '<strong>' + a + '</strong>';
            }));
            return q;
        });
    }; 
    $scope.topicWasClicked = false;
    $scope.clearSkillSearchBox = () => {
        $log.debug('clearing Skillbox');
        $scope.skillSearch = null;
    };
    $scope.pickSkill = (s, e) => {
        e.stopPropagation();
        $scope.topicWasClicked = true;
        // $log.debug("user wants to pick skill", s)
        $scope.addInt.isNew = false;
        $scope.skillSearch = s.display;
        $scope.selectedTopic = s;
        // $scope.$digest();
    };
    socket.on('topicRef', function (o) {
        bulmabox.confirm('Topic Refresh', `One or more topics have been update. Would you like to refresh the page to make these new topics available?`, r => {
            if (!!r) {
                return $scope.refTopObjs();
            }
        });
    });


    //project stuff
    $scope.modProj = {
        show: false,
        proj: null,
        editMode: false
    };
    $scope.modProjDial = (oldP) => {
        if (!oldP) {
            oldP = { name: null, description: null, position: null };
            // $scope.$parent.user.projects.push(oldP)
            $scope.modProj.editMode = false;
        } else {
            $scope.modProj.editMode = true;
        }
        $scope.modProj.proj = oldP;
        $scope.modProj.show = true;
    };
    $scope.saveProjs = (t) => {
        const projArr = angular.copy($scope.$parent.user.projects);
        $log.debug('Saving projects. List is', projArr, 'modProj', $scope.modProj);
        if (!$scope.modProj.editMode) {
            projArr.push(angular.copy($scope.modProj.proj));
        }
        const dupName = countDups(projArr, 'name');
        if (!!dupName) {
            return bulmabox.alert('Duplicate Project Name', `The name ${dupName} is already being used! Please pick another one for this project.`);
        }
        $http.put('/user/projs', projArr)
            .then(r => {
                $scope.modProj = {
                    show: false,
                    proj: null,
                    editMode: false
                };
                // $scope.$parent.$refUsr();
            });
    };
    $scope.projView = {
        proj: null,
        show: false
    };
    $scope.viewEditProj = p => {
        $scope.projView.proj = p;
        $scope.show = true;
    };
    $scope.deleteProj = t => {
        bulmabox.confirm('Remove Project', `Are you sure you wish to remove the project ${t}?`, r => {
            if (!!r) {
                $http.delete('/user/projs', { data: { name: t }, headers: { 'Content-Type': 'application/json;charset=utf-8' } })
                    .then(r => {
                        // $scope.$parent.$refUsr();
                    });
            }
        });
    };

    //curr lesson stuffs
    $scope.countDups = countDups;
    $scope.messageTeacher = l => {
        bulmabox.confirm('Message Mentor', "Do you wish to send a message to this mentor that you wish to discuss the lesson?", function (r) {
            if (!r || r == null) {
                return false;
            }
            $http.post('/user/reqDiscussLesson?id=', l)
                .then(r => {
                    bulmabox.alert('Message Sent', `Your mentor has been notified that you wish to discuss this lesson.`);
                    // $scope.$parent.$refUsr();
                });
        });
    };
    $scope.reqEndLesson = l => {
        bulmabox.confirm('Request Lesson End', "Do you wish to notify this mentor that you wish to end the lesson?", function (r) {
            if (!r || r == null) {
                return false;
            }
            $http.post('/user/reqEndLesson?id=', l)
                .then(r => {
                    bulmabox.alert('Lesson End Requested', `Your mentor has been notified that you wish to end this lesson. <br>Please note that it is still up to them to end the lesson.`);
                    // $scope.$parent.$refUsr();
                });
        });
    };
    $scope.reportLesson = l => {
        bulmabox.confirm('Report Lesson', "Are you sure you wish to report this lesson to the moderator team? <br>Please note that abuse of the report feature in any context is grounds for account termination.", function (r) {
            if (!r || r == null) {
                return false;
            }
            $http.post('/usr/repLesson', l).then(r => {
                bulmabox.alert('Lesson Reported', `This lesson has been reported to the moderator team. In addition, the lesson has automatically been stopped, and a message has been sent to the lesson's mentor.`);
                // $scope.$parent.$refUsr();
            });
        });
    };
    $scope.getLessons = () => {
        $http.get('/user/activeLessons')
            .then(r => {
                $log.debug('ACTIVE LESSONS', r);
                $scope.activeLessons = (r && r.data) || [];
            });
    };
    $scope.getLessons();

    //review stuffs
    $scope.writeReview = async function (tch) {
        //get the review first to see if it exists.
        //note that while we could just default search by user, i wanna give people the option to hide their real usernames (i.e., search by display name)
        $scope.reviewPage.msg = '';
        $scope.reviewPage.stars = 5;
        $scope.reviewPage.currStars = 5;
        $scope.reviewPage.teacher = {
            user: tch.user,
            displayName: tch.displayName || null
        };
        $scope.reviewPage.hideName = false;

        const oldReview = await $http.get(`/user/review?tch=${(tch.displayName || tch.user)}`);
        $log.debug('OLD REVIEW', oldReview);
        if (oldReview) {
            //old review exists, so use it
            $scope.reviewPage.msg = oldReview.data.rateText;
            $scope.reviewPage.stars = oldReview.data.rateNum;
            $scope.reviewPage.currStars = oldReview.data.rateNum;
            $scope.reviewPage.hideName = oldReview.data.hideName;
        }
        $scope.reviewPage.starsArr = [0, 1, 2, 3, 4];
        $scope.reviewPage.show = true;
        $scope.$apply();
    };
    $scope.overStars = false;
    $scope.toggleOverStars = (t, s) => {
        if (t === false) {
            $scope.overStars = false;
            return false;
        }
        $scope.overStars = s;
    };
    $scope.isActiveStar = (i, s, e) => {
        if (!$scope.overStars && $scope.overStars === false) {
            //not currently mousing over
            return i < $scope.reviewPage.stars;
        }
        return $scope.overStars !== false && $scope.overStars + 1 > i;
    };
    $scope.reviewPage = {
        show: false,
        stars: 5,
        currStars: 5,
        teacher: {
            user: 'Nothere',
            displayName: 'DoesntExist'
        },
        msg: null
    };
    $scope.submitReview = () => {
        const rvwObj = {
            // rateUsr: {
            //     user: $scope.$parent.user.user,
            //     displayName: $scope.$parent.user.displayName
            // },
            rateNum: $scope.reviewPage.stars,
            hideName: !!$scope.reviewPage.hideName,
            rateText: $scope.reviewPage.msg,
            tch: {
                user: $scope.reviewPage.teacher.user,
                displayName: $scope.reviewPage.teacher.displayName
            }
        };
        $log.debug('WOULD SUBMIT', rvwObj);
        $http.put('/user/review', rvwObj).then(r => {
            $scope.reviewPage = {
                show: false,
                stars: 5,
                currStars: 5,
                teacher: {
                    user: 'Nothere',
                    displayName: 'DoesntExist'
                },
                msg: null
            };
            // $scope.$parent.$refUsr();
        });
    };
});
const countDups = (arr, p) => {
    if (!arr || !arr.length) {
        return false;
    }
    const nameCount = {};
    for (let i = 0; i < arr.length; i++) {
        if (!nameCount[arr[i][p]]) {
            nameCount[arr[i][p]] = 1;
        } else {
            return nameCount[arr[i][p]];
        }
    }
    return false;
};