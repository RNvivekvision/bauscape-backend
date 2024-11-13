'use strict';

const { ObjectId } = require('mongodb');

const cloneDeep = (array) => {
    if (array) return JSON.parse(JSON.stringify(array))
    return array
}

// Modify Response Object
const appendExtraParams = (response, extraParams = null) => {
    if (extraParams) Object.keys(extraParams).map((item) => (response[item] = extraParams[item]));
};

// Check Duplicate Record
const checkDuplicateRecord = async (SCHEMA, id, keyValues) => {
    const query = {};

    if (id) query._id = { $ne: new ObjectId(id) };

    if (Array.isArray(keyValues) && keyValues?.length > 0) {
        const orConditions = keyValues.map(({ key, value }) => {
            const normalizedString = value?.toLowerCase().trim();
            return { [key]: { $regex: new RegExp(`^${normalizedString}$`, 'i') } };
        });

        if (orConditions?.length > 0) query.$or = orConditions;
    }

    return await SCHEMA.findOne(query);
};

/**
 * Builds an aggregation pipeline for searching, sorting, filtering (with dynamic keys), and pagination.
 * Handles ObjectId conversion for specific fields (passed dynamically), and leaves other fields as-is.
 * 
 * @param {Object} params - The parameters to configure the query.
 * @param {string} [params.search] - Search term for text-based search.
 * @param {Array<string>} [params.searchFields] - Array of field names to search within.
 * @param {string} [params.sortOrder='desc'] - The sort order ('asc' or 'desc').
 * @param {string} [params.sortBy='updatedAt'] - Field by which to sort the results.
 * @param {number} [params.page=1] - Page number for pagination (default is 1).
 * @param {number} [params.limit=10] - Number of results per page (default is 10).
 * @param {Object} [params.filter={}] - Dynamic key-value filters for filtering data.
 * @param {Array<string>} [params.objectIdFields=[]] - Array of field names that should be treated as ObjectId.
 * @returns {Array} - Aggregation pipeline for MongoDB queries.
 */

const buildDynamicAggregationPipeline = ({
    search = '',
    searchFields = [],
    sortOrder = 'desc',
    sortBy = 'updatedAt',
    page = 1,
    limit = 10,
    filter = {},
    objectIdFields = []
} = {}) => {
    const pipeline = [];

    // Add match conditions based on the filter
    if (Object.keys(filter).length > 0) {
        const matchConditions = {};

        Object.keys(filter).forEach(key => {
            const filterValue = filter[key];

            // Skip empty arrays in filter
            if (Array.isArray(filterValue) && filterValue.length > 0) {
                matchConditions[key] = {
                    $in: filterValue.map(value => {
                        const isForeignKey = objectIdFields.includes(key);

                        // Convert to ObjectId if the field is an ObjectId field and the value is valid
                        if (isForeignKey && ObjectId.isValid(value)) {
                            return new ObjectId(value);
                        } else {
                            return value;
                        }
                    })
                };
            }
            // Handle non-array values
            else if (filterValue && !Array.isArray(filterValue)) {
                const isForeignKey = objectIdFields.includes(key);
                if (isForeignKey && ObjectId.isValid(filterValue)) {
                    matchConditions[key] = new ObjectId(filterValue);
                } else {
                    matchConditions[key] = filterValue;
                }
            }
        });

        // Apply match conditions to the pipeline
        if (Object.keys(matchConditions).length > 0) {
            pipeline.push({ $match: matchConditions });
        }
    }

    // Add search conditions based on searchFields
    if (search && searchFields.length > 0) {
        const searchConditions = searchFields.map(field => ({
            [field]: { $regex: search, $options: 'i' }
        }));

        pipeline.push({
            $match: { $or: searchConditions }
        });
    }

    // Sort stage
    const validSortBy = sortBy && typeof sortBy === 'string' && sortBy.trim() !== '' ? sortBy : 'updatedAt';
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
    pipeline.push({
        $sort: { [validSortBy]: sortDirection }
    });

    // Pagination logic
    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageLimit = Math.max(1, parseInt(limit, 10));

    // Only add $skip and $limit if page is not -1
    if (page !== -1) {
        const skipRecords = (pageNumber - 1) * pageLimit;

        if (skipRecords > 0) {
            pipeline.push({ $skip: skipRecords });
        }

        pipeline.push({ $limit: pageLimit });
    }

    return pipeline;
};

module.exports = {
    cloneDeep,
    appendExtraParams,
    checkDuplicateRecord,
    buildDynamicAggregationPipeline
};
