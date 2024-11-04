const telegramAPI = require('node-telegram-bot-api');
const { inlineKeyboard } = require('telegraf/markup');
const { callbackQuery } = require('telegraf/filters');
const axios = require('axios'); // for HTTP requests
const express = require('express');
const token = require('./token.js');
const GOOGLE_API_KEY = require('./google_api_key.js');
const connectDB = require('./db.js')
const Cafe = require('./models/cafe.js');

const bot = new telegramAPI(token, { polling: true });

// --------------------------------------------------

const userSteps = {};
const defaultRange = 1000; 
let selectedCategory = '';

const main = () => {
    bot.setMyCommands([
        { command: `/start`, description: 'start chat with the bot' }
    ]);

    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        
        // if (userSteps[chatId] === 'choosing_category') return;
        resetUserState(chatId);
        userSteps[chatId] = 'choosing_category';

        initialChoice(chatId);  
    });

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;
        
        if (text === `/start`) return; 

        // place types from places api:
        // gym, night_club, museum, park, restaurant, spa, ~florist, movie_theater
        if (text && ['cafe', 'sport', 'park', 'culture'].includes(text.toLowerCase())) {
            selectedCategory = text;
            userSteps[chatId] = 'waiting_for_city'; 
            
            await bot.sendMessage(
                chatId, 
                `You chose ${selectedCategory}.` + 
                `\nPlease enter your city 📌` + 
                `\n(e.g. Київ, San Francisco, абу-дабі)`
            );
        }
        // перевірка на введення міста і продовження введення вулиці
        else if (userSteps[chatId] === 'waiting_for_city') {
            console.log('\n========> Введене місто: ', text);

            if (!isValidCityInput(text)) {
                console.log('========> Обробка випадку з неправильним вводом міста..')
                
                await bot.sendMessage(
                    chatId,
                    `Invalid city name🥲` + 
                    `\n\nPlease enter a valid city name without` + 
                    `\n- numbers\n- extra spaces\n- multiple hyphens\n- etc`
                );

                await bot.sendMessage(
                    chatId,  
                    `\nPlease enter your city 📌` + 
                    `\n(e.g. Київ, San Francisco, абу-дабі)`
                );
            }
            else {
                console.log('\n========> Прийнятий ввід міста: ', text);

                userSteps[chatId] = {
                    step: 'waiting_for_street',
                    city: text
                };
    
                await bot.sendMessage(
                    chatId, 
                    `Now enter your street with number 📌` +
                    `\n(e.g. 3 Abbey Rd., Шевченка 7)`
                );

                console.log(`========> Інформація в об'єкті юзера: `, userSteps[chatId]);
            }
        }
        // перевірка на введення вулиці і введення діапазону пошуку
        else if (userSteps[chatId]?.step === 'waiting_for_street') {
            console.log('\n\n========> Введена вулиця: ', text);

            let city = userSteps[chatId].city;
            let street = text;

            const isValidStreet = await isValidStreetInput(city, street);

            if (!isValidStreet) {
                console.log('========> Обробка випадку з неправильним вводом вулиці..')

                await bot.sendMessage(
                    chatId,
                    `Street ${street} not found in ${city}` + 
                    `Please enter a valid street😌`
                );

                await bot.sendMessage(
                    chatId, 
                    `Enter your street with number 📌` +
                    `\n(e.g. 3 Abbey Rd., Шевченка 7)`
                );
            }
            else {
                console.log('\n========> Прийнятий ввід вулиці: ', text);
                let address = `${city} ${street}`;

                userSteps[chatId] = {
                    ...userSteps[chatId], // to save field city
                    step: 'waiting_for_range',
                    location: address
                };

                await bot.sendMessage(
                    chatId, 
                    `Now enter the search range in meters` +
                    `\n(Default is ${defaultRange} meters)`
                );

                console.log(`========> Інформація в об'єкті юзера: `, userSteps[chatId]);
            }
        }
        else if (userSteps[chatId]?.step === 'waiting_for_range') {
            const location = userSteps[chatId].location;
            
            console.log('\n\n========> Загальна локація користувача: ', location);
            console.log('========> Введений діапазон пошуку: ', text);

            let range = parseFloat(text);

            if (isNaN(range) || range <= 0) {
                range = defaultRange;
                await bot.sendMessage(
                    chatId, 
                    `Invalid range value. <b>Set to default: ${defaultRange} m.</b>`, 
                    { parse_mode: "HTML"}
                );
            }

            console.log(`========> Інформація в об'єкті юзера: `, userSteps[chatId], `\n\n`);

            await bot.sendMessage(
                chatId, 
                `Searching ${selectedCategory}'s around <b>'${location}'</b> within a <b>${range} m</b> radius... 🔍`,
                { parse_mode: "HTML"}    
            );

            await searchCafesByAddress(location, range);
            await sendCafeButtons(chatId);

            resetUserState(chatId);
        }
        else {
            initialChoice(chatId);
        }
    });

    bot.on('callback_query', async (callbackQuery) => {
        const cafeId = callbackQuery.data;
        const chatId = callbackQuery.message.chat.id;
    
        try {
            const cafe = await getCafeById(cafeId);
    
            if (cafe) {
                sendCafeInfo(cafe, chatId);
                // sendMapImageUrl(cafe, chatId);
                sendMapLink(cafe, chatId); 
            } 
            else {
                await bot.sendMessage(chatId, 'Cafe not found 😶');
            }
        } 
        catch (error) {
            console.error('========> Error fetching cafe details: ', error.message);
            bot.sendMessage(chatId, 'Error fetching cafe details.');
        }
    });
};

main();



// --------> validations
async function isValidCityInput(city) {
    const cityPattern = /^[a-zA-Z\u0400-\u04FF]+(?:[ -][a-zA-Z\u0400-\u04FF]+)*$/;
    return cityPattern.test(city);
}

async function isValidStreetInput(city, street) {
    const address = `${street}, ${city}`;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;

    try {
        // За допомогою axios.get відправляється запит до API, який передає сформовану адресу.
        const response = await axios.get(url);

        if (response.data.status === 'OK') {
            const result = response.data.results[0];
            console.log('========> Address found: ', result.formatted_address);
            return true;
        } 
        else if (response.data.status === 'ZERO_RESULTS') {
            console.log('========> Address not found');
            return false;
        }
    } 
    catch (error) {
        console.error('========> Error with Geocoding API:', error);
        return false;
    }
}

// --------> functions

async function sendCafeButtons(chatId) {
    try {
        const cafes = await getCafesFromDB();

        if (cafes.length === 0) {
            return await bot.sendMessage(chatId, 'Cafes not found'); 
        }

        // creating buttons
        const cafeButtons = cafes.map((cafe) => [
            { text: cafe.name, callback_data: cafe._id.toString() }
        ]);

        await bot.sendMessage(chatId, 'Choose cafe:', {
            reply_markup: { inline_keyboard: cafeButtons }
        });
    }
    catch (error) {
        console.error('--> Error retrieving cafe from database: ', error.message);
        bot.sendMessage(chatId, 'Error retrieving cafe from database');
    }
}


async function getCoordinates(address) {
    const geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

    try {
        const response = await axios.get(geocodeUrl, {
            params: {
                address: address,
                key: GOOGLE_API_KEY,
            },
        });

        if (response.data.status === 'OK') {
            const location = response.data.results[0].geometry.location;
            return location;
        }
        else {
            console.error('Coordinates could not be found: ', response.data.status);
            return null;
        }
    }
    catch (error) {
        console.error('--> Geocoding API Error: ', error.message);
        return null;
    }
}

async function findCafes(latitude, longitude, radius) {
    const placesUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

    try {
        const response = await axios.get(placesUrl, {
            params: {
                location: `${latitude},${longitude}`,
                radius: radius,
                type: 'cafe',
                key: GOOGLE_API_KEY,
            },
        });

        if (response.data.status === 'OK') {
            const cafes = response.data.results;

            console.log('Found cafes: ');
            cafes.forEach((cafe) => {
                console.log(`Name: ${cafe.name}, Address: ${cafe.vicinity}, Rating: ${cafe.rating}`);
            });

            await Cafe.deleteMany({});

            await saveCafesToDB(cafes);
        }
        else {
            console.log('--> Cafe search error: ', response.data.status);
        }
    }
    catch (error) {
        console.error('Places API Error: ', error.message);
    }
}

async function saveCafesToDB(cafes) {
    try {
        const cafeDocs = cafes.map((cafe) => ({
            name: cafe.name,
            address: cafe.vicinity,
            rating: cafe.rating || 0,
            location: cafe.geometry.location,
            place_id: cafe.place_id,
        }));

        await Cafe.insertMany(cafeDocs);
        
        console.log('Cafes successfully saved to dynamic_cafes table');
    }
    catch (error) {
        console.error('Error saving cafe to database: ', error.message);
    }
}

const getCafesFromDB = async () => Cafe.find();

async function searchCafesByAddress(address, radius) {
    await connectDB();

    const coordinates = await getCoordinates(address);
    if (coordinates) {
        await findCafes(coordinates.lat, coordinates.lng, radius);
    }
    else {
        console.log('Could not find the cafe due to an error in the address.');
    }
}

async function getCafeById(cafeId) {
    try {
        const cafe = await Cafe.findById(cafeId);
        return cafe;
    }
    catch (error) {
        console.error('Error getting cafe: ', error.message);
        return null;
    }
}

async function sendCafeInfo(cafe, chatId) {
    const message = `<b>${cafe.name}</b>` + 
                    `\n\n<b>Address:</b> ${cafe.address}📍` + 
                    `\n\n<b>Rating:</b> ${cafe.rating || '-'} ⭐`;
                
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
}

async function sendMapImageUrl(cafe, chatId) {
    const { location } = cafe;
    const latitude = location.lat;
    const longitude = location.lng;

    const imageUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    
    await bot.sendPhoto(chatId, imageUrl);
}

async function sendMapLink(cafe, chatId) {
    const { location } = cafe;
    const latitude = location.lat;
    const longitude = location.lng;

    const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    
    await bot.sendMessage(
        chatId, 
        `Here is the map to [${cafe.name}](${mapUrl})`, 
        { parse_mode: 'Markdown' }
    );  
}

// Виклик функції з прикладними даними
// const userAddress = 'Куліша 28 Борислав'; // Адреса користувача
// const searchRadius = 1500; // Радіус пошуку (2 км)
  
// searchCafesByAddress(userAddress, searchRadius);
// console.log("Кафе з БД: ");
// getCafesFromDB();

const initialChoice = async (chatId) => {
    const options = {
        reply_markup: {
          keyboard: [
            [`Cafe`, `Sport`],
            [`Park`, `Culture`],
          ],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      };
    
    await bot.sendMessage(chatId, `Select category`, options); 
};

const resetUserState = (chatId) => userSteps[chatId] = null;