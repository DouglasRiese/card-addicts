var express = require('express');
var router = express.Router();
const activityTracking = require('../utils/activity-tracking')
const {checkAuthentication} = require("../utils/passport-validation");

let activityLastFour = []
let isNoActivity = true

/* GET recent-activity page. */
router.get('/', function (req, res, next) {
    checkAuthentication(req, res)

    if (req.session[activityTracking.activityCategoryName]) {
        // The full list of all activities
        let activityFullList = req.session[activityTracking.activityCategoryName]

        // Loop through from the end, only getting the last 4 activities
        activityLastFour = []
        const listLength = Object.keys(activityFullList).length
        for (let i = listLength; i > 0 && activityLastFour.length < 4; i--) {
            activityLastFour.push(activityFullList[i])
        }
        isNoActivity = false
    } else {
        isNoActivity = true
    }

    res.render('recent-activity', {
        title: 'Recent Activity',
        // Use variable specified in activity tracking file
        activityList: activityLastFour,
        isNoActivity
    });
});

module.exports = router;