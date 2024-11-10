const mongoose = require('mongoose');

const parkSchema = new mongoose.Schema({
    name: String, 
    address: String,
    rating: Number,
    location: {
        lat: Number,
        lng: Number,
    },
    place_id: String,
});

const Park = mongoose.model('dynamic_parks', parkSchema);

module.exports = Park;