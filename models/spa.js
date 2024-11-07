const mongoose = require('mongoose');

const spaSchema = new mongoose.Schema({
    name: String, 
    address: String,
    rating: Number,
    location: {
        lat: Number,
        lng: Number,
    },
    place_id: String,
});

const Spa = mongoose.model('dynamic_spa', spaSchema);

module.exports = Spa;