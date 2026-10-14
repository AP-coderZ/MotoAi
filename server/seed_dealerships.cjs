/**
 * Seed script — sample dealership data
 * Run: node server/seed_dealerships.cjs
 *
 * NOTE: All records have isSeedData: true — these are NOT real
 * dealership partnerships, only sample data for demonstration.
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();

const Dealership = require("./models/Dealership");

const SAMPLE_DEALERSHIPS = [
    // Bajaj
    {
        name: "Bajaj Auto, Koramangala",
        brand: "Bajaj",
        city: "Bengaluru",
        state: "Karnataka",
        address: "112, 5th Block, Koramangala, Bengaluru – 560034",
        phone: "080-41234567",
        email: "koramangala@bajaj-demo.in",
        operatingHours: "Mon–Sat: 9:00 AM – 7:00 PM",
        isSeedData: true,
    },
    {
        name: "Bajaj Probiking, Andheri",
        brand: "Bajaj",
        city: "Mumbai",
        state: "Maharashtra",
        address: "Plot 14, MIDC Road, Andheri East, Mumbai – 400093",
        phone: "022-61234567",
        email: "andheri@bajaj-demo.in",
        operatingHours: "Mon–Sat: 9:30 AM – 7:30 PM",
        isSeedData: true,
    },
    // Royal Enfield
    {
        name: "Royal Enfield Studio, Lajpat Nagar",
        brand: "Royal Enfield",
        city: "Delhi",
        state: "Delhi",
        address: "B-24, Ring Road, Lajpat Nagar II, New Delhi – 110024",
        phone: "011-41234567",
        email: "lajpatnagar@re-demo.in",
        operatingHours: "Mon–Sun: 10:00 AM – 7:00 PM",
        isSeedData: true,
    },
    {
        name: "Royal Enfield, Anna Nagar",
        brand: "Royal Enfield",
        city: "Chennai",
        state: "Tamil Nadu",
        address: "Plot 5, 2nd Ave, Anna Nagar West, Chennai – 600040",
        phone: "044-61234567",
        email: "annanagar@re-demo.in",
        operatingHours: "Mon–Sat: 9:00 AM – 7:00 PM",
        isSeedData: true,
    },
    // Honda
    {
        name: "Honda BigWing, Banjara Hills",
        brand: "Honda",
        city: "Hyderabad",
        state: "Telangana",
        address: "Road No. 12, Banjara Hills, Hyderabad – 500034",
        phone: "040-41234567",
        email: "banjarahills@honda-demo.in",
        operatingHours: "Mon–Sat: 9:00 AM – 7:00 PM",
        isSeedData: true,
    },
    {
        name: "Honda Motorcycle, Salt Lake",
        brand: "Honda",
        city: "Kolkata",
        state: "West Bengal",
        address: "Block EA, Salt Lake, Sector V, Kolkata – 700091",
        phone: "033-41234567",
        email: "saltlake@honda-demo.in",
        operatingHours: "Mon–Sat: 9:00 AM – 6:30 PM",
        isSeedData: true,
    },
    // KTM
    {
        name: "KTM, Hadapsar",
        brand: "KTM",
        city: "Pune",
        state: "Maharashtra",
        address: "Survey No. 188, Hadapsar, Pune – 411028",
        phone: "020-61234567",
        email: "hadapsar@ktm-demo.in",
        operatingHours: "Mon–Sat: 9:30 AM – 7:00 PM",
        isSeedData: true,
    },
    // TVS
    {
        name: "TVS Motor, Madurai Road",
        brand: "TVS",
        city: "Coimbatore",
        state: "Tamil Nadu",
        address: "23, Madurai Road, Coimbatore – 641014",
        phone: "0422-41234567",
        email: "coimbatore@tvs-demo.in",
        operatingHours: "Mon–Sat: 9:00 AM – 7:00 PM",
        isSeedData: true,
    },
    // Yamaha
    {
        name: "Yamaha World, Gariahat",
        brand: "Yamaha",
        city: "Kolkata",
        state: "West Bengal",
        address: "120A, Gariahat Road, Kolkata – 700019",
        phone: "033-61234567",
        email: "gariahat@yamaha-demo.in",
        operatingHours: "Mon–Sat: 9:00 AM – 7:00 PM",
        isSeedData: true,
    },
    // Hero
    {
        name: "Hero MotoCorp, Saket",
        brand: "Hero",
        city: "Delhi",
        state: "Delhi",
        address: "H-Block, Saket, New Delhi – 110017",
        phone: "011-61234567",
        email: "saket@hero-demo.in",
        operatingHours: "Mon–Sat: 9:00 AM – 7:00 PM",
        isSeedData: true,
    },
];

async function seed() {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/motorcycle_ai";
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB");

        const existing = await Dealership.countDocuments();
        if (existing > 0) {
            console.log(`${existing} dealerships already exist. Skipping seed.`);
            process.exit(0);
        }

        await Dealership.insertMany(SAMPLE_DEALERSHIPS);
        console.log(`✅ Seeded ${SAMPLE_DEALERSHIPS.length} sample dealerships`);
        process.exit(0);
    } catch (err) {
        console.error("Seed error:", err);
        process.exit(1);
    }
}

seed();
