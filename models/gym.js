const mongoose = require('mongoose');

const gymSchema = new mongoose.Schema({
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

const Gym = mongoose.model('dynamic_gyms', gymSchema);

module.exports = Gym;