const { ObjectId } = require('mongodb');

const CITY = require('../models/citySchema');

const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

const { checkDuplicateRecord, buildDynamicAggregationPipeline } = require('../lib/commonQueries');

exports.city = {
    insertCity: async (req, res) => {
        try {
            const {
                name,
            } = req.body;

            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(CITY, null, [{ key: 'name', value: name }]);
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: `${name} city already exist!` });

            const city = {
                name,
            }

            const isCreated = await CITY.create(city);

            return !isCreated || isCreated.length <= 0
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'City created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getCities: async (req, res) => {
        try {

            const { sortBy, order, search, page, limit } = req.body;

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

            const pipeline = [
                {
                    $facet: {
                        cities: [...orchestrationPipeline],
                        totalRecords: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ cities = [], totalRecords = 0 }] = await CITY.aggregate(pipeline);

            return !cities
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cities, totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getCity: async (req, res) => {
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

            const city = await CITY.aggregate(pipeline);

            return !city || city.length <= 0
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: city[0] });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateCity: async (req, res) => {
        try {
            const { id, name } = req.body;

            const city = await CITY.findOne({ _id: id });
            if (!city) return badRequestResponse(res, { message: 'City not found!' });

            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(CITY, id, [{ key: 'name', value: name }]);
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: `${name} city already exist!` });

            const updatedCity = { name };
            const isUpdated = await CITY.findByIdAndUpdate({ _id: city._id }, updatedCity);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'City updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    cityOptions: async (req, res) => {
        try {

            const pipeline = [
                {
                    $match: {
                        isActive: true
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

            const cities = await CITY.aggregate(pipeline);

            return !cities
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cities });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
}