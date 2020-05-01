/*eslint-disable*/
const passport = require('passport'),
    GoogleStrategy = require('passport-google-oauth20').Strategy,
    LocalStrategy = require('passport-local').Strategy,
    fs = require('fs'),
    User = require('../models/users'),
    mongoose = require('mongoose');
if (!!fs.existsSync('./config/keys.json')) {
    // console.log('loading keys from local file')
    keys = JSON.parse(fs.readFileSync('./config/keys.json', 'utf-8'));
    console.log("keys loaded from file! (No, you can't see them >:(  )")
} else {
    // console.log('loading keys from environment vars')
    keys = {
        google:{
            clientID:process.env.googleId,
            secret:process.env.clientSecret
        }
    }
}
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id).then((user) => {
        done(null, user);
    });
});

//begin Google
passport.use('google-signup',
    new GoogleStrategy({
        // options for google strategy
        clientID: keys.google.clientID,
        clientSecret: keys.google.clientSecret,
        callbackURL: '/user/googleRedir',
        userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
        passReqToCallback: true,
    }, (request, accessToken, refreshToken, profile, done) => {
        User.findOne({
            googleId: profile.id
        }).then((currentUser) => {
            //first we check if this google user is already recorded
            if (currentUser) {
                // console.log('user is: ', currentUser);
                //ERROR GENERATION!
                currentUser.lastLogin = Date.now();
                currentUser.save((lle, lls) => {
                    done(null, lls);
                })
            } else {
                // if not, create user in our db
                new User({
                    googleId: profile.id,
                    user: profile.displayName,
                    avatar: profile.photos[0] && profile.photos[0].value || null,
                    ints: [0, 0, 0, 0, 0, 0]
                }).save().then((newUser) => {
                    // console.log('created new user: ', newUser);
                    done(null, newUser);
                });
            }
        });
    })
);
//end Google

//local
passport.use('local-signup', new LocalStrategy({
        usernameField: 'user',
        passwordField: 'pass',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
    function (req, user, pass, done) {
        User.findOne({
            'user': user
        }, function (err, usrFnd) {
            if(usrFnd){
                console.log('triggered duplicate response, NOT new usr')
                return done('duplicate',false)
            }else{
                console.log('triggered new user (NOT duplicate)')
                let newUser = new User();
                // set the user's local credentials
                newUser.user = user;
                newUser.salt = mongoose.model('User').generateSalt();
                newUser.pass = mongoose.model('User').encryptPassword(req.body.pass, newUser.salt)
                newUser.ints = [0, 0, 0, 0, 0, 0];
                // save the user
                newUser.save(function (err) {
                    if (err)
                    throw err;
                    return done(null, newUser);
                });
            }
        });
    }
));

passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'user',
        passwordField: 'pass',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
    function (req, user, pass, done) { // callback with email and password from our form
        // console.log('DATA :', user, pass)
        User.findOne({
            'user': user
        }, function (err, usrFnd) {
            // console.log('err from findone?',err||'none!')
            // console.log('Result of findone',err,usrFnd)
            // if there are any errors, return the error before anything else
            if (err) {
                return done(err, false, false);
            }
            // login problems!
            //note that these both return the wrong "combo" msg (i.e., wrong pwd+un combo)
            if (!usrFnd) {
                console.log('User not f ound!', req.body)
                return done(null, false, false);
            } else if (!usrFnd.correctPassword(pass)) {
                usrFnd.wrongAttempts++;
                usrFnd.save((errsv, usv) => {
                    console.log('Wrong pwd!', req.body)
                    return done(null, false, false);
                });
            } else {
                //all correct!
                usrFnd.wrongAttempts = 0;
                let oldLastLogin = usrFnd.lastLogin ||0;
                usrFnd.lastLogin = Date.now();
                usrFnd.save((errsv, usv) => {
                    // all is well, return successful user
                    usv.oldLastLogin = oldLastLogin;
                    return done(null, {u:usv,oll:oldLastLogin}, true);
                });
            }
        });

    }));