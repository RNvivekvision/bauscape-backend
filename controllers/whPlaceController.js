const { ObjectId } = require('mongodb');

const WHPLACE = require('../models/whPlaceSchema');

const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

const { checkDuplicateRecord, buildDynamicAggregationPipeline, } = require('../lib/commonQueries');


exports.whPlace = {
    insertWHPlace: async (req, res) => {
        try {
            const {
                lager,
                city,
                rackSelfNumber,
                rackNumber,
                organizer
            } = req.body;

            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(
                WHPLACE,
                null,
                [
                    { key: 'rackNumber', value: rackNumber }
                ]
            );
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Rack number already in use!' });

            const currentYear = new Date().getFullYear().toString().substring(2);
            const maxSerialNumber = await WHPLACE.findOne().sort({ serialNumber: -1 }).select('serialNumber uniqueIdentifier');

            const lastThreeDigits = maxSerialNumber ? parseInt(maxSerialNumber.uniqueIdentifier.slice(-3)) : 0;

            const serialNumber = maxSerialNumber ? parseInt(maxSerialNumber.serialNumber) + 1 : 1;

            const uniqueIdentifier =
                lastThreeDigits === 0 || maxSerialNumber?.uniqueIdentifier.slice(2, 4) !== currentYear
                    ? `WH${currentYear}001`
                    : lastThreeDigits < 9
                        ? `WH${currentYear}00${lastThreeDigits + 1}`
                        : lastThreeDigits < 99
                            ? `WH${currentYear}0${lastThreeDigits + 1}`
                            : `WH${currentYear}${lastThreeDigits + 1}`;

            const whPlace = {
                serialNumber,
                uniqueIdentifier,
                lager,
                city,
                rackSelfNumber,
                rackNumber,
                organizer
            };

            const isCreated = await WHPLACE.create(whPlace);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'WH created successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getWHPlaces: async (req, res) => {
        try {

            const { search, filters, organizer } = req.body;

            const orchestrationPipeline = buildDynamicAggregationPipeline({
                search,
                searchFields: ['rackNumber', 'uniqueIdentifier'],
                page: -1,
                filter: filters,
                objectIdFields: ['lager', 'city']
            });

            const transformationPipeline = [
                {
                    $match: { isActive: true }
                },
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
                    $lookup: {
                        from: "lagers",
                        localField: "lager",
                        foreignField: "_id",
                        as: "lager",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    name: 1,
                                    uniqueIdentifier: 1
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: "$lager"
                },
                {
                    $set: {
                        lager: "$lager.name",
                        lagerUniqueIdentifire: "$lager.uniqueIdentifier"
                    }
                },
                {
                    $project: {
                        _id: 1,
                        rackSelfNumber: 1,
                        rackNumber: 1,
                        uniqueIdentifier: 1,
                        lager: 1,
                        lagerUniqueIdentifire: 1,
                        city: 1,
                        organizer: 1,
                        isActive: 1
                    }
                }
            ];

            const pipeline = [
                {
                    $facet: {
                        whPlaces: [...orchestrationPipeline, ...transformationPipeline],
                        totalRecords: [
                            ...orchestrationPipeline,
                            ...transformationPipeline,
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ whPlaces = [], totalRecords = 0 }] = await WHPLACE.aggregate(pipeline);

            return whPlaces.length <= 0 || !whPlaces
                ? badRequestResponse(res, { message: 'No wh found!' })
                : successResponse(res, { records: whPlaces, totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getWhPlace: async (req, res) => {
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

            const whPlace = await WHPLACE.aggregate(pipeline);

            return !whPlace
                ? badRequestResponse(res, { message: 'Lagar not found!' })
                : successResponse(res, { record: whPlace.length > 0 ? whPlace[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateWHPlace: async (req, res) => {
        try {
            const {
                id,
                lager,
                city,
                rackSelfNumber,
                rackNumber,
                organizer
            } = req.body;

            const whPlace = await WHPLACE.findOne({ _id: id });
            if (!whPlace) return badRequestResponse(res, { message: 'WH not found!' });

            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(
                WHPLACE,
                id,
                [
                    { key: 'rackNumber', value: rackNumber }
                ]
            );
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Rack number already in use!' });

            const updatedWHPlace = {
                lager,
                city,
                rackSelfNumber,
                rackNumber,
                organizer
            };
            const isUpdated = await WHPLACE.findByIdAndUpdate({ _id: whPlace._id }, updatedWHPlace);
            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'WH updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleLagarStatus: async (req, res) => {
        try {
            const { id } = req.query;

            const whPlace = await WHPLACE.findOne({ _id: id });
            if (!whPlace) return badRequestResponse(res, { message: 'WH not found!' });

            const isWHPlaceStatusChanged = await WHPLACE.findByIdAndUpdate({ _id: whPlace._id }, { isActive: !whPlace.isActive });
            const statusMessage = !whPlace.isActive ? 'activated' : 'deactivated';

            return !isWHPlaceStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `WH ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getWHPlaceByName: async (req, res) => {

    }
};
