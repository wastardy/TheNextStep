const mongoose = require('mongoose');

const movieTheaterSchema = new mongoose.Schema({
    name: String, 
    address: String,
    rating: Number,
    location: {
        lat: Number,
        lng: Number,
    },
    place_id: String,
});

const MovieTheater = mongoose.model('dynamic_movie_theater', movieTheaterSchema);

module.exports = MovieTheater;