const mongoose = require('mongoose');

// const cafeSchema = new mongoose.Schema({
//     name: String,
//     address: String,
//     working_hours: String, // таблиця на тиждень з робочими годинами
//     phone_number: String, // масив для номерів
//     rating: Number, // таблиця для відгуків і рейтингу
//     latitude: Number,
//     longitude: Number
// });

const cafeSchema = new mongoose.Schema({
    name: String,
    address: String,
    working_hours: String, 
    phone_number: String, 
    rating: Number, 
    latitude: Number,
    longitude: Number
});

module.exports = mongoose.model('Cafe', cafeSchema, 'cafes');