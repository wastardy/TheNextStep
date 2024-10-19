const telegramAPI = require(`node-telegram-bot-api`);
const TelegramBot = require("node-telegram-bot-api");
const { inlineKeyboard } = require("telegraf/markup");
const { callbackQuery } = require("telegraf/filters");
const token = require(`./token.js`);
const googleMapsAPIKey = require(`./google_api_key.js`);

const bot = new telegramAPI(token, { polling: true });

const axios = require(`axios`); // for HTTP requests

const express = require(`express`);
const mongoose = require(`mongoose`);
const Cafe = require('./models/cafe.js');
const cafe = require("./models/cafe.js");

const app = express();

app.get('/', (req, res) => res.send('Bot is running'));
app.listen(3000, () => console.log('Server is running at http://localhost:3000'))

mongoose.connect('mongodb://localhost:27017/the_next_step')
    // promises
    .then(() => console.log('MongoDB connected successfully'))
    .catch(error => console.error(`MongoDB connection error: ${error}`))

const userSteps = {}; // track user progress
const defaultRange = 1; 
let selectedCategory = '';

const start = () => {
    bot.setMyCommands([
        { command: `/start`, description: `start chat with the bot` }
        // { command: `/cafe`, description: `choose a cafe` }
    ]);

    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        
        // if (userSteps[chatId] === 'choosing_category') return;
        resetUserState(chatId);
        userSteps[chatId] = 'choosing_category';

        initialChoice(chatId);  
    });

    // handle user choices
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (text === '/start') return; 

        if ([`cafe`, `sport`, `park`, `culture`].includes(text.toLowerCase())) {
            selectedCategory = text;
            userSteps[chatId] = 'waiting_for_location'; // Update user step
            await bot.sendMessage(chatId, `You chose ${selectedCategory}.` + 
                                    `\nPlease enter your location 📌`);
        }
        else if (userSteps[chatId] === 'waiting_for_location') {
            userSteps[chatId] = {
                step: 'waiting_for_range',
                location: text
            };
            await bot.sendMessage(chatId, `Now enter the search range in km` +
                                    `\n(Default is ${defaultRange} km)`);
        }
        else if (userSteps[chatId]?.step === 'waiting_for_range') {
            const location = userSteps[chatId].location;
            
            let range = parseFloat(text);

            if (isNaN(range) || range <= 0) {
                range = defaultRange;
                await bot.sendMessage(
                    chatId, 
                    `Invalid range value. <b>Set to default: ${defaultRange} km.</b>`, 
                    { parse_mode: "HTML"}
                );
            }

            await bot.sendMessage(
                chatId, 
                `Searching ${selectedCategory}'s around <b>'${location}'</b> within a <b>${range} km</b> radius... 🔍`,
                { parse_mode: "HTML"}    
            );
            
            const cafes = await findCafesInRange(location, range);
            
            sendCafeList(chatId, location, range);

            resetUserState(chatId);

            // TODO: Add Google Maps API call here to perform the search
        }
        else {
            // await bot.sendMessage(chatId, 'Please choose a valid option or start again with /start.');
            initialChoice(chatId);
        }
    });

    bot.on('callback_query', async (msg) => {
        const data = msg.data;
        const chatId = msg.message.chat.id;

        if (mongoose.Types.ObjectId.isValid(data)) {
            try {
                const cafe = await Cafe.findById(data);
                if (cafe) {
                    const cafeDetails = `📍<b>${cafe.name}</b>` +
                        `\n\n📍 Address: ${cafe.address}` +
                        `\n\n🕒 Working Hours: ${cafe.working_hours}` +
                        `\n\n☎️ Phone Number: ${cafe.phone_number}` +
                        `\n\n⭐ Rating: ${cafe.rating}/5\n`;
                    
                        // const mapUrl = `https://www.google.com/maps/@?api=1&map_action=map&center=${cafe.latitude},${cafe.longitude}&zoom=15`;
                        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${cafe.latitude},${cafe.longitude}`;

                        await bot.sendMessage(chatId, cafeDetails, { parse_mode: 'HTML' });

                        await bot.sendPhoto(chatId, mapUrl); // , { caption: `🗺️ Here is the map: ${mapUrl}` }

                        await bot.sendMessage(
                            chatId, 
                            `Here is the map to [${cafe.name}](${mapUrl})`, 
                            { parse_mode: 'Markdown' }
                        );
                } 
                else {
                    await bot.sendMessage(chatId, 'Cafe not found 😶');
                }
            }
            catch (error) {
                console.error(`Error fetching cafe details: ${error}`);
                await bot.sendMessage(chatId, 'Error fetching cafe details.');
            }
        }
    });
};

start();


// --------> functions

const sendCafeList = async (chatId, location, range) => {
    try {
        const cafes = await findCafesInRange(location, range);
        console.log('Fetched cafes: ', cafes); // log the cafes to check
        
        if (cafes.length > 0) {
            const cafeButtons = cafes.map(cafe => [
                { text: cafe.name, callback_data: cafe._id.toString() }
            ]);

            await bot.sendMessage(chatId, 'Choose a cafe:', {
                reply_markup: { inline_keyboard: cafeButtons }
            });
        }
        else {
            await bot.sendMessage(chatId, `No cafes found within ${range} km 😶`);
        }
    }
    catch (error) {
        console.error('Error fetching cafes:', error);
        await bot.sendMessage(chatId, 'Error occurred while retrieving cafes.');
    }
}

const findCafesInRange = async (location, range) => {
    return Cafe.find();
};

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
}

const resetUserState = (chatId) => userSteps[chatId] = null;

/* const requestsLocation = (chatId) =>  {
    bot.sendMessage(chatId, `Please enter your location 📌`);
}*/

/* const requestRange = (chatId) => {
    bot.sendMessage(chatId, `Now enter the search range in km` +
                            `\n(Default is ${defaultRange} km)`);
} */

// !!!!!!!!!!!!!!!!
/* async function findCafesInRange(location, range) {
    try {
        //  розрахунок введення локації та діапазону
        const [lat, lon] = location.split(',').map(coord => parseFloat(coord.trim()));
    
        if (isNaN(lat) || isNaN(lon)) {
            throw new Error('Invalid location format. Please enter coordinates like: "50.4501, 30.5234".');
        }

        // Конвертація радіусу в градуси
        const radiusInDegrees = range / 111; 

        return await Cafe.find({
            latitude: { $gte: lat - radiusInDegrees, $lte: lat + radiusInDegrees },
            longitude: { $gte: lon - radiusInDegrees, $lte: lon + radiusInDegrees }
        });
    }
    catch (error) {
        console.error(`Error in findCafesInRange: ${error.message}`);
        return []; // Повертаємо пустий масив, якщо сталася помилка
    }
} */