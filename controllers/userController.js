const { ObjectId } = require('mongodb');
const nodemailer = require('nodemailer');
const ejs = require('ejs');

const USER = require('../models/userSchema');

const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

const { checkDuplicateRecord, buildDynamicAggregationPipeline, } = require('../lib/commonQueries');

const { generateRandomToken } = require('../middleware/auth');

// env 
const mail = process.env.MAIL;
const secretMail = process.env.MAIL_SECRET;
const secretMailHost = process.env.MAIL_HOST;
const secretMailPort = process.env.MAIL_PORT;
const clientURI = process.env.CLIENT_URI;

exports.user = {
    insertUser: async (req, res) => {
        try {
            const {
                firstName,
                lastName,
                email,
                phone,
                address,
                userType
            } = req.body;

            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(
                USER,
                null,
                [
                    { key: 'email', value: email }
                ]
            );
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Email already in use!' });

            const invitationToken = generateRandomToken();

            const user = {
                firstName,
                lastName,
                email,
                phone,
                address,
                userType,
                invitationToken,
                invitationExpiryTime: new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
            };

            const isCreated = await USER.create(user);

            if (!isCreated) return badRequestResponse(res, { message: 'Something went wrong!' })

            const emailBody = await ejs.renderFile('./templates/welcome.ejs', { clientURI, user, userId: isCreated._id, token: invitationToken });

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
                to: user.email,
                subject: 'Willkommen in der App Welt von Welzel Bau GmbH, Wache Parkettleger GmbH und Berlin Fliesendesign BFD GmbH.',
                html: emailBody
            });

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'User created and Invitation sended successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getUsers: async (req, res) => {
        try {
            const { sortBy, order, search, page, limit, filters = {}, client } = req.body;

            const orchestrationPipeline = buildDynamicAggregationPipeline({
                search,
                searchFields: ['firstName', 'lastName', 'email'],
                sortOrder: order,
                sortBy,
                page,
                limit,
                filter: filters,
                objectIdFields: []
            });

            const transformationPipeline = [
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
                    $project: {
                        _id: 1,
                        firstName: 1,
                        lastName: 1,
                        email: 1,
                        phone: 1,
                        profilePicture: 1,
                        address: 1,
                        userType: 1,
                        status: 1,
                        isImmutable: 1,
                        isInitialSignIn: 1,
                        isActive: 1
                    }
                }
            ];

            const pipeline = [
                {
                    $facet: {
                        users: [...orchestrationPipeline, ...transformationPipeline],
                        totalRecords: [
                            ...transformationPipeline,
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ users = [], totalRecords = 0 }] = await USER.aggregate(pipeline);

            return users.length <= 0 || !users
                ? badRequestResponse(res, { message: 'No users found' })
                : successResponse(res, { records: users, totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getUser: async (req, res) => {
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

            const user = await USER.aggregate(pipeline);

            return !user
                ? badRequestResponse(res, { message: 'User not found!' })
                : successResponse(res, { record: user.length > 0 ? user[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateUser: async (req, res) => {
        try {
            const {
                id,
                firstName,
                lastName,
                email,
                phone,
                address,
                userType,
                profilePicture
            } = req.body;

            const user = await USER.findOne({ _id: id });
            if (!user) return badRequestResponse(res, { message: 'User not found!' });

            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(
                USER,
                id,
                [
                    { key: 'email', value: email }
                ]
            );
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Email already in use!' });

            const updatedUser = {
                firstName,
                lastName,
                email,
                phone,
                address,
                userType,
                isInitialSignIn: false,
                profilePicture: req.file ? req.file?.filename : profilePicture
            };

            const isUpdated = await USER.findByIdAndUpdate({ _id: user._id }, updatedUser);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'User updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleUserStatus: async (req, res) => {
        try {
            const { id } = req.query;

            const user = await USER.findOne({ _id: id });
            if (!user) return badRequestResponse(res, { message: 'User not found!' });

            const isUserStatusChanged = await USER.findByIdAndUpdate({ _id: user._id }, { isActive: !user.isActive, status: !user.isActive ? 1 : 3 });
            const statusMessage = !user.isActive ? 'activated' : 'deactivated';

            return !isUserStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `User ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    onboarding: async (req, res) => {
        try {
            const { id } = req.query;

            const user = await USER.findOne({ _id: id });

            return !user
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { isInitialSignIn: user.isInitialSignIn });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
}