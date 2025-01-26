var express = require('express');
const passport = require("passport");
const passportGoogleOIDC = require("passport-google-oidc");
var router = express.Router();

// Load .env variables
require('dotenv').config();
router.get('/', function (req, res, next) {
    res.render('login', {
        title: 'Login'
    });
});


router.post('/logout', function (req, res, next) {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});
passport.use(new passportGoogleOIDC({
        clientID: process.env['GOOGLE_CLIENT_ID'], // ensure .env variables are loaded with require('dotenv').config();
        clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
        callbackURL: 'http://localhost:3001/login/verified', // Must match what is set up in Google developer page
        scope: ['profile'],
    },
    function verify(issuer, profile, cb) {
        // If profile has ID return cb(null, profile)
        console.log('issuer: ' + issuer)
        console.log('profile: ' + profile);

        if (profile.id) {
            const user = {
                name: profile.displayName,
            }
            return cb(null, user);
        }
        // Else, return error
        else {
            return cb(null, null, {message: 'No User ID'});
        }
    }));

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        cb(null, user);
    });
});


passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});


router.get('/with-google',
    passport.authenticate('google', {failureRedirect: '/login/', failureMessage: true}),
);


router.get('/verified/', passport.authenticate('google', {
        failureRedirect: '/login',
        failureMessage: true
    }),
    function (req, res, next) {
        console.log('\ngoing to /login/verified\n')
        console.log('user: ' + req.user)
        console.log('session: ' + req.session)
        for (item in req.session) {
            console.log(req.session[item]);
        }
        console.log('is auth: ' + req.isAuthenticated);
        console.log('------------------------------')

        // path to go to after they have been rejected or accepted
        res.render('login'
        )
    })

module.exports = router;