var express = require('express');
const {checkAuthentication} = require("../utils/passport-validation");
var router = express.Router();


// Info for the featured game
const featuredGame = {
    title: 'War (1 player)',
    imgPath: '/images/cards4.jpg',
    imgDesc: `Cards`,
    link: '/war/'
}

// Info for other games to come
const gamesList = [
    solitaire = {
        title: 'Solitaire',
        imgPath: '/images/cards1.jpg',
        imgDesc: `Cards`
    },
    war2 = {
        title: 'War 2.0',
        imgPath: '/images/cards2.jpg',
        imgDesc: `Cards`
    },
    blackjack = {
        title: 'Blackjack',
        imgPath: '/images/cards3.jpg',
        imgDesc: `Cards`
    }
]


/* GET home page. */
router.get('/', function (req, res, next) {
    checkAuthentication(req, res)

    res.render('home', {
        title: 'Card Addicts',
        cssStyle: "home.css",
        featuredGame,
        gamesList,
        selectedAvatar: req.session.avatar
    });
});

module.exports = router;
