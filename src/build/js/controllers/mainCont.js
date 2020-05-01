String.prototype.capMe = function () {
    return this.slice(0, 1).toUpperCase() + this.slice(1);
}; 
app.controller('main-cont', function ($scope, $http, $state, userFact, $log) {
    $log.debug('main controller registered!');
    $scope.user = null;
    $scope.refUsr = ()=>{
        userFact.getUser().then(r => {
            $scope.user = r.data;            
            // $scope.$apply();
        }); 
    };
    socket.on('refreshById',u=>{
        userFact.getUser().then(r => {
            $scope.user = r.data;            
            $scope.$apply();
        }); 
    });
    $scope.refUsr();
    socket.on('refresh',u=>{
        if($scope.user && u.user==$scope.user.user){
            $scope.refUsr();
        }
    });
    $scope.isActive=true;
    $scope.pokeTimer = null;
    $scope.faceOpen = false;
    const baseTitle = 'CodeMentorMatch';
    window.addEventListener('focus',function(e){
        $scope.isActive = true;
        if($scope.pokeTimer){
            clearInterval($scope.pokeTimer);
        }
        document.title = baseTitle;
    });
    window.addEventListener('blur',function(e){
        $scope.isActive = false;
    });
    const faces = ['😐','😮',];
    socket.on('chatMsgOut',(m)=>{
        //for detecting if someone has mentioned us in chat and w
        if(m.msg.includes('@'+$scope.user.user) && m.user!=$scope.user.user && !$scope.isActive){
            // $log.debug('this user was mentioned in',m)
            $scope.pokeTimer = setInterval(function(){
                $scope.faceOpen = !$scope.faceOpen;
                let pos = $scope.faceOpen?0:1;
                document.title=faces[pos]+' '+ baseTitle;
            },250);
        }
        // $log.debug('MESSAGE',m)
    });
    //used to see if this user is still online after a disconnect.
    //also used to see who ELSE is online
    socket.on('reqHeartBeat', function (sr) {
        $scope.alsoOnline = sr.filter(q => !$scope.user || !$scope.user.user || $scope.user.user != q.name).map(m => m.name);
        // $log.debug('Users that are not this user online',$scope.alsoOnline)
        // $log.debug('$state is',$state)
        if ($scope.user && $scope.user.user && $state.current.name.includes('app.')) {
            socket.emit('hbResp', {
                name: $scope.user.user
            });
        }
    });
    socket.on('disco',m=>{
        if(!m.on){
            $scope.col='div:nth-child(even){animation:none;}div:nth-child(odd){animation:none}';
        }else{
            $scope.col='div:nth-child(even){animation:huehue 4s linear 2s infinite;}div:nth-child(odd){animation:huehue 4s linear 0s infinite;}';
        }
        $scope.$apply();
    });
    // socket.on('allNames',function(r){
    // 	$scope.online = r;
    // 	$log.debug('users now online are',r)
    // })
    $scope.explMd = () => {
        bulmabox.alert('Markdown', `<div class='is-size-2'>Markdown</div>
        <hr>
        <div class='is-size-5'>What It Is</div>
        <p>Markdown is a specialized way of formatting text, used by sites like Reddit, Stack Overflow, and apps like Discord.</p>
        <hr>
        <div class='is-size-5'>What It Does</div>
        <p>It allows you to format text with stuff like <strong>bold</strong> or <em>italics</em> without the use of fancy, complex word processors.</p>
        <hr>
        <div class='is-size-4'>Commands:</div>
        <table class="table table-striped table-bordered">
        <thead>
        <tr>
        <th style="text-align:left"><strong>Markdown</strong></th>
        <th style="text-align:left"><strong>Result</strong></th>
        </tr>
        </thead>
        <tbody>
        <tr>
        <td style="text-align:left">#text, ##text,…</td>
        <td style="text-align:left">header (big text). More '#'s means smaller headers</td>
        </tr>
        <tr>
        <td style="text-align:left">*text*, _text_</td>
        <td style="text-align:left"><em>italic text</em></td>
        </tr>
        <tr>
        <td style="text-align:left">**text**,__text,__</td>
        <td style="text-align:left"><strong>bold text</strong></td>
        </tr>
        <tr>
        <td style="text-align:left">~~text~~</td>
        <td style="text-align:left"><s>strikethrough text</s> woops!</td>
        </tr>
        <tr>
        <td style="text-align:left">[link text](link url)</td>
        <td style="text-align:left"><a href="https://www.google.com">links</a></td>
        </tr>
        <tr>
        <td style="text-align:left">- item</td>
        <td style="text-align:left">- item in a bullet list</td>
        </tr>
        <tr>
        <td style="text-align:left">1. item</td>
        <td style="text-align:left">1. Item in a numbered list</td>
        </tr>
        <tr>
        <td style="text-align:left">![alt text](url “hover text”)</td>
        <td style="text-align:left"><img src="https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png" alt="alt text" title="hover text"> (The alt text is displayed if the browser can’t load the image)</td>
        </tr>
        <tr>
        <td style="text-align:left">\`text\`</td>
        <td style="text-align:left"><code>look ma, ima programmer!</code></td>
        </tr>
        </tbody>
        </table>`);
    };
    $scope.sc = '';
    $scope.seekrit = {
        code: ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a', 'Space'],
        on: false,
        asking: false,
        hist: [],
        corrNum: 0,
        whichFont: 0
    };
    $scope.fontOpts = ['aurebesh', 'tengwar quenya-1', 'klingon font', 'hieroglyphic', 'dovahkiin', 'Skyrim_Daedra'];
    const bgImg = `./img/bgs/bg${Math.ceil(Math.random()*3)}.jpg`;
    $scope.bgFull = `background:linear-gradient(rgba(0,0,0,.4),rgba(0,0,0,.4)),url('${bgImg}'); background-size:cover; background-attachment:fixed; will-change:transform; background-repeat:no-repeat`;
    document.addEventListener('scroll',function(q){
        // console.log('The User Scrolls V: border-color:skyblue;',q,window.scrollY)
        setTimeout(function(){
            const sFd = 0.5 + (0.45*window.scrollY/window.outerHeight);
            $scope.bgFull = `background:linear-gradient(rgba(0,0,0,${sFd}),rgba(0,0,0,${sFd})),url('${bgImg}'); background-size:cover; background-attachment:fixed;will-change:transform; background-repeat:no-repeat`;
            $scope.$apply();
        },100);
    });
    document.querySelector('body').addEventListener('keyup', function (e) {
        e.preventDefault();
        // $log.debug('KEY PRESSED WAS', e)
        if ($scope.seekrit.asking) {
            //asking kweschun, so ignore keypress
            return false;
        }
        const nextCode = $scope.seekrit.code[$scope.seekrit.corrNum]; //the next correct code to be entered
        if ((e.key.toLowerCase() != nextCode && e.code != nextCode)) {
            //wrong code: return false and do nuffink
            // $scope.seekrit.on=false;
            // $scope.sc = '';
            // $scope.seekrit.corrNum=0;
            return false;
        } else if ($scope.seekrit.corrNum + 1 === $scope.seekrit.code.length) {
            //at end
            $scope.seekrit.asking = true;
            bulmabox.confirm('Toggle Secret Mode', 'Are you sure you wanna toggle the Secret Mode?', function (r) {
                if (r && r !== null) {
                    $scope.seekrit.on = !$scope.seekrit.on;
                    if (!!$scope.seekrit.on) {
                        let theFont = $scope.fontOpts[$scope.seekrit.whichFont];
                        $scope.seekrit.whichFont++;
                        if ($scope.seekrit.whichFont >= $scope.fontOpts.length) {
                            $scope.seekrit.whichFont = 0;
                        }
                        $scope.sc = `*:not(.fa){font-family:${theFont},arial!important;}`;
                    } else {
                        $scope.sc = '';
                    }
                    $scope.$digest();
                } else {
                    $scope.sc = '';
                    $scope.$digest();
                }
                $scope.seekrit.asking = false;
                $scope.seekrit.corrNum = 0;
            });
        } else {
            $scope.seekrit.corrNum++;
        }
    });
}).filter('numToDate', function () {
    return function (num) {
        if (isNaN(num)) {
            return 'Invalid date!';
        }
        const theDate = new Date(num);
        // $log.debug(theDate.getMinutes())
        return `${theDate.toLocaleDateString()} ${theDate.getHours() % 12}:${theDate.getMinutes().toString().length < 2 ? '0' + theDate.getMinutes() : theDate.getMinutes()} ${theDate.getHours() < 13 ? 'AM' : 'PM'}`;
    };
});