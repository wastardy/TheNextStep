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
    sendPlacesButtons, 
    updatePlacesButtons, 
    sendRangeSelectionButtons 
} = require('./inline_buttons.js');

const connectDB = require('./db.js')
const Cafe = require('./models/cafe.js');
const Gym = require('./models/gym.js');
const Park = require('./models/park.js');
const Spa = require('./models/spa.js');

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

const dbTables = {
    Cafe,
    Gym,
    Park,
    Spa,
};

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
                `\nPlease enter your <b>City name</b> 📌` + 
                `\n\n(e.g. Київ, San Francisco, Абу-Дабі)`,
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
                    `\nPlease enter your <b>City name</b> 📌` + 
                    `\n\n(e.g. Київ, San Francisco, Абу-Дабі)`,
                    { parse_mode: "HTML"}    
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
                    `Now enter your <b>street with number</b> 📌` +
                    `\n\n(e.g. 3 Abbey Rd., Шевченка 7)`,
                    { parse_mode: "HTML"}    
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
                    `\nor you did not specify the street number` + 
                    `\n\nPlease enter a valid street 😌`
                );

                await bot.sendMessage(
                    chatId, 
                    `Enter your <b>street with number</b> 📌` +
                    `\n\n(e.g. 3 Abbey Rd., Шевченка 7)`,
                    { parse_mode: "HTML"}    
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
                    `Now enter the <b>search range</b> <u>between 500 and 5000 meters</u>` +
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
                requiredTableForUrl = userSteps[chatId].requiredTable;

                console.log(`\n========> Буде використано тип: ${placeType}, бд: ${userSteps[chatId].requiredTable}`);

                await searchPlacesByAddress(location, range, placeType, dbModel);
                await sendPlacesButtons(bot, chatId, 1, dbModel, requiredTableForUrl);
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
        
        userSteps[chatId] = {
            ...userSteps[chatId],
        };
        // console.log(`========> Інформація в об'єкті юзера (callback_query): `, userSteps[chatId]);

        const placeType = userSteps[chatId]?.placeType;
        dbModel = getRequiredTable(userSteps[chatId]?.requiredTable);
        requiredTableForUrl = userSteps[chatId]?.requiredTable;
    
        if (callbackData === 'set_default_range') {
            await handleSetDefaultRange(chatId, placeType, dbModel, requiredTableForUrl);
        }
        else if (callbackData === 'enter_range_again') {
            await handleEnterRangeAgain(chatId);
        }
        else if (callbackData.startsWith('page_')) {
            const page = parseInt(callbackData.split('_')[1], 10);
            await updatePlacesButtons(bot, chatId, page, messageId, dbModel);
        }
        else {
            await handlePlaceSelection(chatId, callbackData, dbModel);
        }
    });
};

main();

// #region callback_handlers
async function handleEnterRangeAgain(chatId) {
    await bot.sendMessage(
        chatId,
        `Please enter the <b>search range</b> <u>between 500 and 5000 meters</u>` +
        `\n(Default is ${defaultRange} meters)`, 
        { parse_mode: 'HTML' }
    );
}

async function handleSetDefaultRange(chatId, placeType, requiredTable, requiredTableForUrl) {
    userSteps[chatId] = {
        ...userSteps[chatId],
    };

    userSteps[chatId].range = defaultRange;

    await bot.sendMessage(
        chatId,
        `Range set to default: <b>${defaultRange} meters</b>`,
        { parse_mode: "HTML"}
    );

    console.log('======> користувач містить: ', userSteps[chatId]);
    
    const location = userSteps[chatId].location;
    const range = userSteps[chatId].range;

    console.log('\n\n========> handleSetDefaultRange() передана таблиця:', requiredTable);

    await bot.sendMessage(
        chatId, 
        `Searching ${placeType}'s around <b>'${location}'</b> within a <b>${range} m</b> radius... 🔍`,
        { parse_mode: "HTML"}    
    );

    await searchPlacesByAddress(location, range, placeType, requiredTable);
    await sendPlacesButtons(bot, chatId, 1, requiredTable, requiredTableForUrl);

    // resetUserState(chatId);
}

async function handlePlaceSelection(chatId, placeId, requiredTable) {
    try {
        const place = await getPlaceById(placeId, requiredTable);

        if (place) {
            await sendPlaceInfo(place, chatId);
            await sendMapLink(place, chatId); 
        } 
        else {
            await bot.sendMessage(chatId, 'Place not found 😶');
            console.log(`--------> ${place.name} not found`);
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
        console.log('--------> Тип місць для пошуку:', placeType);

        const response = await axios.get(placesUrl, {
            params: {
                location: `${latitude},${longitude}`,
                radius: radius,
                type: placeType,
                key: GOOGLE_API_KEY,
            },
        });

        // console.log('===========================> response data', response.data);

        let responseStatus = response.data.status;
        console.log('========> RESPONSE STATUS:', responseStatus);

        if (responseStatus === 'OK') {
            const places = response.data.results;

            if (!requiredTable) {
                console.log(`--------> findPlaces() Invalid datatable type -> ${requiredTable}`);
                return;
            }

            console.log(`\nFound ${placeType}s:`);
            displayPlacesTable(places);

            console.log('\n-------> потрібна таблиця бд:', requiredTable);

            await savePlacesToDB(responseStatus, places, requiredTable);
        }
        else if (responseStatus === 'ZERO_RESULTS') {
            const places = [];
            console.error(`--------> No places found in the specified search area (ZERO_RESULTS)`);
            await savePlacesToDB(responseStatus, places, requiredTable);
            return;
        }
        else {
            console.error(`-------> findPlaces() ${placeType} search error: `, response.data.status);
        }
    }
    catch (error) {
        console.error('-------> findPlaces() Places API Error: ', error.message);
    }
}

async function savePlacesToDB(responseStatus, places, requiredTable) {
    try {
        if (responseStatus === 'OK') {
            await requiredTable.deleteMany({});
            console.log(`-------> Очищено всі попередні дані з ${requiredTable.name}`);
            
            const placeDocs = await Promise.all(places.map(async (place) => {
                let photoURL = '';

                if (place.photos && place.photos.length > 0) {
                    const photoReference = place.photos[0].photo_reference;
                    photoURL = getPhotoUrl(photoReference);
                }

                return {
                    photo_url: photoURL, 
                    name: place.name,
                    address: place.vicinity,
                    is_open: place.opening_hours ? place.opening_hours.open_now : false,
                    rating: place.rating ?? 0,
                    location: place.geometry.location,
                    place_id: place.place_id,
                };
            }));

            console.log('-------> savePlacesToDB() Сортую дані');

            placeDocs.sort((a, b) => b.rating - a.rating);

            // for (const place of placeDocs) {
            //     console.log(`Name: ${place.name} - rating: ${place.rating}`);
            // }

            console.log('-------> savePlacesToDB() Записую дані в ', requiredTable);

            await requiredTable.insertMany(placeDocs);
            
            console.log(`-------> Places successfully saved to table`);
        }
        else {
            await requiredTable.deleteMany({});
            console.log(`-------> else* Очищено всі попередні дані з ${requiredTable.name}`);
            return;
        }
    }
    catch (error) {
        console.error(`-------> Error saving ${placeType}s to database: `, error.message);
    }
}

// Функція для формування URL фото за photo_reference
function getPhotoUrl(photoReference) {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${GOOGLE_API_KEY}`;
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

async function getPlaceById(placeId, requiredTable) {
    try {
        const place = await requiredTable.findById(placeId);
        return place;
    }
    catch (error) {
        console.error('========> Error getting place: ', error.message);
        return null;
    }
}

async function sendPlaceInfo(place, chatId) {
    
    let isOpen = place.is_open === true ? 'open now! ✅' : '-';

    const message = `<b>${place.name}</b>` + 
                    `\n\n<b>Address:</b> ${place.address}📍` + 
                    `\n\n<b>Is open:</b> ${isOpen}` + 
                    `\n\n<b>Rating:</b> ${place.rating || '-'} ⭐`;
                
    // console.log('--------> sendPlaceInfo(): ', message);
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
}

async function sendMapLink(place, chatId) {
    const { location } = place;
    const latitude = location.lat;
    const longitude = location.lng;

    const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    
    // console.log('--------> sendMapLink(): ', mapUrl);
    await bot.sendMessage(
        chatId, 
        `Here is the map to [${place.name}](${mapUrl})`, 
        { parse_mode: 'Markdown' }
    );  
}

function getRequiredTable(requiredTable) {
    return dbTables[requiredTable] || null;
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

function formatRow(columns, width) {
    return columns.map((col, index) => col.toString().padEnd(width[index], ' ')).join(' | ');
}

function displayPlacesTable(places) {
    const columnWidths = [40, 50, 10, 10];

    console.log(formatRow(['Name', 'Address', 'Rating', 'Status'], columnWidths));
    console.log('-'.repeat(columnWidths.reduce((a, b) => a + b + 3, 0))); // Лінія розділу

    places.forEach((place) => {
        const isOpen = place.opening_hours ? (place.opening_hours.open_now ? 'Open' : 'Closed') : '-';
        const row = formatRow(
            [place.name, place.vicinity, place.rating ?? '-', isOpen],
            columnWidths
        );
        console.log(row);
    });
}