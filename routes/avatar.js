var express = require('express');
var router = express.Router();

// Import the action type
const activityTracking = require('../utils/activity-tracking')


// -----Setup for multer file upload-----
const multer = require('multer')
// Allow for file system operations
const fs = require('fs')
// Include the code from the express-validator package
const {body, query, validationResult} = require('express-validator')
const {ActionEnum} = require("../utils/activity-tracking");
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

const TWO_MB = 2 * 1024 * 1024
// Track the id for custom uploaded avatars
let nextCustomAvatarId = 100

// List of default avatars.
const avatarsList = [
    avatar0 = {
        id: 0,
        name: 'Fishing Time',
        imgPath: '/images/avatars/astronaut-fish-moon.png',
        imgDesc: 'An cartoon astronaut fishing on the Moon'
    },
    avatar1 = {
        id: 1,
        name: 'Sun Conqueror',
        imgPath: '/images/avatars/astronaut-on-sun.png',
        imgDesc: 'An cartoon astronaut sitting on the Sun'
    },
    avatar2 = {
        id: 2,
        name: 'Hello!',
        imgPath: '/images/avatars/astronaut-wave.png',
        imgDesc: 'An cartoon astronaut waving hello'
    }
]

// The selected avatar
let selectedAvatar = {
    id: avatarsList[0].id,
    name: avatarsList[0].name,
    imgPath: avatarsList[0].imgPath,
    imgDesc: avatarsList[0].imgDesc
}
router.selectedAvatar = selectedAvatar

/* GET home page. */
router.get('/', function (req, res, next) {


    checkAuthentication(req, res)


    // Load the selected Avatar
    const selectedAvatarId = req.query.avatarId;
    // If the user is changing the avatar
    if (selectedAvatarId) {
        // Search in the list for the selected avatar id
        selectedAvatar = avatarsList.find(a => a.id == selectedAvatarId);

        // add action to recent activity
        activityTracking.addItemToActivities(req, '/avatar', activityTracking.actionTypes.CHANGED_AVATAR, selectedAvatar.name)
    }

    // Check if the items need to be sorted
    const sort = req.query.sort;
    if (sort) {
        if (sort == 'ascending') {
            // sort the items ascending
            avatarsList.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort == 'descending') {
            // sort the items descending
            avatarsList.sort((a, b) => b.name.localeCompare(a.name));
        } else {
            // invalid sort do nothing
        }
    }

    // Store the new selected avatar in the path
    req.session.avatar = selectedAvatar

    res.render('avatar', {
        title: 'Avatar',
        avatarsList,
        selectedAvatar
    });
});

/* POST handler for avatar file upload */
router.post('/',

    // Multer middle ware
    uploader.fields([{name: 'customAvatarImage', maxCount: 1}]),
    // After multer converts the body from binary to string do validation aka req.body
    [

        body('customAvatarImage').custom((value, {req}) => {
            if (req.files.customAvatarImage) {
                const img = req.files.customAvatarImage[0]
                if (img.size > TWO_MB) {
                    throw new Error('File must be less than 2MB big')
                }
                if (!img.mimetype.startsWith('image/')) {
                    throw new Error('Only image files are allowed')
                }
            } else {
                throw new Error('No file chosen')
            }
            return true
        })
    ],

    // After multer middleware is run
    (req, res) => {
        checkAuthentication(req, res)
    

        // Ensure your form is setup with
        // <form action="/avatar" method="post" enctype="multipart/form-data"></form>

        // MUST compare the form data aka req.body against the rules above
        const violations = validationResult(req)
        const errorMessages = violations.formatWith(onlyMsgErrorFormatter).mapped()
        console.log('Error msgs and input tag name: \n', errorMessages)

        // form name is "customAvatarImage"

        // check if uploaded image is valid
        if (req.files.customAvatarImage) {
            const avatarImg = req.files.customAvatarImage[0]
            if (avatarImg.fieldname in errorMessages) {
                console.log('invalid input!!')
                // invalid upload delete file,
                // delete file from temp location, DO NOT move to images folder
                fs.unlinkSync(avatarImg.path)
                console.log(avatarImg.path, 'deleted due to: ',
                    errorMessages[avatarImg.fieldname])
            } else {
                console.log('uploading...')
                console.log(avatarImg)
                // good! move to images folder
                moveFile(avatarImg, `${__dirname}/../public/images/avatars/custom/`)

                // get the new path for the custom image
                const customImgPath = '/images/avatars/custom/' + avatarImg.filename + "-" + avatarImg.originalname
                console.log('--customImgPath: ', customImgPath)

                // add to avatarsList
                avatarsList.push(
                    customAvatar = {
                        id: nextCustomAvatarId++,
                        name: avatarImg.originalname,
                        imgPath: customImgPath,
                        imgDesc: 'A custom avatar image'
                    })


                // add action to recent activity
                activityTracking.addItemToActivities(req, '/avatar', activityTracking.actionTypes.UPLOAD_AVATAR, avatarImg.originalname)

                // select the new avatar
                selectedAvatar = avatarsList[avatarsList.length - 1]

                // Store the new selected avatar in the path
                req.session.avatar = selectedAvatar
            }
        }

        // Render the page with the new selected avatar and new list
        res.render('avatar', {
            title: 'Avatar',
            selectedAvatar,
            avatarsList,
            errorMessages
        })
    })


/**
 * Move the file to the specified path
 * @param tempFileInfo
 * @param newPath
 */
function moveFile(tempFileInfo, newPath) {
    newPath += tempFileInfo.filename + '-' + tempFileInfo.originalname
    fs.renameSync(tempFileInfo.path, newPath)
}


module.exports = router;
