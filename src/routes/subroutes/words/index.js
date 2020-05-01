const express = require('express');
const router = express.Router(),
    _ = require('lodash');


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
    router.get('/word', this.authbit, (req, res, next) => {
        if (!req.body.word || !req.body.lang) {
            return res.status(400).send('err');
        }
        mongoose.model('words').findOne({ $or: [{ fw: req.body.word, fl: req.body.lang },{ tw: req.body.word, tl: req.body.lang }] }, (err, wrd) => {
            if (err || !wrd) {
                return res.status(404).send('not found');
            }
        })
    });
    router.get('/all', this.authbit, (req, res, next) => {
        //ALL words
        if(!req.body.lang){
            return mongoose.model('words').find({}, (err, wrds) => {
                res.send(wrds);
            });
        }
        mongoose.model('words').find({})
    });
    router.post('/word', this.authbit, (req, res, next) => {
        // console.log('triggered topic add route', req.body);
        const requireds = ['fl', 'tl', 'fw', 'tw', 'pos'];
        //need a from word AND a to word

        if (!!requireds.filter(q => !req.body[q]).length) {
            return res.status(400).send('err');
        }
        mongoose.model.find({ $or: [{ tw: req.body.tw }, { fw: req.body.fw }] }, (err, wrd) => {
            if (!!wrd) {
                return res.status(400).send('duplicate');
            }
            mongoose.model('words')
        })
        // res.send('DONE')
    });
    return router;
};
module.exports = routeExp;
