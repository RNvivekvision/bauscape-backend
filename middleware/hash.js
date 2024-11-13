'use strict';

const bcrypt = require('bcrypt');

const saltRounds = Number(process.env.SALT_ROUNDS);

const bcryptPassword = (userSchema) => {
    userSchema.pre('save', async function (next) {
        if (this.isModified('password')) {
            this.password = await bcrypt.hash(this.password, saltRounds);
        }
        next();
    });
};

module.exports = { bcryptPassword };