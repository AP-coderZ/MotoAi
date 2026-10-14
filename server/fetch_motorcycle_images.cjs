const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../public/images/motorcycles');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// Map of slug -> search terms or direct high-res fallback URLs
const VEHICLES_TO_FETCH = [
    // Scooters
    { slug: 'honda-activa-6g', query: 'Honda Activa scooter', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Gold_Metallic_Honda_Activa.jpg/960px-Gold_Metallic_Honda_Activa.jpg' },
    { slug: 'honda-dio-125', query: 'Honda Dio scooter', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Honda_Dio_DLX_110cc_Mat_Axis_Grey_Metallic.jpg/960px-Honda_Dio_DLX_110cc_Mat_Axis_Grey_Metallic.jpg' },
    { slug: 'tvs-jupiter-110', query: 'TVS Jupiter scooter', fallback: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/TVS_Jupiter.jpg' },
    { slug: 'tvs-ntorq-125', query: 'TVS NTorq 125 scooter', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/TVS_Ntorq_125_Race_Edition.jpg/960px-TVS_Ntorq_125_Race_Edition.jpg' },
    { slug: 'suzuki-access-125', query: 'Suzuki Access 125 scooter', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Suzuki_Access_125.jpg/960px-Suzuki_Access_125.jpg' },
    { slug: 'suzuki-burgman-street-125', query: 'Suzuki Burgman Street scooter', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Suzuki_Burgman_Street_125.jpg/960px-Suzuki_Burgman_Street_125.jpg' },
    { slug: 'hero-pleasure-plus', query: 'Hero Pleasure scooter', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Hero_Honda_Pleasure.JPG/960px-Hero_Honda_Pleasure.JPG' },
    { slug: 'aprilia-sr-160', query: 'Aprilia SR 150 160 scooter', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Aprilia_SR_150.jpg/960px-Aprilia_SR_150.jpg' },
    { slug: 'vespa-sxl-150', query: 'Vespa scooter SXL', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Vespa_LX_125_Front-Right.jpg/960px-Vespa_LX_125_Front-Right.jpg' },
    { slug: 'hero-vida-v1-pro', query: 'Hero Vida V1 electric scooter', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Electric_Scooter_Hero_Vida_V1.jpg/960px-Electric_Scooter_Hero_Vida_V1.jpg' },

    // Commuters
    { slug: 'hero-splendor-plus', query: 'Hero Splendor motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Hero_Splendor_Plus.jpg/960px-Hero_Splendor_Plus.jpg' },
    { slug: 'hero-hf-deluxe', query: 'Hero HF Deluxe motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Hero_HF_Deluxe.jpg/960px-Hero_HF_Deluxe.jpg' },
    { slug: 'honda-shine-125', query: 'Honda Shine motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Honda_CB_Shine.JPG/960px-Honda_CB_Shine.JPG' },
    { slug: 'honda-sp-125', query: 'Honda SP 125 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Honda_SP125_BS6.jpg/960px-Honda_SP125_BS6.jpg' },
    { slug: 'bajaj-platina-110', query: 'Bajaj Platina motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Bajaj_Platina_100.jpg/960px-Bajaj_Platina_100.jpg' },
    { slug: 'tvs-raider-125', query: 'TVS Raider 125 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/TVS_Raider_125cc.jpg/960px-TVS_Raider_125cc.jpg' },
    { slug: 'hero-glamour-xtec', query: 'Hero Glamour motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Hero_Honda_Glamour_Programmed_FI_125cc_bike.jpg/960px-Hero_Honda_Glamour_Programmed_FI_125cc_bike.jpg' },
    { slug: 'bajaj-pulsar-125', query: 'Bajaj Pulsar 125 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Bajaj_Pulsar_150_Dtsi.jpg/960px-Bajaj_Pulsar_150_Dtsi.jpg' },

    // Naked / Street
    { slug: 'bajaj-pulsar-n160', query: 'Bajaj Pulsar N160 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Bajaj_Pulsar_N250_Front.jpg/960px-Bajaj_Pulsar_N250_Front.jpg' },
    { slug: 'tvs-apache-rtr-160-4v', query: 'TVS Apache RTR 160 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/TVS_Apache_RTR_160_4V.jpg/960px-TVS_Apache_RTR_160_4V.jpg' },
    { slug: 'honda-hornet-20', query: 'Honda CB Hornet motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Honda_CB_Hornet_160R.jpg/960px-Honda_CB_Hornet_160R.jpg' },
    { slug: 'hero-xtreme-160r-4v', query: 'Hero Xtreme motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Hero_Xtreme_Sports.jpg/960px-Hero_Xtreme_Sports.jpg' },
    { slug: 'suzuki-gixxer-150', query: 'Suzuki Gixxer 150 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Suzuki_Gixxer_155.jpg/960px-Suzuki_Gixxer_155.jpg' },
    { slug: 'suzuki-gixxer-250', query: 'Suzuki Gixxer 250 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Suzuki_Gixxer_250_2019.jpg/960px-Suzuki_Gixxer_250_2019.jpg' },
    { slug: 'bajaj-pulsar-n250', query: 'Bajaj Pulsar N250 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Bajaj_Pulsar_N250_Front.jpg/960px-Bajaj_Pulsar_N250_Front.jpg' },
    { slug: 'ktm-200-duke', query: 'KTM 200 Duke motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/KTM_200_Duke_2012.JPG/960px-KTM_200_Duke_2012.JPG' },

    // Sports
    { slug: 'suzuki-gixxer-sf-250', query: 'Suzuki Gixxer SF 250 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Suzuki_Gixxer_SF_250_MotoGP_Edition.jpg/960px-Suzuki_Gixxer_SF_250_MotoGP_Edition.jpg' },
    { slug: 'ktm-rc-200', query: 'KTM RC 200 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/KTM_RC200_Track.jpg/960px-KTM_RC200_Track.jpg' },
    { slug: 'ktm-rc-390', query: 'KTM RC 390 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/KTM_RC_390_White.jpg/960px-KTM_RC_390_White.jpg' },
    { slug: 'tvs-apache-rr-310', query: 'TVS Apache RR 310 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/TVS_Apache_RR_310_Racing_Red.jpg/960px-TVS_Apache_RR_310_Racing_Red.jpg' },
    { slug: 'aprilia-rs-457', query: 'Aprilia RS 457 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Aprilia_RS_457_EICMA_2023.jpg/960px-Aprilia_RS_457_EICMA_2023.jpg' },
    { slug: 'bmw-g-310-rr', query: 'BMW G310RR motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/BMW_G_310_R_White.jpg/960px-BMW_G_310_R_White.jpg' },

    // Cruisers & Roadsters
    { slug: 'royal-enfield-bullet-350', query: 'Royal Enfield Bullet 350 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Royal_Enfield_Bullet_Electra_350.JPG/960px-Royal_Enfield_Bullet_Electra_350.JPG' },
    { slug: 'royal-enfield-meteor-350', query: 'Royal Enfield Meteor 350 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Royal_Enfield_Meteor_350_Fireball_Yellow.jpg/960px-Royal_Enfield_Meteor_350_Fireball_Yellow.jpg' },
    { slug: 'royal-enfield-super-meteor-650', query: 'Royal Enfield Super Meteor 650 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Royal_Enfield_Super_Meteor_650_EICMA_2022.jpg/960px-Royal_Enfield_Super_Meteor_650_EICMA_2022.jpg' },
    { slug: 'honda-hness-cb350', query: 'Honda Hness CB350 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Honda_H%27ness_CB350_Precious_Red_Metallic.jpg/960px-Honda_H%27ness_CB350_Precious_Red_Metallic.jpg' },
    { slug: 'honda-cb350rs', query: 'Honda CB350RS motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Honda_CB350RS_Radiant_Red_Metallic.jpg/960px-Honda_CB350RS_Radiant_Red_Metallic.jpg' },
    { slug: 'jawa-42', query: 'Jawa 42 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Jawa_Forty_Two_Nebula_Blue.jpg/960px-Jawa_Forty_Two_Nebula_Blue.jpg' },
    { slug: 'jawa-350', query: 'Jawa 350 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Jawa_350_Standard.jpg/960px-Jawa_350_Standard.jpg' },
    { slug: 'tvs-ronin', query: 'TVS Ronin motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/TVS_Ronin_225_Magma_Red.jpg/960px-TVS_Ronin_225_Magma_Red.jpg' },

    // Adventure
    { slug: 'royal-enfield-himalayan-450', query: 'Royal Enfield Himalayan motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Royal_Enfield_Himalyana_DB2K5445.jpg/960px-Royal_Enfield_Himalyana_DB2K5445.jpg' },
    { slug: 'royal-enfield-scram-411', query: 'Royal Enfield Scram 411 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Royal_Enfield_Scram_411_Graphite_Yellow.jpg/960px-Royal_Enfield_Scram_411_Graphite_Yellow.jpg' },
    { slug: 'ktm-390-adventure', query: 'KTM 390 Adventure motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/KTM_390_Adventure_Orange.jpg/960px-KTM_390_Adventure_Orange.jpg' },
    { slug: 'hero-xpulse-200-4v', query: 'Hero XPulse 200 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Hero_XPulse_200_4V.jpg/960px-Hero_XPulse_200_4V.jpg' },
    { slug: 'bmw-g-310-gs', query: 'BMW G310GS motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/BMW_G_310_GS_Kalamata_metallic.jpg/960px-BMW_G_310_GS_Kalamata_metallic.jpg' },
    { slug: 'yezdi-adventure', query: 'Yezdi Adventure motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Yezdi_Adventure_Mambo_Black.jpg/960px-Yezdi_Adventure_Mambo_Black.jpg' },

    // Touring
    { slug: 'royal-enfield-interceptor-650', query: 'Royal Enfield Interceptor 650 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Royal_Enfield_Interceptor_650_Orange_Crush.jpg/960px-Royal_Enfield_Interceptor_650_Orange_Crush.jpg' },
    { slug: 'royal-enfield-continental-gt-650', query: 'Royal Enfield Continental GT 650 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Royal_Enfield_Continental_GT_650_Mister_Clean.jpg/960px-Royal_Enfield_Continental_GT_650_Mister_Clean.jpg' },
    { slug: 'triumph-speed-400', query: 'Triumph Speed 400 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Triumph_Speed_400_Carnival_Red.jpg/960px-Triumph_Speed_400_Carnival_Red.jpg' },
    { slug: 'triumph-scrambler-400-x', query: 'Triumph Scrambler 400 X motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Triumph_Scrambler_400_X_Matt_Khaki_Green.jpg/960px-Triumph_Scrambler_400_X_Matt_Khaki_Green.jpg' },
    { slug: 'harley-davidson-x440', query: 'Harley-Davidson X440 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Harley-Davidson_X440_Denim.jpg/960px-Harley-Davidson_X440_Denim.jpg' },
    { slug: 'kawasaki-z650', query: 'Kawasaki Z650 motorcycle', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Kawasaki_Z650_2020.jpg/960px-Kawasaki_Z650_2020.jpg' },
];

async function fetchFromWiki(query) {
    try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&pithumbsize=900&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'MotoAI/1.0 (motorcycle platform; contact@motoai.local)' } });
        const data = await res.json();
        const pages = data.query?.pages;
        if (!pages) return null;
        const page = Object.values(pages)[0];
        return page?.thumbnail?.source || null;
    } catch {
        return null;
    }
}

async function downloadImage(url, dest) {
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
            redirect: 'follow'
        });
        if (!res.ok) return false;
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength < 3000) return false; // Too small or error page
        fs.writeFileSync(dest, Buffer.from(buffer));
        return true;
    } catch {
        return false;
    }
}

async function run() {
    console.log(`Starting image acquisition for ${VEHICLES_TO_FETCH.length} vehicles...`);
    let downloadedCount = 0;
    for (const v of VEHICLES_TO_FETCH) {
        const destFile = path.join(targetDir, `${v.slug}.jpg`);
        if (fs.existsSync(destFile) && fs.statSync(destFile).size > 5000) {
            console.log(`[EXISTS] ${v.slug} (${fs.statSync(destFile).size} bytes)`);
            downloadedCount++;
            continue;
        }

        let url = await fetchFromWiki(v.query);
        let ok = false;
        if (url) {
            ok = await downloadImage(url, destFile);
        }
        if (!ok && v.fallback) {
            ok = await downloadImage(v.fallback, destFile);
        }
        if (ok) {
            console.log(`[SAVED] ${v.slug} (${fs.statSync(destFile).size} bytes)`);
            downloadedCount++;
        } else {
            console.warn(`[FAILED] ${v.slug}`);
        }
    }
    console.log(`\nFinished: ${downloadedCount}/${VEHICLES_TO_FETCH.length} images acquired locally.`);
}

run();
