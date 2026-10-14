const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Motorcycle = require('./models/Motorcycle');

async function inspect() {
    await mongoose.connect(process.env.MONGO_URI);
    const bikes = await Motorcycle.find({}).lean();
    console.log('Total motorcycles in DB:', bikes.length);
    bikes.forEach((b, i) => {
        console.log(`${i+1}. [${b._id}] ${b.brand} ${b.name} | Cat: ${b.category} | Fuel: ${b.fuel} | Price: ${b.price} | brandLogo: ${b.brandLogo ? 'YES' : 'NO'}`);
    });
    console.log('\nSample bike 1 full structure:');
    console.log(JSON.stringify(bikes[0], null, 2));
    if (bikes.length > 1) {
        console.log('\nSample bike 2 colors & images:');
        console.log('Colors:', JSON.stringify(bikes[0].colors, null, 2));
        console.log('Images:', JSON.stringify(bikes[0].images, null, 2));
    }
    await mongoose.disconnect();
}
inspect().catch(console.error);
