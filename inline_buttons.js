async function getPlacesFromDB(requiredTable) {
    try {
        const places = await requiredTable.find();
        return places || [];
    }
    catch (error) {
        console.error('======> Error fetching places getPlacesFromDB():', error);
        return []; 
    }
}

async function sendWebsiteButton(bot, chatId, requiredTable) {
    try {
        console.log('\n--------> ТИП, ЯКИЙ ПЕРЕДАЄТЬСЯ В URL:', requiredTable, '\n');
        bot.sendMessage(chatId, 'Better overview of places:', {
            reply_markup: {
                inline_keyboard: [
                    [
                        { 
                            text: 'Open the web page🎴', 
                            url: `https://flariii.github.io/TheNextStep_website/?type=${requiredTable}` 
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

async function sendPlacesButtons(bot, chatId, page = 1, requiredTable, requiredTableForUrl) {
    const placesPerPage = 5;

    try {
        const places = await getPlacesFromDB(requiredTable);

        if (!Array.isArray(places)) {
            console.error('Received data is not an array:', places);
            return await bot.sendMessage(chatId, 'Error retrieving places from database');
        }

        if (places.length === 0) {
            return await bot.sendMessage(chatId, 'No places in your range🥲'); 
        }

        // calculate start and end indexes for current page
        const startIndex = (page - 1) * placesPerPage;
        const endIndex = startIndex + placesPerPage;
        const pagePlaces = places.slice(startIndex, endIndex);

        // creating buttons
        const placeButtons = pagePlaces.map((place) => [
            { text: place.name, callback_data: place._id.toString() }
        ]);

        // navigation buttons
        const navigationButtons = [];
        if (page > 1) {
            navigationButtons.push({ text: '⏮️ Previous', callback_data: `page_${page - 1}` });
        }
        if (endIndex < places.length) {
            navigationButtons.push({ text: 'Next ⏭️', callback_data: `page_${page + 1}` });
        }
        if (navigationButtons.length > 0) {
            placeButtons.push(navigationButtons); // add arrows for current page
        }

        const message = await bot.sendMessage(chatId, 'Choose place:', {
            reply_markup: { inline_keyboard: placeButtons }
        });

        sendWebsiteButton(bot, chatId, requiredTableForUrl);

        currentMessageId = message.message_id;
    }
    catch (error) {
        console.error(`========> Error retrieving ${places} from database: `, error.message);
        bot.sendMessage(chatId, `Error retrieving ${places} from database`);
    }
}

async function updatePlacesButtons(bot, chatId, page, messageId, requiredTable) {
    const placesPerPage = 5;

    try {
        const places = await getPlacesFromDB(requiredTable);

        if (places.length === 0) {
            return await bot.sendMessage(chatId, 'No places in your range🥲'); 
        }

        // calculate start and end indexes for current page
        const startIndex = (page - 1) * placesPerPage;
        const endIndex = startIndex + placesPerPage;
        const pagePlaces = places.slice(startIndex, endIndex);

        // creating buttons
        const placeButtons = pagePlaces.map((place) => [
            { text: place.name, callback_data: place._id.toString() }
        ]);

        // navigation buttons
        const navigationButtons = [];
        if (page > 1) {
            navigationButtons.push({ text: '⏮️ Previous', callback_data: `page_${page - 1}` });
        }
        if (endIndex < places.length) {
            navigationButtons.push({ text: 'Next ⏭️', callback_data: `page_${page + 1}` });
        }
        if (navigationButtons.length > 0) {
            placeButtons.push(navigationButtons); // add arrows for current page
        }

        // update buttons in existing message
        await bot.editMessageReplyMarkup(
            { inline_keyboard: placeButtons },
            { chat_id: chatId, message_id: messageId }
        );
    }
    catch (error) {
        console.error('========> Error updating places buttons: ', error.message);
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
    sendPlacesButtons,
    updatePlacesButtons,
    sendRangeSelectionButtons,
};