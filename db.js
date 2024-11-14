const mongoose = require('mongoose');
const userPassword = require('./mongodb_password');

async function connectDB() {
    try {
        await mongoose.connect(`mongodb+srv://developer_andrew:${userPassword}@thenextstep.t6qek.mongodb.net/the_next_step`);
        console.log('--------> Successfully connected to the_next_step database');
    }
    catch (error) {
        console.error('--------> Error connecting to MongoDB', error.message);
    }
}

module.exports = connectDB;