const mongoose = require('mongoose');

async function connectDB() {
    try {
        await mongoose.connect('mongodb+srv://developer_andrew:Variable2311@thenextstep.t6qek.mongodb.net/the_next_step');
        console.log('--------> Successfully connected to the_next_step database');
    }
    catch (error) {
        console.error('--------> Error connecting to MongoDB', error.message);
    }
}

module.exports = connectDB;