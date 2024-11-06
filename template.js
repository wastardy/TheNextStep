/* запит на локацію
const requestLocation = (chatId) => {
    const options = {
        reply_markup: {
            keyboard: [
                [{ text: "Send Location 📍", request_location: true }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
        }
    };
    bot.sendMessage(chatId, "Please share your location:", options);
};

*/

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




// -----------------------------------!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// одиниці вимірювання відстані (м)
// звідки береться центр точки
// список виведення кнопок
// якщо вибираєш вулицю і не вказуєш місто




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