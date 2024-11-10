const telegramAPI = require('node-telegram-bot-api');
const { inlineKeyboard } = require('telegraf/markup');
const { callbackQuery } = require('telegraf/filters');
const axios = require('axios'); // for HTTP requests
const express = require('express');
const token = require('./token.js');
const GOOGLE_API_KEY = require('./google_api_key.js');

const { 
    isValidCityInput, 
    isValidStreetInput, 
    isValidRangeInput 
} = require('./validation.js');

const {  
    sendCafeButtons, 
    updateCafeButtons, 
    sendRangeSelectionButtons 
} = require('./inline_buttons.js');

const connectDB = require('./db.js')
const Cafe = require('./models/cafe.js');
const Gym = require('./models/gym.js');
const Park = require('./models/park.js');
// const Restaurant = require('./models/restaurant.js');
const Spa = require('./models/spa.js');
// const MovieTheater = require('./models/movie_theater.js');

// const models = {
//     cafe: Cafe,
//     gym: Gym,
//     park: Park,
//     restaurant: Restaurant,
//     spa: Spa,
//     movie_theater: MovieTheater,
// };

const bot = new telegramAPI(token, { polling: true });

// --------------------------------------------------

const userSteps = {};
const defaultRange = 1000; 

const categories = {
    'Cafe': 'cafe', 
    'Gym': 'gym', 
    'Park': 'park', 
    'Spa': 'spa',
};
// 'Restaurant': 'restaurant',
// 'Movie Theater': 'movie_theater',

const dbTables = {
    Cafe,
    Gym,
    Park,
    Spa,
};
// Restaurant: Restaurant,
// MovieTheater: MovieTheater,

// ========================================================== RIGHT WAY!!!!!!
function getRequiredTable(requiredTable) {
    return dbTables[requiredTable] || null;
}

let currentMessageId = '';
let slectedCategoryDB = '';
let dbModel;

const main = () => {
    bot.setMyCommands([
        { command: `/start`, description: 'start chat with the bot' },
    ]);

    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        
        resetUserState(chatId);
        userSteps[chatId] = 'choosing_category';

        initialChoice(chatId);  
    });

    bot.on('polling_error', (error) => {
        console.log(error.code);  
        console.log(error.message);  
    });    

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const text = msg.text;
        
        if (text === `/start`) return; 

        if (text && categories[text]) {

            let selectedCategory = text;
            let placeType = categories[text];
            // slectedCategoryDB = models[placeType];

            console.log('\n\n========> Вибір, як параметр: ', placeType);

            userSteps[chatId] = {
                userId: userId,
                step: 'waiting_for_city', 
                requiredTable: selectedCategory,
                placeType: placeType,
            }; 
            
            console.log(`========> Інформація в об'єкті юзера: `, userSteps[chatId]);
            console.log('----------------------------------------------------- Категорія\n')

            await bot.sendMessage(
                chatId, 
                `You chose <b>${selectedCategory}</b>` + 
                `\nPlease enter your city 📌` + 
                `\n(e.g. Київ, San Francisco, Абу-Дабі)`,
                { parse_mode: "HTML"}
            );
        }
        else if (userSteps[chatId]?.step === 'waiting_for_city') {
            console.log('\n========> Введене місто: ', text);

            const isValidCity = await isValidCityInput(text);

            if (!isValidCity) {
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
                    `\n(e.g. Київ, San Francisco, Абу-Дабі)`
                );
            }
            else {
                console.log('========> Прийнятий ввід міста: ', text);

                userSteps[chatId] = {
                    ...userSteps[chatId],
                    step: 'waiting_for_street',
                    city: text
                };
    
                console.log(`========> Інформація в об'єкті юзера: `, userSteps[chatId]);
                console.log('----------------------------------------------------- Місто\n\n');

                await bot.sendMessage(
                    chatId, 
                    `Now enter your street with number 📌` +
                    `\n(e.g. 3 Abbey Rd., Шевченка 7)`
                );
            }
        }
        // перевірка на введення вулиці і введення діапазону пошуку
        else if (userSteps[chatId]?.step === 'waiting_for_street') {
            console.log('========> Введена вулиця: ', text);

            let city = userSteps[chatId].city;
            let street = text;

            const isValidStreet = await isValidStreetInput(city, street);

            if (!isValidStreet) {
                console.log('========> Обробка випадку з неправильним вводом вулиці..')

                await bot.sendMessage(
                    chatId,
                    `Street ${street} not found in ${city}` + 
                    `Please enter a valid street 😌`
                );

                await bot.sendMessage(
                    chatId, 
                    `Enter your street with number 📌` +
                    `\n(e.g. 3 Abbey Rd., Шевченка 7)`
                );
            }
            else {
                console.log('========> Прийнятий ввід вулиці: ', street);
                let address = `${city} ${street}`;

                userSteps[chatId] = {
                    ...userSteps[chatId],
                    step: 'waiting_for_range',
                    location: address,
                };

                console.log(`========> Інформація в об'єкті юзера: `, userSteps[chatId]);
                console.log('----------------------------------------------------- Вулиця\n');

                await bot.sendMessage(
                    chatId, 
                    `Now enter the search range <b>between 50 and 5000 meters</b>` +
                    `\n(Default is ${defaultRange} meters)`, 
                    { parse_mode: 'HTML' }
                );
            }
        }
        else if (userSteps[chatId]?.step === 'waiting_for_range') {
            const location = userSteps[chatId].location;

            console.log('\n\n========> Загальна локація користувача: ', location);
            console.log('========> Введений діапазон пошуку: ', text);

            let range = parseFloat(text);

            const isValidRange = await isValidRangeInput(range);

            if (!isValidRange) {
                await bot.sendMessage(chatId, 'Incorrectly entered range');
                await sendRangeSelectionButtons(bot, chatId);
            }
            else {
                console.log('========> Прийнятий ввід діапазону: ', range);

                userSteps[chatId] = {
                    ...userSteps[chatId],
                    searchRange: range,
                };

                console.log(`========> Інформація в об'єкті юзера: `, userSteps[chatId]);
                console.log('----------------------------------------------------- Діапазон\n\n');

                await bot.sendMessage(
                    chatId, 
                    `Searching ${userSteps[chatId].placeType}'s ` + 
                    `around <b>'${location}'</b> within a <b>${range} m</b> radius... 🔍`,
                    { parse_mode: "HTML"}    
                );

                const placeType = userSteps[chatId].placeType;
                // const dbModel = dbTables[userSteps[chatId].requiredTable];
                dbModel = getRequiredTable(userSteps[chatId].requiredTable);
                console.log(`\n\n========> Буде використано тип: ${placeType}, бд: ${userSteps[chatId].requiredTable}`);

                await searchPlacesByAddress(location, range, placeType, dbModel);
                await sendCafeButtons(bot, chatId, 1, dbModel);

                resetUserState(chatId);
            }
        }
        else {
            initialChoice(chatId);
        }
    });

    bot.on('callback_query', async (callbackQuery) => {
        const callbackData = callbackQuery.data;
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
    
        if (callbackData === 'set_default_range') {
            await handleSetDefaultRange(chatId, userSteps);
        }
        else if (callbackData === 'enter_range_again') {
            await handleEnterRangeAgain(chatId);
        }
        else if (callbackData.startsWith('page_')) {
            const page = parseInt(callbackData.split('_')[1], 10);
            await updateCafeButtons(bot, chatId, page, messageId, dbModel);
        }
        else {
            await handleCafeSelection(chatId, callbackData);
        }
    });
};

main();

// #region callback_handlers
async function handleEnterRangeAgain(chatId) {
    await bot.sendMessage(
        chatId,
        'Please enter a search range between 50 and 5000 meters'
    );
}

async function handleSetDefaultRange(chatId, userSteps) {
    userSteps[chatId].range = defaultRange;

    await bot.sendMessage(
        chatId,
        `Range set to default: <b>${defaultRange} meters</b>`,
        { parse_mode: "HTML"}
    );

    console.log('======> користувач містить: ', userSteps[chatId]);
    
    const location = userSteps[chatId].location;
    const range = userSteps[chatId].range;
    const placeType = userSteps[chatId].placeType;
    const requiredTable = userSteps[chatId].requiredTable;

    await bot.sendMessage(
        chatId, 
        `Searching ${selectedCategory}'s around <b>'${location}'</b> within a <b>${range} m</b> radius... 🔍`,
        { parse_mode: "HTML"}    
    );

    await searchPlacesByAddress(location, range, placeType, requiredTable);
    await sendCafeButtons(chatId, 1);

    resetUserState(chatId);
}

async function handleCafeSelection(chatId, placeId) {
    try {
        const place = await getPlaceById(placeId);

        if (place) {
            await sendPlaceInfo(place, chatId);
            await sendMapLink(place, chatId); 
        } 
        else {
            await bot.sendMessage(chatId, 'Place not found 😶');
        }
    } 
    catch (error) {
        console.error(`========> Error fetching place details: `, error.message);
        bot.sendMessage(chatId, 'Error fetching place details.');
    }
}
// #endregion

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
            console.error('--------> getCoordinates() Coordinates could not be found: ', response.data.status);
            return null;
        }
    }
    catch (error) {
        console.error('--------> getCoordinates() Geocoding API Error: ', error.message);
        return null;
    }
}

async function findPlaces(latitude, longitude, radius, placeType, requiredTable) {
    const placesUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

    try {
        console.log('-------->', placeType);

        const response = await axios.get(placesUrl, {
            params: {
                location: `${latitude},${longitude}`,
                radius: radius,
                type: placeType,
                key: GOOGLE_API_KEY,
            },
        });

        if (response.data.status === 'OK') {
            const places = response.data.results;

            if (!requiredTable) {
                console.log(`-------> findPlaces() Invalid datatable type -> ${requiredTable}`);
                return;
            }

            console.log(`Found ${placeType}s:`);
            places.forEach((place) => {
                console.log(`Name: ${place.name}, Address: ${place.vicinity}, Rating: ${place.rating}`);
            });

            console.log('---- потрібна таблиця бд ---->', requiredTable);
            // await requiredTable.deleteMany({});

            await savePlacesToDB(places, requiredTable);
        }
        else {
            console.error(`-------> findPlaces() ${params.type} search error: `, response.data.status);
        }
    }
    catch (error) {
        console.error('-------> findPlaces() Places API Error: ', error.message);
    }
}

async function savePlacesToDB(places, requiredTable) {
    try {
        const placeDocs = places.map((place) => ({
            name: place.name,
            address: place.vicinity,
            rating: place.rating ?? 0,
            location: place.geometry.location,
            place_id: place.place_id,
        }));

        console.log('-------> savePlacesToDB() Записую дані в ', requiredTable);

        await requiredTable.insertMany(placeDocs);
        
        console.log(`-------> Places successfully saved to table`);
    }
    catch (error) {
        console.error(`-------> Error saving ${placeType}s to database: `, error.message);
    }
}

async function getPlacesFromDB() {
    try {
        const places = await Model.find();
        return places || [];
    }
    catch (error) {
        console.error('======> Error fetching places getPlacesFromDB():', error);
        return []; 
    }
}

async function searchPlacesByAddress(address, radius, placeType, requiredTable) {
    await connectDB();

    const coordinates = await getCoordinates(address);
    if (coordinates) {
        await findPlaces(coordinates.lat, coordinates.lng, radius, placeType, requiredTable);
    }
    else {
        console.log('--------> searchPlacesByAddress() Could not find place due to an error in the address.');
    }
}

async function getCafeById(cafeId) {
    try {
        const cafe = await Cafe.findById(cafeId);
        return cafe;
    }
    catch (error) {
        console.error('========> Error getting cafe: ', error.message);
        return null;
    }
}

async function sendPlaceInfo(place, chatId) {
    const message = `<b>${place.name}</b>` + 
                    `\n\n<b>Address:</b> ${place.address}📍` + 
                    `\n\n<b>Rating:</b> ${place.rating || '-'} ⭐`;
                
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

async function initialChoice(chatId) {
    const options = {
        reply_markup: {
            keyboard: [
                ['Cafe', 'Gym'],
                ['Park', 'Spa'],
                // ['Restaurant', 'Movie Theater'],
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };
    
    await bot.sendMessage(chatId, `Select category`, options); 
}

function resetUserState(chatId) {
    userSteps[chatId] = null;
}