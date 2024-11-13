const { ObjectId } = require('mongodb');

const STAMMUSERDOCUMENT = require('../models/stammUserDocumentSchema');

const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

const { buildDynamicAggregationPipeline, } = require('../lib/commonQueries');


exports.stammUserDocument = {
    insertStammUserDocument: async (req, res) => {
        try {
            const {
                name,
                type,
                project,
                document,
                stammUser
            } = req.body;

            const stammUserDocument = {
                name,
                type,
                project,
                document: req.file?.filename,
                stammUser
            };

            const isCreated = await STAMMUSERDOCUMENT.create(stammUserDocument);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Document created successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getStammUserDocuments: async (req, res) => {
        try {
            const { sortBy, order, search, page, limit, filters = {}, stammUser } = req.body;

            const orchestrationPipeline = buildDynamicAggregationPipeline({
                search,
                searchFields: ['name'],
                sortOrder: order,
                sortBy,
                page,
                limit,
                filter: filters,
                objectIdFields: []
            });

            const transformationPipeline = [
                {
                    $match: {
                        stammUser: new ObjectId(stammUser)
                    }
                },
                {
                    $lookup: {
                        from: "stammuserprojects",
                        localField: "project",
                        foreignField: "_id",
                        as: "project",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    name: 1
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: "$project",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $set: {
                        project: {
                            $ifNull: ["$project.name", "N/A"]
                        }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        type: 1,
                        project: 1,
                        document: 1,
                        isActive: 1,
                        createdAt: 1
                    }
                }
            ];

            const pipeline = [
                {
                    $facet: {
                        stammUserDocuments: [...orchestrationPipeline, ...transformationPipeline],
                        totalRecords: [
                            ...transformationPipeline,
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ stammUserDocuments = [], totalRecords = 0 }] = await STAMMUSERDOCUMENT.aggregate(pipeline);

            return stammUserDocuments.length <= 0 || !stammUserDocuments
                ? badRequestResponse(res, { message: 'No stamm user found!' })
                : successResponse(res, { records: stammUserDocuments, totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getStammUserDocument: async (req, res) => {
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

            const stammUserDocument = await STAMMUSERDOCUMENT.aggregate(pipeline);

            return !stammUserDocument
                ? badRequestResponse(res, { message: 'Organizer not found!' })
                : successResponse(res, { record: stammUserDocument.length > 0 ? stammUserDocument[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleStammUserDocumentStatus: async (req, res) => {
        try {
            const { id } = req.query;

            const stammUserDocument = await STAMMUSERDOCUMENT.findOne({ _id: id });
            if (!stammUserDocument) return badRequestResponse(res, { message: 'Project not found!' });

            const isStammUserDocumentStatusChanged = await STAMMUSERDOCUMENT.findByIdAndUpdate({ _id: stammUserDocument._id }, { isActive: !stammUserDocument.isActive });
            const statusMessage = !stammUserDocument.isActive ? 'activated' : 'deactivated';

            return !isStammUserDocumentStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Document ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
};
