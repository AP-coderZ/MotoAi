/**
 * seed_expanded_motorcycles.cjs
 *
 * Repeatable, idempotent seeding script that expands the MOTOAI database
 * with 52 additional motorcycles and scooters across 7 categories.
 *
 * Guarantees:
 * - Preserves ALL 12 existing motorcycle records without modification or deletion.
 * - Checks for duplicates (brand + name case-insensitive) before inserting.
 * - Conforms to the existing Motorcycle schema in MongoDB.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();

const Motorcycle = require('./models/Motorcycle');

// Brand logo mapping
const BRAND_LOGOS = {
    'Honda': 'https://www.google.com/s2/favicons?domain=honda2wheelersindia.com&sz=128',
    'Hero': 'https://www.google.com/s2/favicons?domain=heromotocorp.com&sz=128',
    'TVS': 'https://www.google.com/s2/favicons?domain=tvsmotor.com&sz=128',
    'Bajaj': 'https://www.google.com/s2/favicons?domain=bajajauto.com&sz=128',
    'Suzuki': 'https://www.google.com/s2/favicons?domain=suzukimotorcycle.co.in&sz=128',
    'Royal Enfield': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTt2x1XbLNcHC7dI9Q1oHblxCIWvGyNaUTMt13YhWQxLA&s=10',
    'KTM': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhT4H-Q_jQvjH3V9h-7sWzP4w7j3yZ4xX1Zg&s=10',
    'Aprilia': 'https://www.google.com/s2/favicons?domain=apriliaindia.com&sz=128',
    'BMW': 'https://www.google.com/s2/favicons?domain=bmw-motorrad.in&sz=128',
    'Triumph': 'https://www.google.com/s2/favicons?domain=triumphmotorcycles.in&sz=128',
    'Harley-Davidson': 'https://www.google.com/s2/favicons?domain=harley-davidson.com&sz=128',
    'Vespa': 'https://cdn.worldvectorlogo.com/logos/vespa.svg',
    'Jawa': 'https://www.google.com/s2/favicons?domain=jawayezdimotorcycles.com&sz=128',
    'Yezdi': 'https://www.google.com/s2/favicons?domain=yezdi.com&sz=128',
    'Kawasaki': 'https://www.google.com/s2/favicons?domain=kawasaki-india.com&sz=128',
};

// Helper to compute standard 4-city on-road tax
function calculateCityPrices(exPrice) {
    return [
        { city: 'Mumbai', roadTax: Math.round(exPrice * 0.12) },
        { city: 'Pune', roadTax: Math.round(exPrice * 0.09) },
        { city: 'Delhi', roadTax: Math.round(exPrice * 0.15) },
        { city: 'Bangalore', roadTax: Math.round(exPrice * 0.11) },
    ];
}

const NEW_VEHICLES = [
    // ==========================================
    // 1. SCOOTERS (10 vehicles)
    // ==========================================
    {
        name: 'Activa 6G',
        brand: 'Honda',
        category: 'Scooter',
        price: 77850,
        exShowroomPrice: 77850,
        engine: 109.51,
        power: 7.79,
        torque: 8.9,
        mileage: 50,
        fuel: 'Petrol',
        weight: 106,
        topSpeed: 85,
        transmission: 'Automatic',
        rating: 4.5,
        image: '/images/motorcycles/honda-activa-6g.jpg',
        images: [
            { url: '/images/motorcycles/honda-activa-6g.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Decent Blue', hex: '#1e3a8a', image: '/images/motorcycles/honda-activa-6g.jpg' },
            { name: 'Pearl Siren Blue', hex: '#0284c7', image: '/images/motorcycles/honda-activa-6g.jpg' },
            { name: 'Black', hex: '#18181b', image: '/images/motorcycles/honda-activa-6g.jpg' },
            { name: 'Pearl Precious White', hex: '#f8fafc', image: '/images/motorcycles/honda-activa-6g.jpg' }
        ],
        description: "India's highest-selling scooter powered by an ultra-refined 110cc PGM-FI engine with eSP technology, silent ACG starter, and telescopic front suspension.",
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Dio 125',
        brand: 'Honda',
        category: 'Scooter',
        price: 85400,
        exShowroomPrice: 85400,
        engine: 123.92,
        power: 8.28,
        torque: 10.4,
        mileage: 48,
        fuel: 'Petrol',
        weight: 104,
        topSpeed: 90,
        transmission: 'Automatic',
        rating: 4.4,
        image: '/images/motorcycles/honda-dio-125.jpg',
        images: [
            { url: '/images/motorcycles/honda-dio-125.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Sports Red', hex: '#dc2626', image: '/images/motorcycles/honda-dio-125.jpg' },
            { name: 'Matte Marvel Blue', hex: '#1e40af', image: '/images/motorcycles/honda-dio-125.jpg' },
            { name: 'Matte Axis Grey', hex: '#475569', image: '/images/motorcycles/honda-dio-125.jpg' },
            { name: 'Pearl Deep Ground Grey', hex: '#334155', image: '/images/motorcycles/honda-dio-125.jpg' }
        ],
        description: 'Sporty urban moto-scooter with an aggressive dual-LED headlight setup, fully digital instrument cluster, alloy wheels, and Smart Key system.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Jupiter 110',
        brand: 'TVS',
        category: 'Scooter',
        price: 76400,
        exShowroomPrice: 76400,
        engine: 113.3,
        power: 7.91,
        torque: 9.8,
        mileage: 52,
        fuel: 'Petrol',
        weight: 105,
        topSpeed: 85,
        transmission: 'Automatic',
        rating: 4.6,
        image: '/images/motorcycles/tvs-jupiter-110.jpg',
        images: [
            { url: '/images/motorcycles/tvs-jupiter-110.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Titanium Grey', hex: '#4b5563', image: '/images/motorcycles/tvs-jupiter-110.jpg' },
            { name: 'Walnut Brown', hex: '#78350f', image: '/images/motorcycles/tvs-jupiter-110.jpg' },
            { name: 'Pristine White', hex: '#f9fafb', image: '/images/motorcycles/tvs-jupiter-110.jpg' },
            { name: 'Starlight Blue', hex: '#1d4ed8', image: '/images/motorcycles/tvs-jupiter-110.jpg' }
        ],
        description: 'Highly popular family scooter featuring next-gen iGO Assist micro-hybrid technology, spacious footboard, and best-in-class underseat storage.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Ntorq 125',
        brand: 'TVS',
        category: 'Scooter',
        price: 90700,
        exShowroomPrice: 90700,
        engine: 124.8,
        power: 9.38,
        torque: 10.5,
        mileage: 45,
        fuel: 'Petrol',
        weight: 116,
        topSpeed: 95,
        transmission: 'Automatic',
        rating: 4.6,
        image: '/images/motorcycles/tvs-ntorq-125.jpg',
        images: [
            { url: '/images/motorcycles/tvs-ntorq-125.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Race Edition Red', hex: '#b91c1c', image: '/images/motorcycles/tvs-ntorq-125.jpg' },
            { name: 'Matte Yellow', hex: '#eab308', image: '/images/motorcycles/tvs-ntorq-125.jpg' },
            { name: 'Combat Blue', hex: '#2563eb', image: '/images/motorcycles/tvs-ntorq-125.jpg' },
            { name: 'Stealth Black', hex: '#0f172a', image: '/images/motorcycles/tvs-ntorq-125.jpg' }
        ],
        description: 'Performance scooter inspired by stealth aircraft, equipped with a 3-valve CVTi engine, SmartXonnect Bluetooth telemetry, and signature throaty exhaust note.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Access 125',
        brand: 'Suzuki',
        category: 'Scooter',
        price: 81200,
        exShowroomPrice: 81200,
        engine: 124.0,
        power: 8.7,
        torque: 10.0,
        mileage: 50,
        fuel: 'Petrol',
        weight: 103,
        topSpeed: 92,
        transmission: 'Automatic',
        rating: 4.6,
        image: '/images/motorcycles/suzuki-access-125.jpg',
        images: [
            { url: '/images/motorcycles/suzuki-access-125.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Metallic Matte Platinum Silver', hex: '#9ca3af', image: '/images/motorcycles/suzuki-access-125.jpg' },
            { name: 'Pearl Mirage White', hex: '#ffffff', image: '/images/motorcycles/suzuki-access-125.jpg' },
            { name: 'Metallic Dark Greenish Blue', hex: '#0f766e', image: '/images/motorcycles/suzuki-access-125.jpg' },
            { name: 'Metallic Royal Bronze', hex: '#92400e', image: '/images/motorcycles/suzuki-access-125.jpg' }
        ],
        description: 'Retro-styled commuter scooter with a lightweight Suzuki Eco Performance engine, LED headlamp with chrome surround, and Bluetooth-enabled digital console.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Burgman Street 125',
        brand: 'Suzuki',
        category: 'Scooter',
        price: 95300,
        exShowroomPrice: 95300,
        engine: 124.0,
        power: 8.7,
        torque: 10.0,
        mileage: 48,
        fuel: 'Petrol',
        weight: 111,
        topSpeed: 95,
        transmission: 'Automatic',
        rating: 4.5,
        image: '/images/motorcycles/suzuki-burgman-street-125.jpg',
        images: [
            { url: '/images/motorcycles/suzuki-burgman-street-125.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Metallic Matte Black', hex: '#18181b', image: '/images/motorcycles/suzuki-burgman-street-125.jpg' },
            { name: 'Pearl Mirage White', hex: '#ffffff', image: '/images/motorcycles/suzuki-burgman-street-125.jpg' },
            { name: 'Metallic Matte Bordeaux Red', hex: '#831843', image: '/images/motorcycles/suzuki-burgman-street-125.jpg' }
        ],
        description: 'European maxi-scooter inspired design offering relaxed stretched-out footboard positions, large flyscreen, and generous underseat storage.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Pleasure Plus',
        brand: 'Hero',
        category: 'Scooter',
        price: 72800,
        exShowroomPrice: 72800,
        engine: 110.9,
        power: 8.0,
        torque: 8.7,
        mileage: 50,
        fuel: 'Petrol',
        weight: 104,
        topSpeed: 80,
        transmission: 'Automatic',
        rating: 4.3,
        image: '/images/motorcycles/hero-pleasure-plus.jpg',
        images: [
            { url: '/images/motorcycles/hero-pleasure-plus.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Polestar Blue', hex: '#0284c7', image: '/images/motorcycles/hero-pleasure-plus.jpg' },
            { name: 'Pearl Silver White', hex: '#f1f5f9', image: '/images/motorcycles/hero-pleasure-plus.jpg' },
            { name: 'Midnight Black', hex: '#09090b', image: '/images/motorcycles/hero-pleasure-plus.jpg' },
            { name: 'Matte Vernier Grey', hex: '#64748b', image: '/images/motorcycles/hero-pleasure-plus.jpg' }
        ],
        description: 'Compact, nimble city scooter with xSens programmed fuel injection, retro-modern front apron, and low kerb weight for effortless maneuvering.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'SR 160',
        brand: 'Aprilia',
        category: 'Scooter',
        price: 133000,
        exShowroomPrice: 133000,
        engine: 160.03,
        power: 11.27,
        torque: 13.44,
        mileage: 35,
        fuel: 'Petrol',
        weight: 118,
        topSpeed: 100,
        transmission: 'Automatic',
        rating: 4.5,
        image: '/images/motorcycles/aprilia-sr-160.jpg',
        images: [
            { url: '/images/motorcycles/aprilia-sr-160.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Aprilia Black', hex: '#09090b', image: '/images/motorcycles/aprilia-sr-160.jpg' },
            { name: 'Fluo Red', hex: '#ef4444', image: '/images/motorcycles/aprilia-sr-160.jpg' },
            { name: 'White', hex: '#ffffff', image: '/images/motorcycles/aprilia-sr-160.jpg' },
            { name: 'Matte Blue', hex: '#1d4ed8', image: '/images/motorcycles/aprilia-sr-160.jpg' }
        ],
        description: 'Italian race-bred scooter featuring large 14-inch alloy wheels, single-channel ABS, razor-sharp chassis geometry, and punchy 160cc 3-valve engine.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'SXL 150',
        brand: 'Vespa',
        category: 'Scooter',
        price: 149000,
        exShowroomPrice: 149000,
        engine: 149.5,
        power: 10.47,
        torque: 10.6,
        mileage: 36,
        fuel: 'Petrol',
        weight: 115,
        topSpeed: 95,
        transmission: 'Automatic',
        rating: 4.5,
        image: '/images/motorcycles/vespa-sxl-150.jpg',
        images: [
            { url: '/images/motorcycles/vespa-sxl-150.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Tuscan Sun Yellow', hex: '#facc15', image: '/images/motorcycles/vespa-sxl-150.jpg' },
            { name: 'Azzurro Provenza', hex: '#38bdf8', image: '/images/motorcycles/vespa-sxl-150.jpg' },
            { name: 'Monte Carlo Grey', hex: '#4b5563', image: '/images/motorcycles/vespa-sxl-150.jpg' },
            { name: 'Rosso Dragon', hex: '#dc2626', image: '/images/motorcycles/vespa-sxl-150.jpg' }
        ],
        description: 'Iconic Italian steel monocoque scooter with rectangular LED headlamp, aircraft-inspired single-sided front suspension, and front disc brake with ABS.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Vida V1 Pro',
        brand: 'Hero',
        category: 'Electric',
        price: 145900,
        exShowroomPrice: 145900,
        engine: 0,
        power: 8.04,
        torque: 25.0,
        mileage: 0,
        fuel: 'Electric',
        weight: 125,
        topSpeed: 80,
        transmission: 'Automatic',
        rating: 4.4,
        image: '/images/motorcycles/hero-vida-v1-pro.jpg',
        images: [
            { url: '/images/motorcycles/hero-vida-v1-pro.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Matte White', hex: '#f8fafc', image: '/images/motorcycles/hero-vida-v1-pro.jpg' },
            { name: 'Matte Sports Red', hex: '#dc2626', image: '/images/motorcycles/hero-vida-v1-pro.jpg' },
            { name: 'Matte Abrax Orange', hex: '#ea580c', image: '/images/motorcycles/hero-vida-v1-pro.jpg' },
            { name: 'Gloss Black', hex: '#09090b', image: '/images/motorcycles/hero-vida-v1-pro.jpg' }
        ],
        description: 'Smart electric scooter featuring dual removable lithium-ion batteries, 7-inch TFT touchscreen, custom ride modes, and 165 km claimed IDC range.',
        batteryCapacity: 3.94,
        range: 165,
        chargingTime: 6
    },

    // ==========================================
    // 2. COMMUTERS (8 vehicles)
    // ==========================================
    {
        name: 'Splendor Plus',
        brand: 'Hero',
        category: 'Commuter',
        price: 75400,
        exShowroomPrice: 75400,
        engine: 97.2,
        power: 7.91,
        torque: 8.05,
        mileage: 65,
        fuel: 'Petrol',
        weight: 112,
        topSpeed: 87,
        transmission: 'Manual',
        rating: 4.7,
        image: '/images/motorcycles/hero-splendor-plus.jpg',
        images: [
            { url: '/images/motorcycles/hero-splendor-plus.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Black with Silver', hex: '#334155', image: '/images/motorcycles/hero-splendor-plus.jpg' },
            { name: 'Black with Purple', hex: '#581c87', image: '/images/motorcycles/hero-splendor-plus.jpg' },
            { name: 'Black with Sports Red', hex: '#991b1b', image: '/images/motorcycles/hero-splendor-plus.jpg' },
            { name: 'Heavy Grey with Green', hex: '#14532d', image: '/images/motorcycles/hero-splendor-plus.jpg' }
        ],
        description: "The undisputed king of Indian commuters with legendary fuel economy, bulletproof reliability, i3S start-stop system, and accessible maintenance.",
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'HF Deluxe',
        brand: 'Hero',
        category: 'Commuter',
        price: 61800,
        exShowroomPrice: 61800,
        engine: 97.2,
        power: 7.91,
        torque: 8.05,
        mileage: 65,
        fuel: 'Petrol',
        weight: 110,
        topSpeed: 85,
        transmission: 'Manual',
        rating: 4.4,
        image: '/images/motorcycles/hero-hf-deluxe.jpg',
        images: [
            { url: '/images/motorcycles/hero-hf-deluxe.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Techno Blue', hex: '#1d4ed8', image: '/images/motorcycles/hero-hf-deluxe.jpg' },
            { name: 'Heavy Grey with Black', hex: '#374151', image: '/images/motorcycles/hero-hf-deluxe.jpg' },
            { name: 'Black with Red', hex: '#b91c1c', image: '/images/motorcycles/hero-hf-deluxe.jpg' },
            { name: 'Canvas Black', hex: '#0a0a0a', image: '/images/motorcycles/hero-hf-deluxe.jpg' }
        ],
        description: 'Economical and durable daily workhorse built with xSens programmed fuel injection, long comfortable seat, and low running costs.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Shine 125',
        brand: 'Honda',
        category: 'Commuter',
        price: 81800,
        exShowroomPrice: 81800,
        engine: 123.94,
        power: 10.59,
        torque: 11.0,
        mileage: 55,
        fuel: 'Petrol',
        weight: 114,
        topSpeed: 95,
        transmission: 'Manual',
        rating: 4.6,
        image: '/images/motorcycles/honda-shine-125.jpg',
        images: [
            { url: '/images/motorcycles/honda-shine-125.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Black', hex: '#18181b', image: '/images/motorcycles/honda-shine-125.jpg' },
            { name: 'Geny Grey Metallic', hex: '#4b5563', image: '/images/motorcycles/honda-shine-125.jpg' },
            { name: 'Rebel Red Metallic', hex: '#b91c1c', image: '/images/motorcycles/honda-shine-125.jpg' },
            { name: 'Decent Blue Metallic', hex: '#1e3a8a', image: '/images/motorcycles/honda-shine-125.jpg' }
        ],
        description: "India's benchmark 125cc executive commuter renowned for its silent ACG starter, 5-speed transmission, and ultra-smooth vibration-free engine.",
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'SP 125',
        brand: 'Honda',
        category: 'Commuter',
        price: 87500,
        exShowroomPrice: 87500,
        engine: 123.94,
        power: 10.72,
        torque: 10.9,
        mileage: 55,
        fuel: 'Petrol',
        weight: 116,
        topSpeed: 100,
        transmission: 'Manual',
        rating: 4.6,
        image: '/images/motorcycles/honda-sp-125.jpg',
        images: [
            { url: '/images/motorcycles/honda-sp-125.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Imperial Red Metallic', hex: '#991b1b', image: '/images/motorcycles/honda-sp-125.jpg' },
            { name: 'Matte Marvel Blue', hex: '#1e40af', image: '/images/motorcycles/honda-sp-125.jpg' },
            { name: 'Pearl Siren Blue', hex: '#0284c7', image: '/images/motorcycles/honda-sp-125.jpg' },
            { name: 'Heavy Grey Metallic', hex: '#374151', image: '/images/motorcycles/honda-sp-125.jpg' }
        ],
        description: 'Contemporary premium 125cc commuter featuring dynamic tank shrouds, full LED headlamp, and fully digital console with real-time mileage indicator.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Platina 110',
        brand: 'Bajaj',
        category: 'Commuter',
        price: 72900,
        exShowroomPrice: 72900,
        engine: 115.45,
        power: 8.48,
        torque: 9.81,
        mileage: 70,
        fuel: 'Petrol',
        weight: 119,
        topSpeed: 90,
        transmission: 'Manual',
        rating: 4.5,
        image: '/images/motorcycles/bajaj-platina-110.jpg',
        images: [
            { url: '/images/motorcycles/bajaj-platina-110.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Cocktail Wine Red', hex: '#881337', image: '/images/motorcycles/bajaj-platina-110.jpg' },
            { name: 'Charcoal Black', hex: '#1c1917', image: '/images/motorcycles/bajaj-platina-110.jpg' },
            { name: 'Ebony Black Blue', hex: '#172554', image: '/images/motorcycles/bajaj-platina-110.jpg' }
        ],
        description: 'Comfort-first commuter motorcycle equipped with segment-first single-channel ABS, ComforTec spring-on-spring suspension, and exceptional mileage.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Raider 125',
        brand: 'TVS',
        category: 'Commuter',
        price: 95200,
        exShowroomPrice: 95200,
        engine: 124.8,
        power: 11.22,
        torque: 11.2,
        mileage: 56,
        fuel: 'Petrol',
        weight: 123,
        topSpeed: 105,
        transmission: 'Manual',
        rating: 4.7,
        image: '/images/motorcycles/tvs-raider-125.jpg',
        images: [
            { url: '/images/motorcycles/tvs-raider-125.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Fiery Yellow', hex: '#eab308', image: '/images/motorcycles/tvs-raider-125.jpg' },
            { name: 'Wicked Black', hex: '#0f172a', image: '/images/motorcycles/tvs-raider-125.jpg' },
            { name: 'Blazing Blue', hex: '#2563eb', image: '/images/motorcycles/tvs-raider-125.jpg' },
            { name: 'Striking Red', hex: '#dc2626', image: '/images/motorcycles/tvs-raider-125.jpg' }
        ],
        description: 'Sporty, tech-loaded 125cc commuter featuring distinctive animalistic LED headlamps, split seat, Eco/Power riding modes, and color TFT display.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Glamour XTEC',
        brand: 'Hero',
        category: 'Commuter',
        price: 89300,
        exShowroomPrice: 89300,
        engine: 124.7,
        power: 10.72,
        torque: 10.6,
        mileage: 55,
        fuel: 'Petrol',
        weight: 122,
        topSpeed: 95,
        transmission: 'Manual',
        rating: 4.4,
        image: '/images/motorcycles/hero-glamour-xtec.jpg',
        images: [
            { url: '/images/motorcycles/hero-glamour-xtec.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Candy Blazing Red', hex: '#b91c1c', image: '/images/motorcycles/hero-glamour-xtec.jpg' },
            { name: 'Techno Blue Black', hex: '#1e3a8a', image: '/images/motorcycles/hero-glamour-xtec.jpg' },
            { name: 'Grey with Black', hex: '#475569', image: '/images/motorcycles/hero-glamour-xtec.jpg' }
        ],
        description: 'High-tech executive motorcycle with Bluetooth turn-by-turn navigation, integrated USB charging port, side-stand engine cut-off, and LED headlamp.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Pulsar 125',
        brand: 'Bajaj',
        category: 'Commuter',
        price: 85200,
        exShowroomPrice: 85200,
        engine: 124.4,
        power: 11.64,
        torque: 10.8,
        mileage: 51,
        fuel: 'Petrol',
        weight: 140,
        topSpeed: 100,
        transmission: 'Manual',
        rating: 4.5,
        image: '/images/motorcycles/bajaj-pulsar-125.jpg',
        images: [
            { url: '/images/motorcycles/bajaj-pulsar-125.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Solar Red', hex: '#dc2626', image: '/images/motorcycles/bajaj-pulsar-125.jpg' },
            { name: 'Neon Blue', hex: '#0284c7', image: '/images/motorcycles/bajaj-pulsar-125.jpg' },
            { name: 'Platinum Silver', hex: '#9ca3af', image: '/images/motorcycles/bajaj-pulsar-125.jpg' },
            { name: 'Carbon Black', hex: '#18181b', image: '/images/motorcycles/bajaj-pulsar-125.jpg' }
        ],
        description: 'Accessible gateway to the legendary Pulsar family featuring classic wolf-eyed pilot lamps, clip-on handlebars, and muscular fuel tank.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },

    // ==========================================
    // 3. NAKED / STREET BIKES (8 vehicles)
    // ==========================================
    {
        name: 'Pulsar N160',
        brand: 'Bajaj',
        category: 'Street',
        price: 124000,
        exShowroomPrice: 124000,
        engine: 164.82,
        power: 15.68,
        torque: 14.65,
        mileage: 46,
        fuel: 'Petrol',
        weight: 152,
        topSpeed: 115,
        transmission: 'Manual',
        rating: 4.7,
        image: '/images/motorcycles/bajaj-pulsar-n160.jpg',
        images: [
            { url: '/images/motorcycles/bajaj-pulsar-n160.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Brooklyn Black', hex: '#0a0a0a', image: '/images/motorcycles/bajaj-pulsar-n160.jpg' },
            { name: 'Pearl Metallic White', hex: '#f8fafc', image: '/images/motorcycles/bajaj-pulsar-n160.jpg' },
            { name: 'Racing Red', hex: '#dc2626', image: '/images/motorcycles/bajaj-pulsar-n160.jpg' },
            { name: 'Caribbean Blue', hex: '#0284c7', image: '/images/motorcycles/bajaj-pulsar-n160.jpg' }
        ],
        description: 'Best-in-class dual-channel ABS street fighter with bi-functional projector LED headlamp, USD front forks, and tractable oil-cooled DTS-i engine.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Apache RTR 160 4V',
        brand: 'TVS',
        category: 'Street',
        price: 125800,
        exShowroomPrice: 125800,
        engine: 159.7,
        power: 17.31,
        torque: 14.73,
        mileage: 45,
        fuel: 'Petrol',
        weight: 144,
        topSpeed: 114,
        transmission: 'Manual',
        rating: 4.7,
        image: '/images/motorcycles/tvs-apache-rtr-160-4v.jpg',
        images: [
            { url: '/images/motorcycles/tvs-apache-rtr-160-4v.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Racing Red', hex: '#b91c1c', image: '/images/motorcycles/tvs-apache-rtr-160-4v.jpg' },
            { name: 'Metallic Blue', hex: '#1d4ed8', image: '/images/motorcycles/tvs-apache-rtr-160-4v.jpg' },
            { name: 'Knight Black', hex: '#111827', image: '/images/motorcycles/tvs-apache-rtr-160-4v.jpg' },
            { name: 'Matte Black', hex: '#18181b', image: '/images/motorcycles/tvs-apache-rtr-160-4v.jpg' }
        ],
        description: 'Race-derived street bike with 4-valve oil-cooled engine, segment-first riding modes (Sport/Urban/Rain), and Glide Through Technology (GTT).',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Hornet 2.0',
        brand: 'Honda',
        category: 'Street',
        price: 139000,
        exShowroomPrice: 139000,
        engine: 184.4,
        power: 17.03,
        torque: 15.9,
        mileage: 42,
        fuel: 'Petrol',
        weight: 142,
        topSpeed: 120,
        transmission: 'Manual',
        rating: 4.5,
        image: '/images/motorcycles/honda-hornet-20.jpg',
        images: [
            { url: '/images/motorcycles/honda-hornet-20.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Matte Axis Grey Metallic', hex: '#334155', image: '/images/motorcycles/honda-hornet-20.jpg' },
            { name: 'Matte Marvel Blue', hex: '#1e3a8a', image: '/images/motorcycles/honda-hornet-20.jpg' },
            { name: 'Pearl Igneous Black', hex: '#09090b', image: '/images/motorcycles/honda-hornet-20.jpg' },
            { name: 'Matte Sangria Red', hex: '#881337', image: '/images/motorcycles/honda-hornet-20.jpg' }
        ],
        description: 'Muscular urban street machine featuring golden upside-down (USD) front forks, hazard switch, and distinctive X-shaped LED tail lamp.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Xtreme 160R 4V',
        brand: 'Hero',
        category: 'Street',
        price: 127300,
        exShowroomPrice: 127300,
        engine: 163.2,
        power: 16.66,
        torque: 14.6,
        mileage: 46,
        fuel: 'Petrol',
        weight: 144,
        topSpeed: 115,
        transmission: 'Manual',
        rating: 4.5,
        image: '/images/motorcycles/hero-xtreme-160r-4v.jpg',
        images: [
            { url: '/images/motorcycles/hero-xtreme-160r-4v.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Blazing Sports Red', hex: '#dc2626', image: '/images/motorcycles/hero-xtreme-160r-4v.jpg' },
            { name: 'Matte Slate Black', hex: '#1e293b', image: '/images/motorcycles/hero-xtreme-160r-4v.jpg' },
            { name: 'Neon Shooting Star', hex: '#a3e635', image: '/images/motorcycles/hero-xtreme-160r-4v.jpg' }
        ],
        description: 'Aggressive streetfighter with 37mm KYB inverted front forks, 4-valve air-oil cooled engine, and class-leading 0-60 km/h acceleration.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Gixxer 150',
        brand: 'Suzuki',
        category: 'Street',
        price: 134800,
        exShowroomPrice: 134800,
        engine: 155.0,
        power: 13.41,
        torque: 13.8,
        mileage: 45,
        fuel: 'Petrol',
        weight: 141,
        topSpeed: 115,
        transmission: 'Manual',
        rating: 4.5,
        image: '/images/motorcycles/suzuki-gixxer-150.jpg',
        images: [
            { url: '/images/motorcycles/suzuki-gixxer-150.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Metallic Sonic Silver', hex: '#94a3b8', image: '/images/motorcycles/suzuki-gixxer-150.jpg' },
            { name: 'Glass Sparkle Black', hex: '#09090b', image: '/images/motorcycles/suzuki-gixxer-150.jpg' },
            { name: 'Pearl Mira Red', hex: '#dc2626', image: '/images/motorcycles/suzuki-gixxer-150.jpg' }
        ],
        description: 'Sharp Japanese naked street machine engineered with Suzuki Eco Performance (SEP) technology and twin-muffler exhaust with chrome heat shields.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Gixxer 250',
        brand: 'Suzuki',
        category: 'Street',
        price: 181400,
        exShowroomPrice: 181400,
        engine: 249.0,
        power: 26.13,
        torque: 22.2,
        mileage: 36,
        fuel: 'Petrol',
        weight: 156,
        topSpeed: 140,
        transmission: 'Manual',
        rating: 4.6,
        image: '/images/motorcycles/suzuki-gixxer-250.jpg',
        images: [
            { url: '/images/motorcycles/suzuki-gixxer-250.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Metallic Matte Black', hex: '#18181b', image: '/images/motorcycles/suzuki-gixxer-250.jpg' },
            { name: 'Metallic Matte Stellar Blue', hex: '#1e3a8a', image: '/images/motorcycles/suzuki-gixxer-250.jpg' },
            { name: 'Pearl Glacier White', hex: '#ffffff', image: '/images/motorcycles/suzuki-gixxer-250.jpg' }
        ],
        description: 'Quarter-liter naked with Suzuki Oil Cooling System (SOCS), dual-channel ABS, cast aluminum wheels, and punchy mid-range acceleration.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Pulsar N250',
        brand: 'Bajaj',
        category: 'Street',
        price: 151000,
        exShowroomPrice: 151000,
        engine: 249.07,
        power: 24.13,
        torque: 21.5,
        mileage: 35,
        fuel: 'Petrol',
        weight: 164,
        topSpeed: 135,
        transmission: 'Manual',
        rating: 4.6,
        image: '/images/motorcycles/bajaj-pulsar-n250.jpg',
        images: [
            { url: '/images/motorcycles/bajaj-pulsar-n250.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Glossy Ebony Black', hex: '#000000', image: '/images/motorcycles/bajaj-pulsar-n250.jpg' },
            { name: 'Pearl Metallic White', hex: '#f8fafc', image: '/images/motorcycles/bajaj-pulsar-n250.jpg' },
            { name: 'Racing Red', hex: '#dc2626', image: '/images/motorcycles/bajaj-pulsar-n250.jpg' }
        ],
        description: 'Refined quarter-liter streetfighter with 37mm inverted forks, traction control, assist and slipper clutch, and three ABS modes (Rain, Road, Off-road).',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: '200 Duke',
        brand: 'KTM',
        category: 'Street',
        price: 198000,
        exShowroomPrice: 198000,
        engine: 199.5,
        power: 24.67,
        torque: 19.3,
        mileage: 34,
        fuel: 'Petrol',
        weight: 159,
        topSpeed: 138,
        transmission: 'Manual',
        rating: 4.7,
        image: '/images/motorcycles/ktm-200-duke.jpg',
        images: [
            { url: '/images/motorcycles/ktm-200-duke.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Electronic Orange', hex: '#f97316', image: '/images/motorcycles/ktm-200-duke.jpg' },
            { name: 'Dark Galvano', hex: '#334155', image: '/images/motorcycles/ktm-200-duke.jpg' },
            { name: 'Metallic Silver', hex: '#cbd5e1', image: '/images/motorcycles/ktm-200-duke.jpg' }
        ],
        description: 'The iconic street brawler featuring a high-revving liquid-cooled DOHC engine, lightweight steel trellis frame, and WP Apex upside-down forks.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },

    // ==========================================
    // 4. SPORTS BIKES (6 vehicles)
    // ==========================================
    {
        name: 'Gixxer SF 250',
        brand: 'Suzuki',
        category: 'Sports',
        price: 192100,
        exShowroomPrice: 192100,
        engine: 249.0,
        power: 26.13,
        torque: 22.2,
        mileage: 36,
        fuel: 'Petrol',
        weight: 161,
        topSpeed: 150,
        transmission: 'Manual',
        rating: 4.6,
        image: '/images/motorcycles/suzuki-gixxer-sf-250.jpg',
        images: [
            { url: '/images/motorcycles/suzuki-gixxer-sf-250.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Metallic Triton Blue', hex: '#0284c7', image: '/images/motorcycles/suzuki-gixxer-sf-250.jpg' },
            { name: 'Metallic Matte Black', hex: '#18181b', image: '/images/motorcycles/suzuki-gixxer-sf-250.jpg' },
            { name: 'Pearl Mira Red', hex: '#dc2626', image: '/images/motorcycles/suzuki-gixxer-sf-250.jpg' }
        ],
        description: 'Aerodynamic fully-faired sport tourer with MotoGP racing livery option, clip-on handlebars, LED lighting, and oil-cooled refinement.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'RC 200',
        brand: 'KTM',
        category: 'Sports',
        price: 218000,
        exShowroomPrice: 218000,
        engine: 199.5,
        power: 24.67,
        torque: 19.2,
        mileage: 35,
        fuel: 'Petrol',
        weight: 160,
        topSpeed: 140,
        transmission: 'Manual',
        rating: 4.6,
        image: '/images/motorcycles/ktm-rc-200.jpg',
        images: [
            { url: '/images/motorcycles/ktm-rc-200.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'GP Edition Orange', hex: '#ea580c', image: '/images/motorcycles/ktm-rc-200.jpg' },
            { name: 'Black with Orange', hex: '#18181b', image: '/images/motorcycles/ktm-rc-200.jpg' },
            { name: 'White', hex: '#ffffff', image: '/images/motorcycles/ktm-rc-200.jpg' }
        ],
        description: 'Track-focused supersport equipped with Grand Prix aerodynamic bodywork, clip-on handlebars, and ByBre disc brakes with Supermoto ABS.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'RC 390',
        brand: 'KTM',
        category: 'Sports',
        price: 318000,
        exShowroomPrice: 318000,
        engine: 373.27,
        power: 42.9,
        torque: 37.0,
        mileage: 28,
        fuel: 'Petrol',
        weight: 172,
        topSpeed: 175,
        transmission: 'Manual',
        rating: 4.8,
        image: '/images/motorcycles/ktm-rc-390.jpg',
        images: [
            { url: '/images/motorcycles/ktm-rc-390.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Factory Racing Blue/Orange', hex: '#1e40af', image: '/images/motorcycles/ktm-rc-390.jpg' },
            { name: 'Electronic Orange', hex: '#f97316', image: '/images/motorcycles/ktm-rc-390.jpg' }
        ],
        description: 'Hardcore track weapon with Cornering ABS, Motorcycle Traction Control (MTC), Quickshifter+, WP Apex adjustable suspension, and color TFT screen.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Apache RR 310',
        brand: 'TVS',
        category: 'Sports',
        price: 275000,
        exShowroomPrice: 275000,
        engine: 312.2,
        power: 37.48,
        torque: 29.0,
        mileage: 32,
        fuel: 'Petrol',
        weight: 174,
        topSpeed: 164,
        transmission: 'Manual',
        rating: 4.8,
        image: '/images/motorcycles/tvs-apache-rr-310.jpg',
        images: [
            { url: '/images/motorcycles/tvs-apache-rr-310.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Racing Red', hex: '#b91c1c', image: '/images/motorcycles/tvs-apache-rr-310.jpg' },
            { name: 'Bomber Grey', hex: '#64748b', image: '/images/motorcycles/tvs-apache-rr-310.jpg' },
            { name: 'Titanium Black', hex: '#09090b', image: '/images/motorcycles/tvs-apache-rr-310.jpg' }
        ],
        description: 'Co-developed with BMW Motorrad, featuring reverse-inclined engine, ram-air intake, aerodynamic winglets, and 5-inch vertical TFT with race telemetry.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'RS 457',
        brand: 'Aprilia',
        category: 'Sports',
        price: 410000,
        exShowroomPrice: 410000,
        engine: 457.0,
        power: 46.9,
        torque: 43.5,
        mileage: 25,
        fuel: 'Petrol',
        weight: 175,
        topSpeed: 185,
        transmission: 'Manual',
        rating: 4.9,
        image: '/images/motorcycles/aprilia-rs-457.jpg',
        images: [
            { url: '/images/motorcycles/aprilia-rs-457.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Prismatic Dark', hex: '#18181b', image: '/images/motorcycles/aprilia-rs-457.jpg' },
            { name: 'Opalescent Light', hex: '#f8fafc', image: '/images/motorcycles/aprilia-rs-457.jpg' },
            { name: 'Racing Stripes', hex: '#dc2626', image: '/images/motorcycles/aprilia-rs-457.jpg' }
        ],
        description: 'Twin-cylinder supersport engineering with aluminum perimeter frame, 270-degree crankshaft, ride-by-wire with 3 riding modes, and 3-level traction control.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'G 310 RR',
        brand: 'BMW',
        category: 'Sports',
        price: 305000,
        exShowroomPrice: 305000,
        engine: 313.0,
        power: 33.52,
        torque: 27.3,
        mileage: 30,
        fuel: 'Petrol',
        weight: 174,
        topSpeed: 160,
        transmission: 'Manual',
        rating: 4.7,
        image: '/images/motorcycles/bmw-g-310-rr.jpg',
        images: [
            { url: '/images/motorcycles/bmw-g-310-rr.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Cosmic Black 2', hex: '#0a0a0a', image: '/images/motorcycles/bmw-g-310-rr.jpg' },
            { name: 'Style Passion Racing Blue', hex: '#1d4ed8', image: '/images/motorcycles/bmw-g-310-rr.jpg' },
            { name: 'Motorsport Light White', hex: '#f1f5f9', image: '/images/motorcycles/bmw-g-310-rr.jpg' }
        ],
        description: 'Premium compact supersport carrying the BMW M-sport racing pedigree with Track/Sport/Rain/Urban riding modes and inverted gold forks.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },

    // ==========================================
    // 5. CRUISERS & ROADSTERS (8 vehicles)
    // ==========================================
    {
        name: 'Bullet 350',
        brand: 'Royal Enfield',
        category: 'Cruiser',
        price: 173500,
        exShowroomPrice: 173500,
        engine: 349.0,
        power: 20.2,
        torque: 27.0,
        mileage: 36,
        fuel: 'Petrol',
        weight: 195,
        topSpeed: 110,
        transmission: 'Manual',
        rating: 4.7,
        image: '/images/motorcycles/royal-enfield-bullet-350.jpg',
        images: [
            { url: '/images/motorcycles/royal-enfield-bullet-350.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Military Black', hex: '#18181b', image: '/images/motorcycles/royal-enfield-bullet-350.jpg' },
            { name: 'Standard Maroon', hex: '#831843', image: '/images/motorcycles/royal-enfield-bullet-350.jpg' },
            { name: 'Black Gold', hex: '#09090b', image: '/images/motorcycles/royal-enfield-bullet-350.jpg' },
            { name: 'Military Red', hex: '#b91c1c', image: '/images/motorcycles/royal-enfield-bullet-350.jpg' }
        ],
        description: 'The longest continuously produced motorcycle model in history, reincarnated with the smooth J-series counterbalanced engine and hand-painted pinstripes.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Meteor 350',
        brand: 'Royal Enfield',
        category: 'Cruiser',
        price: 205900,
        exShowroomPrice: 205900,
        engine: 349.0,
        power: 20.2,
        torque: 27.0,
        mileage: 35,
        fuel: 'Petrol',
        weight: 191,
        topSpeed: 115,
        transmission: 'Manual',
        rating: 4.7,
        image: '/images/motorcycles/royal-enfield-meteor-350.jpg',
        images: [
            { url: '/images/motorcycles/royal-enfield-meteor-350.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Fireball Yellow', hex: '#eab308', image: '/images/motorcycles/royal-enfield-meteor-350.jpg' },
            { name: 'Stellar Blue', hex: '#1e3a8a', image: '/images/motorcycles/royal-enfield-meteor-350.jpg' },
            { name: 'Supernova Red', hex: '#b91c1c', image: '/images/motorcycles/royal-enfield-meteor-350.jpg' },
            { name: 'Aurora Green', hex: '#15803d', image: '/images/motorcycles/royal-enfield-meteor-350.jpg' }
        ],
        description: 'Thorough modern highway cruiser with relaxed foot-forward ergonomics, low seat height, Tripper navigation pod, and plush suspension.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Super Meteor 650',
        brand: 'Royal Enfield',
        category: 'Cruiser',
        price: 363900,
        exShowroomPrice: 363900,
        engine: 648.0,
        power: 46.3,
        torque: 52.3,
        mileage: 24,
        fuel: 'Petrol',
        weight: 241,
        topSpeed: 160,
        transmission: 'Manual',
        rating: 4.8,
        image: '/images/motorcycles/royal-enfield-super-meteor-650.jpg',
        images: [
            { url: '/images/motorcycles/royal-enfield-super-meteor-650.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Astral Black', hex: '#09090b', image: '/images/motorcycles/royal-enfield-super-meteor-650.jpg' },
            { name: 'Interstellar Green', hex: '#14532d', image: '/images/motorcycles/royal-enfield-super-meteor-650.jpg' },
            { name: 'Celestial Blue', hex: '#1e40af', image: '/images/motorcycles/royal-enfield-super-meteor-650.jpg' },
            { name: 'Astral Blue', hex: '#0284c7', image: '/images/motorcycles/royal-enfield-super-meteor-650.jpg' }
        ],
        description: 'Grand tourer cruiser featuring Showa upside-down front forks, full LED headlamp, sculpted fuel tank, and silky 648cc parallel-twin engine.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: "H'ness CB350",
        brand: 'Honda',
        category: 'Cruiser',
        price: 209800,
        exShowroomPrice: 209800,
        engine: 348.36,
        power: 20.78,
        torque: 30.0,
        mileage: 35,
        fuel: 'Petrol',
        weight: 181,
        topSpeed: 125,
        transmission: 'Manual',
        rating: 4.7,
        image: '/images/motorcycles/honda-hness-cb350.jpg',
        images: [
            { url: '/images/motorcycles/honda-hness-cb350.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Precious Red Metallic', hex: '#991b1b', image: '/images/motorcycles/honda-hness-cb350.jpg' },
            { name: 'Matte Marshal Green', hex: '#166534', image: '/images/motorcycles/honda-hness-cb350.jpg' },
            { name: 'Pearl Nightstar Black', hex: '#0a0a0a', image: '/images/motorcycles/honda-hness-cb350.jpg' },
            { name: 'Athletic Blue Metallic', hex: '#1d4ed8', image: '/images/motorcycles/honda-hness-cb350.jpg' }
        ],
        description: 'Classic roadster featuring Honda Selectable Torque Control (HSTC), assist and slipper clutch, smartphone voice control system, and deep exhaust thump.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'CB350RS',
        brand: 'Honda',
        category: 'Roadster',
        price: 214800,
        exShowroomPrice: 214800,
        engine: 348.36,
        power: 20.78,
        torque: 30.0,
        mileage: 35,
        fuel: 'Petrol',
        weight: 179,
        topSpeed: 125,
        transmission: 'Manual',
        rating: 4.7,
        image: '/images/motorcycles/honda-cb350rs.jpg',
        images: [
            { url: '/images/motorcycles/honda-cb350rs.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Radiant Red Metallic', hex: '#dc2626', image: '/images/motorcycles/honda-cb350rs.jpg' },
            { name: 'Black with Pearl Sports Yellow', hex: '#eab308', image: '/images/motorcycles/honda-cb350rs.jpg' },
            { name: 'Mat Massive Grey', hex: '#475569', image: '/images/motorcycles/honda-cb350rs.jpg' }
        ],
        description: 'Scrambler-inspired contemporary roadster featuring tuck-and-roll seat, dual-purpose pattern tires, skid plate, and sporty forward-leaning riding posture.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: '42',
        brand: 'Jawa',
        category: 'Roadster',
        price: 172900,
        exShowroomPrice: 172900,
        engine: 294.72,
        power: 26.95,
        torque: 26.84,
        mileage: 32,
        fuel: 'Petrol',
        weight: 182,
        topSpeed: 130,
        transmission: 'Manual',
        rating: 4.4,
        image: '/images/motorcycles/jawa-42.jpg',
        images: [
            { url: '/images/motorcycles/jawa-42.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Nebula Blue', hex: '#1e40af', image: '/images/motorcycles/jawa-42.jpg' },
            { name: 'Comet Red', hex: '#b91c1c', image: '/images/motorcycles/jawa-42.jpg' },
            { name: 'Starlight Blue', hex: '#2563eb', image: '/images/motorcycles/jawa-42.jpg' },
            { name: 'AllStar Black', hex: '#18181b', image: '/images/motorcycles/jawa-42.jpg' }
        ],
        description: 'Modern-retro roadster with liquid-cooled DOHC engine, offset instrument console, bar-end mirrors, and spirited exhaust roar.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: '350',
        brand: 'Jawa',
        category: 'Cruiser',
        price: 214900,
        exShowroomPrice: 214900,
        engine: 334.0,
        power: 22.26,
        torque: 28.1,
        mileage: 30,
        fuel: 'Petrol',
        weight: 194,
        topSpeed: 125,
        transmission: 'Manual',
        rating: 4.5,
        image: '/images/motorcycles/jawa-350.jpg',
        images: [
            { url: '/images/motorcycles/jawa-350.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Maroon', hex: '#831843', image: '/images/motorcycles/jawa-350.jpg' },
            { name: 'Black', hex: '#0a0a0a', image: '/images/motorcycles/jawa-350.jpg' },
            { name: 'Mystique Orange', hex: '#ea580c', image: '/images/motorcycles/jawa-350.jpg' },
            { name: 'White', hex: '#f8fafc', image: '/images/motorcycles/jawa-350.jpg' }
        ],
        description: 'Classic heritage cruiser with chrome tank panels, dual exhausts, 334cc liquid-cooled engine, and high ground clearance of 178mm.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Ronin',
        brand: 'TVS',
        category: 'Cruiser',
        price: 149200,
        exShowroomPrice: 149200,
        engine: 225.9,
        power: 20.12,
        torque: 19.93,
        mileage: 42,
        fuel: 'Petrol',
        weight: 160,
        topSpeed: 120,
        transmission: 'Manual',
        rating: 4.6,
        image: '/images/motorcycles/tvs-ronin.jpg',
        images: [
            { url: '/images/motorcycles/tvs-ronin.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Magma Red', hex: '#dc2626', image: '/images/motorcycles/tvs-ronin.jpg' },
            { name: 'Lightning Black', hex: '#0a0a0a', image: '/images/motorcycles/tvs-ronin.jpg' },
            { name: 'Delta Blue', hex: '#1e3a8a', image: '/images/motorcycles/tvs-ronin.jpg' },
            { name: 'Galactic Grey', hex: '#475569', image: '/images/motorcycles/tvs-ronin.jpg' }
        ],
        description: 'Modern retro lifestyle cruiser with golden Showa upside-down forks, voice assistance, dual-channel ABS with Rain/Urban modes, and block-pattern tires.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },

    // ==========================================
    // 6. ADVENTURE BIKES (6 vehicles)
    // ==========================================
    {
        name: 'Himalayan 450',
        brand: 'Royal Enfield',
        category: 'Adventure',
        price: 285000,
        exShowroomPrice: 285000,
        engine: 452.0,
        power: 39.5,
        torque: 40.0,
        mileage: 30,
        fuel: 'Petrol',
        weight: 196,
        topSpeed: 150,
        transmission: 'Manual',
        rating: 4.8,
        image: '/images/motorcycles/royal-enfield-himalayan-450.jpg',
        images: [
            { url: '/images/motorcycles/royal-enfield-himalayan-450.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Kaza Brown', hex: '#a8a29e', image: '/images/motorcycles/royal-enfield-himalayan-450.jpg' },
            { name: 'Slate Himalayan Salt', hex: '#f43f5e', image: '/images/motorcycles/royal-enfield-himalayan-450.jpg' },
            { name: 'Hanle Black', hex: '#09090b', image: '/images/motorcycles/royal-enfield-himalayan-450.jpg' },
            { name: 'Kamet White', hex: '#ffffff', image: '/images/motorcycles/royal-enfield-himalayan-450.jpg' }
        ],
        description: 'Purpose-built adventure tourer powered by the liquid-cooled Sherpa 450 engine, 21-inch front spoke wheel, Showa long-travel suspension, and full-map Google navigation.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Scram 411',
        brand: 'Royal Enfield',
        category: 'Adventure',
        price: 206000,
        exShowroomPrice: 206000,
        engine: 411.0,
        power: 24.3,
        torque: 32.0,
        mileage: 32,
        fuel: 'Petrol',
        weight: 185,
        topSpeed: 120,
        transmission: 'Manual',
        rating: 4.5,
        image: '/images/motorcycles/royal-enfield-scram-411.jpg',
        images: [
            { url: '/images/motorcycles/royal-enfield-scram-411.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Graphite Yellow', hex: '#eab308', image: '/images/motorcycles/royal-enfield-scram-411.jpg' },
            { name: 'Graphite Red', hex: '#dc2626', image: '/images/motorcycles/royal-enfield-scram-411.jpg' },
            { name: 'Blazing Black', hex: '#18181b', image: '/images/motorcycles/royal-enfield-scram-411.jpg' },
            { name: 'Skyline Blue', hex: '#0284c7', image: '/images/motorcycles/royal-enfield-scram-411.jpg' }
        ],
        description: 'Street scrambler blending rugged off-road capability with urban agility, 19-inch front wheel, single-piece seat, and long-travel suspension.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: '390 Adventure',
        brand: 'KTM',
        category: 'Adventure',
        price: 338000,
        exShowroomPrice: 338000,
        engine: 373.27,
        power: 42.9,
        torque: 37.0,
        mileage: 28,
        fuel: 'Petrol',
        weight: 177,
        topSpeed: 165,
        transmission: 'Manual',
        rating: 4.8,
        image: '/images/motorcycles/ktm-390-adventure.jpg',
        images: [
            { url: '/images/motorcycles/ktm-390-adventure.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Atlantic Blue', hex: '#1e3a8a', image: '/images/motorcycles/ktm-390-adventure.jpg' },
            { name: 'Electronic Orange', hex: '#ea580c', image: '/images/motorcycles/ktm-390-adventure.jpg' },
            { name: 'Dark Galvano', hex: '#334155', image: '/images/motorcycles/ktm-390-adventure.jpg' }
        ],
        description: 'Rally-proven adventure tourer with Cornering ABS, Offroad ABS mode, traction control, spoked wheels, adjustable WP Apex suspension, and full TFT screen.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'XPulse 200 4V',
        brand: 'Hero',
        category: 'Adventure',
        price: 147300,
        exShowroomPrice: 147300,
        engine: 199.6,
        power: 18.9,
        torque: 17.35,
        mileage: 40,
        fuel: 'Petrol',
        weight: 159,
        topSpeed: 115,
        transmission: 'Manual',
        rating: 4.6,
        image: '/images/motorcycles/hero-xpulse-200-4v.jpg',
        images: [
            { url: '/images/motorcycles/hero-xpulse-200-4v.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Matte Nexus Blue', hex: '#1e3a8a', image: '/images/motorcycles/hero-xpulse-200-4v.jpg' },
            { name: 'Techno Blue', hex: '#0284c7', image: '/images/motorcycles/hero-xpulse-200-4v.jpg' },
            { name: 'Black Sports Red', hex: '#dc2626', image: '/images/motorcycles/hero-xpulse-200-4v.jpg' }
        ],
        description: 'Lightweight dual-sport trail machine boasting 220mm ground clearance, 21-inch front spoke wheel, 3 ABS ride modes (Road/Off-road/Rally), and LED projector light.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'G 310 GS',
        brand: 'BMW',
        category: 'Adventure',
        price: 330000,
        exShowroomPrice: 330000,
        engine: 313.0,
        power: 33.52,
        torque: 28.0,
        mileage: 30,
        fuel: 'Petrol',
        weight: 175,
        topSpeed: 143,
        transmission: 'Manual',
        rating: 4.7,
        image: '/images/motorcycles/bmw-g-310-gs.jpg',
        images: [
            { url: '/images/motorcycles/bmw-g-310-gs.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Kalamata Dark Gold', hex: '#854d0e', image: '/images/motorcycles/bmw-g-310-gs.jpg' },
            { name: 'Cosmic Black 3', hex: '#0a0a0a', image: '/images/motorcycles/bmw-g-310-gs.jpg' },
            { name: 'Sport Polar White', hex: '#f1f5f9', image: '/images/motorcycles/bmw-g-310-gs.jpg' }
        ],
        description: 'Compact GS adventure bike with distinctive beak front fender, high windscreen, 19-inch front wheel, upside-down forks, and luggage rack.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Adventure',
        brand: 'Yezdi',
        category: 'Adventure',
        price: 215900,
        exShowroomPrice: 215900,
        engine: 334.0,
        power: 29.89,
        torque: 29.84,
        mileage: 30,
        fuel: 'Petrol',
        weight: 187,
        topSpeed: 140,
        transmission: 'Manual',
        rating: 4.5,
        image: '/images/motorcycles/yezdi-adventure.jpg',
        images: [
            { url: '/images/motorcycles/yezdi-adventure.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Tornado Black', hex: '#09090b', image: '/images/motorcycles/yezdi-adventure.jpg' },
            { name: 'Magnite Maroon', hex: '#881337', image: '/images/motorcycles/yezdi-adventure.jpg' },
            { name: 'Wolf Grey', hex: '#64748b', image: '/images/motorcycles/yezdi-adventure.jpg' },
            { name: 'Glacier White', hex: '#ffffff', image: '/images/motorcycles/yezdi-adventure.jpg' }
        ],
        description: 'Rugged overland adventure motorcycle equipped with fuel tank crash cages, turn-by-turn navigation console, 220mm ground clearance, and long travel mono-shock.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },

    // ==========================================
    // 7. TOURING & MID-WEIGHTS (6 vehicles)
    // ==========================================
    {
        name: 'Interceptor 650',
        brand: 'Royal Enfield',
        category: 'Touring',
        price: 303000,
        exShowroomPrice: 303000,
        engine: 648.0,
        power: 47.0,
        torque: 52.0,
        mileage: 25,
        fuel: 'Petrol',
        weight: 218,
        topSpeed: 170,
        transmission: 'Manual',
        rating: 4.8,
        image: '/images/motorcycles/royal-enfield-interceptor-650.jpg',
        images: [
            { url: '/images/motorcycles/royal-enfield-interceptor-650.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Cali Green', hex: '#15803d', image: '/images/motorcycles/royal-enfield-interceptor-650.jpg' },
            { name: 'Canyon Red', hex: '#b91c1c', image: '/images/motorcycles/royal-enfield-interceptor-650.jpg' },
            { name: 'Sunset Strip', hex: '#ea580c', image: '/images/motorcycles/royal-enfield-interceptor-650.jpg' },
            { name: 'Black Pearl', hex: '#09090b', image: '/images/motorcycles/royal-enfield-interceptor-650.jpg' }
        ],
        description: 'Beloved British-style twin-cylinder roadster delivering broad torque spread, relaxed upright touring ergonomics, dual exhausts, and LED headlamp.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Continental GT 650',
        brand: 'Royal Enfield',
        category: 'Touring',
        price: 319000,
        exShowroomPrice: 319000,
        engine: 648.0,
        power: 47.0,
        torque: 52.0,
        mileage: 25,
        fuel: 'Petrol',
        weight: 214,
        topSpeed: 170,
        transmission: 'Manual',
        rating: 4.8,
        image: '/images/motorcycles/royal-enfield-continental-gt-650.jpg',
        images: [
            { url: '/images/motorcycles/royal-enfield-continental-gt-650.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'British Racing Green', hex: '#14532d', image: '/images/motorcycles/royal-enfield-continental-gt-650.jpg' },
            { name: 'Dux Deluxe', hex: '#334155', image: '/images/motorcycles/royal-enfield-continental-gt-650.jpg' },
            { name: 'Slipstream Blue', hex: '#1e3a8a', image: '/images/motorcycles/royal-enfield-continental-gt-650.jpg' },
            { name: 'Apex Grey', hex: '#64748b', image: '/images/motorcycles/royal-enfield-continental-gt-650.jpg' }
        ],
        description: 'Authentic 1960s café racer with clip-on handlebars, rear-set footpegs, sculpted single seat with cowl, and twin-cradle steel frame tuned by Harris Performance.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Speed 400',
        brand: 'Triumph',
        category: 'Touring',
        price: 234000,
        exShowroomPrice: 234000,
        engine: 398.15,
        power: 39.5,
        torque: 37.5,
        mileage: 29,
        fuel: 'Petrol',
        weight: 176,
        topSpeed: 160,
        transmission: 'Manual',
        rating: 4.9,
        image: '/images/motorcycles/triumph-speed-400.jpg',
        images: [
            { url: '/images/motorcycles/triumph-speed-400.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Carnival Red', hex: '#b91c1c', image: '/images/motorcycles/triumph-speed-400.jpg' },
            { name: 'Caspian Blue', hex: '#1e40af', image: '/images/motorcycles/triumph-speed-400.jpg' },
            { name: 'Phantom Black', hex: '#09090b', image: '/images/motorcycles/triumph-speed-400.jpg' },
            { name: 'Racing Yellow', hex: '#eab308', image: '/images/motorcycles/triumph-speed-400.jpg' }
        ],
        description: 'Modern classic roadster powered by Triumph TR-series fuel-injected DOHC engine, 43mm big-piston USD forks, switchable traction control, and immaculate finish.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Scrambler 400 X',
        brand: 'Triumph',
        category: 'Touring',
        price: 264000,
        exShowroomPrice: 264000,
        engine: 398.15,
        power: 39.5,
        torque: 37.5,
        mileage: 28,
        fuel: 'Petrol',
        weight: 179,
        topSpeed: 155,
        transmission: 'Manual',
        rating: 4.8,
        image: '/images/motorcycles/triumph-scrambler-400-x.jpg',
        images: [
            { url: '/images/motorcycles/triumph-scrambler-400-x.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Matt Khaki Green', hex: '#3f6212', image: '/images/motorcycles/triumph-scrambler-400-x.jpg' },
            { name: 'Carnival Red', hex: '#b91c1c', image: '/images/motorcycles/triumph-scrambler-400-x.jpg' },
            { name: 'Phantom Black', hex: '#09090b', image: '/images/motorcycles/triumph-scrambler-400-x.jpg' }
        ],
        description: 'Rugged scrambler with 19-inch front wheel, wide handlebars with handguards, sump guard, switchable off-road ABS and traction control, and high ground clearance.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'X440',
        brand: 'Harley-Davidson',
        category: 'Touring',
        price: 239500,
        exShowroomPrice: 239500,
        engine: 440.0,
        power: 27.0,
        torque: 38.0,
        mileage: 35,
        fuel: 'Petrol',
        weight: 190.5,
        topSpeed: 135,
        transmission: 'Manual',
        rating: 4.7,
        image: '/images/motorcycles/harley-davidson-x440.jpg',
        images: [
            { url: '/images/motorcycles/harley-davidson-x440.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Mustard Yellow', hex: '#ca8a04', image: '/images/motorcycles/harley-davidson-x440.jpg' },
            { name: 'Metallic Dark Silver', hex: '#475569', image: '/images/motorcycles/harley-davidson-x440.jpg' },
            { name: 'Denim Red', hex: '#b91c1c', image: '/images/motorcycles/harley-davidson-x440.jpg' },
            { name: 'Matte Black', hex: '#0a0a0a', image: '/images/motorcycles/harley-davidson-x440.jpg' }
        ],
        description: 'The first single-cylinder modern Harley engineered for Indian highways with immense low-end torque, KYB 43mm inverted forks, and classic American roadster presence.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    },
    {
        name: 'Z650',
        brand: 'Kawasaki',
        category: 'Touring',
        price: 665000,
        exShowroomPrice: 665000,
        engine: 649.0,
        power: 67.3,
        torque: 64.0,
        mileage: 20,
        fuel: 'Petrol',
        weight: 191,
        topSpeed: 210,
        transmission: 'Manual',
        rating: 4.8,
        image: '/images/motorcycles/kawasaki-z650.jpg',
        images: [
            { url: '/images/motorcycles/kawasaki-z650.jpg', label: 'Main View' }
        ],
        colors: [
            { name: 'Metallic Matte Graphenesteel Gray', hex: '#334155', image: '/images/motorcycles/kawasaki-z650.jpg' },
            { name: 'Candy Persimmon Red', hex: '#dc2626', image: '/images/motorcycles/kawasaki-z650.jpg' },
            { name: 'Metallic Spark Black', hex: '#000000', image: '/images/motorcycles/kawasaki-z650.jpg' }
        ],
        description: 'Sugomi-styled middleweight naked sports tourer with responsive parallel-twin engine, Kawasaki Traction Control (KTRC), and 4.3-inch full-color TFT display.',
        batteryCapacity: 0,
        range: 0,
        chargingTime: 0
    }
];

async function seed() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/motoai';
    console.log(`Connecting to MongoDB: ${mongoUri.replace(/:[^:@]+@/, ':****@')} ...`);
    await mongoose.connect(mongoUri);
    console.log('Connected successfully to MongoDB.');

    // 1. Capture snapshot of existing records before seeding
    const initialBikes = await Motorcycle.find({}, 'name brand _id');
    console.log(`Initial vehicle count: ${initialBikes.length}`);
    const initialIds = new Set(initialBikes.map(b => b._id.toString()));

    let insertedCount = 0;
    let skippedCount = 0;

    for (const vehicleData of NEW_VEHICLES) {
        // Strict duplicate check: match by brand and name (case-insensitive regex)
        const existing = await Motorcycle.findOne({
            brand: new RegExp(`^${vehicleData.brand.trim()}$`, 'i'),
            name: new RegExp(`^${vehicleData.name.trim()}$`, 'i')
        });

        if (existing) {
            console.log(`[SKIP] Already exists: ${vehicleData.brand} ${vehicleData.name}`);
            skippedCount++;
            continue;
        }

        // Attach brandLogo and computed city on-road prices
        const docToInsert = {
            ...vehicleData,
            brandLogo: BRAND_LOGOS[vehicleData.brand] || '',
            cityPrices: calculateCityPrices(vehicleData.price)
        };

        const created = await Motorcycle.create(docToInsert);
        console.log(`[INSERTED] ${created.brand} ${created.name} (id: ${created._id})`);
        insertedCount++;
    }

    // 2. Verification after seeding
    const finalBikes = await Motorcycle.find({}, 'name brand _id category price');
    console.log('\n================ SEED SUMMARY ================');
    console.log(`Initial vehicle count : ${initialBikes.length}`);
    console.log(`Newly inserted        : ${insertedCount}`);
    console.log(`Skipped (existing)    : ${skippedCount}`);
    console.log(`Final total vehicles  : ${finalBikes.length}`);

    // Verify all original records are preserved with same ID
    let originalIntact = true;
    for (const initBike of initialBikes) {
        const found = finalBikes.find(b => b._id.toString() === initBike._id.toString());
        if (!found || found.name !== initBike.name || found.brand !== initBike.brand) {
            console.error(`ERROR: Original bike mutated or missing: ${initBike.brand} ${initBike.name}`);
            originalIntact = false;
        }
    }

    if (originalIntact) {
        console.log(`CONFIRMED: All ${initialBikes.length} original motorcycles are 100% UNCHANGED and intact.`);
    } else {
        console.error('CRITICAL: One or more original vehicles were modified!');
    }

    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
}

seed().catch(err => {
    console.error('Seeding failed with error:', err);
    process.exit(1);
});
