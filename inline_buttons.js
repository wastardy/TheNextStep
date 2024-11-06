const Cafe = require('./models/cafe.js');

async function getCafesFromDB() {
    try {
        const cafes = await Cafe.find();
        return cafes || [];
    }
    catch (error) {
        console.error('======> Error fetching cafes getCafesFromDB():', error);
        return []; 
    }
}

async function sendWebsiteButton(bot, chatId) {
    try {
        bot.sendMessage(chatId, 'Better overview of places:', {
            reply_markup: {
                inline_keyboard: [
                    [
                        { 
                            text: 'Open the web page🎴', 
                            url: 'https://flariii.github.io/TheNextStep_website/' 
                        }
                    ]
                ]
            }
        });
    }
    catch (error) {
        console.error('========> Error sending website button: ', error.message);
        bot.sendMessage(chatId, 'Error sending website button');
    }
}

async function sendCafeButtons(bot, chatId, page = 1) {
    const placesPerPage = 5;

    try {
        const cafes = await getCafesFromDB();

        if (!Array.isArray(cafes)) {
            console.error('Received data is not an array:', cafes);
            return await bot.sendMessage(chatId, 'Error retrieving cafes');
        }

        if (cafes.length === 0) {
            return await bot.sendMessage(chatId, 'Cafes not found 🥲'); 
        }

        // calculate start and end indexes for current page
        const startIndex = (page - 1) * placesPerPage;
        const endIndex = startIndex + placesPerPage;
        const pagePlaces = cafes.slice(startIndex, endIndex);

        // creating buttons
        const cafeButtons = pagePlaces.map((cafe) => [
            { text: cafe.name, callback_data: cafe._id.toString() }
        ]);

        // navigation buttons
        const navigationButtons = [];
        if (page > 1) {
            navigationButtons.push({ text: '⏮️ Previous', callback_data: `page_${page - 1}` });
        }
        if (endIndex < cafes.length) {
            navigationButtons.push({ text: 'Next ⏭️', callback_data: `page_${page + 1}` });
        }
        if (navigationButtons.length > 0) {
            cafeButtons.push(navigationButtons); // add arrows for current page
        }

        const message = await bot.sendMessage(chatId, 'Choose cafe:', {
            reply_markup: { inline_keyboard: cafeButtons }
        });

        sendWebsiteButton(bot, chatId);

        currentMessageId = message.message_id;
    }
    catch (error) {
        console.error('========> Error retrieving cafe from database: ', error.message);
        bot.sendMessage(chatId, 'Error retrieving cafe from database');
    }
}

async function updateCafeButtons(bot, chatId, page, messageId) {
    const placesPerPage = 5;

    try {
        const cafes = await getCafesFromDB();

        if (cafes.length === 0) {
            return await bot.sendMessage(chatId, 'Cafes not found 🥲'); 
        }

        // calculate start and end indexes for current page
        const startIndex = (page - 1) * placesPerPage;
        const endIndex = startIndex + placesPerPage;
        const pagePlaces = cafes.slice(startIndex, endIndex);

        // creating buttons
        const cafeButtons = pagePlaces.map((cafe) => [
            { text: cafe.name, callback_data: cafe._id.toString() }
        ]);

        // navigation buttons
        const navigationButtons = [];
        if (page > 1) {
            navigationButtons.push({ text: '⏮️ Previous', callback_data: `page_${page - 1}` });
        }
        if (endIndex < cafes.length) {
            navigationButtons.push({ text: 'Next ⏭️', callback_data: `page_${page + 1}` });
        }
        if (navigationButtons.length > 0) {
            cafeButtons.push(navigationButtons); // add arrows for current page
        }

        // update buttons in existing message
        await bot.editMessageReplyMarkup(
            { inline_keyboard: cafeButtons },
            { chat_id: chatId, message_id: messageId }
        );
    }
    catch (error) {
        console.error('========> Error updating cafe buttons: ', error.message);
    }
}

async function sendRangeSelectionButtons(bot, chatId) {
    await bot.sendMessage(chatId, 'Select the appropriate action:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Set default range (1000 m)', callback_data: 'set_default_range' }],
                [{ text: 'Enter search range again', callback_data: 'enter_range_again'}]
            ]
        }
    });
}

module.exports = {
    sendWebsiteButton, 
    sendCafeButtons,
    updateCafeButtons,
    sendRangeSelectionButtons,
};