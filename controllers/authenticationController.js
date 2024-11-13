const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const ejs = require('ejs');

const USER = require('../models/userSchema');
const ORGANIZER = require('../models/organizerSchema');
const USERTYPE = require('../models/userTypeSchema');
const MENU = require('../models/menuSchema');

const { badRequestResponse, successResponse } = require('../middleware/responses');
const { generateRandomToken, generateAuthToken } = require('../middleware/auth');
const { errorResponse } = require('../middleware/error');

const mail = process.env.MAIL;
const secretMail = process.env.MAIL_SECRET;
const secretMailHost = process.env.MAIL_HOST;
const secretMailPort = process.env.MAIL_PORT;
const clientURI = process.env.CLIENT_URI;
const saltRounds = process.env.SALT_ROUNDS;

exports.authentication = {
    setPassword: async (req, res) => {
        try {
            const { id, token, password } = req.body;

            let user = await USER.findOne({ _id: id });
            let isOrganizer = false;

            if (!user) {
                user = await ORGANIZER.findOne({ _id: id });
                isOrganizer = true;
            }

            if (!user) return badRequestResponse(res, { message: 'User not found!' });
            if (user.status !== 2) return badRequestResponse(res, { message: 'Something went wrong! Please contact admin.' });
            if (user.invitationExpiryTime < new Date()) return badRequestResponse(res, { message: 'Invitation is expired! Please contact admin.' });
            if (user.invitationToken !== token) return badRequestResponse(res, { message: 'Something went wrong!' });

            if (!password) return badRequestResponse(res, { message: 'Password is required!' });

            const hashedPassword = await bcrypt.hash(password, Number(saltRounds));
            let isUpdated

            if (isOrganizer) {
                isUpdated = await ORGANIZER.findByIdAndUpdate({ _id: user._id }, { password: hashedPassword, status: 1, invitationToken: null, invitationExpiryTime: null });
            } else {
                isUpdated = await USER.findByIdAndUpdate({ _id: user._id }, { password: hashedPassword, status: 1, invitationToken: null, invitationExpiryTime: null });
            }

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Your password has been successfully updated.' });

        } catch (error) {
            return badRequestResponse(res, { message: 'Something went wrong!' });
        }
    },
    checkInvitation: async (req, res) => {
        try {
            const { id } = req.query;

            let user = await USER.findOne({ _id: id });

            if (!user) {
                user = await ORGANIZER.findOne({ _id: id });
            }

            if (!user) return badRequestResponse(res, { message: 'User not found!' });
            if (user.status === 2 && user.invitationExpiryTime > new Date()) return successResponse(res, { messageOne: 'Invitation not expired yet!', messageTwo: 'Are you sure you want to invite this user or client again?' });
            if (user.status === 2 && user.invitationExpiryTime < new Date()) return successResponse(res, { message: 'Invitation is expired.' });
            if (user.isActive === false || user.status === 1) return badRequestResponse(res, { message: 'Something went wrong!' });
            return badRequestResponse(res, { message: 'Something went wrong!' });

        } catch (error) {
            return badRequestResponse(res, { message: 'Something went wrong!' });
        }
    },
    resendInvitation: async (req, res) => {
        try {
            const { id } = req.query;

            let user = await USER.findOne({ _id: id });
            let isOrganizer = false;

            if (!user) {
                user = await ORGANIZER.findOne({ _id: id });
                isOrganizer = true;
            }

            if (!user) return badRequestResponse(res, { message: 'User not found!' });
            if (user.isActive === false || user.status === 1) return badRequestResponse(res, { message: 'Something went wrong!' });

            const invitationToken = generateRandomToken();

            let isUpdated

            if (isOrganizer) {
                isUpdated = await ORGANIZER.findByIdAndUpdate({ _id: user._id }, { invitationToken: invitationToken, invitationExpiryTime: new Date(new Date().getTime() + 24 * 60 * 60 * 1000) })
            } else {
                isUpdated = await USER.findByIdAndUpdate({ _id: user._id }, { invitationToken: invitationToken, invitationExpiryTime: new Date(new Date().getTime() + 24 * 60 * 60 * 1000) })
            }

            const emailBody = await ejs.renderFile('./templates/welcome.ejs', { clientURI, user, userId: user._id, token: invitationToken });

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
                subject: 'Welcome to BFD GmbH',
                html: emailBody
            });

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Invitation sent successfully.' });

        } catch (error) {
            return badRequestResponse(res, { message: 'Something went wrong!' });
        }
    },
    signIn: async (req, res) => {
        try {
            const { email, password } = req.body;

            let user = await USER.findOne({ email: email });
            let isOrganizer = false;

            if (!user) {
                user = await ORGANIZER.findOne({ email: email });
                isOrganizer = true;
            }

            if (!user) return badRequestResponse(res, { message: "Incorrect email or password!" });

            if (!user?.isActive) return badRequestResponse(res, { message: 'Something went wrong! Please contact admin.' });

            const userType = await USERTYPE.aggregate([
                {
                    $match: { _id: new ObjectId(user.userType) }
                },
            ]);

            const menu = await MENU.find()

            function replaceMenuNames(userType, menu) {
                // Create a map of menu IDs to names from the menu array
                const menuMap = menu.reduce((acc, menuItem) => {
                    acc[menuItem._id] = menuItem.name;
                    if (menuItem.children) {
                        menuItem.children.forEach(child => {
                            acc[child._id] = child.name;
                        });
                    }
                    return acc;
                }, {});

                // Update the names in the userType based on the menuMap
                userType.forEach(item => {
                    item.menu.forEach(menuItem => {
                        // Replace the menu ID directly with its name if it exists in menuMap
                        if (menuMap[menuItem.menu]) {
                            menuItem.menu = menuMap[menuItem.menu]; // Directly replace menu ID with the name
                        }
                        // Check children menus and update them as well
                        if (menuItem.children && menuItem.children.length > 0) {
                            menuItem.children.forEach(child => {
                                if (menuMap[child.menu]) {
                                    child.menu = menuMap[child.menu]; // Directly replace children menu IDs with names
                                }
                            });
                        }
                    });
                });

                return userType;
            }

            const updatedUserType = replaceMenuNames(userType, menu);

            const isMatched = await bcrypt.compare(password, user.password);

            if (!isMatched) return badRequestResponse(res, { message: "Incorrect email or password!" });

            const accessToken = await generateAuthToken(user, updatedUserType);

            if (isOrganizer) {
                isUpdated = await ORGANIZER.findByIdAndUpdate({ _id: user._id }, { accessToken: accessToken.token });
            } else {
                isUpdated = await USER.findByIdAndUpdate({ _id: user._id }, { accessToken: accessToken.token, });
            }

            return !accessToken
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { accessToken: accessToken.token });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    requestOTP: async (req, res) => {
        try {
            const { email } = req.body;

            let user = await USER.findOne({ email: email });
            let isOrganizer = false

            if (!user) {
                user = await ORGANIZER.findOne({ email: email });
                isOrganizer = true
            }

            if (!user) return badRequestResponse(res, { message: "User not found!" });

            if (!user.isActive) return badRequestResponse(res, { message: 'Something went wrong, Please contact admin!' });

            const otpCode = parseFloat(`${Math.ceil(Math.random() * 5 * 1000)}`.padEnd(6, '0'));
            const otpExpiryTime = new Date(new Date().getTime() + 10 * 60 * 1000);

            const transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: {
                    user: mail,
                    pass: secretMail,
                },
            });

            const emailBody = await ejs.renderFile('./templates/otp.ejs', { clientURI, user, otpCode });

            const emailSent = await transporter.sendMail({
                from: mail,
                to: user.email,
                subject: 'Reset Your Password',
                text: 'We have received your forget password request...',
                html: emailBody,
            });

            if (emailSent.accepted) {
                if (isOrganizer) {
                    await ORGANIZER.findOneAndUpdate(
                        { _id: user._id },
                        {
                            $set: {
                                resetPasswordOTP: otpCode,
                                resetPasswordOTPExpiryTime: otpExpiryTime,
                                resetPasswordToken: '',
                                resetPasswordTokenExpiryTime: null
                            }
                        }
                    );
                } else {
                    await USER.findOneAndUpdate(
                        { _id: user._id },
                        {
                            $set: {
                                resetPasswordOTP: otpCode,
                                resetPasswordOTPExpiryTime: otpExpiryTime,
                                resetPasswordToken: '',
                                resetPasswordTokenExpiryTime: null
                            }
                        }
                    );
                }
                return successResponse(res, { message: 'OTP sent to your email address, Please check your mail' });
            } else {
                return errorResponse({ message: 'Something went wrong, Please try again' }, res);
            }

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    verifyOTP: async (req, res) => {
        try {
            const { id, otp } = req.body;

            if (otp?.toString()?.length !== 6) return badRequestResponse(res, { message: 'Enter valid OTP!' });

            let user = await USER.findOne({ _id: id });
            let isOrganizer = false;

            if (!user) {
                user = await ORGANIZER.findOne({ _id: id });
                isOrganizer = true
            }

            if (!user) return badRequestResponse(res, { message: 'User not found!' });

            if (!user.resetPasswordOTP) {
                const updatedUser = { resetPasswordToken: null, resetPasswordTokenExpiryTime: null };
                let isUpdated

                if (isOrganizer) {
                    isUpdated = await ORGANIZER.findByIdAndUpdate({ _id: user._id }, updatedUser);
                } else {
                    isUpdated = await USER.findByIdAndUpdate({ _id: user._id }, updatedUser);
                }

                return !isUpdated
                    ? badRequestResponse(res, { message: 'Something went wrong!' })
                    : badRequestResponse(res, { message: 'You have to request for new OTP!' });
            }

            if (new Date(user.resetPasswordOTPExpiryTime) < new Date()) {
                const updateduser = { resetPasswordOTP: null, resetPasswordOTPExpiryTime: null };

                let isUpdated

                if (isOrganizer) {
                    isUpdated = await ORGANIZER.findOneAndUpdate({ _id: user._id }, updateduser);
                } else {
                    isUpdated = await USER.findOneAndUpdate({ _id: user._id }, updateduser);
                }

                return !isUpdated
                    ? badRequestResponse(res, { message: 'Something went wrong!' })
                    : badRequestResponse(res, { message: 'OTP is expired, Please Request for new OTP!' });
            }

            if (user.resetPasswordOTP !== otp) return badRequestResponse(res, { message: 'Invalid OTP!' });

            const uniqueString = generateRandomToken();

            const updateduser = {
                resetPasswordToken: uniqueString,
                resetPasswordTokenExpiryTime: new Date(new Date().getTime() + 10 * 60 * 1000),
                resetPasswordOTP: null,
                resetPasswordOTPExpiryTime: null
            };

            let isUpdated
            if (isOrganizer) {
                isUpdated = await ORGANIZER.findOneAndUpdate({ _id: user._id }, updateduser);
            } else {
                isUpdated = await USER.findOneAndUpdate({ _id: user._id }, updateduser);
            }

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { resetPasswordToken: uniqueString });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    resetPassword: async (req, res) => {
        try {
            const { id, password, token } = req.body;

            let user = await USER.findOne({ _id: id });
            let isOrganizer = false;

            if (!user) {
                user = await ORGANIZER.findOne({ _id: id });
                isOrganizer = true
            }

            if (!user) return badRequestResponse(res, { message: "User or Client not found!" });

            if (!user.resetPasswordToken) return badRequestResponse(res, { message: 'You have to request for new OTP!' });

            if (new Date(user.resetPasswordTokenExpiryTime) < new Date()) {
                const updateduser = { resetPasswordToken: '', resetPasswordOTPExpiryTime: null };
                let isUpdated
                if (isOrganizer) {
                    isUpdated = await ORGANIZER.findOneAndUpdate({ _id: user._id }, updateduser);
                } else {
                    isUpdated = await USER.findOneAndUpdate({ _id: user._id }, updateduser);
                }

                return !isUpdated
                    ? badRequestResponse(res, { message: 'Something went wrong!' })
                    : badRequestResponse(res, { message: 'Session expired, Please Request for new OTP!' });
            }

            if (user.resetPasswordToken !== token) return badRequestResponse(res, { message: 'Something went wrong!' });

            if (!password) return badRequestResponse(res, { message: "Password is required!" });

            const updatedUser = {
                password: await bcrypt.hash(password, Number(saltRounds)),
                resetPasswordToken: '',
                resetPasswordTokenExpiryTime: null
            };

            let isUpdated

            if (isOrganizer) {
                isUpdated = await ORGANIZER.findByIdAndUpdate({ _id: id }, updatedUser)
            } else {
                isUpdated = await USER.findByIdAndUpdate({ _id: id }, updatedUser)
            }
            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Password updated successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    changePassword: async (req, res) => {
        try {
            const { id, currentPassword, newPassword } = req.body;

            let user = await USER.findOne({ _id: id });

            let isOrganizer = false;

            if (!user) {
                user = await ORGANIZER.findOne({ _id: id });
                isOrganizer = true
            }

            const comparePassword = await bcrypt.compare(currentPassword, user.password);
            if (!comparePassword) return badRequestResponse(res, { message: 'Incorrect current password!' });

            const hashedPassword = await bcrypt.hash(newPassword, Number(saltRounds));

            let isUpdated

            if (isOrganizer) {
                isUpdated = await ORGANIZER.findByIdAndUpdate({ _id: user._id }, { password: hashedPassword });
            } else {
                isUpdated = await USER.findByIdAndUpdate({ _id: user._id }, { password: hashedPassword });
            }

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Password updated successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    signOut: async (req, res) => {
        try {
            const { id } = req.query;

            let user = await USER.findOne({ _id: id });
            let isOrganizer = false;

            if (!user) {
                user = await ORGANIZER.findOne({ _id: id });
                isOrganizer = true;
            }

            if (isOrganizer) {
                isUpdated = await ORGANIZER.findByIdAndUpdate({ _id: user._id }, { accessToken: "" });
            } else {
                isUpdated = await USER.findByIdAndUpdate({ _id: user._id }, { accessToken: "", });
            }

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Your session ended successfully.' });

        } catch (error) {
            return badRequestResponse(res, { message: 'Something went wrong!' });
        }
    }
};
