const express = require('express');
const router = express.Router();
const activityTracking = require('../utils/activity-tracking')
const {checkAuthentication} = require("../utils/passport-validation");
const {infoStore} = require("../stores/global-vars");

let draw;
let startGame;
let data;
let deckID;
let cards = [];
let playerCaptures = [];
let computerCaptures = [];
let cardsRemaining;
let result;
let noSettings = true;
let areSettings = false;

let victoryCardCount;
let startingDecks;
let gameNotOver = true

let victoryConditions = [
    condition1 = {name: 5, isSelected: false},
    condition2 = {name: 10, isSelected: false},
    condition3 = {name: 20, isSelected: false},
    condition4 = {name: 30, isSelected: false}
]
let numberOfDecks = [
    deck1 = {name: 1, isSelected: false},
    deck2 = {name: 2, isSelected: false},
    deck3 = {name: 3, isSelected: false},
]


/* POST war page. */
router.post('/', function (req, res) {
    checkAuthentication(req, res)

    gameNotOver = true

    startingDecks = req.body.numberOfDecks;
    victoryCardCount = req.body.victoryConditions;
    noSettings = false;
    areSettings = true;

    const cookieOptions = {
        path: req.baseUrl,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 60 // store cookie for 60 days
    }
    // If Remember choices was clicked save to cookie
    if (req.body.rememberChoices) {
        res.cookie('rememberChoices', {
            numberOfDecks: startingDecks,
            victoryConditions: victoryCardCount
        }, cookieOptions);
    }

    // add action to recent activity
    activityTracking.addItemToActivities(req, '/war', activityTracking.actionTypes.START_GAME, "war")

    renderPage(req, res)
})

/* GET war page. */
router.get('/', function (req, res) {
    checkAuthentication(req, res)
    
    draw = req.query.draw;
    startGame = req.query.startGame;

    if (startGame) {
        startingDecks = req.query.startDecks
        victoryCardCount = req.query.startCardCount
        noSettings = true;
        areSettings = false;
    }

    if (draw) {
        drawCard()
            .then(() =>
                // Check if game is after drawing cards but before rendering the page
                isGameOver(req)
            )
            .then(() =>
                /* This renders the page every time a card is drawn. */
                renderPage(req, res))

    } else {
        /* This renders the page when the page first loads. */
        renderPage(req, res)
    }
});

/**
 * Creates a new deck, shuffles it, and assigns the deckID to a variable
 * @returns {Promise<void>}
 */
const getJsonData = async () => {
    const res = await fetch(`${infoStore.backEndURL}/api/deck/new/draw/?count=0`);
    if (res.ok) {
        data = await res.json();
        deckID = data.deck_id;
        cardsRemaining = data.remaining / 2
    }
}

/**
 * Draws two cards at a time, and hands one to each player.
 * @returns {Promise<void>}
 */
const drawCard = async () => {
    // I draw the cards 2 at a time, and hand 1 to the computer and the player
    const res = await fetch(`${infoStore.backEndURL}/api/deck/${deckID}/draw/?count=2`)
    if (res.ok) {
        data = await res.json();

        if (data.cards[0].value > data.cards[1].value) {
            result = "Player 1 wins!"
            playerCaptures.unshift(data.cards[1], data.cards[0])
        } else if (data.cards[0].value < data.cards[1].value) {
            result = "Computer wins :("
            computerCaptures.unshift(data.cards[0], data.cards[1])
        } else {
            result = "Tie!"
        }

        cards[0] = data.cards[0].image
        cards[1] = data.cards[1].image
        cardsRemaining = data.remaining / 2
    }
}

/**
 * A simple check for whether the game is over. Performed every time cards are drawn.
 * @param req
 */
function isGameOver(req) {
    if (playerCaptures.length >= victoryCardCount) {
        result = "Player 1 has won the game!"
        gameNotOver = false
        // add action to recent activity
        activityTracking.addItemToActivities(req, '/war', activityTracking.actionTypes.WON_GAME, "war")
    }
    if (computerCaptures.length >= victoryCardCount) {
        result = "The computer has won the game!"
        gameNotOver = false
        // add action to recent activity
        activityTracking.addItemToActivities(req, '/war', activityTracking.actionTypes.LOST_GAME, "war")
    }
}

/**
 * function for rendering the page to reduce the number of lines of code.
 * @param res
 */
function renderPage(req, res) {

    setChoicesFromCookie(req);

    res.render('war', {
        startDecks: numberOfDecks,
        startCards: victoryConditions,
        title: 'War',
        playerCard: cards[0],
        computerCard: cards[1],
        cssStyle: "war.css",
        cardsRemaining,
        computerCaptures,
        playerCaptures,
        result,
        noSettings,
        areSettings,
        victoryConditions,
        numberOfDecks,
        gameNotOver
    })
}

/**
 * Sets the choices for game settings loading from a cookie.
 * The settings are saved between server restarts.
 * @param req
 */
function setChoicesFromCookie(req) {
    // if cookie exists with "remember me choices"
    if (req.cookies.rememberChoices) {
        // Set which victory condition is selected by default
        for (let i in victoryConditions) {
            victoryConditions[i].isSelected = victoryConditions[i].name === req.cookies.rememberChoices.victoryConditions;
        }

        // Set which number of decks is selected by default
        for (let i in numberOfDecks) {
            numberOfDecks[i].isSelected = numberOfDecks[i].name === req.cookies.rememberChoices.numberOfDecks;
        }
    }
}

getJsonData();

module.exports = router;
