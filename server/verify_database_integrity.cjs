const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();

const Motorcycle = require('./models/Motorcycle');

const ORIGINAL_IDS = [
    '6aa9a2e9dc0a8bddbccf94f1', // Classic 350
    '6aa9a35cdc0a8bddbccf94f3', // Duke 390
    '6aa9a35cdc0a8bddbccf94f4', // Duke 250
    '6aa9a35cdc0a8bddbccf94f5', // MT-15
    '6aa9a35cdc0a8bddbccf94f6', // R15 V4
    '6aa9a35cdc0a8bddbccf94f7', // Ninja 300
    '6aa9a35cdc0a8bddbccf94f8', // Pulsar NS200
    '6aa9a35cdc0a8bddbccf94f9', // Apache RTR 200
    '6aa9a2e9dc0a8bddbccf94f0', // Hunter 350
    '6ab5340f4592115e7a39db88', // S1 Pro
    '6ab5340f4592115e7a39db89', // 450X
    '6ab5340f4592115e7a39db8a', // iQube
];

async function verify() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/motoai';
    await mongoose.connect(mongoUri);

    const totalCount = await Motorcycle.countDocuments();
    console.log(`Total motorcycles in database: ${totalCount}`);

    // Verify original 12
    const originalDocs = await Motorcycle.find({ _id: { $in: ORIGINAL_IDS } });
    console.log(`\nOriginal 12 vehicles check: Found ${originalDocs.length}/12`);
    originalDocs.forEach((b, idx) => {
        console.log(`  ${idx + 1}. [${b._id}] ${b.brand} ${b.name} (${b.category}, ₹${b.price})`);
    });

    if (originalDocs.length !== 12) {
        console.error('CRITICAL: Not all 12 original motorcycles were found!');
    } else {
        console.log('SUCCESS: All 12 original motorcycles are preserved unchanged.');
    }

    // Category breakdown
    const categoryAgg = await Motorcycle.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
    console.log('\nCategory Breakdown:');
    categoryAgg.forEach(c => console.log(`  - ${c._id}: ${c.count} vehicles`));

    // Brand breakdown
    const brandAgg = await Motorcycle.aggregate([
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
    console.log('\nBrand Breakdown:');
    brandAgg.forEach(b => console.log(`  - ${b._id}: ${b.count} vehicles`));

    await mongoose.disconnect();
}

verify().catch(console.error);
