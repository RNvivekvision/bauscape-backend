const { ObjectId } = require('mongodb');

const LAGER = require('../models/lagerSchema');

const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

const { checkDuplicateRecord, buildDynamicAggregationPipeline, } = require('../lib/commonQueries');


exports.lager = {
    insertLagar: async (req, res) => {
        try {
            const {
                name,
                city,
                organizer
            } = req.body;

            const currentYear = new Date().getFullYear().toString().substring(2);
            const maxSerialNumber = await LAGER.findOne().sort({ serialNumber: -1 }).select('serialNumber uniqueIdentifier');

            const lastThreeDigits = maxSerialNumber ? parseInt(maxSerialNumber.uniqueIdentifier.substring(3)) : 0;

            const serialNumber = maxSerialNumber ? parseInt(maxSerialNumber.serialNumber) + 1 : 1;

            const uniqueIdentifier =
                lastThreeDigits === 0 || maxSerialNumber?.uniqueIdentifier.substring(1, 3) !== currentYear
                    ? `L${currentYear}001`
                    : lastThreeDigits < 9
                        ? `L${currentYear}00${lastThreeDigits + 1}`
                        : lastThreeDigits < 99
                            ? `L${currentYear}0${lastThreeDigits + 1}`
                            : `L${currentYear}${lastThreeDigits + 1}`;

            const lager = {
                name,
                city: city,
                organizer,
                uniqueIdentifier,
                serialNumber
            };

            const isCreated = await LAGER.create(lager);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Lagar created successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getLagars: async (req, res) => {
        try {
            const { sortBy, order, search, page, limit, filters, organizer } = req.body;

            const orchestrationPipeline = buildDynamicAggregationPipeline({
                search,
                searchFields: ['name', 'uniqueIdentifier'],
                sortOrder: order,
                sortBy,
                page,
                limit,
                filter: filters,
                objectIdFields: ['city']
            });

            const transformationPipeline = [
                {
                    $match: { organizer: new ObjectId(organizer) }
                },
                {
                    $lookup: {
                        from: "cities",
                        localField: "city",
                        foreignField: "_id",
                        as: "city",
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
                    $unwind: "$city"
                },
                {
                    $set: {
                        city: "$city.name"
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        city: 1,
                        uniqueIdentifier: 1,
                        isActive: 1,
                    }
                }
            ];

            const pipeline = [
                {
                    $facet: {
                        lagers: [...orchestrationPipeline, ...transformationPipeline],
                        totalRecords: [
                            ...orchestrationPipeline,
                            ...transformationPipeline,
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ lagers = [], totalRecords = 0 }] = await LAGER.aggregate(pipeline);

            return lagers.length <= 0 || !lagers
                ? badRequestResponse(res, { message: 'No lager found!' })
                : successResponse(res, { records: lagers, totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getLagar: async (req, res) => {
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

            const lager = await LAGER.aggregate(pipeline);

            return !lager
                ? badRequestResponse(res, { message: 'Lagar not found!' })
                : successResponse(res, { record: lager.length > 0 ? lager[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateLagar: async (req, res) => {
        try {
            const {
                id,
                name,
                city,
                organizer,
                uniqueIdentifier,
                serialNumber
            } = req.body;

            const lager = await LAGER.findOne({ _id: id });
            if (!lager) return badRequestResponse(res, { message: 'Lagar not found!' });

            const updatedLagar = {
                name,
                city,
                organizer,
                uniqueIdentifier,
                serialNumber
            };
            const isUpdated = await LAGER.findByIdAndUpdate({ _id: lager._id }, updatedLagar);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Lagar updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleLagarStatus: async (req, res) => {
        try {
            const { id } = req.query;

            const lager = await LAGER.findOne({ _id: id });
            if (!lager) return badRequestResponse(res, { message: 'Lagar not found!' });

            const isLagarStatusChanged = await LAGER.findByIdAndUpdate({ _id: lager._id }, { isActive: !lager.isActive });
            const statusMessage = !lager.isActive ? 'activated' : 'deactivated';

            return !isLagarStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Lagar ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    lagerOptions: async (req, res) => {
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
                        label: {
                            $concat: ["$name", " ", "-", " ", "$uniqueIdentifier"]
                        }
                    }
                }
            ];

            const lagers = await LAGER.aggregate(pipeline);

            return !lagers
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: lagers });

        } catch (error) {
            return errorResponse(error, res);
        }
    }
};
