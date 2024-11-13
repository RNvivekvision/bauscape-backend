const jwt = require('jsonwebtoken');

const USER = require('../models/userSchema');
const ORGANIZER = require('../models/organizerSchema');

const { unauthorizedResponse } = require('./responses');

const jwtSecretKey = process.env.JWT_SECRET_KEY;
const charactersSecretKey = process.env.CHARACTERS_SECRET_KEY;

const allowedUrls = [
    '/authentication/sign-in',
    '/authentication/set-password',
    '/authentication/request-otp',
    '/authentication/resend-otp',
    '/authentication/verify-otp',
    '/authentication/reset-password',
];

const generateAuthToken = async (user, userType) => {
    const tokenDetails = {};

    ['_id', 'company', 'firstName', 'lastName', 'email', 'phone', 'package', 'organizer', 'profilePicture'].forEach((key) => {
        if (user[key] !== undefined) {
            tokenDetails[key] = user[key];
        };
    });

    tokenDetails.permissions = userType;

    const token = jwt.sign(tokenDetails, jwtSecretKey, { algorithm: 'HS512', expiresIn: '24h' });
    return { token };
}

const generateRandomToken = (length = 32) => {
    return Array.from({ length }, () => charactersSecretKey.charAt(Math.floor(Math.random() * charactersSecretKey.length))).join('');
}

const ensureAuthorized = async (req, res, next) => {

    if (allowedUrls.includes(req.path)) return next();

    const bearerHeader = req.headers["authorization"];
    if (!bearerHeader) return unauthorizedResponse(res, { message: "Authorization header missing!" });

    const bearer = bearerHeader.split(" ");
    const bearerToken = bearer[1];

    try {
        const decoded = jwt.verify(bearerToken, jwtSecretKey);
        req.user = decoded;

        let user = await USER.findOne({ _id: decoded._id, accessToken: bearerToken })
        if (!user) user = await ORGANIZER.findOne({ _id: decoded._id, accessToken: bearerToken });

        if (!user) return unauthorizedResponse(res, { message: "Unauthorized or invalid token!" });

        next();
    } catch (error) {
        return unauthorizedResponse(res, { message: "Unauthorized or invalid token!" });
    }
};

module.exports = {
    generateAuthToken,
    generateRandomToken,
    ensureAuthorized
};
