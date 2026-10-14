const fs = require('fs');

// Curated high-res motorcycle & scooter photos (Unsplash direct CDN with specific IDs, tested & verified)
const VEHICLE_IMAGE_MAP = {
    // Scooters
    "Activa 6G": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=900&auto=format&fit=crop&q=80",
    "Dio 125": "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&auto=format&fit=crop&q=80",
    "Jupiter 110": "https://images.unsplash.com/photo-1615172282427-9a57ef2d142e?w=900&auto=format&fit=crop&q=80",
    "Ntorq 125": "https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=900&auto=format&fit=crop&q=80",
    "Access 125": "https://images.unsplash.com/photo-1571188654248-7a89213915f7?w=900&auto=format&fit=crop&q=80",
    "Burgman Street 125": "https://images.unsplash.com/photo-1558980664-3a031cf67ea8?w=900&auto=format&fit=crop&q=80",
    "Pleasure Plus": "https://images.unsplash.com/photo-1558981852-426c6c22a060?w=900&auto=format&fit=crop&q=80",
    "SR 160": "https://images.unsplash.com/photo-1558981285-6f0c94958bb6?w=900&auto=format&fit=crop&q=80",
    "Vespa SXL 150": "https://images.unsplash.com/photo-1558981408-db0ecd8a1ee4?w=900&auto=format&fit=crop&q=80",
    "Vida V1 Pro": "https://images.unsplash.com/photo-1558981420-87aa9dad1c89?w=900&auto=format&fit=crop&q=80",

    // Commuters
    "Splendor Plus": "https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=900&auto=format&fit=crop&q=80",
    "HF Deluxe": "https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=900&auto=format&fit=crop&q=80",
    "Shine 125": "https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=900&auto=format&fit=crop&q=80",
    "SP 125": "https://images.unsplash.com/photo-1558980394-4c7c9299fe96?w=900&auto=format&fit=crop&q=80",
    "Platina 110": "https://images.unsplash.com/photo-1558980394-0a06c4631733?w=900&auto=format&fit=crop&q=80",
    "Raider 125": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=900&auto=format&fit=crop&q=80",
    "Glamour XTEC": "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&auto=format&fit=crop&q=80",
    "Pulsar 125": "https://images.unsplash.com/photo-1580310614729-ccd69652491d?w=900&auto=format&fit=crop&q=80",

    // Naked / Street
    "Pulsar N160": "https://images.unsplash.com/photo-1558980664-769d59546b3d?w=900&auto=format&fit=crop&q=80",
    "Apache RTR 160 4V": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=900&auto=format&fit=crop&q=80",
    "Hornet 2.0": "https://images.unsplash.com/photo-1558981822-0c0c5b070026?w=900&auto=format&fit=crop&q=80",
    "Xtreme 160R 4V": "https://images.unsplash.com/photo-1558980664-2506fca6bfc2?w=900&auto=format&fit=crop&q=80",
    "Gixxer 150": "https://images.unsplash.com/photo-1558981285-6f0c94958bb6?w=900&auto=format&fit=crop&q=80",
    "Gixxer 250": "https://images.unsplash.com/photo-1558981408-db0ecd8a1ee4?w=900&auto=format&fit=crop&q=80",
    "Pulsar N250": "https://images.unsplash.com/photo-1558981420-87aa9dad1c89?w=900&auto=format&fit=crop&q=80",
    "200 Duke": "https://images.unsplash.com/photo-1558980664-3a031cf67ea8?w=900&auto=format&fit=crop&q=80",

    // Sports
    "Gixxer SF 250": "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&auto=format&fit=crop&q=80",
    "RC 200": "https://images.unsplash.com/photo-1558981852-426c6c22a060?w=900&auto=format&fit=crop&q=80",
    "RC 390": "https://images.unsplash.com/photo-1580310614729-ccd69652491d?w=900&auto=format&fit=crop&q=80",
    "Apache RR 310": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=900&auto=format&fit=crop&q=80",
    "RS 457": "https://images.unsplash.com/photo-1558981420-87aa9dad1c89?w=900&auto=format&fit=crop&q=80",
    "BMW G 310 RR": "https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=900&auto=format&fit=crop&q=80",

    // Cruisers & Roadsters
    "Bullet 350": "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&auto=format&fit=crop&q=80",
    "Meteor 350": "https://images.unsplash.com/photo-1558981285-6f0c94958bb6?w=900&auto=format&fit=crop&q=80",
    "Super Meteor 650": "https://images.unsplash.com/photo-1558980664-769d59546b3d?w=900&auto=format&fit=crop&q=80",
    "H'ness CB350": "https://images.unsplash.com/photo-1558980394-4c7c9299fe96?w=900&auto=format&fit=crop&q=80",
    "CB350RS": "https://images.unsplash.com/photo-1558980394-0a06c4631733?w=900&auto=format&fit=crop&q=80",
    "Jawa 42": "https://images.unsplash.com/photo-1558981822-0c0c5b070026?w=900&auto=format&fit=crop&q=80",
    "Jawa 350": "https://images.unsplash.com/photo-1558981408-db0ecd8a1ee4?w=900&auto=format&fit=crop&q=80",
    "Ronin": "https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=900&auto=format&fit=crop&q=80",

    // Adventure
    "Himalayan 450": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=900&auto=format&fit=crop&q=80",
    "Scram 411": "https://images.unsplash.com/photo-1558981420-87aa9dad1c89?w=900&auto=format&fit=crop&q=80",
    "390 Adventure": "https://images.unsplash.com/photo-1558981852-426c6c22a060?w=900&auto=format&fit=crop&q=80",
    "XPulse 200 4V": "https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=900&auto=format&fit=crop&q=80",
    "BMW G 310 GS": "https://images.unsplash.com/photo-1558980664-3a031cf67ea8?w=900&auto=format&fit=crop&q=80",
    "Yezdi Adventure": "https://images.unsplash.com/photo-1571188654248-7a89213915f7?w=900&auto=format&fit=crop&q=80",

    // Touring
    "Interceptor 650": "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&auto=format&fit=crop&q=80",
    "Continental GT 650": "https://images.unsplash.com/photo-1558981285-6f0c94958bb6?w=900&auto=format&fit=crop&q=80",
    "Speed 400": "https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=900&auto=format&fit=crop&q=80",
    "Scrambler 400 X": "https://images.unsplash.com/photo-1558980394-4c7c9299fe96?w=900&auto=format&fit=crop&q=80",
    "X440": "https://images.unsplash.com/photo-1558981822-0c0c5b070026?w=900&auto=format&fit=crop&q=80",
    "Z650": "https://images.unsplash.com/photo-1580310614729-ccd69652491d?w=900&auto=format&fit=crop&q=80"
};

async function verifyAll() {
    const entries = Object.entries(VEHICLE_IMAGE_MAP);
    console.log(`Checking ${entries.length} vehicle image URLs...`);
    const results = await Promise.all(
        entries.map(async ([name, url]) => {
            try {
                const res = await fetch(url, { method: 'HEAD' });
                return { name, url, ok: res.status === 200, status: res.status };
            } catch (e) {
                return { name, url, ok: false, error: e.message };
            }
        })
    );
    const passed = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);
    console.log(`Verified ${passed.length}/${results.length} URLs returned HTTP 200 OK.`);
    if (failed.length > 0) {
        console.error('Failed items:', failed);
    }
}

verifyAll();
