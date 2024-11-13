const { ObjectId } = require('mongodb');

const USER = require('../models/userSchema');
const ORGANIZER = require('../models/organizerSchema');

const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

exports.language = {
    getLanguage: async (req, res) => {
        try {

            const { id } = req.query;

            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $project: {
                        language: 1
                    }
                }
            ];

            let language = await USER.aggregate(pipeline);

            if (language.length <= 0) language = await ORGANIZER.aggregate(pipeline);

            return !language
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { language: language[0]?.language || "" });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateLanguage: async (req, res) => {
        try {
            const { id, language } = req.body;

            let user = await USER.findOne({ _id: id });
            let isOrganizer = false;

            if (!user) {
                user = await ORGANIZER.findOne({ _id: id });
                isOrganizer = true
            }

            if (!user) return badRequestResponse(res, { message: 'User not found!' });

            let isUpdated
            if (isOrganizer) {
                isUpdated = await ORGANIZER.findOneAndUpdate(
                    { _id: user._id },
                    {
                        $set: {
                            language: language
                        }
                    }
                );
            } else {
                isUpdated = await USER.findOneAndUpdate(
                    { _id: user._id },
                    {
                        $set: {
                            language: language
                        }
                    }
                );
            }

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Language updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    }
}