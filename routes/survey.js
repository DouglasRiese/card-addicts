var express = require('express');
var router = express.Router();
const activityTracking = require('../utils/activity-tracking')

// -----Setup for multer file upload-----
const multer = require('multer')
// Include the code from the express-validator package
const {body, query, validationResult} = require('express-validator')
const {checkAuthentication} = require("../utils/passport-validation");
/* Configure multer to store files in the public/uploads folder
And create the function that will act as middleware.
 */
const uploader = multer({
    dest: 'public/uploads/'
})
const onlyMsgErrorFormatter = ({location, msg, param, value, nestedErrors}) => {
    return msg
}
// -----done-----

// data for validation
const formLimits = {
    minFeedbackLength: 10,
    maxFeedbackLength: 600,
    minRating: 1,
    maxRating: 10,
    ratingStep: 1
}


const gameChoices = [
    game1 = {name: 'War 2', isSelected: false},
    game2 = {name: 'Solitaire', isSelected: false},
    game3 = {name: 'Blackjack', isSelected: false},
    game4 = {name: 'None', isSelected: false}
];


/* GET Survey page. */
router.get('/', function (req, res, next) {
    checkAuthentication(req, res)

    res.render('survey', {
        title: 'Survey',
        // Pass in game choices for radio buttons
        gameChoices,
        formLimits
    });
});

/* POST Survey page. */
router.post('/',
    // Multer middle ware
    uploader.fields(),
    // After multer converts the body from binary to string do validation aka req.body
    [
        // Email validation - allow an empty field as it is optional
        body('email')
            .if(body('email').trim().notEmpty())
            .isEmail().withMessage('Please enter a valid email address'),

        // Text area validation --> length
        body('feedback').trim()
            .isLength({min: formLimits.minFeedbackLength, max: formLimits.maxFeedbackLength})
            .withMessage(`Message must be ${formLimits.minFeedbackLength} to ${formLimits.maxFeedbackLength}`),

        // Text area validation --> NO special characters except ['!', '.', ',']
        body('feedback').custom((value, {req}) => {
            const allowedChars = ['!', '.', ',']
            const feedback = req.body.feedback.trim()
            for (const char of feedback) {
                if (!(char.match(/^[a-zA-Z0-9]*$/) || allowedChars.includes(char))) {
                    throw new Error('Only "!", "." and "," are allowed as special characters')
                }
            }
            return true
        }),

        // Rating slider validation only whole numbers
        body('rating').isInt().withMessage('Rating must be a whole number, I see you hacking >( '),

        // Rating slider validation with limits
        body('rating')
            .isInt({min: formLimits.minRating, max: formLimits.maxRating})
            .withMessage(`Rating must be from ${formLimits.minRating} to ${formLimits.maxRating}`),

        // Radio button must be selected
        body('gameChoice').notEmpty().withMessage('Please select a choice'),

        // Radio button validation must be in list
        body('gameChoice').custom((value, {req}) => {
            // Search if the value submitted is in our provided list
            let isFound = false
            for (const i in gameChoices) {
                if (gameChoices[i].name === req.body.gameChoice) {
                    isFound = true
                }
            }
            if (!isFound) {
                throw new Error(`Error: "${req.body.gameChoice}" is not one of the choices`)
            }
            return true;
        }),

        // Agreed to sharing feedback checkbox
        body('agreed').notEmpty().withMessage('Must agree to sharing feedback')

    ],

    // After multer middleware is run
    (req, res) => {
        checkAuthentication(req, res)

        // Ensure your form is setup with
        // <form action="/pageHere" method="post"></form>

        // MUST compare the form data aka req.body against the rules above
        const violations = validationResult(req)
        const errorMessages = violations.formatWith(onlyMsgErrorFormatter).mapped()
        console.log('Error msgs and input tag name: \n', errorMessages)

        // If no errors clear form
        if (isEmpty(errorMessages)) {
            // add action to recent activity
            activityTracking.addItemToActivities(req, '/survey', activityTracking.actionTypes.SUBMITTED_FEEDBACK_SURVEY)

            // Render the page clearing the form
            res.render('survey', {
                title: 'Thank you!',
                formSubmitted: true,
                formLimits
            })
        } else {
            // Add property .isSelected to selected game choice
            const selectedGame = req.body.gameChoice;

            for (const i in gameChoices) {
                // if same as selected game add the property
                if (gameChoices[i].name === selectedGame) {
                    gameChoices[i].isSelected = true
                }
                // remove selected property if user changes their mind
                else {
                    gameChoices[i].isSelected = false
                }
            }

            // Render repopulating the form with the old data, and error messages
            res.render('survey', {
                title: 'Please try again...',
                submittedData: {
                    feedback: req.body.feedback,
                    rating: req.body.rating,
                    email: req.body.email
                },
                gameChoices,
                errorMessages,
                formLimits,
                formSubmitted: false
            })
        }
    })

/**
 * Returns true if the number is in the range provided, inclusive to both.
 * @param num
 * @param min
 * @param max
 * @returns {boolean}
 */
function isInRange(num, min, max) {
    return min <= num && num <= max
}


/**
 * Returns true if the object is empty.
 * @param object
 * @returns {boolean}
 */
function isEmpty(object) {
    for (const property in object) {
        if (object.hasOwnProperty(property)) {
            return false
        }
    }
    return true
}


module.exports = router;
