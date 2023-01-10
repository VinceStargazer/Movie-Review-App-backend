const { isValidObjectId } = require('mongoose');
const PasswdResetToken = require('../models/passwdResetToken');
const { sendError } = require('../utils/helper');

exports.isValidPassResetToken = async (req, res, next) => {
    const {token, userId} = req.body;
    if (!token || !token.trim() || !userId || !isValidObjectId(userId))
        return sendError(res, "Invalid request!");
    const resetToken = await PasswdResetToken.findOne({ owner: userId });
    if (!resetToken) return sendError(res, "Unauthorized access!");
    const isMatched = await resetToken.compareToken(token);
    if (!isMatched) return sendError(res, "Unauthorized access!");

    req.resetToken = resetToken;
    next();
}