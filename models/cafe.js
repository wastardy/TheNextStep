const mongoose = require('mongoose');

const cafeSchema = new mongoose.Schema({
    photo_url: String,
    name: String,
    address: String,
    is_open: Boolean,
    rating: Number,
    location: {
        lat: Number,
        lng: Number,
    },
    place_id: String,
});

const Cafe = mongoose.model('dynamic_cafes', cafeSchema);

module.exports = Cafe;