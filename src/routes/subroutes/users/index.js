const express = require('express');
const router = express.Router(),
    _ = require('lodash'),
    path = require('path'),
    maxAttempts = 10,
    // mongoose = require('mongoose'),
    uuid = require('uuid'),
    passport = require('passport'),
    fs = require('fs'),
    sgMail = require('@sendgrid/mail');
let sparkyConf;
//load config info either from local file OR from environment vars
try {
    sparkyConf = JSON.parse(fs.readFileSync('./config/keys.json', 'utf-8')).keys;
} catch (error) {
    sparkyConf = {
        SPARKPOST_API_KEY: process.env.SPARKPOST_API_KEY,
        SPARKPOST_API_URL: process.env.SPARKPOST_API_URL,
        SPARKPOST_SANDBOX_DOMAIN: process.env.SPARKPOST_SANDBOX_DOMAIN,
        SPARKPOST_SMTP_HOST: process.env.SPARKPOST_SMTP_HOST,
        SPARKPOST_SMTP_PASSWORD: process.env.SPARKPOST_SMTP_PASSWORD,
        SPARKPOST_SMTP_PORT: process.env.SPARKPOST_SMTP_PORT,
        SPARKPOST_SMTP_USERNAME: process.env.SPARKPOST_SMTP_USERNAME,
        SENDGRID_API: process.env.SENDGRID_API
    };
}
sgMail.setApiKey(sparkyConf.SENDGRID_API);

const routeExp = function (io, mongoose) {
    this.isMod = (req, res, next) => {
        mongoose.model('User').findOne({
            _id: req.session.passport.user
        }, function (err, usr) {
            if (!err && usr.mod) {
                next();
            } else {
                res.status(403).send('err');
            }
        });
    };
    this.isSuperMod = (req, res, next) => {
        mongoose.model('User').findOne({
            _id: req.session.passport.user
        }, function (err, usr) {
            if (!err && usr.superMod) {
                next();
            } else {
                res.status(403).send('err');
            }
        });
    };
    this.authbit = (req, res, next) => {
        if (!req.session || !req.session.passport || !req.session.passport.user) {
            //no passport userid
            res.status(401).send('err');
        } else {
            mongoose.model('User').findOne({
                _id: req.session.passport.user
            }, function (err, usr) {
                // console.log(err, usr)
                if (!err && usr && !usr.isBanned && !usr.locked) {
                    usr.lastAction = Date.now();
                    usr.save((errsv, usv) => {
                        // truncus('after auth and LA update, usr is',usv)
                        // console.log('USER UPDATED AT', usr.lastAction)
                        const cleanUsr = JSON.parse(JSON.stringify(usv));
                        delete cleanUsr.salt;
                        delete cleanUsr.pass;
                        req.user = usv;
                        req.cleanUsr = cleanUsr;
                        next();
                    });
                } else {
                    res.status(403).send('err');
                }
            });
        }
    };
    this.findUserNames = (param) => {
        return function (req, res, next) {
            // console.log('incoming data to findUserNames', req.body, param);
            if (!req.body || !req.body[param] || !req.body[param].length) {
                return next();//cannot find param, so just run Next
            }
            const usrProms = req.body[param].map(q => {
                // console.log('Trying to find user to match:', q)
                return mongoose.model('User').findOne({
                    $or: [{ user: q }, { displayName: q }]
                });
            });
            Promise.all(usrProms).then(r => {
                // console.log(r)
                req.body.users = r.map(a => ({ user: a.user, displayName: a.displayName }));
                next();
            });
        };
    };
    //login/acct creation
    router.post('/new', function (req, res, next) {
        passport.authenticate('local-signup', function (err, user, info) {
            // truncus('err', err, 'usr', user, 'inf', info)
            if (err) {
                return res.status(400).send(err);
            }
            res.send('done');
        })(req, res, next);
    });
    router.put('/login', function (req, res, next) {
        // console.log('body', req.body);
        const logStart = Date.now();
        if (!req.body || !req.body.pass || !req.body.user) {
            // console.log('Missing info!');
            return res.status(400).send(false);
        }
        passport.authenticate('local-login', function (err, uObj, info) {
            let usr = uObj.u;
            // console.log('USER',usr,'ERR',err,'INFO',info);
            if (!info) {
                //wrong un/pwd combo
                mongoose.model('User').findOne({
                    'user': req.body.user
                }, (_err, usrwc) => {
                    if (!usrwc || usrwc.wrongAttempts < maxAttempts) {
                        return res.send(false);
                    }
                    usrwc.wrongAttempts = 0;
                    usrwc.locked = true; //too many incorrect attempts; lock account & wait for teacher;
                    refStu();
                    usrwc.save((_erru, _svu) => {
                        return res.status(403).send({ status: 'locked' });
                    });
                });
            } else {
                if (usr && !usr.isBanned && !usr.locked) {
                    req.session.passport = {
                        user: usr._id
                    };
                    const lastNews = fs.readFileSync('./news.txt', 'utf8').split(/\n/);
                    // console.log(fs.lstatSync('./news.txt'))
                    let news = null;
                    let mtime = new Date(fs.lstatSync('./news.txt').mtime).getTime();
                    // const prevLog = usr.lastLogin || 0;
                    // const prevLog = 0
                    // console.log('TIME DIF: latest news time', mtime, 'last login was', usr.oldLastLogin, 'dif is', mtime - usr.oldLastLogin, 'Now is', Date.now());
                    if ((mtime - usr.oldLastLogin) > 1000) {
                        news = lastNews.map(d => d.replace(/\r/, ''));
                    }
                    usr.pass = null;
                    usr.salt = null;
                    const clUsr = JSON.parse(JSON.stringify(usr));
                    delete clUsr.pass;
                    delete clUsr.salt;
                    // console.log('TIME FOR LOGIN ROUTE', Date.now() - logStart);
                    res.send({
                        usr: clUsr,
                        news: news,
                    });
                }
                if (!!usr.isBanned) {
                    mongoose.model('User').findOne({ user: usr.isBanned }, (errm, md) => {
                        return res.status(403).send({ status: 'banned', usr: md.displayName || md.user });
                    });
                } else if (usr.locked) {
                    return res.status(403).send({ status: 'locked' });
                }
            }
        })(req, res, next);
    });
    router.get('/logout', function (req, res, next) {
        /*this function logs out the user. It has no confirmation stuff because
        1) this is on the backend
        2) this assumes the user has ALREADY said "yes", and
        3) logging out doesn't actually really require any credentials (it's logging IN that needs em!)
        */
        console.log('usr sez bai');
        req.session.destroy();
        res.send('logged');
    });
    router.get('/google', passport.authenticate('google-signup', {
        scope: ['profile']
    }));
    router.get('/redir', passport.authenticate('google-signup', {
        failureRedirect: '../login?dup'
    }), (req, res) => {
        mongoose.model('User').findOne({
            _id: req.session.passport.user
        }, function (_err, usr) {
            res.redirect('../');
        });
    });
    //user duplicate and data stuff
    router.get('/getUsr', this.authbit, (req, res, next) => {
        res.send(req.user);
    });
    router.get('/usrData', this.authbit, function (req, res, next) {
        // console.log('asking for secure(ish) user',req.cleanUsr)
        res.send(req.cleanUsr);
    });

    router.get('/allUsrs', this.authbit, (req, res, next) => {
        let aus = Date.now();
        console.log('Start time for AllUsrs route', aus);
        mongoose.model('User').find({}, function (err, usrs) {
            const badStuff = ['msgs', 'salt', 'googleId', 'pass'],
                usrSend = _.cloneDeep(usrs).map(u => {
                    //we wanna remove all the sensitive info
                    badStuff.forEach(d => {
                        if (u[d]) {
                            u[d] = null;
                        }
                    });
                    return u;
                });
            let aue = Date.now();
            console.log('End time for AllUsrs route', aue + '. Elapsed time', aue - aus);
            res.send(usrSend);
        });
    });
    router.get('/nameOkay', function (req, res, next) {
        mongoose.model('User').find({ $or: [{ user: req.query.name }, { displayName: req.query.name }] }, function (err, user) {
            // console.log('USER CHECK', user);
            res.send(!user.length);
        });
    });
    //user profile stuff, like interests, etc.    
    router.put('/profile', this.authbit, (req, res, next) => {
        if (req.body.displayName && req.body.displayName != req.user.displayName) {
            //changed display name; we need to check if this name is okay
            mongoose.model('User').findOne({ $or: [{ user: req.body.displayName }, { displayName: req.body.displayName }] }, (err, usr) => {
                if (usr && usr.user != req.user.user) {
                    return res.status(400).send('dupDisplay');
                }
                ['company', 'projects', 'otherInfo', 'displayName', 'avatar', 'gitLink'].forEach(n => {
                    if (n == 'projects' && !req.body[n].length) {
                        return false;
                    }
                    req.user[n] = req.body[n];
                });
                req.user.save((errsv, usrsv) => {
                    res.send('refresh');
                });
            });
        } else {
            ['company', 'projects', 'otherInfo', 'displayName', 'avatar', 'gitLink'].forEach(n => {
                if (n == 'projects' && !req.body[n].length) {
                    return false;
                }
                req.user[n] = req.body[n];
            });

            req.user.save((errsv, usrsv) => {
                res.send('refresh');
            });
        }

    });
    router.put('/ava', this.authbit, (req, res, next) => {
        req.user.avatar = req.body.img;
        // console.log('USER NOW', req.body, usr);
        req.user.save((errsv, usrsv) => {
            res.send('refresh');
        });
    });
    router.get('/setEmail', authbit, (req, res, next) => {
        ///(\w+\.*)+@(\w*)(\.\w+)+/g
        if (!req.query.email || !req.query.email.match(/(\w+\.*)+@(\w+\.)+\w+/g) || (req.query.email.match(/(\w+\.*)+@(\w+\.)+\w+/g)[0].length !== req.query.email.length)) {
            res.send('err');
            return false;
        }
        mongoose.model('User').findOne({
            _id: req.session.passport.user
        }, function (err, usr) {
            usr.email = req.query.email;
            usr.save((errsv, usrsv) => {
                res.send(usrsv);
            });
        });
    });
    //mod stuff
    router.get('/users', this.authbit, this.isMod, (req, res, next) => {
        mongoose.model('User').find({}).lean().exec(function (err, usrs) {
            if (err || !usrs || !usrs.length) {
                return res.status(400).send('noUsrs');
            }
            // console.log('filtering out',req.user.user);
            const safeUsrs = usrs.filter(uf => {
                // return Math.random()>0.5
                return uf.user !== req.user.user;
            }).map(q => {
                return {
                    user: q.user,
                    displayName: q.displayName,
                    demo: q.isDemoUser,
                    interests: q.interests,
                    teaching: q.teaching,
                    mod: q.mod,
                    isBanned: q.isBanned
                };
            });
            res.send(safeUsrs);
        });
    });
    //password stuff    
    router.post('/editPwd', this.authbit, (req, res, next) => {
        mongoose.model('User').findOne({
            _id: req.session.passport.user
        }, function (err, usr) {
            if (usr && usr.correctPassword(req.body.old) && req.body.pwd == req.body.pwdDup) {
                // console.log('got correct pwd, changing!');
                usr.salt = mongoose.model('User').generateSalt();
                usr.pass = mongoose.model('User').encryptPassword(req.body.pwd, usr.salt);
                usr.save((err, usrsv) => {
                    res.send(usrsv);
                });
            } else {
                res.send('err');
            }
        });
    });
    router.put('/forgot', function (req, res, next) {
        //user enters username, requests reset email
        //this IS call-able without credentials, but
        //as all it does is send out a reset email, this
        //shouldn't be an issue
        mongoose.model('User').findOne({
            user: req.body.user
        }, function (err, usr) {
            // console.log(err, usr, req.body);
            if (!usr || err) {
                res.send('err');
                return;
            } else {
                let jrrToken = uuid.v1();
                for (let i = 0; i < 15; i++) {
                    jrrToken += uuid.v4();
                }
                if (!usr.email) {
                    res.send('err');
                    return false;
                }
                // console.log(jrrToken);
                //req.protocol,req.get('host')
                const resetUrl = req.protocol + '://' + req.get('host') + '/user/reset?key=' + jrrToken;
                usr.reset = jrrToken;
                usr.save(function () {
                    const msg = {
                        to: usr.email,
                        from: 'no-reply@codementormatch.herokuapp.com',
                        subject: 'Password Reset',
                        text: 'Someone (hopefully you!) requested a reset email for your CodeMentorMatch account. If you did not request this, just ignore this email. Otherwise, go to ' + resetUrl + '!',
                        html: 'Someone (hopefully you!) requested a reset email for your CodeMentorMatch account. <br>If you did not request this, just ignore this email.<br>Otherwise, click <a href="' + resetUrl + '">here</a>',
                    };
                    sgMail.send(msg);
                    res.end('done');
                });
            }
        });
    });
    router.get('/reset', function (req, res, next) {
        //trying to get reset page using req.query. incorrect token leads to resetFail
        const rst = req.query.key;
        if (!rst) {
            // console.log('NO KEY!');
            res.sendFile('resetFail.html', {
                root: './views'
            });
        } else {
            mongoose.model('User').findOne({
                reset: rst
            }, function (err, usr) {
                if (err || !usr) {
                    // console.log('NO USER!');
                    res.sendFile('resetFail.html', {
                        root: './views'
                    });
                }
                res.sendFile('reset.html', {
                    root: './views'
                });
            });
        }
    });
    router.get('/resetUsr', function (req, res, next) {
        // get user info by key for the reset.html page
        const rst = req.query.key;
        if (!rst) {
            res.send('err');
        } else {
            // console.log('lookin for key:', rst);
            mongoose.model('User').findOne({
                reset: rst
            }, function (err, usr) {
                if (err) {
                    res.status(400).send('err');
                } else if (!usr) {
                    res.status(400).send('noUsr');
                } else {
                    res.send(usr);
                }
            });
        }
    });
    router.put('/resetPwd/', function (req, res, next) {
        if (!req.body.acct || !req.body.pwd || !req.body.key || !req.body.pwdDup || (req.body.pwdDup != req.body.pwd)) {
            res.send('err');
        } else {
            mongoose.model('User').findOne({
                reset: req.body.key
            }, function (err, usr) {
                if (err || !usr || usr.user !== req.body.acct) {
                    res.send('err');
                } else {
                    // console.log('usr before set:', usr);
                    // usr.setPassword(req.body.pwd, function() {
                    usr.salt = mongoose.model('User').generateSalt();
                    usr.pass = mongoose.model('User').encryptPassword(req.body.pwd, usr.salt);
                    // console.log('usr after set:', usr);
                    // usr.reset = null;
                    usr.save();
                    res.send('done');
                    // });
                }
            });
        }
    });

    //Supermod routes

    router.get('/genDemoUser', this.authbit, this.isSuperMod, (req, res, next) => {
        const user = `${demoNames.adjectives[Math.floor(Math.random() * demoNames.adjectives.length)]}-${demoNames.animals[Math.floor(Math.random() * demoNames.animals.length)]}-${Math.ceil(Math.random() * 99)}`;
        req.body = {
            user: user,
            pass: Math.floor(Math.random() * 9999999999).toString(32)
        };
        passport.authenticate('local-signup', function (err, user, info) {
            // truncus('err', err, 'usr', user, 'inf', info)
            if (err) {
                return res.status(400).send(err);
            }
            mongoose.model('topic').find({}).exec((err, tps) => {
                const numTops = Math.floor(Math.random() * 0.75 * tps.length);
                tps = tps.sort(q => Math.floor(Math.random() * 3) - 1).slice(0, numTops).map(q => q.title);
                user.isDemoUser = true;
                user.interests = tps.map(q => {
                    const canTeach = Math.random() > 0.6;
                    return {
                        title: q,
                        lvl: canTeach ? Math.ceil(Math.random() * 5) + 5 : Math.floor(Math.random() * 11),
                        canTeach: canTeach
                    };
                });
                user.save((err, dsv) => {
                    res.send(`Your demo user: ${req.body.user}, password: ${req.body.pass} . WRITE THIS DOWN!`);
                });
            });
        })(req, res, next);
    });
    return router;
};

module.exports = routeExp;