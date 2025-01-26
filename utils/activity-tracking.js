/* how to use...

const activityTracking = require('../utils/activity-tracking')

// add action to recent activity
activityTracking.addItemToActivities(req,'/survey', activityTracking.actionTypes.UPLOAD, "img-name")

*/

// Track the ID of each item added
let activityIDStart = 1;
let activityIDNext = activityIDStart;

// The name of the main category inside session
const activityCategoryName = 'activity'

// The different action types
const actionTypes = {
    UPLOAD_AVATAR: 'Upload',
    CHANGED_AVATAR: 'Changed Avatar',
    START_GAME: 'Start Game',
    WON_GAME: 'Won Game',
    LOST_GAME: 'Lost Game',
    SUBMITTED_FEEDBACK_SURVEY: 'Submitted Feedback Survey'
}

/**
 * Gets the action message for the provided type, using the value provided.
 * @param action The actionType
 * @param value The value to put in the message
 * @returns {string}
 */
function getActionMessage(action, value) {
    let returnMessage = "";
    switch (action) {
        case actionTypes.UPLOAD_AVATAR:
            returnMessage = `Uploaded avatar of image "${value}"`
            break
        case actionTypes.CHANGED_AVATAR:
            returnMessage = `Changed avatar to image "${value}"`
            break
        case actionTypes.START_GAME:
            returnMessage = `Started game of ${value}`
            break;
        case actionTypes.WON_GAME:
            returnMessage = `Won game of ${value}!`
            break;
        case actionTypes.LOST_GAME:
            returnMessage = `Lost game of ${value}`
            break;
        case actionTypes.SUBMITTED_FEEDBACK_SURVEY:
            returnMessage = `Submitted Feedback Survey`
            break;
        default:
            returnMessage = 'Error: Unrecognized activity'
            break;
    }
    return returnMessage;
}


/**
 * Add an item to activities list inside req.session
 * @param req The reqest object
 * @param page The page name e.g. '/survey'
 * @param actionType Action type enum from this file
 * @param value Value to put in the message
 */
function addItemToActivities(req, page, actionType, value) {
    // add activity main category if not present
    if (!req.session[activityCategoryName]) {
        req.session[activityCategoryName] = {}
    }

    // A template activity to set values in
    const tempDate = new Date();
    const tempActivity = {
        // adjust the month by one because zero based (Jan = 0)
        date: tempDate.getFullYear() + '-' + (tempDate.getMonth() + 1) + '-' + tempDate.getDate(),
        // ternary statement to handle the bug if the minute is '2' then hh:m 12:2 would be displayed instead of 12:02
        time: tempDate.getHours() + ':' +
            (tempDate.getMinutes() > 9 ? tempDate.getMinutes() : '0' + tempDate.getMinutes()) + ":" +
            (tempDate.getSeconds() > 9 ? tempDate.getSeconds() : '0' + tempDate.getSeconds()),
        page: '/replace-me',
        action: 'replace me with getActionMessage()'
    }
    tempActivity.page = page
    tempActivity.action = getActionMessage(actionType, value)

    // add new value to session
    addToSession(req.session[activityCategoryName], activityIDNext, 'date', tempActivity.date)
    addToSession(req.session[activityCategoryName], activityIDNext, 'time', tempActivity.time)
    addToSession(req.session[activityCategoryName], activityIDNext, 'page', tempActivity.page)
    addToSession(req.session[activityCategoryName], activityIDNext, 'action', tempActivity.action)
    activityIDNext++;
}


/**
 * Add key value pair to the category in jsonObject
 * Put 'null' for category to not use it.
 * @param jsonObject
 * @param category
 * @param key
 * @param value
 */
function addToSession(jsonObject, category, key, value) {
    // if category is not null
    if (category) {
        // if category does not exist add it
        if (!jsonObject[category]) {
            jsonObject[category] = {}
        }
        // add key to it
        jsonObject[category][key] = value
    } else {
        // add key to it
        jsonObject[key] = value
    }
}


// Export the enum and the functions
module.exports = {
    actionTypes,
    activityCategoryName,
    activityIDNext,
    addItemToActivities
};
