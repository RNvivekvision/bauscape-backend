const { ObjectId } = require('mongodb');

const USERTYPE = require('../models/userTypeSchema');

const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

const { buildDynamicAggregationPipeline } = require('../lib/commonQueries');

exports.userType = {
    insertUserType: async (req, res) => {
        try {
            const {
                name,
                menu,
                organizer
            } = req.body;

            const userType = {
                name,
                menu,
                organizer
            }

            const isCreated = await USERTYPE.create(userType);

            return !isCreated || isCreated.length <= 0
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'User type created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getUserTypes: async (req, res) => {
        try {

            const { sortBy, order, search, page, limit, organizer } = req.body;

            const orchestrationPipeline = buildDynamicAggregationPipeline({
                search,
                searchFields: ['name'],
                sortOrder: order,
                sortBy,
                page,
                limit,
                filter: {},
                objectIdFields: []
            });

            if (organizer) {
                orchestrationPipeline.unshift({
                    $match: {
                        organizer: new ObjectId(organizer)
                    }
                });
            } else {
                orchestrationPipeline.unshift({
                    $match: {
                        organizer: null
                    }
                });
            }

            const transformationPipeline = [
                {
                    $match: {
                        isActive: true
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        isReadOnly: 1,
                        isActive: 1
                    }
                }
            ];

            const pipeline = [
                {
                    $facet: {
                        userTypes: [...orchestrationPipeline, ...transformationPipeline],
                        totalRecords: [
                            ...orchestrationPipeline,
                            ...transformationPipeline,
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ userTypes = [], totalRecords = 0 }] = await USERTYPE.aggregate(pipeline);

            return !userTypes
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: userTypes, totalRecords: totalRecords[0]?.count || 0, orchestrationPipeline });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getUserType: async (req, res) => {
        try {

            const { id } = req.query;

            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $project: {
                        isActive: 0,
                        createdAt: 0,
                        updatedAt: 0,
                        __v: 0
                    }
                }
            ];

            const userType = await USERTYPE.aggregate(pipeline);

            return !userType || userType.length <= 0
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: userType[0] });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateUserType: async (req, res) => {
        try {
            const { id, name, menu, organizer } = req.body;

            const userType = await USERTYPE.findOne({ _id: id });
            if (!userType) return badRequestResponse(res, { message: 'userType not found!' });

            const updatedRole = { name, menu, organizer };
            const isUpdated = await USERTYPE.findByIdAndUpdate({ _id: userType._id }, updatedRole);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'User type updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleUserTypeStatus: async (req, res) => {
        try {
            const { id } = req.query;

            const userType = await USERTYPE.findOne({ _id: id });
            if (!userType) return badRequestResponse(res, { message: 'Something went wrong!' });

            const isUserTypeStatusChanged = await USERTYPE.findByIdAndUpdate({ _id: userType._id }, { isActive: !userType.isActive });
            const statusMessage = !userType.isActive ? 'activated' : 'deactivated';

            return !isUserTypeStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `User type ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    userTypeOptions: async (req, res) => {
        try {

            const { id } = req.query;

            const pipeline = [
                {
                    $match: {
                        isActive: true
                    }
                },
                {
                    $match: {
                        organizer: id ? new ObjectId(id) : null
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: "$name"
                    }
                }
            ];

            const userTypes = await USERTYPE.aggregate(pipeline);

            return !userTypes || userTypes.length === 0
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: userTypes });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
}