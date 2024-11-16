const mongoose = require('mongoose');

const spaSchema = new mongoose.Schema({
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

const Spa = mongoose.model('dynamic_spas', spaSchema);

module.exports = Spa;