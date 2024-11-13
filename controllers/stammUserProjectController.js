const { ObjectId } = require('mongodb');

const STAMMUSERPROJECT = require('../models/stammUserProjectSchema');

const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

const { buildDynamicAggregationPipeline, } = require('../lib/commonQueries');


exports.stammUserProject = {
    insertStammUserProject: async (req, res) => {
        try {
            const {
                name,
                phone,
                address,
                organizer,
                otherContact,
                stammUser
            } = req.body;

            const stammUserProject = {
                name,
                phone,
                address,
                organizer,
                otherContact,
                stammUser
            };

            const isCreated = await STAMMUSERPROJECT.create(stammUserProject);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Project created successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getStammUserProjects: async (req, res) => {
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
                    $project: {
                        _id: 1,
                        name: 1,
                        phone: 1,
                        address: 1,
                        isActive: 1,
                        createdAt: 1
                    }
                }
            ];

            const pipeline = [
                {
                    $facet: {
                        stammUserProjectss: [...orchestrationPipeline, ...transformationPipeline],
                        totalRecords: [
                            ...transformationPipeline,
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ stammUserProjectss = [], totalRecords = 0 }] = await STAMMUSERPROJECT.aggregate(pipeline);

            return !stammUserProjectss
                ? badRequestResponse(res, { message: 'No stamm user found!' })
                : successResponse(res, { records: stammUserProjectss, totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getStammUserProject: async (req, res) => {
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

            const stammUserProject = await STAMMUSERPROJECT.aggregate(pipeline);

            return !stammUserProject
                ? badRequestResponse(res, { message: 'Organizer not found!' })
                : successResponse(res, { record: stammUserProject.length > 0 ? stammUserProject[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateStammUserProject: async (req, res) => {
        try {
            const {
                id,
                name,
                phone,
                address,
                organizer,
                otherContact,
                stammUser
            } = req.body;

            const stammUserProject = await STAMMUSERPROJECT.findOne({ _id: id });
            if (!stammUserProject) return badRequestResponse(res, { message: 'Project not found!' });

            const updatedStammUserProject = {
                name,
                phone,
                address,
                organizer,
                otherContact,
                stammUser
            };
            const isUpdated = await STAMMUSERPROJECT.findByIdAndUpdate({ _id: stammUserProject._id }, updatedStammUserProject);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Project updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleStammUserProjectStatus: async (req, res) => {
        try {
            const { id } = req.query;

            const stammUserProject = await STAMMUSERPROJECT.findOne({ _id: id });
            if (!stammUserProject) return badRequestResponse(res, { message: 'Project not found!' });

            const isStammUserProjectStatusChanged = await STAMMUSERPROJECT.findByIdAndUpdate({ _id: stammUserProject._id }, { isActive: !stammUserProject.isActive });
            const statusMessage = !stammUserProject.isActive ? 'activated' : 'deactivated';

            return !isStammUserProjectStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Project ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    projectOptions: async (req, res) => {
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
                        stammUser: new ObjectId(id)
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

            const projects = await STAMMUSERPROJECT.aggregate(pipeline);

            return !projects
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: projects });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
};
