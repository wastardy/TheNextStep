places.forEach((place) => {
    if (place.opening_hours) {
        console.log(`Opening hours found for ${place.name}`);
        console.log('opening ours містить:', place.opening_hours);
        // Перебір всіх ключів об'єкта place.opening_hours
        // console.log(Object.keys(place.opening_hours));
        var keys = [];
        // Перебираємо всі ключі об'єкта place.opening_hours
        Object.keys(place.opening_hours).forEach((key) => {
            if (keys.indexOf(key) === -1) {
                keys.push(key); // Додаємо ключ до масиву, якщо він ще не доданий
            }
        });
        console.log(keys);
    } 
    else {
        console.log(`No opening hours for ${place.name}`);
    }
});

console.log('\n\n\n');
const dayIndex = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.


/* // Схема для збереження кафе

    const mongoose = require('mongoose');

    const DynamicCafeSchema = new mongoose.Schema({
        name: String,
        address: String,
        coordinates: {
        latitude: Number,
        longitude: Number
        },
        phone_number: String,
        rating: Number,
        place_id: String
    });

    module.exports = mongoose.model('DynamicCafe', DynamicCafeSchema);
*/

/*
    const mongoose = require('mongoose');

    // const cafeSchema = new mongoose.Schema({
    //     name: String,
    //     address: String,
    //     working_hours: String, // таблиця на тиждень з робочими годинами
    //     phone_number: String, // масив для номерів
    //     rating: Number, // таблиця для відгуків і рейтингу
    //     latitude: Number,
    //     longitude: Number
    // });

    const cafeSchema = new mongoose.Schema({
        name: String,
        address: String,
        working_hours: String, 
        phone_number: String, 
        rating: Number, 
        latitude: Number,
        longitude: Number
    });

    module.exports = mongoose.model('Cafe', cafeSchema, 'cafes');
*/


// mongoose.connect('mongodb://localhost:27017/the_next_step')
//     .then(() => console.log('MongoDB connected successfully'))
//     .catch(error => console.error(`MongoDB connection error: ${error}`))

// const app = express();

// app.get('/', (req, res) => res.send('Bot is running'));
// app.listen(3000, () => console.log('Server is running at http://localhost:3000'))


/*
    /project-root
    │
    ├── /src
    │   ├── /services
    │   │   ├── cafeService.js        // Логіка роботи з кафе та БД
    │   │   ├── locationService.js    // Логіка роботи з координатами та Google API
    │   │   ├── messageService.js     // Логіка повідомлень та кнопок
    │   │
    │   ├── index.js                  // Головний файл бота
    │   └── db.js                     // Підключення до БД
    │
    ├── /models
    │   └── cafe.js                   // Модель кафе для MongoDB
    ├── package.json
    └── token.js
*/
// ================================ ?????????????????????????????????????????
function handleInitialButtonClick(chatId, buttonName, userSteps) {
    if (dbTables[buttonName]) {
        userSteps[chatId] = {
            ...userSteps[chatId],
            requiredTable: buttonName,
        };
    }
}

async function sendWebsiteButton(chatId) {
    try {
        bot.sendMessage(chatId, 'Follow the link below to open the web page:', {
            reply_markup: {
                inline_keyboard: [
                    [
                        { 
                            text: 'for better overview of places🎴', 
                            url: 'https://wastardy.github.io/foresthideways_website/' 
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

sendWebsiteButton(chatId);

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
            // console.log(`Name\t\t\t\tAddress\t\t\t\tRating\t\t\t\tStatus`);
            // places.forEach((place) => {
            //     const isOpen = place.opening_hours ? place.opening_hours.open_now ?? '-' : '-';
            //     console.log(`${place.name}\t\t\t\t${place.vicinity}\t\t\t\t${place.rating}\t\t\t\t${isOpen}`);
            // });

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

/* // список кафе в кнопках
    const sendCafeList = async (chatId, location, range, category) => {
    try {
        const cafes = await findCafesInRange(location, range);
        console.log('Fetched cafes: ', cafes); // log the cafes to check
        
        if (cafes.length > 0) {
            const cafeButtons = cafes.map(cafe => [
                { text: cafe.name, callback_data: cafe._id.toString() }
            ]);

            // Save cafes to the Cafe collection
            for (const cafe of cafes) {
                const newCafe = new Cafe({
                    name: cafe.name,
                    address: cafe.address, // Ensure the cafe object has an address
                    coordinates: {
                        latitude: cafe.coordinates.latitude,
                        longitude: cafe.coordinates.longitude,
                    },
                    phone_number: cafe.phone_number,
                    rating: cafe.rating,
                    place_id: cafe.place_id
                });
                await newCafe.save();
            }

            await bot.sendMessage(chatId, 'Choose a cafe:', {
                reply_markup: { inline_keyboard: cafeButtons }
            });
        } else {
            await bot.sendMessage(chatId, `No cafes found within ${range} km 😶`);
        }
    } catch (error) {
        console.error('Error fetching cafes:', error);
        await bot.sendMessage(chatId, 'Error occurred while retrieving cafes.');
    }
};
*/

/* СПИСОК КАФЕ
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
*/