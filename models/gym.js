const mongoose = require('mongoose');

const gymSchema = new mongoose.Schema({
    name: String, 
    address: String,
    rating: Number,
    location: {
        lat: Number,
        lng: Number,
    },
    place_id: String,
});

const Gym = mongoose.model('dynamic_gyms', gymSchema);

module.exports = Gym;