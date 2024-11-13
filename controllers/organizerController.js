const { ObjectId } = require('mongodb');
const nodemailer = require('nodemailer');
const ejs = require('ejs');

const ORGANIZER = require('../models/organizerSchema');
const USERTYPE = require('../models/userTypeSchema');
const PACKAGE = require('../models/packageSchema');
const DESIGNATION = require('../models/designationSchema');

const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

const { checkDuplicateRecord, buildDynamicAggregationPipeline, } = require('../lib/commonQueries');

const { generateRandomToken } = require('../middleware/auth');

const mail = process.env.MAIL;
const secretMail = process.env.MAIL_SECRET;
const secretMailHost = process.env.MAIL_HOST;
const secretMailPort = process.env.MAIL_PORT;
const clientURI = process.env.CLIENT_URI;

exports.organizer = {
    insertOrganizer: async (req, res) => {
        try {
            const {
                firstName,
                lastName,
                company,
                email,
                phone,
                address,
                userType,
                organizer,
                package,
                designation,
                employeeType,
                holiday,
                userLimit,
                workType,
                weeklyWorkHours,
                isImmutable
            } = req.body;

            if (organizer) {
                const existingOrganizer = await ORGANIZER.findOne({ _id: organizer });

                if (!existingOrganizer) {
                    return badRequestResponse(res, { message: 'Organizer not found!' });
                }

                const { userLimit: existingUserLimit } = existingOrganizer;

                const currentUsersCount = await ORGANIZER.countDocuments({ organizer });

                if (currentUsersCount >= existingUserLimit) {
                    return badRequestResponse(res, { message: 'User limit exceeded for this organizer.' });
                }
            }

            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(
                ORGANIZER,
                null,
                [{ key: 'email', value: email }]
            );
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Email already in use!' });

            const invitationToken = generateRandomToken();

            const organizerProfile = {
                firstName,
                lastName,
                company,
                email,
                phone,
                address,
                userType,
                organizer,
                package,
                designation,
                employeeType,
                holiday,
                userLimit,
                workType,
                weeklyWorkHours,
                isImmutable,
                invitationToken,
                invitationExpiryTime: new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
            };

            const isCreated = await ORGANIZER.create(organizerProfile);

            if (!isCreated) return badRequestResponse(res, { message: 'Something went wrong!' });

            if (!organizer) {
                const organizerMenu = await PACKAGE.aggregate([
                    {
                        $match: { _id: new ObjectId(package) },
                    },
                    {
                        $lookup: {
                            from: 'menus',
                            localField: 'menu',
                            foreignField: '_id',
                            as: 'menus',
                        },
                    },
                    {
                        $unwind: '$menus',
                    },
                    {
                        $addFields: {
                            'menus.permissions': {
                                hasAccess: true,
                                canCreate: true,
                                canUpdate: true,
                                canDelete: true,
                            },
                        },
                    },
                    {
                        $addFields: {
                            'menus.children': {
                                $map: {
                                    input: '$menus.children',
                                    as: 'child',
                                    in: {
                                        menu: '$$child._id',
                                        permissions: {
                                            hasAccess: true,
                                            canCreate: true,
                                            canUpdate: true,
                                            canDelete: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    {
                        $group: {
                            _id: '$_id',
                            menus: {
                                $push: {
                                    menu: '$menus._id',
                                    permissions: '$menus.permissions',
                                    children: '$menus.children',
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            menus: 1,
                        },
                    },
                ]);

                const organizerUserType = await USERTYPE.create({
                    name: 'Organizer Admin',
                    menu: organizerMenu[0]?.menus,
                    organizer: isCreated._id,
                    isReadOnly: true
                });

                await DESIGNATION.create({
                    name: 'Organizer User',
                    organizer: isCreated._id
                });

                await ORGANIZER.findByIdAndUpdate({ _id: isCreated._id }, { organizer: isCreated._id, userType: organizerUserType?._id });
            }

            const emailBody = await ejs.renderFile('./templates/welcome.ejs', { clientURI, user: organizerProfile, userId: isCreated._id, token: invitationToken });

            const transporter = nodemailer.createTransport({
                host: secretMailHost,
                port: secretMailPort,
                secure: true,
                auth: {
                    user: mail,
                    pass: secretMail,
                },
            });

            await transporter.sendMail({
                from: `BFD GmbH <${mail}>`,
                to: organizerProfile.email,
                subject: 'Welcome to BFD GmbH',
                html: emailBody
            });

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'User created and Invitation sent successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getOrganizers: async (req, res) => {
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
                    $match: {
                        $expr: {
                            $cond: {
                                if: { $ne: [organizer, null] },
                                then: { $eq: ["$organizer", new ObjectId(organizer)] },
                                else: { $eq: ["$_id", "$organizer"] }
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: "packages",
                        localField: "package",
                        foreignField: "_id",
                        as: "package",
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
                    $unwind: "$package"
                },
                {
                    $set: {
                        package: "$package.name"
                    }
                },
                {
                    $lookup: {
                        from: "usertypes",
                        localField: "userType",
                        foreignField: "_id",
                        as: "userType",
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
                    $unwind: "$userType"
                },
                {
                    $set: {
                        userType: "$userType.name"
                    }
                },
                {
                    $lookup: {
                        from: "designations",
                        localField: "designation",
                        foreignField: "_id",
                        as: "designation",
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
                        path: "$designation",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $set: {
                        designation: { $ifNull: ["$designation.name", null] }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        company: 1,
                        firstName: 1,
                        lastName: 1,
                        email: 1,
                        phone: 1,
                        package: 1,
                        organizer: 1,
                        designation: 1,
                        employeeType: 1,
                        holiday: 1,
                        workType: 1,
                        weeklyWorkHours: 1,
                        isImmutable: 1,
                        isInitialSignIn: 1,
                        userType: 1,
                        userLimit: 1,
                        profilePicture: 1,
                        address: 1,
                        status: 1,
                        isActive: 1
                    }
                }
            ];

            const pipeline = [
                {
                    $facet: {
                        organizers: [...orchestrationPipeline, ...transformationPipeline],
                        totalRecords: [
                            ...orchestrationPipeline,
                            ...transformationPipeline,
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ organizers = [], totalRecords = 0 }] = await ORGANIZER.aggregate(pipeline);

            return !organizers
                ? badRequestResponse(res, { message: 'No organizers found!' })
                : successResponse(res, { records: organizers, totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getOrganizer: async (req, res) => {
        try {

            const { id } = req.query;

            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $project: {
                        password: 0,
                        invitationToken: 0,
                        invitationExpiryTime: 0,
                        status: 0,
                        resetPasswordOTP: 0,
                        resetPasswordOTPExpiryTime: 0,
                        resetPasswordToken: 0,
                        resetPasswordTokenExpiryTime: 0,
                        createdAt: 0,
                        updatedAt: 0,
                        __v: 0
                    }
                }
            ];

            const organizer = await ORGANIZER.aggregate(pipeline);

            return !organizer
                ? badRequestResponse(res, { message: 'Organizer not found!' })
                : successResponse(res, { record: organizer.length > 0 ? organizer[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateOrganizer: async (req, res) => {
        try {
            const {
                id,
                firstName,
                lastName,
                company,
                email,
                phone,
                address,
                userType,
                organizer,
                package,
                designation,
                employeeType,
                holiday,
                userLimit,
                workType,
                weeklyWorkHours,
                isImmutable,
                profilePicture
            } = req.body;

            const organizerProfile = await ORGANIZER.findOne({ _id: id });
            if (!organizerProfile) return badRequestResponse(res, { message: 'Organizer not found!' });

            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(
                ORGANIZER,
                id,
                [
                    { key: 'email', value: email }
                ]
            );
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Email already in use!' });

            const updatedOrganizer = {
                firstName,
                lastName,
                company,
                email,
                phone,
                address,
                userType,
                organizer,
                package,
                designation: designation === null || designation === 'null' ? null : new ObjectId(designation),
                employeeType,
                holiday,
                userLimit,
                workType,
                weeklyWorkHours,
                isImmutable,
                isInitialSignIn: false,
                profilePicture: req.file ? req.file?.filename : profilePicture
            };

            const isUpdated = await ORGANIZER.findByIdAndUpdate({ _id: organizerProfile._id }, updatedOrganizer);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Organizer updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleOrganizerStatus: async (req, res) => {
        try {
            const { id } = req.query;

            const organizer = await ORGANIZER.findOne({ _id: id });
            if (!organizer) return badRequestResponse(res, { message: 'User not found!' });

            const isUserStatusChanged = await ORGANIZER.findByIdAndUpdate({ _id: organizer._id }, { isActive: !organizer.isActive, status: !organizer.isActive ? 1 : 3 });
            const statusMessage = !organizer.isActive ? 'activated' : 'deactivated';

            return !isUserStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Organizer ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    onboarding: async (req, res) => {
        try {
            const { id } = req.query;

            const organizer = await ORGANIZER.findOne({ _id: id });

            return !organizer
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { isInitialSignIn: organizer.isInitialSignIn });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    organizerOptions: async (req, res) => {
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
                        organizer: new ObjectId(id)
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: {
                            $concat: ["$firstName", " ", "$lastName"]
                        }
                    }
                }
            ];

            const organizers = await ORGANIZER.aggregate(pipeline);

            return !organizers
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: organizers });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
};
