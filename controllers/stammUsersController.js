const { ObjectId } = require('mongodb');

const STAMMUSER = require('../models/stammUsers');

const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

const { checkDuplicateRecord, buildDynamicAggregationPipeline, } = require('../lib/commonQueries');


exports.stammUser = {
    insertStammUser: async (req, res) => {
        try {
            const {
                firstName,
                lastName,
                company,
                email,
                phone,
                address,
                organizer,
                otherContact
            } = req.body;

            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(
                STAMMUSER,
                null,
                [{ key: 'email', value: email }]
            );

            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Email already in use!' });

            const stammUser = {
                firstName,
                lastName,
                company,
                email,
                phone,
                address,
                organizer,
                otherContact
            };

            const isCreated = await STAMMUSER.create(stammUser);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Stamm User created successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getStammUsers: async (req, res) => {
        try {
            const { sortBy, order, search, page, limit, filters = {}, organizer } = req.body;

            const orchestrationPipeline = buildDynamicAggregationPipeline({
                search,
                searchFields: ['firstName', 'lastName', 'email', 'company'],
                sortOrder: order,
                sortBy,
                page,
                limit,
                filter: filters,
                objectIdFields: []
            });

            const transformationPipeline = [
                {
                    $match: { organizer: new ObjectId(organizer) }
                },
                {
                    $project: {
                        _id: 1,
                        company: 1,
                        firstName: 1,
                        lastName: 1,
                        email: 1,
                        phone: 1,
                        address: 1,
                        isActive: 1
                    }
                }
            ];

            const pipeline = [
                {
                    $facet: {
                        stammUsers: [...orchestrationPipeline, ...transformationPipeline],
                        totalRecords: [
                            ...orchestrationPipeline,
                            ...transformationPipeline,
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ stammUsers = [], totalRecords = 0 }] = await STAMMUSER.aggregate(pipeline);

            return !stammUsers
                ? badRequestResponse(res, { message: 'No stamm user found!' })
                : successResponse(res, { records: stammUsers, totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getStammUser: async (req, res) => {
        try {

            const { id } = req.query;

            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $project: {
                        createdAt: 0,
                        updatedAt: 0,
                        __v: 0
                    }
                }
            ];

            const stammUser = await STAMMUSER.aggregate(pipeline);

            return !stammUser
                ? badRequestResponse(res, { message: 'Organizer not found!' })
                : successResponse(res, { record: stammUser.length > 0 ? stammUser[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateStammUser: async (req, res) => {
        try {
            const {
                id,
                firstName,
                lastName,
                company,
                email,
                phone,
                address,
                organizer,
                otherContact
            } = req.body;

            const stammUser = await STAMMUSER.findOne({ _id: id });
            if (!stammUser) return badRequestResponse(res, { message: 'Stamm user not found!' });

            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(
                STAMMUSER,
                id,
                [
                    { key: 'email', value: email }
                ]
            );
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Email already in use!' });

            const updatedStammUser = {
                firstName,
                lastName,
                company,
                email,
                phone,
                address,
                organizer,
                otherContact
            };
            const isUpdated = await STAMMUSER.findByIdAndUpdate({ _id: stammUser._id }, updatedStammUser);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Stamm user updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleStammUserStatus: async (req, res) => {
        try {
            const { id } = req.query;

            const stammUser = await STAMMUSER.findOne({ _id: id });
            if (!stammUser) return badRequestResponse(res, { message: 'Stamm user not found!' });

            const isStammUserStatusChanged = await STAMMUSER.findByIdAndUpdate({ _id: stammUser._id }, { isActive: !stammUser.isActive });
            const statusMessage = !stammUser.isActive ? 'activated' : 'deactivated';

            return !isStammUserStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Stamm user ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
};
