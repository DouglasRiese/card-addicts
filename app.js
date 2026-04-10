const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/home');
const warRouter = require('./routes/war');
const surveyRouter = require('./routes/survey');
const avatarRouter = require('./routes/avatar');
const loginRouter = require('./routes/login');
const recentActivityRouter = require('./routes/recent-activity');


const session = require('express-session')
const passport = require("passport");
const {infoStore} = require("./stores/global-vars");


const sessOptions = {
    secret: process.env.SESSION_SECRET,
    name: 'session-id',
    resave: false,
    saveUninitialized: false,
    cookie: {httpOnly: true, maxAge: 1000 * 60 * 60}, // 1 hour is 1000ms * 60 sec * 60 min
    unset: 'destroy',
}

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session(sessOptions)) // put this before passport
app.use(passport.initialize())
app.use(passport.session({}))


// Create and set the avatar object to the session if it does not exist
app.use((req, res, next) => {
    if (!req.session.avatar) {
        req.session.avatar = avatarRouter.selectedAvatar;
    }
    next();
});

app.use('/', indexRouter);
app.use('/', loginRouter);

app.use('/war', warRouter);
app.use('/survey', surveyRouter);
app.use('/avatar', avatarRouter);
app.use('/login', loginRouter);
app.use('/recent-activity', recentActivityRouter);
// Add bootswatch support
app.use('/bw', express.static(path.join(__dirname, 'node_modules/bootswatch/dist')));

/*
// Passport
passport.use(new passportGoogleOIDC({
        clientID: process.env['GOOGLE_CLIENT_ID'], // ensure .env variables are loaded with require('dotenv').config();
        clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
        callbackURL: 'http://localhost:3001/login/verified', // Must match what is set up in Google developer page
        scope: ['profile'],
    },
    function verify(issuer, profile, cb) {
        // If profile has ID return cb(null, profile)
        console.log('issuer: ' + issuer)
        console.log('profile: ' + profile)
        // return cb(null, profile)

        if (profile.id) {
            const user = {
                id: profile.id,
                displayName: profile.displayName,
            }
            return cb(null, user);
        }
        // Else, return error
        else {
            return cb(null, null, {message: 'No User ID'});
        }
    }));

// Serialize user for the session
passport.serializeUser((user, cb) => {
    process.nextTick(() => {
        cb(null, {
            id: user.id,
            displayName: user.displayName,
            email: user.email
        });
    });
});

// Deserialize user from the session
passport.deserializeUser((user, cb) => {
    process.nextTick(() => {
        return cb(null, user);
    });
});


app.get('/login/with-google',
    passport.authenticate('google', {failureRedirect: '/login', failureMessage: true}),
    function (req, res) {
        res.redirect('/');
    });


app.get('/login/verified/',
    function (req, res, next) {
        console.log('\ngoing to /login/verified')
        // console.log(res.user)
        console.log('-----------------------------')
        console.log('error: ' + req.query.error)
        console.log('state: ' + req.query.state)
        console.log('scope: ' + req.query.scope)
        console.log('authuser: ' + req.query.authuser)
        console.log('user: ' + req.user)
        console.log('code: ' + req.query.code)

        console.log('Authenticated User:', req.user);
        console.log('Session:', req.session);
        console.log('is auth:', req.isAuthenticated);
        console.log('-----------------------------')

        // Add is user authenticated to session


        //console.log(next.user.email)

        // path to go to after they have been rejected or accepted
        res.render('login', {
                title: "Login"
            }
        )
    })*/

// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

// error handler
app.use(function (err, req, res) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

console.log(`${infoStore.frontEndURL}`);

module.exports = app;