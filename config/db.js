'use strict';

const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const CONNECTION_STRING = process.env.CONNECTION_STRING;

mongoose.connect(CONNECTION_STRING)
    .then(() => {
        console.log("Database connected successfully!");
    })
    .catch((error) => {
        console.error.bind(console, "Database connection failed!", error);
    });