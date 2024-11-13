const { ObjectId } = require('mongodb');

const PACKAGE = require('../models/packageSchema');
const ORGANIZER = require('../models/organizerSchema');
const USERTYPE = require('../models/userTypeSchema');
const MENU = require('../models/menuSchema');

const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

const { checkDuplicateRecord, buildDynamicAggregationPipeline } = require('../lib/commonQueries');

exports.package = {
    insertPackage: async (req, res) => {
        try {
            const {
                name,
                menu
            } = req.body;

            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(PACKAGE, null, [{ key: 'name', value: name }]);
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: `${name} package already exist!` });

            const package = {
                name,
                menu
            }

            const isCreated = await PACKAGE.create(package);

            return !isCreated || isCreated.length <= 0
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Package created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getPackages: async (req, res) => {
        try {

            const { sortBy, order, search, page, limit, } = req.body;

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
                    $lookup: {
                        from: "menus",
                        localField: "menu",
                        foreignField: "_id",
                        as: "menuDetails"
                    }
                },
                {
                    $project: {
                        name: 1,
                        menu: {
                            $map: {
                                input: "$menuDetails",
                                as: "menuItem",
                                in: "$$menuItem.name"
                            }
                        },
                        isActive: 1,
                    }
                }
            ];

            const pipeline = [
                {
                    $facet: {
                        packages: [...orchestrationPipeline, ...transformationPipeline],
                        totalRecords: [
                            ...orchestrationPipeline,
                            ...transformationPipeline,
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ packages = [], totalRecords = 0 }] = await PACKAGE.aggregate(pipeline);

            return !packages
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: packages, totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getPackage: async (req, res) => {
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

            const package = await PACKAGE.aggregate(pipeline);

            return !package || package.length <= 0
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: package[0] });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updatePackage: async (req, res) => {
        try {
            const { id, name, menu } = req.body;

            const package = await PACKAGE.findOne({ _id: id });
            if (!package) return badRequestResponse(res, { message: 'Package not found!' });

            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(PACKAGE, id, [{ key: 'name', value: name }]);
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: `${name} Role already exist!` });

            const updatedPackage = { name, menu };
            const isUpdated = await PACKAGE.findByIdAndUpdate({ _id: package._id }, updatedPackage);

            const organizers = await ORGANIZER.find({ package: package._id })

            const organizerIds = organizers?.map((item) => {
                return item._id
            })

            const userTypes = await USERTYPE.find({
                organizer: { $in: organizerIds },
                name: "Organizer Admin",
            })

            const menus = await MENU.find({
                _id: { $in: menu },
            })

            const defaultPermissions = {
                hasAccess: true,
                canCreate: true,
                canUpdate: true,
                canDelete: true
            };

            const updatedUserTypeMenus = menus.map(item => {
                const children = item.children.map(child => ({
                    permissions: { ...defaultPermissions },
                    menu: child._id
                }));

                return {
                    permissions: { ...defaultPermissions },
                    menu: item._id,
                    children
                };
            });

            const updatedUserType = userTypes.map(item => ({
                id: item._id,
                name: item.name,
                menu: updatedUserTypeMenus,
                organizer: item.organizer
            }));

            updatedUserType.forEach(async (record) => {
                await USERTYPE.updateOne(
                    { _id: new ObjectId(record.id) },
                    { $set: { name: record.name, menu: record.menu, organizer: record.organizer } },
                    { upsert: false }
                );
            });

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Package updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    togglePackageStatus: async (req, res) => {
        try {
            const { id } = req.query;

            const package = await PACKAGE.findOne({ _id: id });
            if (!package) return badRequestResponse(res, { message: 'Something went wrong!' });

            const isRoleStatusChanged = await PACKAGE.findByIdAndUpdate({ _id: package._id }, { isActive: !package.isActive });
            const statusMessage = !package.isActive ? 'activated' : 'deactivated';

            return !isRoleStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Package ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    packageOptions: async (req, res) => {
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

            const packages = await PACKAGE.aggregate(pipeline);

            return !packages
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: packages });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
}