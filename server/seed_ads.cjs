/**
 * Seed script — sample Contextual Ad Campaigns
 * Run: node server/seed_ads.cjs
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();

const AdCampaign = require("./models/AdCampaign");

const SAMPLE_ADS = [
    {
        advertiserName: "Castrol India",
        title: "Castrol POWER1 Ultimate 10W-50 Synthetic",
        tagline: "5-in-1 formula for exceptional acceleration, cooling & smooth clutch performance.",
        placement: "motorcycles_sidebar",
        ctaText: "Explore Engine Oils",
        ctaUrl: "https://www.castrol.com/en_in/india/home/motorcycle-oil-and-fluids.html",
        imageUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80",
        targetBrand: "",
        targetCategory: "",
        totalBudget: 25000,
        cpm: 60,
        impressions: 145,
        clicks: 18,
        status: "active",
        isSampleCampaign: true,
    },
    {
        advertiserName: "Arai Helmets India",
        title: "Arai RX-7V EVO Flagship Riding Helmet",
        tagline: "Aerodynamic racing shell with PB-SNC2 construction and emergency quick release pads.",
        placement: "detail_sidebar",
        ctaText: "View Gear Specs",
        ctaUrl: "https://www.araihelmet.eu/",
        imageUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80",
        targetBrand: "",
        targetCategory: "",
        totalBudget: 30000,
        cpm: 75,
        impressions: 380,
        clicks: 46,
        status: "active",
        isSampleCampaign: true,
    },
    {
        advertiserName: "Royal Enfield Genuine Accessories",
        title: "Official RE Touring Seats & Panniers",
        tagline: "Long-haul comfort engineered specifically for Hunter, Classic & Himalayan riders.",
        placement: "detail_sidebar",
        targetBrand: "Royal Enfield",
        targetCategory: "",
        ctaText: "Customize Bike",
        ctaUrl: "https://www.royalenfield.com/",
        imageUrl: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80",
        totalBudget: 40000,
        cpm: 80,
        impressions: 290,
        clicks: 39,
        status: "active",
        isSampleCampaign: true,
    },
    {
        advertiserName: "HDFC Bank Two-Wheeler Loans",
        title: "Zero Foreclosure Two-Wheeler Loans @ 7.99%",
        tagline: "Instant digital approval up to 100% on-road financing with flexible 60-month EMI options.",
        placement: "compare_bottom",
        ctaText: "Check Loan Eligibility",
        ctaUrl: "https://www.hdfcbank.com/",
        imageUrl: "https://images.unsplash.com/photo-1558980394-4c7c9299fe96?auto=format&fit=crop&w=800&q=80",
        targetBrand: "",
        targetCategory: "",
        totalBudget: 50000,
        cpm: 90,
        impressions: 480,
        clicks: 62,
        status: "active",
        isSampleCampaign: true,
    },
    {
        advertiserName: "Ather Energy",
        title: "Ather Grid Fast-Charging Network",
        tagline: "Charge up to 80% in 35 minutes across 1,500+ fast-charging points nationwide.",
        placement: "detail_sidebar",
        targetBrand: "",
        targetCategory: "Electric",
        ctaText: "Find Charging Points",
        ctaUrl: "https://www.atherenergy.com/",
        imageUrl: "https://images.unsplash.com/photo-1558980664-769d59546b3d?auto=format&fit=crop&w=800&q=80",
        totalBudget: 35000,
        cpm: 70,
        impressions: 210,
        clicks: 31,
        status: "active",
        isSampleCampaign: true,
    },
    {
        advertiserName: "Motul India",
        title: "Motul 300V Factory Line Synthetic Racing Oil",
        tagline: "Ester Core® technology for maximum power output and extreme engine protection across all rev ranges.",
        placement: "ai_advisor_bottom",
        ctaText: "Explore Motul 300V",
        ctaUrl: "https://www.motul.com/",
        imageUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80",
        videoUrl: "https://vjs.zencdn.net/v/oceans.mp4",
        targetBrand: "",
        targetCategory: "",
        totalBudget: 45000,
        cpm: 65,
        impressions: 120,
        clicks: 14,
        status: "active",
        isSampleCampaign: true,
    },
    {
        advertiserName: "GoPro India",
        title: "GoPro HERO12 Black — Ultimate Moto Vlogging Camera",
        tagline: "HyperSmooth 6.0 stabilization, 5.3K60 HDR video, and rugged waterproof helmet mounts built for riders.",
        placement: "ai_advisor_bottom",
        ctaText: "View Moto Mounts",
        ctaUrl: "https://gopro.com/",
        imageUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        targetBrand: "",
        targetCategory: "",
        totalBudget: 50000,
        cpm: 85,
        impressions: 240,
        clicks: 33,
        status: "active",
        isSampleCampaign: true,
    },
    {
        advertiserName: "Royal Enfield",
        title: "Official RE Touring Gear & Protective Riding Jackets",
        tagline: "CE Level 2 D3O armor with breathable mesh construction for all-weather cross-country endurance.",
        placement: "ai_advisor_bottom",
        ctaText: "Shop Riding Gear",
        ctaUrl: "https://www.royalenfield.com/",
        imageUrl: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80",
        videoUrl: "",
        targetBrand: "",
        targetCategory: "",
        totalBudget: 40000,
        cpm: 75,
        impressions: 310,
        clicks: 42,
        status: "active",
        isSampleCampaign: true,
    },
];

async function seed() {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/motorcycle_ai";
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB:", mongoUri);

        const existing = await AdCampaign.countDocuments();
        if (existing > 0) {
            console.log(`${existing} ad campaigns already exist. Skipping seed.`);
            process.exit(0);
        }

        await AdCampaign.insertMany(SAMPLE_ADS);
        console.log(`✅ Seeded ${SAMPLE_ADS.length} sample ad campaigns`);
        process.exit(0);
    } catch (err) {
        console.error("Seed error:", err);
        process.exit(1);
    }
}

seed();
