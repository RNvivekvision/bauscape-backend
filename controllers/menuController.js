const MENU = require('../models/menuSchema');

const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

exports.menu = {
    insertMenu: async (req, res) => {
        try {
            const {
                name,
                children
            } = req.body;

            const menu = {
                name,
                children
            }

            const isCreated = await MENU.create(menu);

            return !isCreated || isCreated.length === 0
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Menu created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getMenus: async (req, res) => {
        try {

            const pipeline = [
                {
                    $project: {
                        name: 1,
                        children: 1
                    }
                }
            ];

            const menus = await MENU.aggregate(pipeline);

            return !menus || menus.length === 0
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: menus });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    menuOptions: async (req, res) => {
        try {

            const pipeline = [
                {
                    $match: {
                        isOrganizerMenu: true
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

            const menus = await MENU.aggregate(pipeline);

            return !menus || menus.length === 0
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: menus });

        } catch (error) {
            return errorResponse(error, res);
        }
    }
}