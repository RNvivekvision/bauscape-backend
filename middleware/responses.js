'use strict';

const { appendExtraParams } = require("../lib/commonQueries");

const successResponse = (res, extraParams = null) => {
    const response = { isSuccess: true, status: 200 };
    appendExtraParams(response, extraParams);

    return res.json(response);
}

const badRequestResponse = (res, extraParams = null) => {
    const response = { isSuccess: false, status: 400 };
    appendExtraParams(response, extraParams);

    return res.json(response);
}

const existsRequestResponse = (res, extraParams = null) => {
    const response = { isSuccess: false, status: 403 };
    appendExtraParams(response, extraParams);

    return res.json(response);
}

const unauthorizedResponse = (res, extraParams = null) => {
    const resObject = { isSuccess: false, statusCode: 401 };
    appendExtraParams(resObject, extraParams);

    return res.json(resObject);
}

module.exports = {
    successResponse,
    badRequestResponse,
    existsRequestResponse,
    unauthorizedResponse
}