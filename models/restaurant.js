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

const Restaurant = mongoose.model('dynamic_restaurants', restaurantSchema);

module.exports = Restaurant;