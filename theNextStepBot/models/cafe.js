const mongoose = require('mongoose');

const cafeSchema = new mongoose.Schema({
    name: String,
    address: String,
    rating: Number,
    location: {
        lat: Number,
        lng: Number,
    },
    place_id: String,
});

const Cafe = mongoose.model('dynamic_cafes', cafeSchema);

module.exports = Cafe;