const mongoose = require('mongoose');

async function connectDB() {
    try {
        await mongoose.connect('mongodb://localhost:27017/the_next_step');
        console.log('--------> Successfully connected to the_next_step database');
    }
    catch (error) {
        console.error('--------> Error connecting to MongoDB', error.message);
    }
}

module.exports = connectDB;