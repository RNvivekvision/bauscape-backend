'use strict';

const { appendExtraParams } = require("../lib/commonQueries");

const notFoundResponse = (res, extraParams = null) => {
    const response = { isSuccess: false, statusCode: 404 };
    appendExtraParams(response, extraParams);

    return res.json(response);
};

module.exports = {
    notFoundResponse
};