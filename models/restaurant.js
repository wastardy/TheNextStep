const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: String, 
    address: String,
    rating: Number,
    location: {
        lat: Number,
        lng: Number,
    },
    place_id: String,
});

const Restaurant = mongoose.model('dynamic_restaurant', restaurantSchema);

module.exports = Restaurant;