/**
 * Checks if the user is authenticated and allows them, or redirects if not
 * @param req
 * @param res
 * @param next
 * @returns {boolean}
 */
function checkAuthentication(req, res) {
    if (req.user) {
        return true;
    } else {
        res.redirect('/login/with-google')
    }
}

module.exports = {
    checkAuthentication,
};