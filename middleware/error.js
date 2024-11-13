'use strict';

const errorResponse = (error, res) => {
    return res.json({
        isSuccess: false,
        status: 400,
        message: error.message
    });
};

module.exports = { errorResponse };