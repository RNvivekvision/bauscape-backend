const { ObjectId } = require('mongodb');

const DESIGNATION = require('../models/designationSchema');

const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

const { buildDynamicAggregationPipeline } = require('../lib/commonQueries');

exports.designation = {
    insertDesignation: async (req, res) => {
        try {
            const {
                name,
                organizer
            } = req.body;

            const isExisting = await DESIGNATION.findOne({
                name: name,
                organizer: new ObjectId(organizer),
            });

            if (isExisting) return badRequestResponse(res, { message: `${name} designation already exist!` });

            const designation = {
                name,
                organizer
            }

            const isCreated = await DESIGNATION.create(designation);

            return !isCreated || isCreated.length <= 0
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Designation created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getDesignations: async (req, res) => {
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

            const transformationPipeline = [
                {
                    $match: {
                        organizer: new ObjectId(organizer)
                    }
                },
            ];

            const pipeline = [
                {
                    $facet: {
                        designations: [...transformationPipeline, ...orchestrationPipeline],
                        totalRecords: [
                            ...transformationPipeline,
                            ...orchestrationPipeline,
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ designations = [], totalRecords = 0 }] = await DESIGNATION.aggregate(pipeline);

            return !designations
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: designations, totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getDesignation: async (req, res) => {
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

            const designation = await DESIGNATION.aggregate(pipeline);

            return !designation || designation.length <= 0
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: designation[0] });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateDesignation: async (req, res) => {
        try {
            const { id, name, organizer } = req.body;

            const designation = await DESIGNATION.findOne({ _id: id });
            if (!designation) return badRequestResponse(res, { message: 'Designation not found!' });

            const isExisting = await DESIGNATION.findOne({
                _id: id,
                name: name,
                organizer: new ObjectId(organizer),
            });

            if (isExisting) return badRequestResponse(res, { message: `${name} designation already exist!` });

            const updatedDesignations = { name, organizer };
            const isUpdated = await DESIGNATION.findByIdAndUpdate({ _id: designation._id }, updatedDesignations);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Designation updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleDesignationStatus: async (req, res) => {
        try {
            const { id } = req.query;

            const designation = await DESIGNATION.findOne({ _id: id });
            if (!designation) return badRequestResponse(res, { message: 'Something went wrong!' });

            const isRoleStatusChanged = await DESIGNATION.findByIdAndUpdate({ _id: designation._id }, { isActive: !designation.isActive });
            const statusMessage = !designation.isActive ? 'activated' : 'deactivated';

            return !isRoleStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Designation ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    designationOptions: async (req, res) => {
        try {

            const { organizer } = req.query;

            const pipeline = [
                {
                    $match: {
                        isActive: true
                    }
                },
                {
                    $match: {
                        organizer: new ObjectId(organizer)
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

            const designations = await DESIGNATION.aggregate(pipeline);

            return !designations
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: designations });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
}