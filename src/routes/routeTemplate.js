const express = require('express');
const router = express.Router();

const routeExp = function (io, mongoose) {
    this.isMod = (req, res, next) => {
        // console.log('passport', req.session.passport);
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
    this.authbit = (req, res, next) => {
        if (!req.session || !req.session.passport || !req.session.passport.user) {
            //no passport userid
            res.status(401).send('err');
        } else {
            mongoose.model('User').findOne({
                _id: req.session.passport.user
            }, function (err, usr) {
                if (!err && usr && !usr.isBanned && !usr.locked) {
                    usr.lastAction = Date.now();
                    usr.save((errsv, usv) => {
                        req.user = usv;
                        next();
                    });
                } else {
                    res.status(403).send('err');
                }
            });
        }
    };

    router.get('/protected', this.authbit, (req, res, next) => {
        res.send('You are logged in!')
    })

    router.post('/protected', this.authbit, (req, res, next) => {
        res.send(`I'm a protected post route!`)
    })

    router.get('/allUsers', this.authbit, (req, res, next) => {
        if (req.user.mod) {
            return mongoose.model('User').find({}, (err, usrs) => {
                res.send(usrs)
            })
        }
        res.status(403).send('You cant view that!');
    })
    return router;
};
module.exports = routeExp;
