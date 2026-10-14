const Motorcycle = require("../models/Motorcycle");
const {
    creditsFor,
    effectivePlan,
    walletOf,
    tokenGate,
    deductToken,
} = require("../utils/aiTokens");

// Attach context-based usage to any generated answer.
// Billable context = conversation sent + user message + reply.
const withUsage = (text, history, result) => {
    const promptText = [
        ...(Array.isArray(history)
            ? history.map((m) => m.content)
            : []),
        text,
    ].join("\n");
    const usage = creditsFor(promptText, result.reply);
    return { ...result, usage, tokensCharged: usage.tokensCharged };
};

/*
========================================
AI ADVISOR CONTROLLER
POST /api/ai-advisor/chat

- Reads the AI provider from backend .env only
  (AI_API_KEY / AI_API_URL / AI_MODEL).
- Never returns the key to the frontend.
- Sends live MongoDB catalog context so answers
  use only motorcycles that actually exist.
- Understands intent: budget, brand, model names,
  category, fuel, engine, mileage, EV specs,
  daily distance, purpose, comparison, follow-ups.
- Falls back to a local intent engine when the AI
  API is missing, slow or fails.
========================================
*/

const AI_TIMEOUT_MS = 45000;
const MAX_HISTORY = 8;

const isEV = (bike) =>
    String(bike.category || "").toLowerCase() === "electric" ||
    String(bike.fuel || "").toLowerCase() === "electric";

const inr = (n) => `Rs.${Number(n || 0).toLocaleString("en-IN")}`;

// Compact one-line catalog entry for the AI prompt
const describeBike = (bike) => {
    const parts = [
        `${bike.brand} ${bike.name}`,
        `category: ${bike.category}`,
        `price: Rs.${bike.price}`,
        `fuel: ${bike.fuel || "Petrol"}`,
        `rating: ${bike.rating ?? "N/A"}/5`,
    ];

    if (isEV(bike)) {
        if (bike.batteryCapacity)
            parts.push(`battery: ${bike.batteryCapacity} kWh`);
        if (bike.range) parts.push(`range: ${bike.range} km`);
        if (bike.chargingTime)
            parts.push(`charging: ${bike.chargingTime} hrs`);
        if (bike.power) parts.push(`power: ${bike.power} HP`);
        if (bike.torque) parts.push(`torque: ${bike.torque} Nm`);
        if (bike.topSpeed) parts.push(`top speed: ${bike.topSpeed} km/h`);
    } else {
        if (bike.engine) parts.push(`engine: ${bike.engine} CC`);
        if (bike.power) parts.push(`power: ${bike.power} HP`);
        if (bike.torque) parts.push(`torque: ${bike.torque} Nm`);
        if (bike.mileage) parts.push(`mileage: ${bike.mileage} km/l`);
        if (bike.topSpeed) parts.push(`top speed: ${bike.topSpeed} km/h`);
    }

    if (bike.weight) parts.push(`weight: ${bike.weight} kg`);
    if (bike.transmission) parts.push(`gears: ${bike.transmission}`);

    return `- ${parts.join(", ")}`;
};

const SYSTEM_PROMPT = `You are MotoMind, an advanced AI motorcycle buying advisor for the Indian market (prices in Rs.).

CORE OBJECTIVE: You are not just a simple search engine; you are an expert motorcycle consultant who deeply thinks about rider requirements, safety, ergonomics, fuel economy, power-to-weight, and budget value before answering.

THINKING MANDATE (You MUST think through user input before answering):
In your JSON output, you MUST provide a detailed "thought" field before your "reply". In this "thought" field, provide a multi-step analytical Chain of Thought:
1. User Intent & Constraints: Identify explicit budget, category, fuel type, daily commute distance, experience level (beginner/pro), rider ergonomics, or specific models asked.
2. Catalog Analysis: Review the live catalog below. Note which bikes fit within budget, which are excluded (and why), and match specs against user needs.
3. Comparative Trade-offs: Weigh power vs mileage, weight vs agility, suspension comfort, and monthly running cost.
4. Recommendation Rationale: State the exact justification for each bike chosen.

DATABASE RULES:
1. Recommend ONLY motorcycles from the catalog below, using exact "Brand Name". Never invent models or specs. If a value is missing, write "Not available".
2. If an asked model is not in the catalog, say clearly it was not found instead of making up specs.
3. For EVs NEVER show engine CC or "0" specs — use battery, range, charging time, top speed, power, torque.

RESPONSE FORMAT (the "reply" value is GitHub-flavored markdown, rendered in chat):
- Recommendations: start with "### MOTOAI Recommendation", a "Based on your requirements" summary line, then "### Recommended Motorcycles" with one compact block per bike (name, brand, price, category, fuel, 2-3 key specs, rating) followed by 1-2 line "Why it suits you". Then "### MOTOAI Insight" (short, personal, no unsupported claims, no "best" unless asked) and end with a "Next Step" follow-up question (e.g. "Would you like me to compare these in detail?" after 2+ bikes, or "Want options with better mileage, performance, or lower price?" after one). Prose and bullets only — no tables here.
- Single-bike detail ("tell me everything about X"): "### Bike Overview" (name/brand/category/price/fuel), "### Performance" (engine-or-battery/power/torque/top speed/transmission), "### Efficiency / Range" (mileage or range), "### Practical Details" (weight, charging for EV), "### Rating", "### MOTOAI Insight" (who it suits, from data + stated needs only).
- Comparisons ("Compare A and B", 2-3 bikes, petrol-vs-electric welcome): a markdown table | Specification | Bike 1 | Bike 2 | with rows Price, Category, Fuel, Engine/Battery, Power, Torque, Mileage/Range, Top Speed, Weight, Transmission, Rating (missing values read "Not available"), then one short paragraph per bike and "### MOTOAI Insight" on documented differences only. Tables belong ONLY to explicit comparisons.
- Budget questions: filter price <= budget and present the shortlist (never pricier bikes without saying so).
- Daily-distance questions: use mileage/range, price and fuel; show approximate running cost ONLY when data suffices, stating assumptions.
- Beginners ("first bike", "learning"): prefer friendly price, manageable power (<=25 HP), lighter weight and high rating; say why in plain words.
- No match: "### No Exact Match Found" + which requirement to relax (budget, category, fuel, engine). Never invent.
- General questions ("tell me about X"): natural answer with headings/bullets, no forced tables.
- Off-topic: politely say you specialize in motorcycle buying advice and suggest a bike question.
- Greetings & Pleasantries ("hello", "hi", "how are you", "good morning"): NEVER recommend bikes or repeat old budget limits for a simple greeting! Greet the rider warmly, introduce your advisory role, and invite them to share their motorcycle requirements. List "recommendations": [].
- Style: clear, friendly, professional, concise, scannable (headings, bold, bullets, tables only for comparisons). No huge paragraph, no repeated question, no mention of APIs/keys/prompts/databases.

CONVERSATION BEHAVIOR (this is a continuous chat, not isolated questions):
- An "Ongoing rider context" summary may precede the history: persistent prefs there still apply unless the latest message contradicts them (latest wins, e.g. new budget replaces old).
- Resolve it/its/this/that/them/which one/the first one/the second one against previously discussed motorcycles. "Compare the first two" means the first two bikes of your last answer. "Which one is lighter" compares the same set again.
- Short follow-ups ("What about mileage?", "And its price?", "Tell me more about the second one") get short focused answers — never full re-recommendations, never re-ask known info.
- New unrelated topics ("How does ABS work?") are answered directly without forcing old budget context; "which of those" returns to prior bikes.
- General knowledge beyond the catalog: answer briefly, marking anything unverifiable as "Not available in the current database".

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"thought": "Detailed multi-step chain-of-thought analysis explaining how you evaluated the user's input before answering...", "reply": "your formatted markdown answer", "recommendations": ["Brand Exact Name", "..."]}`;

// Best-effort JSON extraction from model output (supports <think> tags & ```json)
const extractJson = (text) => {
    if (!text || typeof text !== "string") return null;

    let extractedThought = "";
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch) {
        extractedThought = thinkMatch[1].trim();
    }

    const cleaned = text
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    let parsed = null;
    try {
        parsed = JSON.parse(cleaned);
    } catch (e) {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start !== -1 && end > start) {
            try {
                parsed = JSON.parse(cleaned.slice(start, end + 1));
            } catch (err) {
                parsed = null;
            }
        }
    }

    if (parsed && typeof parsed === "object") {
        if (!parsed.thought && extractedThought) {
            parsed.thought = extractedThought;
        }
        return parsed;
    }
    return null;
};

// Map recommended "Brand Name" strings to DB documents
const mapToDocs = (names, catalog) => {
    if (!Array.isArray(names)) return [];
    const picked = [];
    names.forEach((raw) => {
        const needle = String(raw || "").toLowerCase().trim();
        if (!needle) return;
        const found = catalog.find((bike) => {
            const full = `${bike.brand} ${bike.name}`.toLowerCase();
            return (
                full === needle ||
                full.includes(needle) ||
                needle.includes(full)
            );
        });
        if (found && !picked.some((b) => String(b._id) === String(found._id))) {
            picked.push(found);
        }
    });
    return picked.slice(0, 3);
};

/*
========================================
LOCAL INTENT ENGINE (no AI needed)
Extracts requirements from the message
(+ conversation history) and answers from
real database values.
========================================
*/

const parseBudget = (text) => {
    // 1. Range expressions like "between 1.5 and 2.5 lakh" or "1.5 - 2 lakh" -> take upper bound
    const range = text.match(/(?:between\s+)?(\d[\d,]*\.?\d*)\s*(?:-|to|and)\s*(\d[\d,]*\.?\d*)\s*(?:lakhs?|lacs?|l\b)/i);
    if (range) {
        return Math.round(parseFloat(range[2].replace(/,/g, "")) * 100000);
    }

    // 2. Lakh notation: "2.5 lakh", "2.5L", "2L", "1.8 lac", "Rs. 2 lakh"
    const lakh = text.match(/(\d[\d,]*\.?\d*)\s*(?:lakhs?|lacs?|l\b)/i);
    if (lakh) {
        return Math.round(parseFloat(lakh[1].replace(/,/g, "")) * 100000);
    }

    // 3. Thousand / k notation: "150k", "200 k", "80 thousand"
    const thou = text.match(/(\d[\d,]*\.?\d*)\s*(?:thousands?|k\b)/i);
    if (thou) {
        return Math.round(parseFloat(thou[1].replace(/,/g, "")) * 1000);
    }

    // 4. Direct currency figures: "Rs. 200000", "₹180000", "under 150000", "max 250000"
    const rs = text.match(/(?:rs\.?|₹|inr|under|below|max|upto|up to|budget of|around)\s*(\d[\d,]{3,})/i);
    if (rs) {
        return parseInt(rs[1].replace(/,/g, ""), 10);
    }

    return null;
};

const parseDailyKm = (text) => {
    let m = text.match(/(\d[\d,]*)\s*kms?\b.{0,25}\b(day|daily|commute|ride)\b/i);
    if (m) return parseInt(m[1].replace(/,/g, ""), 10);
    m = text.match(/\b(daily|every\s*day|per\s*day|commute)\b.{0,25}(\d[\d,]*)\s*kms?\b/i);
    if (m) return parseInt(m[2].replace(/,/g, ""), 10);
    m = text.match(/\btravels?\b.{0,25}(\d[\d,]*)\s*kms?\b/i);
    if (m) return parseInt(m[1].replace(/,/g, ""), 10);
    m = text.match(/(\d[\d,]*)\s*km\b/i);
    if (m && (text.includes("daily") || text.includes("day") || text.includes("office") || text.includes("commute"))) {
        return parseInt(m[1].replace(/,/g, ""), 10);
    }
    return null;
};

const BRAND_ALIASES = [
    { match: /\b(?:re|royal\s*enfield)\b/i, brand: "Royal Enfield" },
    { match: /\bktm\b/i, brand: "KTM" },
    { match: /\byamaha\b/i, brand: "Yamaha" },
    { match: /\bkawasaki\b/i, brand: "Kawasaki" },
    { match: /\bbajaj\b/i, brand: "Bajaj" },
    { match: /\btvs\b/i, brand: "TVS" },
    { match: /\bather\b/i, brand: "Ather" },
    { match: /\b(?:ola|ola\s*electric)\b/i, brand: "Ola Electric" },
    { match: /\bhonda\b/i, brand: "Honda" },
    { match: /\bsuzuki\b/i, brand: "Suzuki" },
    { match: /\bhero\b/i, brand: "Hero" },
    { match: /\baprilia\b/i, brand: "Aprilia" },
    { match: /\bbmw\b/i, brand: "BMW" },
    { match: /\bjawa\b/i, brand: "Jawa" },
    { match: /\byezdi\b/i, brand: "Yezdi" },
    { match: /\btriumph\b/i, brand: "Triumph" },
    { match: /\b(?:harley|harley\s*davidson)\b/i, brand: "Harley-Davidson" },
    { match: /\bvespa\b/i, brand: "Vespa" },
];

const MODEL_ALIASES = [
    { match: /\bclassic(?:\s*350)?\b/i, brand: "Royal Enfield", name: "Classic 350" },
    { match: /\bhunter(?:\s*350)?\b/i, brand: "Royal Enfield", name: "Hunter 350" },
    { match: /\bbullet(?:\s*350)?\b/i, brand: "Royal Enfield", name: "Bullet 350" },
    { match: /\bmeteor(?:\s*350)?\b/i, brand: "Royal Enfield", name: "Meteor 350" },
    { match: /\bhimalayan(?:\s*450)?\b/i, brand: "Royal Enfield", name: "Himalayan 450" },
    { match: /\binterceptor(?:\s*650)?\b/i, brand: "Royal Enfield", name: "Interceptor 650" },
    { match: /\bcontinental\s*gt(?:\s*650)?\b/i, brand: "Royal Enfield", name: "Continental GT 650" },
    { match: /\bsuper\s*meteor(?:\s*650)?\b/i, brand: "Royal Enfield", name: "Super Meteor 650" },
    { match: /\bduke\s*390\b/i, brand: "KTM", name: "Duke 390" },
    { match: /\bduke\s*250\b/i, brand: "KTM", name: "Duke 250" },
    { match: /\bduke\s*200\b/i, brand: "KTM", name: "200 Duke" },
    { match: /\brc\s*390\b/i, brand: "KTM", name: "RC 390" },
    { match: /\brc\s*200\b/i, brand: "KTM", name: "RC 200" },
    { match: /\b390\s*adventure\b/i, brand: "KTM", name: "390 Adventure" },
    { match: /\bmt\s*[-]?\s*15\b/i, brand: "Yamaha", name: "MT-15" },
    { match: /\br15(?:\s*v4)?\b/i, brand: "Yamaha", name: "R15 V4" },
    { match: /\bninja(?:\s*300)?\b/i, brand: "Kawasaki", name: "Ninja 300" },
    { match: /\bz650\b/i, brand: "Kawasaki", name: "Z650" },
    { match: /\b(?:pulsar\s*)?ns\s*200\b/i, brand: "Bajaj", name: "Pulsar NS200" },
    { match: /\b(?:pulsar\s*)?n\s*160\b/i, brand: "Bajaj", name: "Pulsar N160" },
    { match: /\b(?:pulsar\s*)?n\s*250\b/i, brand: "Bajaj", name: "Pulsar N250" },
    { match: /\b(?:pulsar\s*)?125\b/i, brand: "Bajaj", name: "Pulsar 125" },
    { match: /\bplatina\b/i, brand: "Bajaj", name: "Platina 110" },
    { match: /\b(?:apache\s*)?(?:rtr\s*)?200\b/i, brand: "TVS", name: "Apache RTR 200" },
    { match: /\b(?:apache\s*)?(?:rtr\s*)?160\b/i, brand: "TVS", name: "Apache RTR 160 4V" },
    { match: /\b(?:apache\s*)?rr\s*310\b/i, brand: "TVS", name: "Apache RR 310" },
    { match: /\braider\b/i, brand: "TVS", name: "Raider 125" },
    { match: /\bjupiter\b/i, brand: "TVS", name: "Jupiter 110" },
    { match: /\bntorq\b/i, brand: "TVS", name: "Ntorq 125" },
    { match: /\bronin\b/i, brand: "TVS", name: "Ronin" },
    { match: /\bactiva\b/i, brand: "Honda", name: "Activa 6G" },
    { match: /\bdio\b/i, brand: "Honda", name: "Dio 125" },
    { match: /\bshine\b/i, brand: "Honda", name: "Shine 125" },
    { match: /\bsp\s*125\b/i, brand: "Honda", name: "SP 125" },
    { match: /\bhornet\b/i, brand: "Honda", name: "Hornet 2.0" },
    { match: /\b(?:h'?ness|cb350)\b/i, brand: "Honda", name: "H'ness CB350" },
    { match: /\bsplendor\b/i, brand: "Hero", name: "Splendor Plus" },
    { match: /\bhf\s*deluxe\b/i, brand: "Hero", name: "HF Deluxe" },
    { match: /\bxpulse\b/i, brand: "Hero", name: "XPulse 200 4V" },
    { match: /\baccess\b/i, brand: "Suzuki", name: "Access 125" },
    { match: /\bburgman\b/i, brand: "Suzuki", name: "Burgman Street 125" },
    { match: /\bgixxer\s*sf\s*250\b/i, brand: "Suzuki", name: "Gixxer SF 250" },
    { match: /\bgixxer\s*250\b/i, brand: "Suzuki", name: "Gixxer 250" },
    { match: /\bgixxer\b/i, brand: "Suzuki", name: "Gixxer 150" },
    { match: /\bspeed\s*400\b/i, brand: "Triumph", name: "Speed 400" },
    { match: /\bscrambler\s*400\b/i, brand: "Triumph", name: "Scrambler 400 X" },
    { match: /\bx440\b/i, brand: "Harley-Davidson", name: "X440" },
    { match: /\brs\s*457\b/i, brand: "Aprilia", name: "RS 457" },
    { match: /\bsr\s*160\b/i, brand: "Aprilia", name: "SR 160" },
    { match: /\bg\s*310\s*gs\b/i, brand: "BMW", name: "G 310 GS" },
    { match: /\bg\s*310\s*rr\b/i, brand: "BMW", name: "G 310 RR" },
    { match: /\bjawa\s*42\b/i, brand: "Jawa", name: "Jawa 42" },
    { match: /\bjawa\s*350\b/i, brand: "Jawa", name: "Jawa 350" },
    { match: /\byezdi\s*adventure\b/i, brand: "Yezdi", name: "Yezdi Adventure" },
    { match: /\b(?:ola\s*)?(?:s1\s*pro|s1)\b/i, brand: "Ola Electric", name: "S1 Pro" },
    { match: /\b(?:ather\s*)?450\s*x\b/i, brand: "Ather", name: "450X" },
    { match: /\b(?:tvs\s*)?iqube\b/i, brand: "TVS", name: "iQube" },
];

const CATEGORY_MAP = [
    { key: "street", pattern: /\b(street|naked|streetfighter)\b/i },
    { key: "sports", pattern: /\b(sport|sports|sporty|supersport|track|faired|racing)\b/i },
    { key: "cruiser", pattern: /\b(cruiser|cruise|retro|classic)\b/i },
    { key: "roadster", pattern: /\b(roadster|neo-retro)\b/i },
    { key: "adventure", pattern: /\b(adventure|adv|offroad|off-road|dirt|trail)\b/i },
    { key: "commuter", pattern: /\b(commuter|mileage bike|daily commuter)\b/i },
    { key: "scooter", pattern: /\b(scooter|scooters|scoot|maxi-scooter)\b/i },
    { key: "touring", pattern: /\b(touring|tourer|grand tourer)\b/i },
    { key: "electric", pattern: /\b(electric|ev|battery|escooter|e-scooter)\b/i },
];

const CATEGORY_KEYS = [
    "street",
    "sport",
    "sports",
    "cruiser",
    "adventure",
    "roadster",
    "commuter",
    "scooter",
    "touring",
    "electric",
];

// Spec attributes for "which one / its X" questions
const ATTR_PATTERNS = [
    { id: "mileage", pattern: /\bmileage\b|\baverage\b|\bkm\/?l\b|\befficient\b|\bfuel efficiency\b/, higherBetter: true },
    { id: "price", pattern: /\bprice\b|\bcost\b|\bcheap/, higherBetter: false },
    { id: "range", pattern: /\brange\b/, higherBetter: true },
    { id: "power", pattern: /\bpower\b|\bhp\b|\bbhp\b|\bperformance\b/, higherBetter: true },
    { id: "weight", pattern: /\bweight\b|\blight|\bheavy\b/, higherBetter: false },
    { id: "rating", pattern: /\brating\b|\brated\b/, higherBetter: true },
    { id: "battery", pattern: /\bbattery\b/, higherBetter: true },
    { id: "charging", pattern: /\bcharg/, higherBetter: false },
    { id: "torque", pattern: /\btorque\b/, higherBetter: true },
    { id: "engine", pattern: /\bengine\b|\bcc\b/, higherBetter: true },
    { id: "topSpeed", pattern: /\btop speed\b/, higherBetter: true },
];

const ORDINAL_INDEX = {
    first: 0, "1st": 0,
    second: 1, "2nd": 1,
    third: 2, "3rd": 2,
};

const attrValue = (bike, attr) => {
    switch (attr) {
        case "mileage": return bike.mileage || null;
        case "price": return bike.price ?? null;
        case "range": return bike.range || null;
        case "power": return bike.power || null;
        case "weight": return bike.weight || null;
        case "rating": return bike.rating ?? null;
        case "battery": return bike.batteryCapacity || null;
        case "charging": return bike.chargingTime || null;
        case "torque": return bike.torque || null;
        case "engine": return bike.engine || null;
        case "topSpeed": return bike.topSpeed || null;
        default: return null;
    }
};

const attrDisplay = (bike, attr) => {
    const v = attrValue(bike, attr);
    if (v == null) return "Not available in the current database";
    switch (attr) {
        case "mileage": return `${v} km/l`;
        case "price": return inr(v);
        case "range": return `${v} km`;
        case "power": return `${v} HP`;
        case "weight": return `${v} kg`;
        case "rating": return `⭐ ${v}/5`;
        case "battery": return `${v} kWh`;
        case "charging": return `${v} hrs`;
        case "torque": return `${v} Nm`;
        case "engine": return `${v} CC`;
        case "topSpeed": return `${v} km/h`;
        default: return String(v);
    }
};

const detectAttribute = (text) => {
    const found = ATTR_PATTERNS.find((a) => a.pattern.test(text));
    return found ? found.id : null;
};

const isComparative = (text) =>
    /\bbetter\b|\bbest\b|\bhigher\b|\bhighest\b|\bmore\b|\bmost\b|\bcheaper\b|\bcheapest\b|\blower\b|\blowest\b|\blonger\b|\blongest\b|\bfaster\b|\bfastest\b|\blighter\b|\blightest\b|\bheavier\b|\bgreater\b|\bgreatest\b/.test(
        text
    );

const ASPECTS = [
    { id: "touring", pattern: /\b(tour|highway|long ride|long distance|cruising|interstate|road trip|windblast)\b/i, label: "Highway Touring & Stability" },
    { id: "commute", pattern: /\b(commut|city|office|traffic|daily|everyday|work|college)\b/i, label: "City Commute & Traffic Agility" },
    { id: "sport", pattern: /\b(sport|sporty|fast|speed|racing|performance|powerful|pickup|acceleration|triple digit|top speed|punchy)\b/i, label: "Sport Performance & Acceleration" },
    { id: "comfort", pattern: /\b(comfort|comfortable|ergonomics|cushion|suspension|upright|potholes|bad roads|back pain|plush)\b/i, label: "Rider Comfort & Ergonomics" },
    { id: "mileage", pattern: /\b(mileage|average|km\/?l|fuel economy|efficient|low running cost|fuel saver|pocket friendly)\b/i, label: "High Fuel Efficiency" },
    { id: "maintenance", pattern: /\b(maint|service|reliable|reliability|parts|ownership cost|resale)\b/i, label: "Low Maintenance & Reliability" },
    { id: "beginner", pattern: /\b(beginner|learn|first bike|new rider|starting out|college student|easy to ride|forgiving|learner)\b/i, label: "Beginner-Friendly Rideability" },
    { id: "adventure", pattern: /\b(adventure|adv|off.?road|ladakh|mountain|hills|dirt|trail)\b/i, label: "Adventure & Rough Terrain" },
    { id: "lightweight", pattern: /\b(lightweight|light weight|light bike|easy to handle|nimble|maneuverable)\b/i, label: "Lightweight Handling" },
    { id: "pillion", pattern: /\b(pillion|passenger|family|wife|girlfriend|two up|back seat)\b/i, label: "Pillion Comfort" },
    { id: "low_seat", pattern: /\b(short rider|seat height|low seat|5'2|5'3|5'4|5'5|5'6|manageable height)\b/i, label: "Accessible Seat Height" },
    { id: "safety", pattern: /\b(safety|abs|dual channel|braking|disc brakes|traction control|slipper clutch)\b/i, label: "Active Safety & ABS" },
    { id: "budget", pattern: /\b(cheap|affordable|budget|value for money|vfm|economical)\b/i, label: "Value For Money" },
];

const MOTO_SIGNALS = [
    "bike",
    "motorcycle",
    "scoot",
    "scooter",
    "ride",
    "riding",
    "rider",
    "commut",
    "tour",
    "mileage",
    "engine",
    "petrol",
    "electric",
    "ev",
    "battery",
    "charging",
    "charge",
    "price",
    "budget",
    "lakh",
    "rs",
    "₹",
    "cc",
    "km",
    "bhp",
    "hp",
    "buy",
    "buying",
    "suggest",
    "recommend",
    "compare",
    "comparison",
    "versus",
    "vs",
    "best",
    "show",
    "under",
    "below",
    "top speed",
    "torque",
    "power",
    "comfort",
    "maint",
    "service",
    "sport",
    "cruiser",
    "adventure",
    "street",
    "roadster",
    "commuter",
    "city",
    "office",
    "daily",
    "beginner",
    "first bike",
    "hunter",
    "classic",
    "duke",
    "pulsar",
    "apache",
    "r15",
    "mt-15",
    "mt15",
    "ninja",
    "iqube",
    "ather",
    "ola",
    // Technical & mechanical terms
    "abs",
    "anti-lock",
    "braking",
    "brakes",
    "disc",
    "single channel",
    "dual channel",
    "clutch",
    "slipper",
    "quickshifter",
    "gear",
    "transmission",
    "cooling",
    "liquid cooled",
    "air cooled",
    "oil cooled",
    "radiator",
    "suspension",
    "monoshock",
    "fork",
    "usd",
    "tyre",
    "tire",
    "tubeless",
    "seat height",
    "weight",
    "kerb weight",
    "ground clearance",
    "pillion",
    "exhaust",
    "chassis",
    "frame",
    "fuel economy",
    "tank capacity",
    "rpm",
    // Platform terms
    "token",
    "tokens",
    "cost calculator",
    "calculator",
    "dealership",
    "dealer",
    "test ride",
    "ownership cost",
    "motoai",
    "motomind",
    "advisor",
    "subscription",
    "premium",
];

// Robust negative / exclusion parser (e.g. "other than S1 Pro and iQube", "not KTM", "except electric")
const parseExclusions = (text, catalog) => {
    const cleanText = text.toLowerCase();
    const excluded = {
        names: [],
        brands: [],
        fuel: null,
        category: null,
        wantsAlternatives: false,
    };

    if (
        /\b(?:anything\s+else|what\s+else|something\s+else|more\s+options?|other\s+choices?|show\s+(?:more|others?)|any\s+other\s+options?)\b/i.test(
            cleanText
        ) ||
        (/\b(?:other|different)\s+(?:bikes?|motorcycles?|options?|models?|ones?)\b/i.test(cleanText) &&
         !/\b(?:other\s+than|different\s+from)\b/i.test(cleanText))
    ) {
        excluded.wantsAlternatives = true;
    }

    const negationRegex =
        /(?:other than|except(?: for)?|besides|excluding|without|apart from|skip|don't want|dont want|don't show|dont show|do not (?:want|show)|anything but|different from)\s+([^,.;!?]+)/gi;

    let match;
    const phrases = [];
    while ((match = negationRegex.exec(cleanText)) !== null) {
        if (match[1]) {
            const p = match[1].trim();
            if (p && !/^(?:problem|worries|thanks|thank you|doubt|issue|delay)$/.test(p)) {
                phrases.push(p);
            }
        }
    }

    // Also look for "not [phrase]" or "no [phrase]"
    const notRegex = /\b(?:not|no)\s+([a-z0-9\s-]+?)(?:\s+(?:bikes?|motorcycles?|scooters?))?(?:[,.;!?]|$)/gi;
    while ((match = notRegex.exec(cleanText)) !== null) {
        if (match[1]) {
            const p = match[1].trim();
            if (p && !/^(?:problem|worries|thanks|thank you|doubt|issue|delay|worried)$/.test(p)) {
                phrases.push(p);
            }
        }
    }

    phrases.forEach((phrase) => {
        // Excluded fuel
        if (/\belectric\b|\bev\b|\bbattery\b/.test(phrase)) excluded.fuel = "electric";
        if (/\bpetrol\b/.test(phrase)) excluded.fuel = "petrol";

        // Excluded categories
        CATEGORY_MAP.forEach((c) => {
            if (c.pattern.test(phrase)) excluded.category = c.key;
        });

        // Excluded model aliases
        MODEL_ALIASES.forEach((alias) => {
            if (alias.match.test(phrase)) {
                const found = catalog.find(
                    (b) =>
                        String(b.brand).toLowerCase() === alias.brand.toLowerCase() &&
                        String(b.name).toLowerCase() === alias.name.toLowerCase()
                );
                if (found && !excluded.names.some((n) => String(n._id) === String(found._id))) {
                    excluded.names.push(found);
                }
            }
        });

        // Excluded brand aliases
        BRAND_ALIASES.forEach((alias) => {
            if (alias.match.test(phrase) && !excluded.brands.includes(alias.brand)) {
                excluded.brands.push(alias.brand);
            }
        });

        // Excluded catalog models and brands
        catalog.forEach((bike) => {
            if (
                bike.brand &&
                phrase.includes(String(bike.brand).toLowerCase()) &&
                !excluded.brands.some((b) => b.toLowerCase() === String(bike.brand).toLowerCase())
            ) {
                excluded.brands.push(bike.brand);
            }
            if (bike.name) {
                const full = `${bike.brand} ${bike.name}`.toLowerCase();
                const short = String(bike.name).toLowerCase();
                if (
                    (phrase.includes(full) || (short.length > 2 && phrase.includes(short))) &&
                    !excluded.names.some((n) => String(n._id) === String(bike._id))
                ) {
                    excluded.names.push(bike);
                }
            }
        });
    });

    return excluded;
};

// Per-message constraint extraction
const extractFromMessage = (text, catalog) => {
    const exclusions = parseExclusions(text, catalog);
    const excludedIds = new Set(exclusions.names.map((b) => String(b._id)));
    const excludedBrandLower = new Set(exclusions.brands.map((b) => b.toLowerCase()));

    const out = {
        budget: parseBudget(text),
        dailyKm: parseDailyKm(text),
        fuel: null,
        category: null,
        brands: [],
        names: [],
        aspects: [],
        compareWords: false,
        hasMotoSignal: false,
        exclusions,
    };

    if (exclusions.fuel === "electric") {
        out.fuel = "petrol"; // User said "not electric" -> prefer petrol
    } else if (exclusions.fuel === "petrol") {
        out.fuel = "electric"; // User said "no petrol" -> prefer electric
    } else if (
        /\belectric\b|\bev\b|\bbattery\b|\bcharging\b|\bscooter\b|\bescooter\b/.test(text) &&
        !/\bpetrol\b/.test(text)
    ) {
        out.fuel = "electric";
    } else if (/\bpetrol\b/.test(text)) {
        out.fuel = "petrol";
    }

    // Category detection (only if not excluded)
    const foundCategory = CATEGORY_MAP.find((c) => c.pattern.test(text));
    if (foundCategory && (!exclusions.category || exclusions.category !== foundCategory.key)) {
        out.category = foundCategory.key;
    }

    // Model aliases (Hunter, Classic, Duke, MT-15, NS200, RTR 200, S1, 450X, iQube)
    // IMPORTANT: Excluded models are never added to out.names!
    MODEL_ALIASES.forEach((alias) => {
        if (alias.match.test(text)) {
            const found = catalog.find(
                (b) =>
                    String(b.brand).toLowerCase() === alias.brand.toLowerCase() &&
                    String(b.name).toLowerCase() === alias.name.toLowerCase()
            );
            if (
                found &&
                !excludedIds.has(String(found._id)) &&
                !out.names.some((n) => String(n._id) === String(found._id))
            ) {
                out.names.push(found);
            }
        }
    });

    // Brand aliases (skip any in excludedBrandLower)
    BRAND_ALIASES.forEach((alias) => {
        if (
            alias.match.test(text) &&
            !excludedBrandLower.has(alias.brand.toLowerCase()) &&
            !out.brands.includes(alias.brand)
        ) {
            out.brands.push(alias.brand);
        }
    });

    catalog.forEach((bike) => {
        if (
            bike.brand &&
            text.includes(String(bike.brand).toLowerCase()) &&
            !excludedBrandLower.has(String(bike.brand).toLowerCase()) &&
            !out.brands.some(
                (b) => b.toLowerCase() === String(bike.brand).toLowerCase()
            )
        ) {
            out.brands.push(bike.brand);
        }
        if (bike.name) {
            const full = `${bike.brand} ${bike.name}`.toLowerCase();
            const short = String(bike.name).toLowerCase();
            if (
                (text.includes(full) ||
                    (short.length > 2 && text.includes(short))) &&
                !excludedIds.has(String(bike._id)) &&
                !out.names.some(
                    (n) => String(n._id) === String(bike._id)
                )
            ) {
                out.names.push(bike);
            }
        }
    });

    ASPECTS.forEach((a) => {
        if (a.pattern.test(text) && !out.aspects.includes(a.id))
            out.aspects.push(a.id);
    });

    // Comparison intent is strictly for explicit comparison wording without negation
    const hasComparePattern =
        /\b(?:compare|comparison|versus|\bvs\b|difference between|which (?:one )?is better|which one should i buy)\b/i.test(
            text
        ) || (/\bwhich (?:bike|motorcycle|scooter|one)\b/i.test(text) && /\bor\b/i.test(text));

    out.compareWords = hasComparePattern && exclusions.names.length === 0;
    out.hasMotoSignal =
        MOTO_SIGNALS.some((s) => text.includes(s)) ||
        out.brands.length > 0 ||
        out.names.length > 0 ||
        exclusions.names.length > 0 ||
        exclusions.brands.length > 0;

    return out;
};

// Merge history (oldest→newest):
// Contextual constraints like budget, dailyKm, fuel, category persist unless overridden.
// CRITICAL FIX: compareWords and names are EPHEMERAL to the current query to prevent
// old comparisons from permanently hijacking future recommendations!
const mergeConstraints = (messages, catalog) => {
    const userMessages = (Array.isArray(messages) ? messages : []).filter(
        (m) => m && m.role === "user"
    );

    if (userMessages.length === 0) {
        return {
            budget: null,
            dailyKm: null,
            fuel: null,
            category: null,
            brands: [],
            names: [],
            excludedNames: [],
            excludedBrands: [],
            aspects: [],
            compareWords: false,
            hasMotoSignal: false,
            wantsAlternatives: false,
        };
    }

    const latestText = String(userMessages[userMessages.length - 1].content || "").toLowerCase();
    const latestExtract = extractFromMessage(latestText, catalog);

    const merged = {
        budget: null,
        dailyKm: null,
        fuel: null,
        category: null,
        brands: latestExtract.brands.length > 0 ? [...latestExtract.brands] : [],
        names: [...latestExtract.names],
        excludedNames: [...latestExtract.exclusions.names],
        excludedBrands: [...latestExtract.exclusions.brands],
        aspects: [...latestExtract.aspects],
        compareWords: latestExtract.compareWords,
        hasMotoSignal: latestExtract.hasMotoSignal,
        wantsAlternatives: latestExtract.exclusions.wantsAlternatives,
    };

    // Scan backwards from latest to oldest for persistent filters (budget, dailyKm, fuel, category, aspects)
    for (let i = userMessages.length - 1; i >= 0; i--) {
        const text = String(userMessages[i].content || "").toLowerCase();
        const c = extractFromMessage(text, catalog);
        if (c.hasMotoSignal) merged.hasMotoSignal = true;
        if (merged.budget == null && c.budget != null) merged.budget = c.budget;
        if (merged.dailyKm == null && c.dailyKm != null) merged.dailyKm = c.dailyKm;
        if (merged.fuel == null && c.fuel != null) merged.fuel = c.fuel;
        if (merged.category == null && c.category != null) merged.category = c.category;
        if (merged.brands.length === 0 && c.brands.length > 0) {
            merged.brands = [...c.brands];
        }
        c.aspects.forEach((a) => {
            if (!merged.aspects.includes(a)) merged.aspects.push(a);
        });
    }

    return merged;
};

// Motorcycles discussed in earlier turns (from assistant messages'
// saved recommendation ids), oldest set first.
const discussedSets = (history, catalog) => {
    const sets = [];
    (Array.isArray(history) ? history : []).forEach((m) => {
        if (m.role !== "assistant") return;
        const recs = Array.isArray(m.recommendations)
            ? m.recommendations
            : [];
        if (recs.length === 0) return;
        const docs = [];
        recs.forEach((r) => {
            const id = String((r && r._id) || r);
            const found = catalog.find(
                (b) => String(b._id) === id
            );
            if (
                found &&
                !docs.some(
                    (d) => String(d._id) === String(found._id)
                )
            ) {
                docs.push(found);
            }
        });
        if (docs.length > 0) sets.push(docs);
    });
    return sets;
};

/*
Resolve pronouns/ordinals against discussed bikes:
- "compare the first two" → first two of the last discussed set
- "which one is lighter / has better mileage" → compare last set
- "its price / tell me more about the second one" → single bike
- "what about mileage?" (aspect only) → focused aspect answer
Returns null when nothing references prior context.
*/
const resolveReference = (text, current, lastSet, allDiscussed) => {
    const pool =
        lastSet.length > 0 ? lastSet : allDiscussed.slice(0, 3);
    if (pool.length === 0) return null;

    const ordinalMatch = text.match(
        /\b(first|second|third|1st|2nd|3rd|last)\b/
    );
    const ordinalIndex = ordinalMatch
        ? ordinalMatch[1] === "last"
            ? pool.length - 1
            : (ORDINAL_INDEX[ordinalMatch[1]] ?? null)
        : null;

    const wantsCompare =
        current.compareWords ||
        /\bcompare\b|\bvs\b|\bversus\b|\bboth\b|\bthese\b|\bthose\b|\bthem\b/.test(
            text
        );

    // "compare the first two" / "first and second"
    if (wantsCompare && /two|both|first|second|these|those|them/.test(text)) {
        let picks = [];
        const ordinals = [...text.matchAll(
            /\b(first|second|third|1st|2nd|3rd|last)\b/g
        )].map((m) =>
            m[1] === "last"
                ? pool.length - 1
                : ORDINAL_INDEX[m[1]]
        );
        if (/\btwo\b|\bboth\b|\bthese\b|\bthose\b|\bthem\b/.test(text)) {
            picks = [pool[0], pool[1]].filter(Boolean);
        } else if (ordinals.length >= 2) {
            picks = ordinals
                .slice(0, 3)
                .map((i) => pool[i])
                .filter(Boolean);
        } else {
            picks = pool.slice(0, 3);
        }
        if (picks.length >= 2) {
            return { kind: "compare", bikes: picks.slice(0, 3) };
        }
    }

    // "which one is lighter / has better mileage / is cheaper"
    if (
        /\bwhich one\b|\bwhich of (those|them|these)\b|\bwhich is better\b/.test(
            text
        )
    ) {
        const attribute = detectAttribute(text);
        if (pool.length >= 2) {
            return {
                kind: "which",
                bikes: pool.slice(0, 3),
                attribute,
            };
        }
    }

    // Single target: "its X", "the second one", "tell me more"
    if (
        ordinalIndex != null ||
        /\bits\b|\bit's\b|\bthat bike\b|\bthis (bike|motorcycle|one)\b|\bthat one\b|\btell me more\b/.test(
            text
        )
    ) {
        const target =
            ordinalIndex != null
                ? pool[ordinalIndex]
                : pool[pool.length - 1];
        if (target) {
            return {
                kind: "single",
                bikes: [target],
                attribute: detectAttribute(text),
            };
        }
    }

    // Bare aspect follow-up: "what about mileage?"
    const aspectAttr = detectAttribute(text);
    if (
        aspectAttr ||
        /\bmileage\b|\baverage\b/.test(text) ||
        current.aspects.length > 0
    ) {
        const hasNewFilters =
            current.budget ||
            current.fuel ||
            current.category ||
            current.brands.length > 0 ||
            current.names.length > 0;
        if (!hasNewFilters) {
            return {
                kind: "aspect",
                bikes: pool.slice(0, 3),
                attribute:
                    aspectAttr ||
                    (current.aspects.includes("mileage")
                        ? "mileage"
                        : null),
            };
        }
    }

    return null;
};

// Focused short answer for one attribute across bikes
const aspectAnswer = (bikes, attribute) => {
    if (!attribute) {
        return {
            reply: `Based on what we've discussed: ${bikes.map((b) => `${b.brand} ${b.name}`).join(", ")}. Ask me about a specific one — price, mileage, range or specs.`,
            recommendations: bikes,
        };
    }
    const meta = ATTR_PATTERNS.find((a) => a.id === attribute);
    const lines = bikes.map(
        (b) => `• **${b.brand} ${b.name}:** ${attrDisplay(b, attribute)}`
    );
    const valued = bikes
        .map((b) => ({ b, v: attrValue(b, attribute) }))
        .filter((x) => x.v != null);
    let takeaway = "";
    if (valued.length > 1) {
        const best = valued.reduce((x, y) =>
            meta.higherBetter
                ? x.v >= y.v
                    ? x
                    : y
                : x.v <= y.v
                  ? x
                  : y
        );
        takeaway = `\n\nSo the **${best.b.brand} ${best.b.name}** leads here at ${attrDisplay(best.b, attribute)}.`;
    }
    return {
        reply: `${lines.join("\n")}${takeaway}`,
        recommendations: bikes,
    };
};

// Verdict on one bike, optionally focused on one attribute
const singleVerdict = (bike, attribute, aspects) => {
    if (attribute) {
        // Price/rating are already the headline — don't echo them
        const extra =
            attribute === "price" || attribute === "rating"
                ? ""
                : whyLine(bike, aspects);
        return {
            reply: `The **${bike.brand} ${bike.name}** has ${attribute} of ${attrDisplay(bike, attribute)}.${extra ? ` ${extra}.` : ""}`,
            recommendations: [bike],
        };
    }
    const line = whyLine(bike, aspects);
    return {
        reply: `The **${bike.brand} ${bike.name}** (${inr(bike.price)}, rated ⭐ ${bike.rating ?? "Not available"}/5): ${line || "it matches your requirements"}. Tap the card below for full specifications.`,
        recommendations: [bike],
    };
};

// Monthly running-cost estimate (assumptions stated to user)
const monthlyCostOf = (bike, dailyKm) => {
    const monthlyKm = dailyKm * 30;
    if (isEV(bike)) {
        if (!bike.range || !bike.batteryCapacity) return null;
        return ((monthlyKm / bike.range) * bike.batteryCapacity * 8);
    }
    if (!bike.mileage) return null;
    return ((monthlyKm / bike.mileage) * 105);
};

// Attach a per-bike "reason" (why it matches) used by the
// frontend recommendation cards. Purely additive.
const attachReasons = (result, aspects) => {
    if (!result || !Array.isArray(result.recommendations))
        return result;
    result.recommendations = result.recommendations.map((b) => {
        if (!b || !b.brand) return b;
        try {
            const line = whyLine(b, aspects || []);
            if (line) b.reason = line;
        } catch (e) {
            /* leave reason empty */
        }
        return b;
    });
    return result;
};

// One-line "why this bike" using real specs + asked aspects.
// With no explicit aspects, fall back to the most telling
// specs so verdicts never read as price-only.
const whyLine = (bike, aspects) => {
    const bits = [];
    const asp =
        aspects.length > 0
            ? aspects
            : isEV(bike)
              ? ["commute"]
              : ["sport"];

    if (isEV(bike)) {
        if (bike.range) bits.push(`${bike.range} km range`);
        if (bike.batteryCapacity)
            bits.push(`${bike.batteryCapacity} kWh battery`);
        if (
            bike.chargingTime &&
            (asp.includes("commute") || asp.includes("maintenance"))
        )
            bits.push(`${bike.chargingTime}h charging`);
    } else {
        if (bike.mileage && (asp.includes("commute") || asp.includes("mileage")))
            bits.push(`${bike.mileage} km/l mileage`);
        if (
            bike.engine &&
            (asp.includes("sport") || asp.includes("touring") || asp.includes("adventure"))
        )
            bits.push(`${bike.engine} CC engine`);
    }
    if (bike.power && (asp.includes("sport") || asp.includes("touring")))
        bits.push(`${bike.power} HP`);
    if (bike.topSpeed && (asp.includes("sport") || asp.includes("touring")))
        bits.push(`${bike.topSpeed} km/h top speed`);
    if (asp.includes("beginner")) {
        if (bike.power) bits.push(`manageable ${bike.power} HP`);
        if (bike.weight) bits.push(`${bike.weight} kg`);
    }
    if (bike.price) bits.push(`${inr(bike.price)}`);
    if (bits.length === 0 && bike.rating)
        bits.push(`rated ${bike.rating}/5`);

    return bits.join(" • ");
};

// Spec-by-spec comparison of 2-3 real bikes.
// Unknown specs are omitted (never shown as "?" or "0").
const specList = (b) => {
    const specs = [`price ${inr(b.price)}`];
    if (isEV(b)) {
        if (b.batteryCapacity)
            specs.push(`battery ${b.batteryCapacity} kWh`);
        if (b.range) specs.push(`range ${b.range} km`);
        if (b.chargingTime)
            specs.push(`charging ${b.chargingTime} hrs`);
    } else {
        if (b.engine) specs.push(`engine ${b.engine} CC`);
        if (b.mileage) specs.push(`mileage ${b.mileage} km/l`);
    }
    if (b.power) specs.push(`power ${b.power} HP`);
    if (b.torque) specs.push(`torque ${b.torque} Nm`);
    if (b.topSpeed) specs.push(`top speed ${b.topSpeed} km/h`);
    if (b.weight) specs.push(`weight ${b.weight} kg`);
    if (b.fuel && !isEV(b)) specs.push(`fuel ${b.fuel}`);
    if (b.rating != null) specs.push(`rating ${b.rating}/5`);
    return specs;
};

// Comparison answer: spec table (comparisons are the one place
// tables belong) + short per-bike notes + documented differences.
// Unknown specs read "Not available", never "?" or "0".
const na = (v) => (v ? String(v) : "Not available");

const compareReply = (bikes) => {
    const names = bikes.map((b) => `${b.brand} ${b.name}`);
    const mid = (b) =>
        isEV(b)
            ? b.batteryCapacity
                ? `${b.batteryCapacity} kWh`
                : null
            : b.engine
              ? `${b.engine} CC`
              : null;
    const eff = (b) =>
        isEV(b)
            ? b.range
                ? `${b.range} km`
                : null
            : b.mileage
              ? `${b.mileage} km/l`
              : null;
    const row = (label, fn) =>
        `| ${label} | ${bikes.map((b) => na(fn(b))).join(" | ")} |`;

    const lines = [
        "### 🏍️ Motorcycle Comparison",
        "",
        `| Specification | ${names.join(" | ")} |`,
        `| --- | ${names.map(() => "---").join(" | ")} |`,
        row("Price", (b) => inr(b.price)),
        row("Category", (b) => b.category),
        row("Fuel", (b) => b.fuel),
        row("Engine / Battery", mid),
        row("Power", (b) => (b.power ? `${b.power} HP` : null)),
        row("Torque", (b) => (b.torque ? `${b.torque} Nm` : null)),
        row("Mileage / Range", eff),
        row("Top Speed", (b) =>
            b.topSpeed ? `${b.topSpeed} km/h` : null
        ),
        row("Weight", (b) => (b.weight ? `${b.weight} kg` : null)),
        row("Transmission", (b) => b.transmission),
        row("Rating", (b) =>
            b.rating != null ? `⭐ ${b.rating}` : null
        ),
    ];

    // Short per-bike notes + documented differences
    const notes = bikes.map(
        (b) => `### ${b.brand} ${b.name}\n${whyLine(b, []) || "Matches your requirements."}.`
    );

    const byPrice = [...bikes].sort((a, b) => a.price - b.price);
    const byRating = [...bikes].sort(
        (a, b) => (b.rating || 0) - (a.rating || 0)
    );
    const diffs = [];
    if (
        bikes.length > 1 &&
        byPrice[0].price !== byPrice[byPrice.length - 1].price
    ) {
        diffs.push(
            `**${byPrice[0].brand} ${byPrice[0].name}** is the most affordable at ${inr(byPrice[0].price)}`
        );
    }
    diffs.push(
        `**${byRating[0].brand} ${byRating[0].name}** is the highest rated at ${byRating[0].rating}/5`
    );

    return [
        ...lines,
        "",
        ...notes.join("\n\n").split("\n"),
        "",
        "### 💡 MOTOAI Insight",
        "",
        diffs.join(". ") + ".",
    ].join("\n");
};

// ========================================
// ADVANCED MULTI-FACTOR MATCH SCORING
// Evaluates budget compliance, riding dynamics,
// power-to-weight, fuel economy & ergonomics.
// ========================================
const calculateMatchScore = (bike, criteria) => {
    let score = (Number(bike.rating) || 4.0) * 10; // Baseline rating 40-50 pts

    const isElectric = isEV(bike);
    const price = Number(bike.price) || 0;
    const power = Number(bike.power) || 0;
    const mileage = Number(bike.mileage) || 0;
    const range = Number(bike.range) || 0;
    const weight = Number(bike.weight) || (isElectric ? 115 : 160);

    // 1. Budget compliance & value factor
    if (criteria.budget) {
        if (price <= criteria.budget) {
            const budgetRatio = price / criteria.budget;
            score += (1 - budgetRatio * 0.2) * 15; // +12 to +15 pts
        } else {
            const overPercent = (price - criteria.budget) / criteria.budget;
            score -= overPercent * 40; // harsh penalty for exceeding budget
        }
    }

    // 2. Fuel & Range alignment
    if (criteria.fuel === "electric" && isElectric) score += 20;
    if (criteria.fuel === "petrol" && !isElectric) score += 20;

    // 3. Aspects weighting
    const aspects = criteria.aspects || [];

    // Commuting / Mileage
    if (aspects.includes("commute") || aspects.includes("mileage")) {
        if (isElectric) {
            score += Math.min(18, range / 10);
        } else {
            score += Math.min(18, (mileage / 50) * 15);
        }
    }

    // Daily commute distance calculation
    if (criteria.dailyKm) {
        if (isElectric) {
            if (range >= criteria.dailyKm * 1.5) score += 15;
            else if (range < criteria.dailyKm) score -= 25;
        } else {
            if (mileage >= 40) score += 12;
        }
    }

    // Performance / Sport / Highway
    if (aspects.includes("sport") || aspects.includes("touring")) {
        score += Math.min(25, (power / 40) * 20);
        if (bike.topSpeed) score += Math.min(10, (bike.topSpeed / 160) * 10);
        const ptw = (power / (weight || 150)) * 100;
        score += Math.min(12, ptw * 0.5);
    }

    // Beginner friendliness
    if (aspects.includes("beginner")) {
        if (power > 0 && power <= 25) score += 15;
        else if (power > 35) score -= 10;
        if (weight <= 165) score += 10;
        else if (weight > 185) score -= 8;
        if (price <= 200000) score += 8;
    }

    // Lightweight & agility
    if (aspects.includes("lightweight")) {
        if (weight <= 145) score += 15;
        else if (weight <= 160) score += 8;
        else if (weight > 180) score -= 12;
    }

    // Low seat / short rider
    if (aspects.includes("low_seat")) {
        if (bike.name.includes("Hunter") || bike.name.includes("Classic") || isElectric) {
            score += 15;
        }
    }

    // Brand preference
    if (criteria.brands && criteria.brands.length > 0) {
        const brandMatch = criteria.brands.some(
            (b) => String(bike.brand).toLowerCase() === String(b).toLowerCase()
        );
        if (brandMatch) score += 25;
    }

    return score;
};

// ========================================
// CHAIN-OF-THOUGHT REASONING GENERATOR
// Produces transparent, authentic multi-step
// thinking before every response.
// ========================================
const generateThinkingProcess = ({
    userMessage,
    intentKind = "recommendation",
    current = {},
    merged = {},
    catalog = [],
    filteredPool = [],
    selectedBikes = [],
    compareBikes = [],
    missingName = null,
    attribute = null,
}) => {
    const steps = [];

    // Step 1: User Intent & Parameter Extraction
    const identified = [];
    if (merged?.budget) identified.push(`Budget Limit: ${inr(merged.budget)} (enforced ceiling)`);
    if (merged?.dailyKm) identified.push(`Daily Distance: ${merged.dailyKm} km/day (~${merged.dailyKm * 30} km/month)`);
    if (merged?.fuel) identified.push(`Propulsion: ${merged.fuel.toUpperCase()}`);
    if (merged?.category) identified.push(`Target Category: ${merged.category}`);
    if (merged?.brands?.length > 0) identified.push(`Brand Filter: ${merged.brands.join(", ")}`);
    if (merged?.excludedNames?.length > 0) {
        identified.push(`Excluded Models: ${merged.excludedNames.map((b) => `${b.brand} ${b.name}`).join(", ")} (negative filter)`);
    }
    if (merged?.excludedBrands?.length > 0) {
        identified.push(`Excluded Brands: ${merged.excludedBrands.join(", ")} (negative filter)`);
    }
    if (merged?.aspects?.length > 0) {
        const aspectLabels = merged.aspects.map((asp) => {
            const found = ASPECTS.find((a) => a.id === asp);
            return found ? found.label : asp;
        });
        identified.push(`Rider Priorities: ${aspectLabels.join(" • ")}`);
    }

    const modeTitle = intentKind === "knowledge" ? "TECHNICAL & APPLICATION KNOWLEDGE" : intentKind.toUpperCase();

    steps.push(
        `### 🎯 1. User Intent & Parameter Extraction\n` +
        `• **Input Query:** "${String(userMessage || "").trim()}"\n` +
        `• **Session Mode:** ${modeTitle} (motorcycle advisory session)\n` +
        `• **Extracted Constraints:**\n` +
        (identified.length > 0
            ? identified.map((item) => `  - ${item}`).join("\n")
            : "  - Exploratory query across the complete showroom catalog with no restrictive constraints.")
    );

    // Step 2: Catalog Scanning & Constraint Filtering
    if (intentKind === "comparison" && compareBikes.length > 0) {
        const bikeNames = compareBikes.map((b) => `${b.brand} ${b.name} (${inr(b.price)})`).join(" vs ");
        steps.push(
            `### 🔍 2. Head-to-Head Specification Mapping\n` +
            `• Target models for direct comparison: **${bikeNames}**.\n` +
            `• Cross-referencing verified parameters: price, displacement/battery capacity, power (HP), torque (Nm), mileage/range, curb weight, and braking configuration.\n` +
            `• Verifying that all compared attributes reflect actual showroom MongoDB records without speculative data.`
        );
    } else if (intentKind === "single" && selectedBikes.length > 0) {
        const b = selectedBikes[0];
        steps.push(
            `### 🔍 2. Model Deep Dive & Database Verification\n` +
            `• Retrieving complete technical profile for **${b.brand} ${b.name}**.\n` +
            `• Validating powertrain architecture (${isEV(b) ? `Electric Motor with ${b.batteryCapacity} kWh battery` : `${b.engine} CC Internal Combustion Engine`}), performance envelope (${b.power} HP, ${b.topSpeed || "N/A"} km/h), and ownership metrics (${isEV(b) ? `${b.range} km range` : `${b.mileage} km/l efficiency`}).\n` +
            `• Synthesizing objective pros, ergonomic profile, and target rider fit.`
        );
    } else if (intentKind === "which" && compareBikes.length > 0) {
        steps.push(
            `### 🔍 2. Comparative Attribute Analysis\n` +
            `• Evaluating **${attribute || "specifications"}** across discussed motorcycles: ${compareBikes.map((b) => `${b.brand} ${b.name}`).join(", ")}.\n` +
            `• Sorting candidates strictly by database metric values (${attribute ? `Attribute: ${attribute}` : "Overall balance"}).`
        );
    } else if (intentKind === "notfound") {
        steps.push(
            `### 🔍 2. Showroom Catalog Lookup\n` +
            `• Searched active catalog for model matching "${missingName}".\n` +
            `• Result: No verified database entry matches this exact model.\n` +
            `• Safety Protocol: Halting speculative generation to avoid misleading the rider. Switching to closest rated alternative recommendations.`
        );
    } else if (intentKind === "knowledge") {
        steps.push(
            `### 🔍 2. Technical Domain Analysis & Showroom Synthesis\n` +
            `• Analyzing engineering principles, riding mechanics, or platform functionality for query.\n` +
            `• Cross-referencing verified showroom models equipped with relevant technology (e.g. Dual-Channel ABS, Liquid Cooling, Slipper Clutch, or EV batteries).\n` +
            `• Formulating objective, comprehensive guidance with actionable showroom links.`
        );
    } else if (intentKind === "offtopic" || intentKind === "general") {
        steps.push(
            `### 🔍 2. Domain Scope Verification\n` +
            `• Scanning query for motorcycle purchasing signals, budget limits, or model comparisons.\n` +
            `• Result: General inquiry. Clarifying AI Advisor specialization and guiding user toward actionable motorcycle buying questions.`
        );
    } else {
        const total = catalog.length;
        const eligibleCount = filteredPool.length;
        const exclusions = [];
        if (merged.excludedNames && merged.excludedNames.length > 0) {
            exclusions.push(`Excluded ${merged.excludedNames.length} models: ${merged.excludedNames.map((b) => `${b.brand} ${b.name}`).join(", ")} per user request`);
        }
        if (merged.excludedBrands && merged.excludedBrands.length > 0) {
            exclusions.push(`Excluded brands: ${merged.excludedBrands.join(", ")} per user request`);
        }
        if (merged.budget) {
            const overBudget = catalog.filter((b) => Number(b.price) > merged.budget);
            if (overBudget.length > 0) {
                const sampleOver = overBudget.slice(0, 2).map((b) => `${b.brand} ${b.name} (${inr(b.price)})`).join(", ");
                exclusions.push(`Excluded ${overBudget.length} models exceeding budget limit of ${inr(merged.budget)} (e.g. ${sampleOver})`);
            }
        }
        if (merged.fuel) {
            const oppFuel = catalog.filter((b) => merged.fuel === "electric" ? !isEV(b) : isEV(b));
            if (oppFuel.length > 0) {
                exclusions.push(`Excluded ${oppFuel.length} ${merged.fuel === "electric" ? "petrol" : "electric"} models to honor fuel preference`);
            }
        }

        steps.push(
            `### 🔍 2. Catalog Audit & Constraint Filtering\n` +
            `• **Total Showroom Inventory Audited:** ${total} motorcycle models.\n` +
            `• **Matching Candidate Pool:** ${eligibleCount} bikes met all hard constraints.\n` +
            (exclusions.length > 0
                ? `• **Filtering Decisions:**\n` + exclusions.map((ex) => `  - ${ex}`).join("\n")
                : `• All catalog models passed preliminary feasibility checks.`)
        );
    }

    // Step 3: Multi-Criteria Trade-off Evaluation & Scoring
    if (intentKind === "comparison" && compareBikes.length >= 2) {
        const [b1, b2] = compareBikes;
        const priceDiff = Math.abs(b1.price - b2.price);
        const cheaper = b1.price < b2.price ? b1 : b2;
        steps.push(
            `### ⚖️ 3. Trade-off & Value Analysis\n` +
            `• **Price Gap:** ${inr(priceDiff)} difference between ${b1.brand} ${b1.name} (${inr(b1.price)}) and ${b2.brand} ${b2.name} (${inr(b2.price)}).\n` +
            `• **Performance vs Economy:**\n` +
            `  - ${b1.brand} ${b1.name}: ${b1.power} HP output, rated at ⭐ ${b1.rating}/5.\n` +
            `  - ${b2.brand} ${b2.name}: ${b2.power} HP output, rated at ⭐ ${b2.rating}/5.\n` +
            `• **Value Recommendation:** For maximum affordability, the ${cheaper.brand} ${cheaper.name} saves ${inr(priceDiff)}; for riders prioritizing specific performance or riding dynamics, the premium may be justified.`
        );
    } else if (intentKind === "knowledge") {
        steps.push(
            `### ⚖️ 3. Practical Impact Assessment\n` +
            `• Evaluated real-world rider benefits across Indian road conditions, maintenance cost, and safety margin.\n` +
            `• Selected representative showroom models for rider exploration.`
        );
    } else if (selectedBikes.length > 0 && intentKind === "recommendation") {
        const topPicks = selectedBikes.map((b, i) => {
            const ev = isEV(b);
            const metric = ev ? `${b.range} km range, ${b.batteryCapacity} kWh battery` : `${b.mileage} km/l mileage, ${b.power} HP`;
            return `  ${i + 1}. **${b.brand} ${b.name}** (${inr(b.price)}): ${metric} | Highlights: ${whyLine(b, merged.aspects || []) || "Balanced all-rounder"}`;
        }).join("\n");

        let costInsight = "";
        if (merged.dailyKm && selectedBikes[0]) {
            const top = selectedBikes[0];
            const monthlyKm = merged.dailyKm * 30;
            const cost = monthlyCostOf(top, merged.dailyKm);
            if (cost) {
                costInsight = `\n• **Commuting Cost Projection:** For ${merged.dailyKm} km daily (~${monthlyKm} km/mo), running cost on the ${top.name} is ~${inr(Math.round(cost))}/month.`;
            }
        }

        steps.push(
            `### ⚖️ 3. Multi-Criteria Trade-off Evaluation & Scoring\n` +
            `• Evaluated power-to-weight, fuel economy, comfort ergonomics, and value-for-money index.\n` +
            `• **Top Ranked Candidates After Scoring:**\n` +
            topPicks +
            costInsight
        );
    }

    // Step 4: Final Selection & Advisory Strategy
    if (intentKind === "knowledge") {
        steps.push(
            `### 💡 4. Knowledge Delivery Strategy\n` +
            `• Provided comprehensive, easy-to-understand explanation with bullet points and comparison tables.\n` +
            `• Connected technical concepts directly to verifiable showroom motorcycles.`
        );
    } else if (selectedBikes.length > 0) {
        steps.push(
            `### 💡 4. Recommendation Strategy\n` +
            `• Selected ${selectedBikes.length} top motorcycle${selectedBikes.length > 1 ? "s" : ""} aligned with rider's budget and requirements.\n` +
            `• Structured clean markdown overview, key specs, suitability analysis, and actionable next steps.`
        );
    }

    return steps.join("\n\n");
};

const isGreetingOnly = (text, current) => {
    if (
        current.budget ||
        current.fuel ||
        current.category ||
        current.brands.length > 0 ||
        current.names.length > 0 ||
        current.dailyKm
    ) {
        return false;
    }
    const clean = text.replace(/^[!?,. ]+|[!?,. ]+$/g, "");
    const greetingsOnlyRegex =
        /^(hi|hello|hey|hiya|howdy|hola|namaste|greetings|good\s*(morning|afternoon|evening|day)|what'?s\s*up|sup|yo)(\s+(there|motoai|bot|ai|advisor|friend|team))?$/i;
    if (greetingsOnlyRegex.test(clean)) return true;

    if (
        /^(hi|hello|hey|good\s*(morning|afternoon|evening))\b/i.test(clean) &&
        !current.hasMotoSignal &&
        current.aspects.length === 0
    ) {
        return true;
    }
    return false;
};

const isGratitudeOnly = (text, current) => {
    if (
        current.budget ||
        current.fuel ||
        current.category ||
        current.brands.length > 0 ||
        current.names.length > 0
    )
        return false;
    const clean = text.replace(/^[!?,. ]+|[!?,. ]+$/g, "");
    return /^(thank\s*you|thanks|thx|thankyou|thanks\s*a\s*lot|much\s*appreciated|thank\s*you\s*so\s*much)(\s*(motoai|bot|ai))?$/i.test(
        clean
    );
};

const isIdentityOrHelp = (text, current) => {
    if (
        current.budget ||
        current.fuel ||
        current.category ||
        current.brands.length > 0 ||
        current.names.length > 0
    )
        return false;
    const clean = text.replace(/^[!?,. ]+|[!?,. ]+$/g, "");
    return /^(who\s*are\s*you|what\s*are\s*you|what\s*can\s*you\s*do|what\s*do\s*you\s*do|help(\s*me)?|what\s*is\s*this(\s*app)?|how\s*can\s*you\s*help)$/i.test(
        clean
    );
};

const isResetIntent = (text) => {
    const clean = text.replace(/^[!?,. ]+|[!?,. ]+$/g, "");
    return /^(reset|start\s*over|clear|clear\s*filters|new\s*search|forget(\s*previous)?)$/i.test(
        clean
    );
};

// ========================================
// MOTORCYCLE & PLATFORM KNOWLEDGE BASE
// Directly answers technical concepts (ABS, Slipper Clutch,
// Cooling, CC, Torque vs Power, EV vs Petrol, Maintenance)
// and MOTOAI platform features (tokens, comparison tool,
// cost calculator, test rides) with real showroom bike ties.
// ========================================

const KNOWLEDGE_TOPICS = [
    {
        id: "abs",
        title: "Anti-Lock Braking System (ABS) & Braking Safety",
        patterns: [
            /\b(?:abs|anti[-\s]?lock|single channel abs|dual channel abs|braking safety)\b/i,
            /\bwhat is abs\b/i,
            /\bhow does abs work\b/i,
            /\bdifference between single and dual channel abs\b/i,
        ],
        summary: "ABS prevents wheels from locking up during hard emergency braking, maintaining steering control and preventing skids.",
        explanation: (catalog) => {
            return [
                "### 🛑 Anti-Lock Braking System (ABS) Explained",
                "",
                "**What is ABS?**",
                "ABS (Anti-lock Braking System) is an active electronic safety feature that monitors wheel speed through magnetic sensors. When you grab the brake hard in a panic stop, ABS pulses brake pressure up to 15-20 times per second to prevent the wheel from seizing and sliding.",
                "",
                "#### ⚖️ Single-Channel vs Dual-Channel ABS",
                "| Feature | Single-Channel ABS | Dual-Channel ABS |",
                "| --- | --- | --- |",
                "| **Coverage** | Front wheel only | Both Front & Rear wheels |",
                "| **Skid Prevention** | Prevents front-end tuck | Prevents both front tuck & rear fish-tailing |",
                "| **Wet/Gravel Safety** | Moderate (rear wheel can still lock) | Superior (full stability on wet Indian roads) |",
                "| **Typical Price Bracket** | Sub-₹1.5 Lakh budget bikes | Premium commuters & sports bikes (₹1.5L+) |",
                "",
                "#### 💡 Why Dual-Channel ABS is Recommended",
                "- **Panic Stopping:** Stops the bike in a straight line without unpredictable rear-wheel fishtailing.",
                "- **Monsoon & Gravel Surfaces:** Essential for unexpected potholes, wet paint lines, and loose gravel common on Indian roads.",
                "- **Cornering Confidence:** Keeps tires tracking true even under sudden mid-corner braking.",
                "",
                "#### 🏍️ Showroom Models Equipped with Dual-Channel ABS",
                "Here are verified motorcycles in our showroom offering dual-channel ABS for maximum safety:",
            ].join("\n");
        },
        relevantBikes: (catalog) => {
            const dualAbsModels = ["Duke 390", "R15 V4", "Classic 350", "Duke 250", "Pulsar NS200", "Ninja 300"];
            return catalog.filter((b) => dualAbsModels.some((m) => `${b.brand} ${b.name}`.includes(m))).slice(0, 3);
        },
    },
    {
        id: "slipper_clutch",
        title: "Assist & Slipper Clutch Technology",
        patterns: [
            /\b(?:slipper clutch|assist and slipper|assist clutch|clutch slipping|downshift hopping)\b/i,
            /\bwhat is (?:a )?slipper clutch\b/i,
            /\bhow does (?:a )?slipper clutch work\b/i,
        ],
        summary: "A slipper clutch prevents rear-wheel hopping during aggressive downshifts and reduces clutch lever effort in heavy city traffic.",
        explanation: (catalog) => {
            return [
                "### ⚙️ Assist & Slipper Clutch Explained",
                "",
                "**What is an Assist & Slipper Clutch?**",
                "A conventional motorcycle clutch directly locks the engine to the transmission. If you downshift aggressively at high speeds, engine braking forces the rear tire to suddenly decelerate, leading to rear-wheel hop or fishtailing.",
                "",
                "#### 🔧 How It Works",
                "1. **Slipper Mechanism (Downshift Safety):** When engine back-torque exceeds wheel speed, internal helical ramps separate the clutch plates slightly. This allows controlled slippage, keeping the rear tire planted and smooth.",
                "2. **Assist Function (City Ergonomics):** Special cams pull the plates together under acceleration, allowing manufacturers to use softer clutch springs. This reduces clutch lever effort by **up to 30-40%**, dramatically reducing wrist fatigue in bumper-to-bumper city traffic.",
                "",
                "#### 🏆 Key Benefits for Riders",
                "- **No Rear-Wheel Lockup:** Safer high-speed corner entries and emergency decelerations.",
                "- **Ultra-Light Clutch Pull:** Effortless 1-finger or 2-finger clutch operation in daily commutes.",
                "- **Transmission Longevity:** Prevents excessive stress on the gearbox and chain.",
                "",
                "#### 🏍️ Showroom Models Equipped with Slipper Clutch",
                "These motorcycles in our showroom feature an Assist & Slipper Clutch straight from the factory:",
            ].join("\n");
        },
        relevantBikes: (catalog) => {
            const slipperModels = ["R15 V4", "MT-15", "Duke 390", "Apache RTR 200", "Ninja 300"];
            return catalog.filter((b) => slipperModels.some((m) => `${b.brand} ${b.name}`.includes(m))).slice(0, 3);
        },
    },
    {
        id: "cooling",
        title: "Engine Cooling Systems (Air vs Oil vs Liquid Cooled)",
        patterns: [
            /\b(?:cooling|liquid cooled|air cooled|oil cooled|radiator|coolant|engine heat)\b/i,
            /\bliquid cooling vs air cooling\b/i,
            /\bwhat is liquid cooling\b/i,
            /\bdifference between air and liquid cooled\b/i,
        ],
        summary: "Liquid cooling uses a radiator and pumped coolant for consistent high-RPM performance, while air/oil cooling provides simplicity and lower maintenance.",
        explanation: (catalog) => {
            return [
                "### ❄️ Motorcycle Cooling Systems: Air vs Oil vs Liquid",
                "",
                "Motorcycle engines produce immense heat during combustion. How that heat is dispersed determines sustained power, engine lifespan, and rider comfort.",
                "",
                "#### 📊 Cooling System Comparison",
                "| Cooling Type | Mechanism | Best For | Pros & Cons |",
                "| --- | --- | --- | --- |",
                "| **Air-Cooled** | Metal fins dissipate heat into passing airflow | Low-revving cruisers & budget commuters | 🟢 Low cost, zero coolant maintenance<br>🔴 Runs hot in bumper-to-bumper traffic |",
                "| **Oil-Cooled** | Engine oil routed through an external mini-cooler | 160-200cc performance commuters | 🟢 15-20% cooler than air cooling<br>🔴 Still relies somewhat on ambient airflow |",
                "| **Liquid-Cooled** | Water-glycol coolant pumped through cylinder jacket + radiator fan | High-revving sports & touring bikes (250cc+) | 🟢 Consistent power, no thermal throttling<br>🔴 Slightly higher weight & coolant top-up |",
                "",
                "#### 💡 Buyer Recommendation",
                "- For **high-speed touring or aggressive track riding**, liquid cooling is mandatory to prevent horsepower drop off as heat builds up.",
                "- For **relaxed city cruising or budget maintenance**, refined air-oil cooled engines (like Royal Enfield's J-Series) are exceptionally durable and fuss-free.",
                "",
                "#### 🏍️ Showroom Models Featuring Liquid Cooling",
                "Explore these high-performance liquid-cooled machines in our showroom:",
            ].join("\n");
        },
        relevantBikes: (catalog) => {
            const liquidModels = ["Duke 390", "Ninja 300", "R15 V4", "MT-15", "Duke 250"];
            return catalog.filter((b) => liquidModels.some((m) => `${b.brand} ${b.name}`.includes(m))).slice(0, 3);
        },
    },
    {
        id: "engine_cc",
        title: "Engine Displacement (CC - Cubic Capacity)",
        patterns: [
            /\b(?:engine cc|what is cc|engine capacity|cubic capacity|displacement|150cc|200cc|250cc|350cc|400cc)\b/i,
            /\bwhat does cc mean\b/i,
            /\bhow does cc affect\b/i,
        ],
        summary: "CC stands for Cubic Centimetres, measuring the total air-fuel displacement of the engine cylinder.",
        explanation: (catalog) => {
            return [
                "### 🔍 Understanding Engine CC (Cubic Capacity)",
                "",
                "**What is CC?**",
                "CC stands for **Cubic Centimetres** (or displacement). It measures the physical volume swept by the piston inside the engine cylinder from Top Dead Centre (TDC) to Bottom Dead Centre (BDC).",
                "",
                "#### 📈 How CC Affects Your Ride",
                "- **Fuel Efficiency:** Smaller CC engines (100cc-160cc) consume less fuel, delivering 45-65 km/l. Larger CC engines (350cc-400cc) deliver 28-35 km/l.",
                "- **Torque & Pulling Power:** Higher CC engines suck in more air-fuel mixture per stroke, generating stronger low-end grunt (useful for overtakes and hill climbs with a pillion).",
                "- **Highway Cruising:** A 350-400cc bike can cruise effortlessly at 100-110 km/h without feeling strained, whereas a 150cc bike will sit near its rev-limiter.",
                "",
                "#### 🎯 Choosing the Right CC for You",
                "1. **125cc - 160cc (Daily Commute & Economy):** 45-55 km/l mileage, nimble traffic handling (e.g., Yamaha MT-15).",
                "2. **200cc - 250cc (Sport Commuter & Weekend Sprints):** 35-40 km/l, 20-30 HP, versatile highway speed (e.g., Pulsar NS200, Duke 250).",
                "3. **350cc - 400cc (Touring & Long Rides):** 28-35 km/l, effortless cruising, premium road presence (e.g., RE Classic 350, KTM Duke 390).",
                "",
                "#### 🏍️ Showroom Picks Across Engine Categories",
            ].join("\n");
        },
        relevantBikes: (catalog) => {
            const picks = ["MT-15", "Pulsar NS200", "Classic 350", "Duke 390"];
            return catalog.filter((b) => picks.some((m) => `${b.brand} ${b.name}`.includes(m))).slice(0, 3);
        },
    },
    {
        id: "torque_vs_power",
        title: "Torque (Nm) vs Horsepower (HP / BHP)",
        patterns: [
            /\b(?:torque vs power|power vs torque|torque and horsepower|hp vs nm|difference between torque and power|bhp vs nm)\b/i,
            /\bwhat is torque\b/i,
            /\bwhat is horsepower\b/i,
        ],
        summary: "Torque is rotational force that determines initial pickup, while horsepower determines how fast the bike can sustain top speed.",
        explanation: (catalog) => {
            return [
                "### ⚡ Torque (Nm) vs Horsepower (HP): What Really Matters?",
                "",
                "A common rider phrase explains it best: ***'Torque is how hard you hit the wall; Horsepower is how fast you hit the wall.'***",
                "",
                "#### ⚖️ Side-by-Side Breakdown",
                "| Attribute | Torque (Newton-Meters - Nm) | Horsepower (HP / BHP) |",
                "| --- | --- | --- |",
                "| **What It Measures** | Rotational twisting force | Rate of doing work over time |",
                "| **Where You Feel It** | Instant pull from stoplights, steep hill climb, overtaking | Screaming high-RPM top-end speed |",
                "| **Ideal Riding Style** | Relaxed city riding, cruiser thumping, heavy loads | Track days, aggressive sports riding, highway sprints |",
                "| **Classic Example** | **Royal Enfield Classic 350:** 27 Nm torque @ 4,000 RPM | **KTM Duke 390:** 45 HP @ 8,500 RPM |",
                "",
                "#### 💡 Rider Advice",
                "- If you spend 80% of your time in **stop-and-go city traffic**, look for **high torque at low RPMs** so you don't have to constantly downshift.",
                "- If you love **highway overtakes and spirited top speed**, prioritize **higher HP**.",
                "",
                "#### 🏍️ Compare Torque vs Power in Showroom Models",
            ].join("\n");
        },
        relevantBikes: (catalog) => {
            const picks = ["Classic 350", "Duke 390", "MT-15"];
            return catalog.filter((b) => picks.some((m) => `${b.brand} ${b.name}`.includes(m))).slice(0, 3);
        },
    },
    {
        id: "ev_vs_petrol",
        title: "Electric Vehicle (EV) vs Petrol Motorcycle Comparison",
        patterns: [
            /\b(?:ev vs petrol|petrol vs ev|electric vs petrol|petrol vs electric|should i buy ev or petrol|is ev cheaper)\b/i,
            /\belectric bike vs petrol bike\b/i,
            /\belectric scooter vs petrol\b/i,
        ],
        summary: "EVs provide an unbeatable ~₹0.30/km running cost for city commutes, while petrol bikes offer unlimited highway range and fast refueling.",
        explanation: (catalog) => {
            return [
                "### ⚡ Electric (EV) vs Petrol: Complete Cost & Practicality Breakdown",
                "",
                "#### 💰 Running Cost Analysis (Based on 30 km daily commute)",
                "| Metric | Electric Scooter (e.g. Ather / Ola / iQube) | Petrol Bike (e.g. 150-350cc) |",
                "| --- | --- | --- |",
                "| **Fuel / Energy Cost** | ~₹0.25 - ₹0.35 per km | ~₹2.20 - ₹3.00 per km (at ₹105/L) |",
                "| **Monthly Running Cost (900 km)** | **~₹250 - ₹320 / month** | **~₹2,100 - ₹2,700 / month** |",
                "| **Annual Fuel Savings** | **Save ~₹22,000 to ₹28,000 every year** on EV! | Baseline petrol expense |",
                "| **Maintenance** | Low (no oil, filters, spark plugs, clutch) | Periodic engine oil, chain, and filter service |",
                "| **Refueling Time** | 4 to 6.5 hours home charge | 2 minutes at petrol station |",
                "| **Range Capability** | 120-195 km true city range | 400-500 km per tank (unlimited highway range) |",
                "",
                "#### 🎯 Verdict: Which Should You Buy?",
                "- **Buy an Electric Scooter IF:** Your daily ride is 20-60 km in city traffic, you can charge overnight at home/parking, and your priority is slashing monthly travel costs.",
                "- **Buy a Petrol Motorcycle IF:** You love weekend touring (200+ km), highway road trips, or lack dedicated home charging access.",
                "",
                "#### 🏍️ Top Electric Showroom Models",
                "Here are the top-rated electric scooters available in our showroom:",
            ].join("\n");
        },
        relevantBikes: (catalog) => {
            return catalog.filter((b) => isEV(b)).slice(0, 3);
        },
    },
    {
        id: "maintenance_tips",
        title: "Motorcycle Maintenance & Mileage Optimization",
        patterns: [
            /\b(?:maintenance|service tips|chain lube|chain cleaning|tyre pressure|how to increase mileage|mileage tips|bike care)\b/i,
            /\bhow to maintain (?:a )?bike\b/i,
            /\bhow to get better mileage\b/i,
        ],
        summary: "Essential preventive maintenance routines for chain care, tyre pressure, engine oil, and smooth throttle habits.",
        explanation: (catalog) => {
            return [
                "### 🛠️ Pro Maintenance & Mileage Tips for Indian Riders",
                "",
                "Keeping your motorcycle in peak condition maximizes resale value, safety, and fuel efficiency.",
                "",
                "#### 📋 Top 5 Golden Rules of Motorcycle Maintenance",
                "1. **Drive Chain Care (Every 500 km):** Clean with kerosene/chain cleaner and apply dedicated chain lube. A dry or loose chain robs up to 2-3 km/l of mileage and wears sprockets rapidly.",
                "2. **Optimal Tyre Pressure (Check Weekly):** Under-inflated tyres increase rolling resistance, drastically lowering mileage by 10-15% and causing sluggish steering. Maintain manufacturer PSI (usually 28-32 Front, 32-36 Rear with pillion).",
                "3. **Engine Oil Replacement:** Change mineral oil every 3,000 km, semi-synthetic every 5,000 km, or fully synthetic every 8,000-10,000 km. Always replace the oil filter.",
                "4. **Smooth Throttle & Gear Shifts:** Avoid sudden wide-open throttle bursts in low gears. Shift up smoothly between 3,500 - 4,500 RPM to keep the engine in its economical torque curve.",
                "5. **Brake Drag Inspection:** Ensure brake pads do not rub against the disc when wheels are spun freely on the center stand.",
                "",
                "#### 🏍️ High-Efficiency Commuters in Showroom",
                "Looking for bikes built for ultra-low maintenance and class-leading mileage?",
            ].join("\n");
        },
        relevantBikes: (catalog) => {
            return catalog.filter((b) => !isEV(b) && (b.mileage || 0) >= 40).sort((a, b) => (b.mileage || 0) - (a.mileage || 0)).slice(0, 3);
        },
    },
    {
        id: "beginners",
        title: "Best Motorcycles for Beginners & Short Riders",
        patterns: [
            /\b(?:beginner|first bike|learner|new rider|short rider|seat height|easy to ride|easy to handle)\b/i,
            /\bbest bike for beginners\b/i,
            /\bwhich bike for college student\b/i,
            /\bbike for (?:short|low) height\b/i,
        ],
        summary: "Beginner-friendly bikes feature low seat heights, manageable weight (sub-165 kg), and smooth, forgiving throttle response.",
        explanation: (catalog) => {
            return [
                "### 🎓 Beginner Rider Guide & Accessible Seat Heights",
                "",
                "**What Makes a Great First Motorcycle?**",
                "When starting your riding journey, high horsepower can be intimidating. The ideal beginner motorcycle should have: accessible seat height, predictable throttle, lightweight chassis, and low repair costs.",
                "",
                "#### 📐 Critical Specs for New Riders",
                "- **Seat Height (780mm - 800mm):** Allows riders of average height (5'4\" to 5'8\") to comfortably flat-foot at traffic lights, preventing accidental tip-overs.",
                "- **Curb Weight (<165 kg):** Easy to balance at walking speeds and effortless to park.",
                "- **Power Ceiling (15 - 25 HP):** Plenty of highway pickup without aggressive wheelie-inducing power spikes.",
                "- **ABS Safety:** Look for at least Single or Dual Channel ABS so sudden panic grabs don't lock the front wheel.",
                "",
                "#### 🏍️ Top Beginner Recommendations in Showroom",
                "These showroom models are widely praised for forgiving ergonomics and reliable performance:",
            ].join("\n");
        },
        relevantBikes: (catalog) => {
            const begModels = ["Hunter 350", "MT-15", "Pulsar NS200", "iQube"];
            return catalog.filter((b) => begModels.some((m) => `${b.brand} ${b.name}`.includes(m))).slice(0, 3);
        },
    },
    {
        id: "platform_tokens",
        title: "MOTOAI AI Tokens & Subscription Plans",
        patterns: [
            /\b(?:tokens?|ai tokens?|how do tokens work|token balance|token limit|how to get tokens|subscription|pricing plan|upgrade plan|premium plan)\b/i,
            /\bwhat are ai tokens\b/i,
            /\bhow to earn tokens\b/i,
        ],
        summary: "AI tokens power your MotoMind advisor sessions and deep comparisons. Free tier users receive daily allowances, while Pro/Premium unlocks expanded limits and ad-free browsing.",
        explanation: (catalog) => {
            return [
                "### 🪙 MOTOAI AI Tokens & Plans Explained",
                "",
                "**How Do AI Tokens Work?**",
                "Every time you chat with **MotoMind**, our AI analyzes your query against live showroom inventory, runs multi-factor scoring, and formats technical guidance. Tokens reflect the computational context consumed per interaction.",
                "",
                "#### 💳 Plan Benefits Breakdown",
                "- 🆓 **Free Plan:** Daily token allowance for standard motorcycle recommendations and basic spec checks. Includes banner sponsors.",
                "- ⭐ **Pro & Premium Plans:**",
                "  - **Substantially Expanded / Unlimited Tokens** for continuous in-depth advisory and comparisons.",
                "  - **100% Ad-Free Experience:** All banners and promotional overlays are automatically removed.",
                "  - **Advanced Multi-Bike Comparisons:** Full side-by-side spec sheets across 3+ motorcycles.",
                "  - **Priority Processing:** Faster response latency and early access to new AI features.",
                "",
                "#### 💡 How to Check or Upgrade Your Account",
                "1. Click the **Profile / Token Wallet** badge in the top navigation header.",
                "2. View your real-time token balance and usage history.",
                "3. Click **Upgrade to Premium** to unlock unlimited advisory sessions and an ad-free interface.",
            ].join("\n");
        },
        relevantBikes: (catalog) => {
            return catalog.slice(0, 3);
        },
    },
    {
        id: "platform_features",
        title: "MOTOAI Platform Features & Tools",
        patterns: [
            /\b(?:comparison tool|cost calculator|dealership|test ride|platform features|how to use motoai|ownership calculator)\b/i,
            /\bhow does comparison work\b/i,
            /\bhow to calculate ownership cost\b/i,
            /\bhow to book a test ride\b/i,
        ],
        summary: "MOTOAI offers an integrated ecosystem including the AI Advisor, Side-by-Side Comparison Tool, 5-Year Ownership Cost Calculator, and Dealership Locator.",
        explanation: (catalog) => {
            return [
                "### 🚀 MOTOAI Platform Tools & Features",
                "",
                "MOTOAI is your all-in-one companion for motorcycle research, buying decisions, and ownership planning in India.",
                "",
                "#### 🛠️ Available Platform Modules",
                "1. 🤖 **AI MotoMind Advisor:** Live conversational AI that recommends bikes based on your budget, daily distance, fuel choice, and riding style.",
                "2. ⚖️ **Side-by-Side Comparison Tool:** Compare any 2 or 3 motorcycles head-to-head across price, engine displacement, power, torque, mileage, curb weight, and user ratings.",
                "3. 📊 **Total Ownership Cost Calculator:** Forecast your 1-to-5 year expenses including daily petrol/charging costs, scheduled maintenance, insurance premiums, and consumables.",
                "4. 📍 **Dealership Locator & Test Rides:** Find verified official dealerships near your pincode and request test rides directly.",
                "",
                "#### 💡 Quick Actions",
                "- To compare bikes right here in chat, just type: *'Compare Hunter 350 vs Classic 350'*",
                "- To calculate monthly commute costs, tell me: *'I travel 40 km daily on an electric scooter'*",
            ].join("\n");
        },
        relevantBikes: (catalog) => {
            return catalog.slice(0, 3);
        },
    },
];

const findKnowledgeResponse = (message, currentText, catalog) => {
    for (const topic of KNOWLEDGE_TOPICS) {
        const matches = topic.patterns.some((p) => p.test(currentText));
        if (matches) {
            const bikes = topic.relevantBikes(catalog);
            const body = topic.explanation(catalog);
            const thought = generateThinkingProcess({
                userMessage: message,
                intentKind: "knowledge",
                current: { hasMotoSignal: true },
                merged: { hasMotoSignal: true },
                catalog,
                selectedBikes: bikes,
            });

            return {
                thought,
                reply: body,
                recommendations: bikes,
            };
        }
    }
    return null;
};

const isMotoRelatedQuery = (text) => {
    const motoTerms = [
        "abs", "brake", "braking", "clutch", "engine", "cc", "gear", "transmission",
        "power", "torque", "bhp", "hp", "cooling", "radiator", "coolant", "fuel", "mileage",
        "petrol", "electric", "ev", "battery", "range", "charging", "seat", "seat height",
        "ergonomics", "pillion", "comfort", "tyre", "tire", "suspension", "monoshock",
        "fork", "maintenance", "service", "chain", "oil", "lube", "helmet", "jacket",
        "gloves", "riding gear", "safety", "chassis", "frame", "exhaust", "commute",
        "touring", "highway", "speed", "cruiser", "sports", "naked", "scooter", "motorcycle",
        "bike", "rider", "ride", "token", "tokens", "calculator", "dealership"
    ];
    return motoTerms.some((term) => text.includes(term));
};

const handleGeneralMotorcycleAdvice = (message, currentText, catalog) => {
    const looksGeneral = /^(how does|how do|what is|what are|what's|whats|explain|why |why\?|what does|meaning of|tell me about|guide me|tips for|recommendation for|should i|which is better)/i.test(
        currentText.trim()
    );
    if (!looksGeneral) return null;

    if (!isMotoRelatedQuery(currentText)) return null;

    const topShowroomBikes = [...catalog]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3);

    let specificTopic = "motorcycle mechanics & riding";
    let body = "";

    if (/traction control/i.test(currentText)) {
        specificTopic = "Traction Control System (TCS)";
        body = [
            "### 🛡️ Traction Control System (TCS) on Motorcycles",
            "",
            "**What is Traction Control?**",
            "Traction Control System (TCS) monitors front and rear wheel speed sensors. If the rear wheel spins faster than the front (due to sudden throttle on sand, wet mud, oil, or wet paint lines), the ECU instantly cuts ignition spark or fuel delivery to regain rear-wheel grip.",
            "",
            "- **Why it matters:** Prevents catastrophic high-side crashes when accelerating out of slippery corners.",
            "- **In our showroom:** High-performance bikes like the **Yamaha R15 V4**, **Yamaha MT-15**, and **KTM Duke 390** come equipped with electronic rider aids and traction control.",
        ].join("\n");
    } else if (/suspension|monoshock|usd fork|telescopic/i.test(currentText)) {
        specificTopic = "Motorcycle Suspension Systems";
        body = [
            "### 🏎️ Suspension Systems: USD Forks vs Telescopic & Monoshock",
            "",
            "**USD (Upside Down / Inverted) Forks vs Conventional Telescopic:**",
            "- **USD Forks:** The heavier outer tube is clamped at the triple tree, reducing unsprung mass at the wheel. This yields sharper feedback, superior high-speed cornering stability, and zero fork flex under hard braking (found on **KTM Duke 390**, **Yamaha R15 V4**, **Yamaha MT-15**).",
            "- **Conventional Telescopic Forks:** Simpler design, lower seal wear from Indian dust/mud, and lower replacement cost (found on **RE Classic 350**, **Hunter 350**).",
            "",
            "**Rear Monoshock vs Twin Shock Absorbers:**",
            "- **Monoshock:** Centrally mounted near the swingarm pivot for centralized mass, progressive damping, and aggressive cornering agility.",
            "- **Twin Shocks:** Classic retro aesthetic and high load-bearing capacity for heavy touring or pillion loads.",
        ].join("\n");
    } else if (/helmet|gear|jacket|gloves|boots/i.test(currentText)) {
        specificTopic = "Essential Rider Safety Gear";
        body = [
            "### 🪖 Essential Riding Gear Guide (ATGATT - All The Gear All The Time)",
            "",
            "Investing in certified gear protects you from unexpected pavement abrasions and impacts:",
            "",
            "1. **Full-Face Helmet:** Look for **ECE 22.06** or **DOT** certification with ISI. Full-face helmets protect the chin/jaw, where 35% of motorcycle crash impacts occur.",
            "2. **Riding Jacket:** Textile mesh jacket with **Level 2 CE** armor at elbows, shoulders, and spine.",
            "3. **Riding Gloves:** Full leather or reinforced textile gloves with hard knuckle protection and palm sliders to prevent scaphoid bone fracture.",
            "4. **Riding Boots:** Ankle-support boots with reinforced toe box and heel cups.",
            "5. **Riding Denims / Pants:** Kevlar-reinforced pants with CE knee armor.",
        ].join("\n");
    } else if (/break[-\s]?in|run[-\s]?in/i.test(currentText)) {
        specificTopic = "Engine Break-In / Run-In Procedure";
        body = [
            "### 🔧 Engine Break-In / Run-In Best Practices",
            "",
            "During the first **1,000 km (First Service)** of a brand-new motorcycle, piston rings, cylinder walls, and gearbox cogs must properly seat together.",
            "",
            "- **Vary Your RPMs:** Don't drone at a constant speed on the highway. Ride through varied city gears to load the piston rings progressively.",
            "- **Avoid Redlining:** Keep engine speed below the manufacturer's recommended break-in RPM (typically under 4,500-5,000 RPM for the first 500 km).",
            "- **Avoid Hard Cold Revving:** Allow the engine to idle for 30-45 seconds before riding off to let oil circulate to the cylinder head.",
            "- **First Oil Change is Vital:** Mineral break-in oil catches microscopic metallic shavings from the factory. Never skip your scheduled first service!",
        ].join("\n");
    } else {
        specificTopic = "Motorcycle Technical Guidance";
        body = [
            `### 🏍️ Expert Motorcycle Advisory: ${message.trim()}`,
            "",
            "Here is the essential guidance for your question:",
            "",
            "- **Engineering & Performance:** Modern motorcycles are engineered around power-to-weight, chassis geometry, and thermal efficiency. Always balance raw horsepower against real-world city rideability.",
            "- **Safety First:** Prioritize active safety technologies like dual-channel ABS, slipper clutches, and quality radial tubeless tyres.",
            "- **Verified Showroom Comparison:** Our showroom database contains complete technical profiles, real-world mileage figures, and on-road pricing for top Indian motorcycles.",
        ].join("\n");
    }

    const thought = generateThinkingProcess({
        userMessage: message,
        intentKind: "knowledge",
        current: { hasMotoSignal: true },
        merged: { hasMotoSignal: true },
        catalog,
        selectedBikes: topShowroomBikes,
    });

    const fullReply = [
        body,
        "",
        "#### ⭐ Verified Showroom Motorcycles Featuring This Technology / Class",
        topShowroomBikes.map((b, i) => `${i + 1}. **${b.brand} ${b.name}** (${inr(b.price)}) • ${whyLine(b, [])}`).join("\n"),
        "",
        "### 💡 Next Step",
        "Would you like to explore full technical specifications, pricing, or side-by-side comparisons for any of these motorcycles?",
    ].join("\n");

    return {
        thought,
        reply: fullReply,
        recommendations: topShowroomBikes,
    };
};

const localRecommend = (message, catalog, conversation = []) => {
    const history = Array.isArray(conversation)
        ? conversation
              .filter(
                  (m) =>
                      m &&
                      typeof m.content === "string" &&
                      (m.role === "user" || m.role === "assistant")
              )
              .slice(-MAX_HISTORY)
        : [];
    const currentText = message.toLowerCase().trim();
    const current = extractFromMessage(currentText, catalog);

    // Prior discussed bikes (from saved assistant recommendations)
    const sets = discussedSets(history, catalog);
    const lastSet = sets.length > 0 ? sets[sets.length - 1] : [];
    const allDiscussed = [];
    sets.forEach((s) =>
        s.forEach((b) => {
            if (
                !allDiscussed.some(
                    (x) => String(x._id) === String(b._id)
                )
            )
                allDiscussed.push(b);
        })
    );

    // 1. GREETING HANDLER
    // When rider says "hello", "hi", "hey", acknowledge politely without dumping recommendation cards or assuming past budgets!
    if (isGreetingOnly(currentText, current)) {
        const prevUserMessages = history.filter((m) => m.role === "user");
        let prevBudget = null;
        for (let i = prevUserMessages.length - 1; i >= 0; i--) {
            const b = parseBudget(prevUserMessages[i].content);
            if (b) {
                prevBudget = b;
                break;
            }
        }
        const prevDiscussedNames =
            lastSet.length > 0
                ? lastSet.map((b) => `${b.brand} ${b.name}`).join(", ")
                : "";

        let thought = "";
        let reply = "";

        if (prevBudget || prevDiscussedNames) {
            thought =
                `### 🎯 1. User Intent & Interaction Analysis\n` +
                `• **Input Query:** "${message}"\n` +
                `• **Session Mode:** GREETING / RE-ENGAGEMENT\n` +
                `• **Context Analysis:** Rider greeted the advisor. Previous conversation referenced ${prevBudget ? `a budget of ${inr(prevBudget)}` : `discussed models (${prevDiscussedNames})`}.\n` +
                `• **Advisory Strategy:** Welcome the rider back warmly, acknowledge prior context without forcing assumptions, and prompt for next steps (refining current criteria or exploring new categories).`;

            reply =
                `Hello! 👋 Great to see you again.\n\n` +
                `We were previously exploring ${prevBudget ? `bikes around **${inr(prevBudget)}**` : `**${prevDiscussedNames}**`}. Would you like to continue with that search, look into a different budget, or compare other motorcycles?\n\n` +
                `**You can ask me to:**\n` +
                `- 💰 *"Show me options around ${prevBudget ? inr(prevBudget) : "₹2 lakh"}"*\n` +
                `- ⚡ *"What are the best electric scooters?"*\n` +
                `- 🏁 *"Compare Royal Enfield Hunter 350 vs Classic 350"*\n` +
                `- ⛽ *"Which bike offers the highest mileage for daily commutes?"*\n\n` +
                `What would you like to explore today?`;
        } else {
            thought =
                `### 🎯 1. User Intent & Interaction Analysis\n` +
                `• **Input Query:** "${message}"\n` +
                `• **Session Mode:** GREETING & INITIAL ONBOARDING\n` +
                `• **Context Analysis:** Rider initiated conversation with a greeting. No motorcycle constraints or filters specified.\n` +
                `• **Advisory Strategy:** Welcome the rider warmly, introduce MOTOAI capabilities (budget matching, mileage, EV analysis, ergonomic comfort, head-to-head comparisons), and invite them to share their riding requirements without making premature assumptions.`;

            reply =
                `Hello! 👋 I'm **MotoMind**, your AI motorcycle advisor.\n\n` +
                `Whether you're shopping for your first bike, upgrading for weekend touring, or finding an efficient EV for your daily office commute, I'm here to guide you using verified showroom data.\n\n` +
                `**Tell me a bit about what you're looking for:**\n` +
                `- 💰 **Your budget** (e.g. *"Best bike under ₹2 lakh"*)\n` +
                `- 🛵 **Riding purpose** (daily commute, highway touring, sporty weekend rides, or beginner friendly)\n` +
                `- ⚡ **Fuel preference** (petrol or electric scooter/bike)\n` +
                `- 🏁 **Comparisons** (e.g. *"Compare Ola S1 Pro and TVS iQube"*)\n\n` +
                `What would you like to explore today?`;
        }

        return {
            thought,
            reply,
            recommendations: [],
        };
    }

    // 2. GRATITUDE HANDLER
    if (isGratitudeOnly(currentText, current)) {
        const thought =
            `### 🎯 1. User Intent & Interaction Analysis\n` +
            `• **Input Query:** "${message}"\n` +
            `• **Session Mode:** COURTESY / ACKNOWLEDGMENT\n` +
            `• **Analysis:** Rider expressed appreciation for the recommendation.\n` +
            `• **Advisory Strategy:** Acknowledge warmly and invite further questions on test rides, technical specs, or financing.`;

        const reply =
            `You're very welcome! 😊\n\n` +
            `If you want to compare more bikes, check specs, or need help with dealership test rides and financing, just let me know anytime.\n\n` +
            `Safe riding! 🏍️💨`;

        return {
            thought,
            reply,
            recommendations: [],
        };
    }

    // 3. IDENTITY & HELP HANDLER
    if (isIdentityOrHelp(currentText, current)) {
        const thought =
            `### 🎯 1. User Intent & Interaction Analysis\n` +
            `• **Input Query:** "${message}"\n` +
            `• **Session Mode:** ADVISOR CAPABILITIES OVERVIEW\n` +
            `• **Analysis:** Rider inquired about MotoMind identity and capabilities.\n` +
            `• **Advisory Strategy:** Provide a clear, comprehensive breakdown of motorcycle advisory services.`;

        const reply =
            `I am **MotoMind**, the dedicated AI motorcycle advisor for the MOTOAI platform 🏍️🤖\n\n` +
            `**Here is what I can do for you:**\n` +
            `- 🎯 **Budget & Spec Matching:** Give me a budget (e.g., *"Best bike under ₹1.5 lakh"*), and I'll rank the top choices based on power, mileage, and value.\n` +
            `- 🏁 **Head-to-Head Comparisons:** Ask to compare any 2 or 3 models (e.g., *"Compare Hunter 350 and Ronin"*), and I'll generate a side-by-side spec table.\n` +
            `- ⚡ **Electric vs Petrol Guidance:** Compare real-world ranges, battery capacity, charging times, and monthly running costs.\n` +
            `- 📏 **Ergonomics & Practicality:** Ask about seat height for your height, pillion comfort, curb weight, and safety features like dual-channel ABS.\n\n` +
            `What kind of motorcycle would you like to look at?`;

        return {
            thought,
            reply,
            recommendations: [],
        };
    }

    // 4. RESET CONVERSATION HANDLER
    if (isResetIntent(currentText)) {
        const thought =
            `### 🎯 1. User Intent & Interaction Analysis\n` +
            `• **Input Query:** "${message}"\n` +
            `• **Session Mode:** CONVERSATION CONTEXT RESET\n` +
            `• **Analysis:** Rider requested to clear previous criteria and start fresh.\n` +
            `• **Advisory Strategy:** Reset constraints and prompt for new preferences.`;

        const reply =
            `All previous search filters have been cleared! 🔄\n\n` +
            `What would you like to search for next? Tell me your budget, preferred brand, or riding style.`;

        return {
            thought,
            reply,
            recommendations: [],
        };
    }

    const merged = mergeConstraints(
        [...history, { role: "user", content: message }],
        catalog
    );

    // Pronouns / ordinals ("it", "which one", "the first two")
    // resolve against previously discussed motorcycles.
    const ref = resolveReference(
        currentText,
        current,
        lastSet,
        allDiscussed
    );

    if (ref) {
        if (ref.kind === "compare") {
            const thought = generateThinkingProcess({
                userMessage: message,
                intentKind: "comparison",
                current,
                merged,
                catalog,
                compareBikes: ref.bikes,
            });
            return {
                thought,
                reply: compareReply(ref.bikes),
                recommendations: ref.bikes,
            };
        }
        if (ref.kind === "which") {
            const thought = generateThinkingProcess({
                userMessage: message,
                intentKind: "which",
                current,
                merged,
                catalog,
                compareBikes: ref.bikes,
                attribute: ref.attribute,
            });
            if (ref.attribute) {
                const res = aspectAnswer(ref.bikes, ref.attribute);
                return { ...res, thought };
            }
            return {
                thought,
                reply: compareReply(ref.bikes),
                recommendations: ref.bikes,
            };
        }
        if (ref.kind === "single") {
            const thought = generateThinkingProcess({
                userMessage: message,
                intentKind: "single",
                current,
                merged,
                catalog,
                selectedBikes: [ref.bikes[0]],
                attribute: ref.attribute,
            });
            const done = singleVerdict(
                ref.bikes[0],
                ref.attribute,
                merged.aspects
            );
            return { ...done, thought };
        }
        if (ref.kind === "aspect") {
            const thought = generateThinkingProcess({
                userMessage: message,
                intentKind: "aspect",
                current,
                merged,
                catalog,
                selectedBikes: ref.bikes,
                attribute: ref.attribute,
            });
            const res = aspectAnswer(ref.bikes, ref.attribute);
            return { ...res, thought };
        }
    }

    // 5. TECHNICAL & APPLICATION KNOWLEDGE HANDLER
    // Directly answers technical concepts (ABS, Slipper Clutch, Cooling, CC, Torque vs Power, EV vs Petrol, Maintenance)
    // and MOTOAI platform features (tokens, comparison tool, cost calculator, test rides) with real showroom bike ties.
    const knowledgeResponse = findKnowledgeResponse(message, currentText, catalog);
    if (knowledgeResponse) {
        return knowledgeResponse;
    }

    // 6. GENERAL MOTORCYCLE ADVICE HANDLER
    // Handles broader motorcycling queries (gear, engine break-in, traction control, suspensions) with expert advice & bikes
    const generalAdvice = handleGeneralMotorcycleAdvice(message, currentText, catalog);
    if (generalAdvice) {
        return generalAdvice;
    }

    // Off-topic guard: strictly for non-motorcycle queries
    if (
        !merged.hasMotoSignal &&
        !merged.budget &&
        merged.names.length === 0 &&
        merged.brands.length === 0 &&
        !merged.category &&
        !merged.fuel
    ) {
        const thought = generateThinkingProcess({
            userMessage: message,
            intentKind: "offtopic",
            current,
            merged,
            catalog,
        });
        return {
            thought,
            reply: "I am **MotoMind**, your dedicated motorcycle and MOTOAI platform advisor 🏍️.\n\nI specialize in two-wheelers, comparisons, technical advice, and platform tools. Here are a few things you can ask me:\n\n- ⚡ *'What is the difference between single and dual channel ABS?'*\n- 🛵 *'Show me the best electric bikes under ₹1.5 lakh'*\n- 🏁 *'Compare Royal Enfield Hunter 350 vs Classic 350'*\n- ⚙️ *'How does an assist and slipper clutch work?'*\n- 🪙 *'How do AI tokens work on MOTOAI?'*",
            recommendations: [],
        };
    }

    // Named-but-missing models must be reported, never invented.
    const vocab = new Set();
    catalog.forEach((b) => {
        `${b.brand} ${b.name}`
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .forEach((w) => {
                if (w.length > 2) vocab.add(w);
            });
    });
    const missingNames = [];
    const modelMentions = currentText.match(
        /\b([a-z]+(?:\s+[a-z0-9]+){0,2}\s+\d{2,4})\b/g
    );
    if (!ref && modelMentions && current.names.length === 0) {
        modelMentions.forEach((raw) => {
            const words = raw.trim().split(/\s+/);
            const anchor = words.findIndex((w) => vocab.has(w));
            if (anchor === -1) return;
            const mention = words.slice(anchor).join(" ");
            const inCatalog = catalog.some((b) =>
                `${b.brand} ${b.name}`.toLowerCase().includes(mention)
            );
            if (!inCatalog && !missingNames.includes(mention)) {
                missingNames.push(mention);
            }
        });
    }

    // COMPARISON intent
    // Explicit comparison intent only: never trigger if user asked to exclude bikes or requested alternatives
    const isExplicitCompare =
        (current.compareWords || (merged.compareWords && current.names.length >= 2)) &&
        current.exclusions.names.length === 0 &&
        !current.exclusions.wantsAlternatives;

    if (isExplicitCompare && (current.names.length >= 2 || (current.names.length === 1 && current.compareWords))) {
        let set = current.names.slice(0, 3);
        if (set.length === 1) {
            const other = catalog
                .filter((b) => String(b._id) !== String(set[0]._id))
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
            if (other) set.push(other);
        }
        if (set.length >= 2) {
            const thought = generateThinkingProcess({
                userMessage: message,
                intentKind: "comparison",
                current,
                merged,
                catalog,
                compareBikes: set,
            });
            return {
                thought,
                reply: compareReply(set),
                recommendations: set.slice(0, 3),
            };
        }
    }

    // SINGLE named bike (no comparison): detailed expert profile
    if (current.names.length === 1 && !merged.compareWords) {
        const bike = current.names[0];
        const ev = isEV(bike);
        const L = [];
        L.push(`### 🏍️ ${bike.brand} ${bike.name}`);
        L.push("");
        L.push("**🏍️ Bike Overview**");
        L.push("");
        L.push(`- Name: ${bike.brand} ${bike.name}`);
        L.push(`- Brand: ${bike.brand}`);
        L.push(`- Category: ${bike.category || "Not available"}`);
        L.push(`- Price: ${inr(bike.price)}`);
        L.push(`- Fuel: ${bike.fuel || "Not available"}`);
        L.push("");
        L.push("**⚙️ Performance**");
        L.push("");
        if (ev) {
            L.push(
                `- Battery: ${bike.batteryCapacity ? `${bike.batteryCapacity} kWh` : "Not available"}`
            );
        } else {
            L.push(
                `- Engine: ${bike.engine ? `${bike.engine} CC` : "Not available"}`
            );
        }
        L.push(
            `- Power: ${bike.power ? `${bike.power} HP` : "Not available"}`
        );
        L.push(
            `- Torque: ${bike.torque ? `${bike.torque} Nm` : "Not available"}`
        );
        L.push(
            `- Top Speed: ${bike.topSpeed ? `${bike.topSpeed} km/h` : "Not available"}`
        );
        L.push(
            `- Transmission: ${bike.transmission || "Not available"}`
        );
        L.push("");
        L.push("**⛽ Efficiency / Range**");
        L.push("");
        if (ev) {
            L.push(
                `- Range: ${bike.range ? `${bike.range} km` : "Not available"}`
            );
        } else {
            L.push(
                `- Mileage: ${bike.mileage ? `${bike.mileage} km/l` : "Not available"}`
            );
        }
        L.push("");
        L.push("**📏 Practical Details**");
        L.push("");
        L.push(
            `- Weight: ${bike.weight ? `${bike.weight} kg` : "Not available"}`
        );
        if (ev) {
            L.push(
                `- Charging Time: ${bike.chargingTime ? `${bike.chargingTime} hours` : "Not available"}`
            );
        }
        const desc = String(bike.description || "").trim().slice(0, 200);
        if (desc) L.push(`- About: ${desc}`);
        L.push("");
        L.push("**⭐ Rating**");
        L.push("");
        L.push(
            `- ${bike.rating != null ? `⭐ ${bike.rating}/5` : "Not available"}`
        );
        L.push("");
        L.push("**🤖 MOTOAI Insight**");
        L.push("");
        const aspectWord =
            current.aspects.length > 0 ? current.aspects[0] : null;
        L.push(
            aspectWord
                ? `For ${aspectWord}, note: ${whyLine(bike, current.aspects) || "it matches your requirements"}.`
                : `A ${bike.category || "motorcycle"} at ${inr(bike.price)} suited to riders who value ${ev ? "electric running and city practicality" : "proven petrol performance"}.`
        );
        const thought = generateThinkingProcess({
            userMessage: message,
            intentKind: "single",
            current,
            merged,
            catalog,
            selectedBikes: [bike],
        });
        return {
            thought,
            reply: L.join("\n"),
            recommendations: [bike],
        };
    }

    // Missing model report
    if (missingNames.length > 0 && current.names.length === 0) {
        const alts = [...catalog]
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 2);
        const thought = generateThinkingProcess({
            userMessage: message,
            intentKind: "notfound",
            missingName: missingNames[0],
            current,
            merged,
            catalog,
            selectedBikes: alts,
        });
        return {
            thought,
            reply: `I couldn't find "${missingNames[0]}" in our showroom, so I won't guess its specs. Here are our highest-rated alternatives instead: ${alts.map((b) => `${b.brand} ${b.name}`).join(", ")}.`,
            recommendations: alts,
        };
    }

    // FILTERED search (budget/fuel/category/brand from message + history)
    let pool = [...catalog];

    // 1. Exclude explicitly named bikes (e.g. "other than s1 pro and iqube")
    const excludedBikeIds = new Set([
        ...merged.excludedNames.map((b) => String(b._id)),
        ...current.exclusions.names.map((b) => String(b._id)),
    ]);
    if (excludedBikeIds.size > 0) {
        pool = pool.filter((b) => !excludedBikeIds.has(String(b._id)));
    }

    // 2. Exclude explicitly named brands (e.g. "not KTM")
    const excludedBrandNames = new Set([
        ...merged.excludedBrands.map((b) => b.toLowerCase()),
        ...current.exclusions.brands.map((b) => b.toLowerCase()),
    ]);
    if (excludedBrandNames.size > 0) {
        pool = pool.filter((b) => !excludedBrandNames.has(String(b.brand).toLowerCase()));
    }

    // 3. Prevent regurgitation when user asks generically for "other options" / "what else" / "something else"
    // (Only apply anti-regurgitation if user didn't specify exact model exclusions)
    if (
        (current.exclusions.wantsAlternatives || merged.wantsAlternatives) &&
        current.exclusions.names.length === 0 &&
        merged.excludedNames.length === 0
    ) {
        const prevDiscussedIds = new Set(allDiscussed.map((b) => String(b._id)));
        const freshPool = pool.filter((b) => !prevDiscussedIds.has(String(b._id)));
        if (freshPool.length > 0) {
            pool = freshPool;
        }
    }

    if (merged.budget)
        pool = pool.filter((b) => Number(b.price) <= merged.budget);
    if (merged.fuel === "electric") pool = pool.filter((b) => isEV(b));
    if (merged.fuel === "petrol") pool = pool.filter((b) => !isEV(b));
    if (merged.category) {
        pool = pool.filter((b) => {
            const c = String(b.category || "").toLowerCase();
            if (merged.category === "sports")
                return c === "sports" || c === "sport";
            return c === merged.category;
        });
    }
    if (merged.brands.length > 0 && current.names.length === 0) {
        pool = pool.filter((b) =>
            merged.brands.some(
                (brand) =>
                    String(b.brand).toLowerCase() ===
                    String(brand).toLowerCase()
            )
        );
    }
    if (current.names.length > 0 && !merged.compareWords && current.exclusions.names.length === 0) {
        const ids = new Set(current.names.map((b) => String(b._id)));
        const named = pool.filter((b) => ids.has(String(b._id)));
        if (named.length > 0) pool = named;
    }

    // Smart multi-criteria ranking
    pool.sort((x, y) => calculateMatchScore(y, merged) - calculateMatchScore(x, merged));
    const results = pool.slice(0, 3);

    const thought = generateThinkingProcess({
        userMessage: message,
        intentKind: "recommendation",
        current,
        merged,
        catalog,
        filteredPool: pool,
        selectedBikes: results,
    });

    if (results.length === 0) {
        return {
            thought,
            reply: "### 🔎 No Exact Match Found\n\nI couldn't find a motorcycle in the current MOTOAI database that matches your exact criteria.\n\n- Try relaxing budget limits\n- Remove negative brand or model exclusions\n- Consider an alternate fuel or category type",
            recommendations: [],
        };
    }

    // Structured markdown reply
    const reqBits = [];
    if (merged.budget) reqBits.push(`budget ${inr(merged.budget)}`);
    if (
        merged.category &&
        merged.category !== merged.fuel
    )
        reqBits.push(merged.category);
    if (merged.fuel) reqBits.push(merged.fuel);
    if (merged.brands.length > 0) reqBits.push(merged.brands.join(", "));
    if (merged.dailyKm) reqBits.push(`${merged.dailyKm} km daily ride`);
    if (merged.aspects.length > 0) reqBits.push(merged.aspects.join(", "));

    const exclusionsSummary = [];
    if (excludedBikeIds.size > 0) {
        const names = [...merged.excludedNames, ...current.exclusions.names].map((b) => `${b.brand} ${b.name}`);
        const uniqueNames = [...new Set(names)];
        exclusionsSummary.push(`excluding ${uniqueNames.join(", ")}`);
    }
    if (excludedBrandNames.size > 0) {
        const uniqueBrands = [...new Set([...merged.excludedBrands, ...current.exclusions.brands])];
        exclusionsSummary.push(`excluding ${uniqueBrands.join(", ")}`);
    }
    if (exclusionsSummary.length > 0) {
        reqBits.push(`${exclusionsSummary.join(" • ")}`);
    }

    const bikeBlock = (b, i) => {
        const specLines = isEV(b)
            ? [
                  `**Battery:** ${b.batteryCapacity ? `${b.batteryCapacity} kWh` : "Not available"}`,
                  `**Range:** ${b.range ? `${b.range} km` : "Not available"}`,
                  `**Charging:** ${b.chargingTime ? `${b.chargingTime} hours` : "Not available"}`,
              ]
            : [
                  `**Engine:** ${b.engine ? `${b.engine} CC` : "Not available"}`,
                  `**Mileage:** ${b.mileage ? `${b.mileage} km/l` : "Not available"}`,
              ];
        return [
            `**${i + 1}. ${b.brand} ${b.name}**`,
            `**Brand:** ${b.brand}`,
            `**Price:** ${inr(b.price)}`,
            `**Category:** ${b.category || "Not available"}`,
            `**Fuel:** ${b.fuel || "Not available"}`,
            ...specLines,
            `**Power:** ${b.power ? `${b.power} HP` : "Not available"}`,
            `**Rating:** ⭐ ${b.rating != null ? b.rating : "Not available"}/5`,
            "",
            `**Why it suits you:** ${whyLine(b, merged.aspects) || "Matches your requirements."}`,
        ].join("\n");
    };

    const parts = [
        "### 🏍️ MOTOAI Recommendation",
        "",
        "**Based on your requirements:**",
        reqBits.length > 0 ? reqBits.join(" • ") : "best overall matches",
        "",
        "### ⭐ Recommended Motorcycles",
        "",
        results.map((b, i) => bikeBlock(b, i)).join("\n\n"),
    ];

    const byPrice = [...results].sort((a, b) => a.price - b.price);
    const byRating = [...results].sort(
        (a, b) => (b.rating || 0) - (a.rating || 0)
    );
    let insight = `${byRating[0].brand} ${byRating[0].name} is the highest rated at ${byRating[0].rating}/5.`;
    if (excludedBikeIds.size > 0 || excludedBrandNames.size > 0) {
        insight = `Filtered out previously mentioned models per your request. ` + insight;
    }
    if (merged.dailyKm) {
        const top = results[0];
        const cost = monthlyCostOf(top, merged.dailyKm);
        const basis = isEV(top)
            ? top.range
                ? `${top.range} km range`
                : "its electric range"
            : top.mileage
              ? `${top.mileage} km/l mileage`
              : "its mileage";
        insight += ` For your ${merged.dailyKm} km daily ride, the ${top.brand} ${top.name} (${basis}) would cost about ${cost != null ? inr(Math.round(cost)) : "an estimated amount"} per month in fuel (assumes standard fuel prices).`;
    } else if (byPrice.length > 1) {
        insight = `${byPrice[0].brand} ${byPrice[0].name} is the most affordable at ${inr(byPrice[0].price)}. ` + insight;
    }
    parts.push("", "### 💡 MOTOAI Insight", "", insight);

    parts.push(
        "",
        "### 👉 Next Step",
        "",
        "**Would you like me to compare these motorcycles in detail?**"
    );

    return { thought, reply: parts.join("\n"), recommendations: results };
};

// Keep only the latest turns for the AI context window.
// Recommendation ids ride along (stripped before the AI call)
// so follow-ups like "the first two" can resolve server-side.
const MAX_RECENT_TURNS = 6;

const sanitizeHistory = (conversation) =>
    Array.isArray(conversation)
        ? conversation
              .filter(
                  (m) =>
                      m &&
                      typeof m.content === "string" &&
                      (m.role === "user" || m.role === "assistant")
              )
              .slice(-MAX_HISTORY)
              .map((m) => ({
                  role: m.role,
                  content: m.content.slice(0, 500),
                  ...(Array.isArray(m.recommendations)
                      ? { recommendations: m.recommendations }
                      : {}),
              }))
        : [];

// Persistent rider context + discussed bikes, injected ahead of
// the recent turns so long chats stay cheap yet continuous.
const buildContextSummary = (history, catalog) => {
    const usersOnly = history.filter((m) => m.role === "user");
    if (usersOnly.length === 0) return "";
    const merged = mergeConstraints(usersOnly, catalog);
    const bits = [];
    if (merged.budget) bits.push(`Budget: ${inr(merged.budget)}`);
    if (merged.fuel) bits.push(`Fuel: ${merged.fuel}`);
    if (merged.category) bits.push(`Category: ${merged.category}`);
    if (merged.brands.length > 0)
        bits.push(`Brands: ${merged.brands.join(", ")}`);
    if (merged.dailyKm)
        bits.push(`Daily distance: ${merged.dailyKm} km`);
    if (merged.aspects.length > 0)
        bits.push(`Interests: ${merged.aspects.join(", ")}`);
    const sets = discussedSets(history, catalog);
    if (sets.length > 0) {
        const last = sets[sets.length - 1];
        bits.push(
            `Discussed: ${last.map((b) => `${b.brand} ${b.name}`).join(", ")}`
        );
    }
    if (bits.length === 0) return "";
    return `Ongoing rider context (persists unless the latest message contradicts it): ${bits.join(" | ")}.`;
};

/*
========================================
Reusable answer generator.
Loads the live catalog, tries the AI API,
falls back to the local intent engine.
Returns { reply, recommendations }.
Throws { statusCode, message } on fatal errors.
========================================
*/
const generateAdvisorReply = async (message, history = []) => {
    const text = String(message || "").trim();

    if (!text) {
        const err = new Error("Please type a message.");
        err.statusCode = 400;
        throw err;
    }

    if (text.length > 1000) {
        const err = new Error(
            "Message is too long. Keep it under 1000 characters."
        );
        err.statusCode = 400;
        throw err;
    }

    // Live catalog from MongoDB (never hardcoded)
    let catalog;
    try {
        catalog = await Motorcycle.find({})
            .select(
                "name brand brandLogo category price engine power torque mileage fuel transmission weight batteryCapacity range chargingTime topSpeed rating image description"
            )
            .lean()
            .limit(40);
    } catch (dbError) {
        console.error("AI Advisor DB error:", dbError.message);
        const err = new Error("AI Advisor is temporarily unavailable.");
        err.statusCode = 503;
        throw err;
    }

    if (!catalog || catalog.length === 0) {
        return withUsage(text, cleanHistory, {
            reply: "Our showroom is currently empty. Please check back after motorcycles are added.",
            recommendations: [],
        });
    }

    const cleanHistory = sanitizeHistory(history);

    // Aspects for card reasons (latest preferences win)
    let reasonAspects = [];
    try {
        reasonAspects = mergeConstraints(
            [...cleanHistory, { role: "user", content: text }],
            catalog
        ).aspects;
    } catch (e) {
        reasonAspects = [];
    }

    // Smart context: persistent summary + recent turns only.
    // Strips recommendation payloads before the AI call.
    const contextSummary = buildContextSummary(cleanHistory, catalog);
    const recentTurns = cleanHistory.slice(-MAX_RECENT_TURNS).map(
        ({ role, content }) => ({ role, content })
    );

    const apiKey = process.env.AI_API_KEY;
    const apiUrl =
        process.env.AI_API_URL ||
        "https://integrate.api.nvidia.com/v1/chat/completions";
    const model = process.env.AI_MODEL || "nvidia/nemotron-3-ultra-550b-a55b";

    // No key configured → local engine (still helpful, still DB-driven)
    if (!apiKey) {
        console.warn("AI_API_KEY missing — using local intent engine.");
        return withUsage(
            text,
            cleanHistory,
            attachReasons(
                localRecommend(text, catalog, cleanHistory),
                reasonAspects
            )
        );
    }

    const catalogText = catalog.map(describeBike).join("\n");

    const callAI = async () => {
        const controller = new AbortController();
        const timeout = setTimeout(
            () => controller.abort(),
            AI_TIMEOUT_MS
        );
        try {
            const aiRes = await fetch(apiUrl, {
                method: "POST",
                signal: controller.signal,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    temperature: 0.4,
                    max_tokens: 600,
                    messages: [
                        {
                            role: "system",
                            content: `${SYSTEM_PROMPT}\n\nMotorcycle catalog:\n${catalogText}`,
                        },
                        ...(contextSummary
                            ? [
                                  {
                                      role: "system",
                                      content: contextSummary,
                                  },
                              ]
                            : []),
                        ...recentTurns,
                        { role: "user", content: text },
                    ],
                }),
            });
            if (!aiRes.ok) {
                throw new Error(
                    `AI provider responded ${aiRes.status}`
                );
            }
            return await aiRes.json();
        } finally {
            clearTimeout(timeout);
        }
    };

    try {
        let aiData;
        try {
            aiData = await callAI();
        } catch (firstError) {
            // One retry on transient timeouts before falling back,
            // so slow responses don't silently become templates.
            if (firstError.name !== "AbortError") throw firstError;
            console.warn("AI request timed out — retrying once.");
            aiData = await callAI();
        }
        const rawText =
            aiData?.choices?.[0]?.message?.content || "";
        const parsed = extractJson(rawText);

            if (parsed && parsed.reply) {
                const docs = mapToDocs(parsed.recommendations, catalog);
                // Safety net: if the model named nothing mappable,
                // fill from the local engine so cards still show.
                const extra =
                    docs.length === 0
                        ? localRecommend(text, catalog, cleanHistory)
                              .recommendations
                        : [];
                const selectedDocs = [...docs, ...extra].slice(0, 3);
                const thought =
                    parsed.thought ||
                    generateThinkingProcess({
                        userMessage: text,
                        intentKind: "recommendation",
                        current: extractFromMessage(text.toLowerCase(), catalog),
                        merged: mergeConstraints(cleanHistory, catalog),
                        catalog,
                        selectedBikes: selectedDocs,
                    });
                return withUsage(
                    text,
                    cleanHistory,
                    attachReasons(
                        {
                            thought,
                            reply: String(parsed.reply).slice(0, 4000),
                            recommendations: selectedDocs,
                        },
                        reasonAspects
                    )
                );
            }

            throw new Error("Invalid AI response format");
        } catch (aiError) {
            // Never leak provider details or keys to the frontend
            console.error(
                "AI provider error:",
                aiError.name === "AbortError"
                    ? "timeout"
                    : aiError.message
            );
            return withUsage(
                text,
                cleanHistory,
                attachReasons(
                    localRecommend(text, catalog, cleanHistory),
                    reasonAspects
                )
            );
        }
};

// =====================================================
// POST /api/ai-advisor/chat (login + tokens required)
// =====================================================
const chat = async (req, res) => {
    try {
        const { message, conversation } = req.body;

        // Subscription + token gate (route is behind `protect`,
        // so req.user is the JWT-verified user)
        await effectivePlan(req.user);
        const blocked = tokenGate(req.user);
        if (blocked) {
            return res.status(blocked.status).json(blocked.body);
        }

        const result = await generateAdvisorReply(
            message,
            conversation
        );

        // Deduct context-based credits — only after success
        const charge = result.tokensCharged || 1;
        const { user: walletUser } = await deductToken(
            req.user._id,
            charge
        );

        return res.status(200).json({
            success: true,
            ...result,
            tokensCharged: charge,
            wallet: walletUser
                ? walletOf(walletUser)
                : walletOf(req.user),
        });
    } catch (error) {
        console.error("AI Advisor error:", error.message);
        const status = error.statusCode || 500;
        return res.status(status).json({
            success: false,
            message:
                error.statusCode === 400
                    ? error.message
                    : "AI Advisor is temporarily unavailable.",
        });
    }
};

module.exports = {
    chat,
    generateAdvisorReply,
    _localRecommend: localRecommend,
    _parseBudget: parseBudget,
};
