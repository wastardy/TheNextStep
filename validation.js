const axios = require('axios');
const GOOGLE_API_KEY = require('./google_api_key.js');

async function isValidCityInput(city) {
    const cityPattern = /^[a-zA-Z\u0400-\u04FF]+(?:[ -][a-zA-Z\u0400-\u04FF]+)*$/;
    return cityPattern.test(city);
}

async function isValidStreetInput(city, street) {
    const address = `${street}, ${city}`;

    const containsNumber = /\d/;

    if (!containsNumber.test(street)) {
        console.log('--------> Введено вулицю без цифри');
        return false;
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;

    try {
        // За допомогою axios.get відправляється запит до API, який передає сформовану адресу.
        const response = await axios.get(url);

        if (response.data.status === 'OK') {
            const result = response.data.results[0];
            console.log('--------> Address found: ', result.formatted_address);
            return true;
        } 
        else if (response.data.status === 'ZERO_RESULTS') {
            console.log('--------> Address not found');
            return false;
        }
    } 
    catch (error) {
        console.error('--------> Error with Geocoding API:', error);
        return false;
    }
}

async function isValidRangeInput(range) {
    const rangePattern = /^[0-9]+$/;
    return rangePattern.test(range) && range >= 500 && range <= 5000; 
}

module.exports = {
    isValidCityInput,
    isValidStreetInput,
    isValidRangeInput,
};