const mongoose = require('mongoose');

const parkSchema = new mongoose.Schema({
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

const Park = mongoose.model('dynamic_parks', parkSchema);

module.exports = Park;