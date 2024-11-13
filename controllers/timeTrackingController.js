const { ObjectId } = require('mongodb');

const TIMETRACKING = require('../models/timeTrackingSchema');

const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

exports.timeTracking = {
    insertTimeTracking: async (req, res) => {
        try {
            const {
                user,
                date,
                timeEntries,
                organizer
            } = req.body;

            const inputDate = new Date(date);

            const startOfDay = new Date(inputDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(inputDate.setHours(23, 59, 59, 999));

            const isExisting = await TIMETRACKING.findOne({
                user: new ObjectId(user),
                organizer: new ObjectId(organizer),
                date: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            });

            if (isExisting) return badRequestResponse(res, { message: 'Record already exist for this day!' });

            const timeTracking = {
                user,
                date,
                timeEntries,
                organizer
            };

            const isCreated = await TIMETRACKING.create(timeTracking);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Record created successfully.', record: isCreated });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getTimeTrackingByUser: async (req, res) => {
        const { user, organizer, month, year } = req.query;

        const pipeline = [
            {
                $match: {
                    $and: [
                        { user: new ObjectId(user) },
                        { organizer: new ObjectId(organizer) },
                        { isActive: true },
                        {
                            $expr: {
                                $and: [
                                    { $eq: [{ $month: "$date" }, Number(month)] },
                                    { $eq: [{ $year: "$date" }, Number(year)] }
                                ]
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "organizers",
                    localField: "user",
                    foreignField: "_id",
                    as: "user",
                    pipeline: [
                        {
                            $project: {
                                _id: 0,
                                firstName: 1
                            }
                        }
                    ]
                }
            },
            { $unwind: "$user" },
            { $set: { user: "$user.firstName" } },
            {
                $set: {
                    timeEntries: {
                        $map: {
                            input: "$timeEntries",
                            as: "entry",
                            in: {
                                $cond: {
                                    if: {
                                        $and: [
                                            { $ne: ["$$entry.start", null] }, // Ensure start time exists
                                            { $ne: ["$$entry.end", null] }, // Ensure end time exists
                                            { $ne: ["$$entry.end", ""] } // Skip if end time is an empty string
                                        ]
                                    },
                                    then: {
                                        $mergeObjects: [
                                            "$$entry",
                                            {
                                                duration: {
                                                    $dateDiff: {
                                                        startDate: {
                                                            $dateFromString: {
                                                                dateString: {
                                                                    $concat: [
                                                                        { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                                                                        "T",
                                                                        "$$entry.start",
                                                                        ":00Z"
                                                                    ]
                                                                }
                                                            }
                                                        },
                                                        endDate: {
                                                            $dateFromString: {
                                                                dateString: {
                                                                    $concat: [
                                                                        { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                                                                        "T",
                                                                        "$$entry.end",
                                                                        ":00Z"
                                                                    ]
                                                                }
                                                            }
                                                        },
                                                        unit: "minute"
                                                    }
                                                }
                                            }
                                        ]
                                    },
                                    else: "$$REMOVE" // Remove entries where end time is missing
                                }
                            }
                        }
                    }
                }
            },
            {
                $set: {
                    timeEntries: {
                        $map: {
                            input: "$timeEntries",
                            as: "entry",
                            in: {
                                $mergeObjects: [
                                    "$$entry",
                                    {
                                        duration: {
                                            $concat: [
                                                {
                                                    $cond: {
                                                        if: { $lt: [{ $floor: { $divide: ["$$entry.duration", 60] } }, 10] },
                                                        then: { $concat: ["0", { $toString: { $floor: { $divide: ["$$entry.duration", 60] } } }] },
                                                        else: { $toString: { $floor: { $divide: ["$$entry.duration", 60] } } }
                                                    }
                                                },
                                                ":",
                                                {
                                                    $cond: {
                                                        if: { $lt: [{ $mod: ["$$entry.duration", 60] }, 10] },
                                                        then: { $concat: ["0", { $toString: { $mod: ["$$entry.duration", 60] } }] },
                                                        else: { $toString: { $mod: ["$$entry.duration", 60] } }
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    totalDurationMinutes: {
                        $sum: {
                            $map: {
                                input: "$timeEntries",
                                as: "entry",
                                in: {
                                    $add: [
                                        {
                                            $multiply: [
                                                {
                                                    $cond: {
                                                        if: { $eq: [{ $type: "$$entry.duration" }, "string"] },
                                                        then: {
                                                            $toInt: {
                                                                $cond: {
                                                                    if: { $ne: [{ $substr: ["$$entry.duration", 0, 2] }, ""] },
                                                                    then: { $substr: ["$$entry.duration", 0, 2] },
                                                                    else: "0"
                                                                }
                                                            }
                                                        },
                                                        else: 0
                                                    }
                                                },
                                                60
                                            ]
                                        },
                                        {
                                            $cond: {
                                                if: { $ne: [{ $substr: ["$$entry.duration", 3, 2] }, ""] },
                                                then: { $toInt: { $substr: ["$$entry.duration", 3, 2] } },
                                                else: 0
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {
                $set: {
                    totalHours: {
                        $concat: [
                            {
                                $cond: {
                                    if: { $lt: [{ $floor: { $divide: ["$totalDurationMinutes", 60] } }, 10] },
                                    then: { $concat: ["0", { $toString: { $floor: { $divide: ["$totalDurationMinutes", 60] } } }] },
                                    else: { $toString: { $floor: { $divide: ["$totalDurationMinutes", 60] } } }
                                }
                            },
                            ":",
                            {
                                $cond: {
                                    if: { $lt: [{ $mod: ["$totalDurationMinutes", 60] }, 10] },
                                    then: { $concat: ["0", { $toString: { $mod: ["$totalDurationMinutes", 60] } }] },
                                    else: { $toString: { $mod: ["$totalDurationMinutes", 60] } }
                                }
                            }
                        ]
                    }
                }
            },
            {
                $addFields: {
                    workingDurationMinutes: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: "$timeEntries",
                                        as: "entry",
                                        cond: { $eq: ["$$entry.type", "work"] }
                                    }
                                },
                                as: "entry",
                                in: {
                                    $add: [
                                        {
                                            $multiply: [
                                                {
                                                    $cond: {
                                                        if: { $eq: [{ $type: "$$entry.duration" }, "string"] },
                                                        then: {
                                                            $toInt: {
                                                                $cond: {
                                                                    if: { $ne: [{ $substr: ["$$entry.duration", 0, 2] }, ""] },
                                                                    then: { $substr: ["$$entry.duration", 0, 2] },
                                                                    else: "0"
                                                                }
                                                            }
                                                        },
                                                        else: 0
                                                    }
                                                },
                                                60
                                            ]
                                        },
                                        {
                                            $cond: {
                                                if: { $ne: [{ $substr: ["$$entry.duration", 3, 2] }, ""] },
                                                then: { $toInt: { $substr: ["$$entry.duration", 3, 2] } },
                                                else: 0
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    },
                    breakDurationMinutes: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: "$timeEntries",
                                        as: "entry",
                                        cond: { $in: ["$$entry.type", ["break", "breakRelatedType"]] }
                                    }
                                },
                                as: "entry",
                                in: {
                                    $add: [
                                        {
                                            $multiply: [
                                                {
                                                    $cond: {
                                                        if: { $eq: [{ $type: "$$entry.duration" }, "string"] },
                                                        then: {
                                                            $toInt: {
                                                                $cond: {
                                                                    if: { $ne: [{ $substr: ["$$entry.duration", 0, 2] }, ""] },
                                                                    then: { $substr: ["$$entry.duration", 0, 2] },
                                                                    else: "0"
                                                                }
                                                            }
                                                        },
                                                        else: 0
                                                    }
                                                },
                                                60
                                            ]
                                        },
                                        {
                                            $cond: {
                                                if: { $ne: [{ $substr: ["$$entry.duration", 3, 2] }, ""] },
                                                then: { $toInt: { $substr: ["$$entry.duration", 3, 2] } },
                                                else: 0
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {
                $set: {
                    workingHours: {
                        $concat: [
                            {
                                $cond: {
                                    if: { $lt: [{ $floor: { $divide: ["$workingDurationMinutes", 60] } }, 10] },
                                    then: { $concat: ["0", { $toString: { $floor: { $divide: ["$workingDurationMinutes", 60] } } }] },
                                    else: { $toString: { $floor: { $divide: ["$workingDurationMinutes", 60] } } }
                                }
                            },
                            ":",
                            {
                                $cond: {
                                    if: { $lt: [{ $mod: ["$workingDurationMinutes", 60] }, 10] },
                                    then: { $concat: ["0", { $toString: { $mod: ["$workingDurationMinutes", 60] } }] },
                                    else: { $toString: { $mod: ["$workingDurationMinutes", 60] } }
                                }
                            }
                        ]
                    },
                    breakHours: {
                        $concat: [
                            {
                                $cond: {
                                    if: { $lt: [{ $floor: { $divide: ["$breakDurationMinutes", 60] } }, 10] },
                                    then: { $concat: ["0", { $toString: { $floor: { $divide: ["$breakDurationMinutes", 60] } } }] },
                                    else: { $toString: { $floor: { $divide: ["$breakDurationMinutes", 60] } } }
                                }
                            },
                            ":",
                            {
                                $cond: {
                                    if: { $lt: [{ $mod: ["$breakDurationMinutes", 60] }, 10] },
                                    then: { $concat: ["0", { $toString: { $mod: ["$breakDurationMinutes", 60] } }] },
                                    else: { $toString: { $mod: ["$breakDurationMinutes", 60] } }
                                }
                            }
                        ]
                    }
                }
            },
            {
                $set: {
                    ourTime: {
                        $cond: {
                            if: { $lte: ["$workingHours", "08:00"] }, // Set ourTime to "00:00" if workingHours <= 08:00
                            then: "00:00",
                            else: {
                                $let: {
                                    vars: {
                                        totalTimeInMinutes: {
                                            $add: [
                                                {
                                                    $multiply: [
                                                        {
                                                            $cond: {
                                                                if: { $eq: [{ $type: "$totalHours" }, "string"] },
                                                                then: {
                                                                    $toInt: {
                                                                        $cond: {
                                                                            if: { $ne: [{ $substr: ["$totalHours", 0, 2] }, ""] },
                                                                            then: { $substr: ["$totalHours", 0, 2] },
                                                                            else: "0"
                                                                        }
                                                                    }
                                                                },
                                                                else: 0
                                                            }
                                                        },
                                                        60
                                                    ]
                                                },
                                                {
                                                    $cond: {
                                                        if: { $ne: [{ $substr: ["$totalHours", 3, 2] }, ""] },
                                                        then: { $toInt: { $substr: ["$totalHours", 3, 2] } },
                                                        else: 0
                                                    }
                                                }
                                            ]
                                        },
                                        breakTimeInMinutes: {
                                            $add: [
                                                {
                                                    $multiply: [
                                                        {
                                                            $cond: {
                                                                if: { $eq: [{ $type: "$breakHours" }, "string"] },
                                                                then: {
                                                                    $toInt: {
                                                                        $cond: {
                                                                            if: { $ne: [{ $substr: ["$breakHours", 0, 2] }, ""] },
                                                                            then: { $substr: ["$breakHours", 0, 2] },
                                                                            else: "0"
                                                                        }
                                                                    }
                                                                },
                                                                else: 0
                                                            }
                                                        },
                                                        60
                                                    ]
                                                },
                                                {
                                                    $cond: {
                                                        if: { $ne: [{ $substr: ["$breakHours", 3, 2] }, ""] },
                                                        then: { $toInt: { $substr: ["$breakHours", 3, 2] } },
                                                        else: 0
                                                    }
                                                }
                                            ]
                                        },
                                        referenceTimeInMinutes: 480 // 08:00 hours in minutes
                                    },
                                    in: {
                                        $let: {
                                            vars: {
                                                overtimeMinutes: {
                                                    $subtract: [
                                                        { $subtract: ["$$totalTimeInMinutes", "$$breakTimeInMinutes"] },
                                                        "$$referenceTimeInMinutes"
                                                    ]
                                                }
                                            },
                                            in: {
                                                $concat: [
                                                    {
                                                        $cond: {
                                                            if: { $lt: [{ $floor: { $divide: ["$$overtimeMinutes", 60] } }, 10] },
                                                            then: { $concat: ["0", { $toString: { $floor: { $divide: ["$$overtimeMinutes", 60] } } }] },
                                                            else: { $toString: { $floor: { $divide: ["$$overtimeMinutes", 60] } } }
                                                        }
                                                    },
                                                    ":",
                                                    {
                                                        $cond: {
                                                            if: { $lt: [{ $mod: ["$$overtimeMinutes", 60] }, 10] },
                                                            then: { $concat: ["0", { $toString: { $mod: ["$$overtimeMinutes", 60] } }] },
                                                            else: { $toString: { $mod: ["$$overtimeMinutes", 60] } }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                $unset: ["totalDurationMinutes", "workingDurationMinutes", "breakDurationMinutes"]
            },
            {
                $project: {
                    createdAt: 0,
                    updatedAt: 0,
                    __v: 0
                }
            }
        ]

        const records = await TIMETRACKING.aggregate(pipeline)

        return records.length <= 0 || !records
            ? badRequestResponse(res, { message: 'No records found' })
            : successResponse(res, { records: records });
    },
    getTimeTrackingByDay: async (req, res) => {
        const { organizer, date } = req.query;

        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);

        const pipeline = [
            {
                $match: {
                    $and: [
                        { organizer: new ObjectId(organizer) },
                        { isActive: true },
                        {
                            date: {
                                $gte: startDate,
                                $lt: endDate
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "organizers",
                    localField: "user",
                    foreignField: "_id",
                    as: "user",
                    pipeline: [
                        {
                            $project: {
                                _id: 0,
                                firstName: 1
                            }
                        }
                    ]
                }
            },
            { $unwind: "$user" },
            { $set: { user: "$user.firstName" } },
            {
                $set: {
                    timeEntries: {
                        $filter: {
                            input: "$timeEntries",
                            as: "entry",
                            cond: {
                                $and: [
                                    { $ne: ["$$entry.start", null] }, // Ensure start time exists
                                    { $ne: ["$$entry.end", null] }, // Ensure end time exists
                                    { $ne: ["$$entry.end", ""] } // Skip if end time is an empty string
                                ]
                            }
                        }
                    }
                }
            },
            {
                $set: {
                    timeEntries: {
                        $map: {
                            input: "$timeEntries",
                            as: "entry",
                            in: {
                                $mergeObjects: [
                                    "$$entry",
                                    {
                                        duration: {
                                            $dateDiff: {
                                                startDate: {
                                                    $dateFromString: {
                                                        dateString: {
                                                            $concat: [
                                                                { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                                                                "T",
                                                                "$$entry.start",
                                                                ":00Z"
                                                            ]
                                                        }
                                                    }
                                                },
                                                endDate: {
                                                    $dateFromString: {
                                                        dateString: {
                                                            $concat: [
                                                                { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                                                                "T",
                                                                "$$entry.end",
                                                                ":00Z"
                                                            ]
                                                        }
                                                    }
                                                },
                                                unit: "minute"
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $set: {
                    timeEntries: {
                        $map: {
                            input: "$timeEntries",
                            as: "entry",
                            in: {
                                $mergeObjects: [
                                    "$$entry",
                                    {
                                        duration: {
                                            $concat: [
                                                {
                                                    $cond: {
                                                        if: { $lt: [{ $floor: { $divide: ["$$entry.duration", 60] } }, 10] },
                                                        then: { $concat: ["0", { $toString: { $floor: { $divide: ["$$entry.duration", 60] } } }] },
                                                        else: { $toString: { $floor: { $divide: ["$$entry.duration", 60] } } }
                                                    }
                                                },
                                                ":",
                                                {
                                                    $cond: {
                                                        if: { $lt: [{ $mod: ["$$entry.duration", 60] }, 10] },
                                                        then: { $concat: ["0", { $toString: { $mod: ["$$entry.duration", 60] } }] },
                                                        else: { $toString: { $mod: ["$$entry.duration", 60] } }
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    totalDurationMinutes: {
                        $sum: {
                            $map: {
                                input: "$timeEntries",
                                as: "entry",
                                in: {
                                    $add: [
                                        {
                                            $multiply: [
                                                {
                                                    $cond: {
                                                        if: { $eq: [{ $type: "$$entry.duration" }, "string"] },
                                                        then: {
                                                            $toInt: {
                                                                $cond: {
                                                                    if: { $ne: [{ $substr: ["$$entry.duration", 0, 2] }, ""] },
                                                                    then: { $substr: ["$$entry.duration", 0, 2] },
                                                                    else: "0"
                                                                }
                                                            }
                                                        },
                                                        else: 0
                                                    }
                                                },
                                                60
                                            ]
                                        },
                                        {
                                            $cond: {
                                                if: { $ne: [{ $substr: ["$$entry.duration", 3, 2] }, ""] },
                                                then: { $toInt: { $substr: ["$$entry.duration", 3, 2] } },
                                                else: 0
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {
                $set: {
                    totalHours: {
                        $concat: [
                            {
                                $cond: {
                                    if: { $lt: [{ $floor: { $divide: ["$totalDurationMinutes", 60] } }, 10] },
                                    then: { $concat: ["0", { $toString: { $floor: { $divide: ["$totalDurationMinutes", 60] } } }] },
                                    else: { $toString: { $floor: { $divide: ["$totalDurationMinutes", 60] } } }
                                }
                            },
                            ":",
                            {
                                $cond: {
                                    if: { $lt: [{ $mod: ["$totalDurationMinutes", 60] }, 10] },
                                    then: { $concat: ["0", { $toString: { $mod: ["$totalDurationMinutes", 60] } }] },
                                    else: { $toString: { $mod: ["$totalDurationMinutes", 60] } }
                                }
                            }
                        ]
                    }
                }
            },
            {
                $addFields: {
                    workingDurationMinutes: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: "$timeEntries",
                                        as: "entry",
                                        cond: { $eq: ["$$entry.type", "work"] }
                                    }
                                },
                                as: "entry",
                                in: {
                                    $add: [
                                        {
                                            $multiply: [
                                                { $toInt: { $substr: ["$$entry.duration", 0, 2] } },
                                                60
                                            ]
                                        },
                                        { $toInt: { $substr: ["$$entry.duration", 3, 2] } }
                                    ]
                                }
                            }
                        }
                    },
                    breakDurationMinutes: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: "$timeEntries",
                                        as: "entry",
                                        cond: { $in: ["$$entry.type", ["break", "breakRelatedType"]] }
                                    }
                                },
                                as: "entry",
                                in: {
                                    $add: [
                                        {
                                            $multiply: [
                                                { $toInt: { $substr: ["$$entry.duration", 0, 2] } },
                                                60
                                            ]
                                        },
                                        { $toInt: { $substr: ["$$entry.duration", 3, 2] } }
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {
                $set: {
                    workingHours: {
                        $concat: [
                            {
                                $cond: {
                                    if: { $lt: [{ $floor: { $divide: ["$workingDurationMinutes", 60] } }, 10] },
                                    then: { $concat: ["0", { $toString: { $floor: { $divide: ["$workingDurationMinutes", 60] } } }] },
                                    else: { $toString: { $floor: { $divide: ["$workingDurationMinutes", 60] } } }
                                }
                            },
                            ":",
                            {
                                $cond: {
                                    if: { $lt: [{ $mod: ["$workingDurationMinutes", 60] }, 10] },
                                    then: { $concat: ["0", { $toString: { $mod: ["$workingDurationMinutes", 60] } }] },
                                    else: { $toString: { $mod: ["$workingDurationMinutes", 60] } }
                                }
                            }
                        ]
                    },
                    breakHours: {
                        $concat: [
                            {
                                $cond: {
                                    if: { $lt: [{ $floor: { $divide: ["$breakDurationMinutes", 60] } }, 10] },
                                    then: { $concat: ["0", { $toString: { $floor: { $divide: ["$breakDurationMinutes", 60] } } }] },
                                    else: { $toString: { $floor: { $divide: ["$breakDurationMinutes", 60] } } }
                                }
                            },
                            ":",
                            {
                                $cond: {
                                    if: { $lt: [{ $mod: ["$breakDurationMinutes", 60] }, 10] },
                                    then: { $concat: ["0", { $toString: { $mod: ["$breakDurationMinutes", 60] } }] },
                                    else: { $toString: { $mod: ["$breakDurationMinutes", 60] } }
                                }
                            }
                        ]
                    }
                }
            },
            {
                $set: {
                    ourTime: {
                        $cond: {
                            if: { $lte: ["$workingHours", "08:00"] }, // Check if workingHours is <= "08:00"
                            then: "00:00", // If true, set ourTime to "00:00"
                            else: {
                                $let: {
                                    vars: {
                                        totalTimeInMinutes: {
                                            $add: [
                                                { $multiply: [{ $toInt: { $substr: ["$totalHours", 0, 2] } }, 60] },
                                                { $toInt: { $substr: ["$totalHours", 3, 2] } }
                                            ]
                                        },
                                        breakTimeInMinutes: {
                                            $add: [
                                                { $multiply: [{ $toInt: { $substr: ["$breakHours", 0, 2] } }, 60] },
                                                { $toInt: { $substr: ["$breakHours", 3, 2] } }
                                            ]
                                        },
                                        referenceTimeInMinutes: 480 // 08:00 hours in minutes
                                    },
                                    in: {
                                        $let: {
                                            vars: {
                                                overtimeMinutes: {
                                                    $subtract: [
                                                        { $subtract: ["$$totalTimeInMinutes", "$$breakTimeInMinutes"] },
                                                        "$$referenceTimeInMinutes"
                                                    ]
                                                }
                                            },
                                            in: {
                                                $concat: [
                                                    {
                                                        $cond: {
                                                            if: { $lt: [{ $floor: { $divide: ["$$overtimeMinutes", 60] } }, 10] },
                                                            then: { $concat: ["0", { $toString: { $floor: { $divide: ["$$overtimeMinutes", 60] } } }] },
                                                            else: { $toString: { $floor: { $divide: ["$$overtimeMinutes", 60] } } }
                                                        }
                                                    },
                                                    ":",
                                                    {
                                                        $cond: {
                                                            if: { $lt: [{ $mod: ["$$overtimeMinutes", 60] }, 10] },
                                                            then: { $concat: ["0", { $toString: { $mod: ["$$overtimeMinutes", 60] } }] },
                                                            else: { $toString: { $mod: ["$$overtimeMinutes", 60] } }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                $unset: ["totalDurationMinutes", "workingDurationMinutes", "breakDurationMinutes"]
            },
            {
                $project: {
                    createdAt: 0,
                    updatedAt: 0,
                    __v: 0
                }
            }
        ]


        const records = await TIMETRACKING.aggregate(pipeline)

        return records.length <= 0 || !records
            ? badRequestResponse(res, { message: 'No records found' })
            : successResponse(res, { records: records });
    },
    getTimeTracking: async (req, res) => {
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

            const timeTracking = await TIMETRACKING.aggregate(pipeline);

            return !timeTracking || timeTracking.length <= 0
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: timeTracking[0] });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateTimeTracking: async (req, res) => {
        try {
            const {
                id,
                user,
                date,
                timeEntries,
                organizer
            } = req.body;

            const timeTracking = await TIMETRACKING.findOne({ _id: id });
            if (!timeTracking) return badRequestResponse(res, { message: 'Record not found!' });

            const updatedTimeTracking = {
                user,
                date,
                timeEntries,
                organizer
            }

            const isUpdated = await TIMETRACKING.findByIdAndUpdate({ _id: timeTracking._id }, updatedTimeTracking);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Record updated successfully.', record: isUpdated });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleTimeTrackingStatus: async (req, res) => {
        try {
            const { id } = req.query;

            const timeTracking = await TIMETRACKING.findOne({ _id: id });
            if (!timeTracking) return badRequestResponse(res, { message: 'Something went wrong!' });

            const isUserTypeStatusChanged = await TIMETRACKING.findByIdAndUpdate({ _id: timeTracking._id }, { isActive: !timeTracking.isActive });
            const statusMessage = !timeTracking.isActive ? 'activated' : 'deactivated';

            return !isUserTypeStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Record ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getWorkHistory: async (req, res) => {
        try {
            const { id, weekStartDate, weekEndDate, month, year } = req.query;

            const dayOne = new Date(weekStartDate);
            const daySeven = new Date(weekEndDate)

            const pipeline = [
                // Match records for the given user, isActive, and specified month and year
                {
                    $match: {
                        $and: [
                            { user: new ObjectId(id) }, // Replace with actual user ID
                            { isActive: true },
                            {
                                $expr: {
                                    $and: [
                                        { $eq: [{ $month: "$date" }, Number(month)] }, // October
                                        { $eq: [{ $year: "$date" }, Number(year)] } // 2024
                                    ]
                                }
                            }
                        ]
                    }
                },
                // Unwind the `timeEntries` array to work with individual entries
                {
                    $unwind: "$timeEntries"
                },
                // Filter out time entries with valid start and end times
                {
                    $match: {
                        "timeEntries.start": { $ne: "" },
                        "timeEntries.end": { $ne: "" }
                    }
                },
                // Project necessary fields and convert start and end times from strings to ISO date
                {
                    $project: {
                        startTime: {
                            $dateFromString: {
                                dateString: {
                                    $concat: [
                                        { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, // Use document date
                                        "T",
                                        {
                                            $cond: {
                                                if: { $lt: [{ $strLenCP: "$timeEntries.start" }, 5] }, // If the time is less than 5 chars (e.g. "8:00")
                                                then: { $concat: ["0", "$timeEntries.start"] }, // Add leading zero to format as "08:00"
                                                else: "$timeEntries.start" // Otherwise, use it as is
                                            }
                                        },
                                        ":00.000Z"
                                    ]
                                }
                            }
                        },
                        endTime: {
                            $dateFromString: {
                                dateString: {
                                    $concat: [
                                        { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, // Use document date
                                        "T",
                                        {
                                            $cond: {
                                                if: { $lt: [{ $strLenCP: "$timeEntries.end" }, 5] }, // If the time is less than 5 chars (e.g. "8:00")
                                                then: { $concat: ["0", "$timeEntries.end"] }, // Add leading zero to format as "08:00"
                                                else: "$timeEntries.end" // Otherwise, use it as is
                                            }
                                        },
                                        ":00.000Z"
                                    ]
                                }
                            }
                        },
                        date: "$date" // Retain the date field for later calculations
                    }
                },
                // Calculate the duration in milliseconds
                {
                    $addFields: {
                        durationInMs: { $subtract: ["$endTime", "$startTime"] }
                    }
                },
                // Group by user and calculate totals for today, current week, and month
                {
                    $group: {
                        _id: null,
                        totalDurationInMs: { $sum: "$durationInMs" },
                        todayTotalInMs: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: [{ $dayOfMonth: "$date" }, { $dayOfMonth: new Date() }] },
                                            { $eq: [{ $month: "$date" }, { $month: new Date() }] },
                                            { $eq: [{ $year: "$date" }, { $year: new Date() }] }
                                        ]
                                    },
                                    "$durationInMs",
                                    0
                                ]
                            }
                        },
                        // Corrected current week calculation
                        currentWeekTotalInMs: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $gte: ["$date", dayOne] }, // Replace with `startOfWeek` from Node.js
                                            { $lte: ["$date", daySeven] } // Include today's date in the current week
                                        ]
                                    },
                                    "$durationInMs",
                                    0
                                ]
                            }
                        }
                    }
                },
                // Convert total milliseconds to hours and minutes for each period
                {
                    $project: {
                        sumOfToday: {
                            $concat: [
                                {
                                    $cond: {
                                        if: { $lt: [{ $floor: { $divide: ["$todayTotalInMs", 1000 * 60 * 60] } }, 10] },
                                        then: { $concat: ["0", { $toString: { $floor: { $divide: ["$todayTotalInMs", 1000 * 60 * 60] } } }] },
                                        else: { $toString: { $floor: { $divide: ["$todayTotalInMs", 1000 * 60 * 60] } } }
                                    }
                                },
                                ":",
                                {
                                    $cond: {
                                        if: { $lt: [{ $floor: { $divide: [{ $mod: ["$todayTotalInMs", 1000 * 60 * 60] }, 1000 * 60] } }, 10] },
                                        then: { $concat: ["0", { $toString: { $floor: { $divide: [{ $mod: ["$todayTotalInMs", 1000 * 60 * 60] }, 1000 * 60] } } }] },
                                        else: { $toString: { $floor: { $divide: [{ $mod: ["$todayTotalInMs", 1000 * 60 * 60] }, 1000 * 60] } } }
                                    }
                                }
                            ]
                        },
                        sumOfCurrentWeek: {
                            $concat: [
                                {
                                    $cond: {
                                        if: { $lt: [{ $floor: { $divide: ["$currentWeekTotalInMs", 1000 * 60 * 60] } }, 10] },
                                        then: { $concat: ["0", { $toString: { $floor: { $divide: ["$currentWeekTotalInMs", 1000 * 60 * 60] } } }] },
                                        else: { $toString: { $floor: { $divide: ["$currentWeekTotalInMs", 1000 * 60 * 60] } } }
                                    }
                                },
                                ":",
                                {
                                    $cond: {
                                        if: { $lt: [{ $floor: { $divide: [{ $mod: ["$currentWeekTotalInMs", 1000 * 60 * 60] }, 1000 * 60] } }, 10] },
                                        then: { $concat: ["0", { $toString: { $floor: { $divide: [{ $mod: ["$currentWeekTotalInMs", 1000 * 60 * 60] }, 1000 * 60] } } }] },
                                        else: { $toString: { $floor: { $divide: [{ $mod: ["$currentWeekTotalInMs", 1000 * 60 * 60] }, 1000 * 60] } } }
                                    }
                                }
                            ]
                        },
                        sumOfMonth: {
                            $concat: [
                                {
                                    $cond: {
                                        if: { $lt: [{ $floor: { $divide: ["$totalDurationInMs", 1000 * 60 * 60] } }, 10] },
                                        then: { $concat: ["0", { $toString: { $floor: { $divide: ["$totalDurationInMs", 1000 * 60 * 60] } } }] },
                                        else: { $toString: { $floor: { $divide: ["$totalDurationInMs", 1000 * 60 * 60] } } }
                                    }
                                },
                                ":",
                                {
                                    $cond: {
                                        if: { $lt: [{ $floor: { $divide: [{ $mod: ["$totalDurationInMs", 1000 * 60 * 60] }, 1000 * 60] } }, 10] },
                                        then: { $concat: ["0", { $toString: { $floor: { $divide: [{ $mod: ["$totalDurationInMs", 1000 * 60 * 60] }, 1000 * 60] } } }] },
                                        else: { $toString: { $floor: { $divide: [{ $mod: ["$totalDurationInMs", 1000 * 60 * 60] }, 1000 * 60] } } }
                                    }
                                }
                            ]
                        }
                    }
                }
            ];

            const record = await TIMETRACKING.aggregate(pipeline)

            return !record
                ? badRequestResponse(res, { message: 'No records found' })
                : successResponse(res, { records: record });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
}