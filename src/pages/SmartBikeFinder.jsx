import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Bike,
    IndianRupee,
    MapPin,
    Gauge,
    Fuel,
    Users,
    Shield,
    Sparkles,
    ChevronRight,
    Star,
    Zap,
    RefreshCw,
} from "lucide-react";
import Navbar from "../components/Navbar";

// =====================================================
// QUESTION STEPS
// =====================================================
const STEPS = [
    {
        id: "purpose",
        question: "What will you primarily use the motorcycle for?",
        subtitle: "Choose the option that best fits your main riding needs.",
        type: "single",
        options: [
            { value: "commuting", label: "Daily Commuting", icon: "🏙️", desc: "Office/college, city traffic" },
            { value: "touring", label: "Long-distance Touring", icon: "🛣️", desc: "Highway trips, exploration" },
            { value: "weekend", label: "Weekend Rides", icon: "🏍️", desc: "Leisure, spirited riding" },
            { value: "sports", label: "Performance / Track", icon: "🏁", desc: "Speed, sportbike experience" },
            { value: "offroad", label: "Off-road / Adventure", icon: "🏔️", desc: "Rough terrain, dual-sport" },
        ],
    },
    {
        id: "budget",
        question: "What is your budget?",
        subtitle: "Include on-road price (ex-showroom + taxes + registration).",
        type: "single",
        options: [
            { value: "under_1l", label: "Under ₹1 Lakh", icon: "💰", desc: "Entry-level segment" },
            { value: "1l_2l", label: "₹1 – ₹2 Lakh", icon: "💰", desc: "Most popular range" },
            { value: "2l_3l", label: "₹2 – ₹3 Lakh", icon: "💰", desc: "Mid-premium" },
            { value: "3l_5l", label: "₹3 – ₹5 Lakh", icon: "💰", desc: "Premium segment" },
            { value: "above_5l", label: "Above ₹5 Lakh", icon: "💎", desc: "Superbikes & premium ADVs" },
        ],
    },
    {
        id: "experience",
        question: "What is your riding experience?",
        subtitle: "This helps us recommend bikes with the right power level.",
        type: "single",
        options: [
            { value: "beginner", label: "Beginner", icon: "🌱", desc: "First bike or less than 1 year" },
            { value: "intermediate", label: "Intermediate", icon: "🏍️", desc: "1–4 years, comfortable on roads" },
            { value: "experienced", label: "Experienced", icon: "⚡", desc: "5+ years, confident rider" },
            { value: "expert", label: "Expert / Enthusiast", icon: "🏁", desc: "Track days, upgrades, etc." },
        ],
    },
    {
        id: "priority",
        question: "What matters most to you in a motorcycle?",
        subtitle: "Select up to 3 priorities.",
        type: "multi",
        max: 3,
        options: [
            { value: "mileage", label: "Fuel Efficiency", icon: "⛽", desc: "Maximum km per litre" },
            { value: "power", label: "Performance", icon: "🔥", desc: "High power & acceleration" },
            { value: "comfort", label: "Ride Comfort", icon: "💺", desc: "Ergonomics & long-ride comfort" },
            { value: "reliability", label: "Reliability", icon: "🛡️", desc: "Low maintenance, proven engine" },
            { value: "looks", label: "Style & Looks", icon: "✨", desc: "Head-turning design" },
            { value: "tech", label: "Technology", icon: "📱", desc: "TFT, connectivity, ABS, traction" },
        ],
    },
    {
        id: "fuel",
        question: "Do you have a preference for fuel type?",
        subtitle: "Electric bikes have zero running costs but limited range.",
        type: "single",
        options: [
            { value: "petrol", label: "Petrol", icon: "⛽", desc: "Widest availability, proven" },
            { value: "electric", label: "Electric", icon: "⚡", desc: "Zero fuel cost, eco-friendly" },
            { value: "no_pref", label: "No Preference", icon: "🔄", desc: "Open to both" },
        ],
    },
    {
        id: "daily_distance",
        question: "How much do you ride daily on average?",
        subtitle: "This helps estimate fuel/charging costs.",
        type: "single",
        options: [
            { value: "lt30", label: "Less than 30 km", icon: "🏠", desc: "Short neighbourhood trips" },
            { value: "30_60", label: "30 – 60 km", icon: "🏙️", desc: "Standard city commute" },
            { value: "60_100", label: "60 – 100 km", icon: "🛣️", desc: "Extended city / intercity" },
            { value: "gt100", label: "100+ km", icon: "🗺️", desc: "Long-haul daily rider" },
        ],
    },
];

// =====================================================
// BUDGET RANGE HELPER
// =====================================================
const BUDGET_MAP = {
    under_1l:  { min: 0,      max: 100000 },
    "1l_2l":   { min: 100000, max: 200000 },
    "2l_3l":   { min: 200000, max: 300000 },
    "3l_5l":   { min: 300000, max: 500000 },
    above_5l:  { min: 500000, max: 99999999 },
};

const PURPOSE_CATEGORY = {
    commuting: ["Commuter", "Street"],
    touring:   ["Cruiser", "Adventure"],
    weekend:   ["Sports", "Cruiser", "Roadster"],
    sports:    ["Sports"],
    offroad:   ["Adventure"],
};

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function SmartBikeFinder() {
    const navigate = useNavigate();

    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [results, setResults] = useState(null);
    const [loadingResults, setLoadingResults] = useState(false);

    const current = STEPS[step];
    const isLast = step === STEPS.length - 1;
    const progress = ((step) / STEPS.length) * 100;

    // =====================================================
    // ANSWER SELECTION
    // =====================================================
    const select = (value) => {
        if (current.type === "multi") {
            const existing = answers[current.id] || [];
            if (existing.includes(value)) {
                setAnswers({ ...answers, [current.id]: existing.filter((v) => v !== value) });
            } else if (existing.length < (current.max || 99)) {
                setAnswers({ ...answers, [current.id]: [...existing, value] });
            }
        } else {
            setAnswers({ ...answers, [current.id]: value });
            // Auto-advance for single-select on next tick
            setTimeout(() => {
                if (!isLast) setStep((s) => s + 1);
            }, 220);
        }
    };

    const isSelected = (value) => {
        const ans = answers[current.id];
        if (current.type === "multi") return Array.isArray(ans) && ans.includes(value);
        return ans === value;
    };

    const canProceed = () => {
        const ans = answers[current.id];
        if (!ans) return false;
        if (current.type === "multi") return Array.isArray(ans) && ans.length > 0;
        return true;
    };

    // =====================================================
    // FETCH RESULTS
    // =====================================================
    const fetchResults = async () => {
        setLoadingResults(true);
        try {
            const params = new URLSearchParams();

            const budget = BUDGET_MAP[answers.budget];
            if (budget) {
                if (budget.min > 0) params.set("minPrice", budget.min);
                params.set("maxPrice", budget.max);
            }

            const categories = PURPOSE_CATEGORY[answers.purpose];
            if (categories && categories.length === 1) {
                params.set("category", categories[0]);
            }

            if (answers.fuel === "electric") params.set("category", "Electric");
            if (answers.fuel === "petrol" && params.get("category") === "Electric") params.delete("category");

            const res = await fetch(
                `http://localhost:5000/api/motorcycles?${params.toString()}`
            );
            const data = await res.json();
            let bikes = data.motorcycles || [];

            // Client-side refine: filter by purpose categories if multiple
            if (categories && categories.length > 1 && answers.fuel !== "electric") {
                const filtered = bikes.filter((b) =>
                    categories.some((c) => b.category?.toLowerCase() === c.toLowerCase())
                );
                if (filtered.length > 0) bikes = filtered;
            }

            // Sort by priorities
            const prio = answers.priority || [];
            bikes = bikes.sort((a, b) => {
                let score = 0;
                if (prio.includes("mileage")) score += (b.mileage || 0) - (a.mileage || 0);
                if (prio.includes("power")) score += (b.power || 0) - (a.power || 0);
                if (prio.includes("reliability")) score += (b.rating || 0) - (a.rating || 0);
                return score;
            });

            setResults(bikes.slice(0, 6));
        } catch (err) {
            console.error("SmartBikeFinder fetch error:", err);
            setResults([]);
        } finally {
            setLoadingResults(false);
        }
    };

    const handleFinish = () => {
        fetchResults();
    };

    const askMotoMind = () => {
        const budget = answers.budget?.replace(/_/g, " ").replace("l", " lakh");
        const priorities = (answers.priority || []).join(", ");
        const prompt = `I am a ${answers.experience || "rider"} looking for a ${answers.purpose || "general"} motorcycle with a budget of ${budget}. I prioritise: ${priorities || "comfort and reliability"}. Fuel preference: ${answers.fuel || "no preference"}. I ride about ${answers.daily_distance || "30–60 km"}/day. Recommend the best motorcycles for me with a brief comparison.`;
        navigate("/ai-advisor", { state: { prefill: prompt } });
    };

    const resetFinder = () => {
        setAnswers({});
        setResults(null);
        setStep(0);
    };

    // =====================================================
    // RESULTS VIEW
    // =====================================================
    if (results !== null) {
        return (
            <div className="min-h-screen bg-[#070707] text-white">
                <Navbar />
                <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-black">Your Matched Bikes</h1>
                            <p className="text-zinc-400 mt-1">
                                {results.length > 0
                                    ? `Found ${results.length} bikes matching your preferences`
                                    : "No exact matches — try widening your criteria"}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={resetFinder}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold hover:border-orange-500/40 hover:text-orange-400 transition"
                            >
                                <RefreshCw size={15} />
                                Retake Quiz
                            </button>
                            <button
                                onClick={askMotoMind}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-sm transition shadow-lg shadow-orange-500/20"
                            >
                                <Sparkles size={15} />
                                Ask MotoMind
                            </button>
                        </div>
                    </div>

                    {/* MotoMind CTA Banner */}
                    <div className="mb-8 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                                <Sparkles size={20} className="text-orange-400" />
                            </div>
                            <div>
                                <p className="font-bold text-orange-400">Get a personalised AI recommendation</p>
                                <p className="text-sm text-zinc-400 mt-0.5">
                                    MotoMind can explain why each bike suits your riding profile and compare them in detail.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={askMotoMind}
                            className="shrink-0 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-sm transition"
                        >
                            Ask MotoMind →
                        </button>
                    </div>

                    {/* Results Grid */}
                    {loadingResults ? (
                        <div className="flex items-center justify-center py-24">
                            <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                        </div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-20">
                            <Bike size={48} className="mx-auto text-zinc-600 mb-4" />
                            <p className="text-zinc-400 text-lg">No bikes found for your exact criteria.</p>
                            <p className="text-zinc-500 text-sm mt-2">Try adjusting your budget or preferences.</p>
                            <button onClick={resetFinder} className="mt-6 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-sm transition">
                                Retake Quiz
                            </button>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {results.map((bike, i) => (
                                <BikeResultCard key={bike._id} bike={bike} rank={i + 1} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // =====================================================
    // QUIZ VIEW
    // =====================================================
    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar />
            <div className="max-w-2xl mx-auto px-5 sm:px-8 py-10">

                {/* Back button */}
                <button
                    onClick={() => step === 0 ? navigate(-1) : setStep((s) => s - 1)}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-8"
                >
                    <ArrowLeft size={17} />
                    {step === 0 ? "Back" : `Step ${step} of ${STEPS.length}`}
                </button>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-zinc-500 font-medium">
                            Question {step + 1} of {STEPS.length}
                        </span>
                        <span className="text-xs text-orange-400 font-bold">
                            {Math.round(progress)}%
                        </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-orange-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Question */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold mb-4">
                        <Bike size={13} />
                        Smart Bike Finder
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black">{current.question}</h2>
                    <p className="text-zinc-400 mt-2 text-sm">{current.subtitle}</p>
                    {current.type === "multi" && (
                        <p className="text-xs text-orange-400/80 mt-1.5">
                            Select up to {current.max} options
                        </p>
                    )}
                </div>

                {/* Options */}
                <div className="grid gap-3 mb-10">
                    {current.options.map((opt) => {
                        const selected = isSelected(opt.value);
                        return (
                            <button
                                key={opt.value}
                                id={`option-${current.id}-${opt.value}`}
                                onClick={() => select(opt.value)}
                                className={`
                                    flex items-center gap-4 p-4 rounded-2xl border text-left transition-all
                                    ${selected
                                        ? "border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10"
                                        : "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                                    }
                                `}
                            >
                                <div className={`
                                    w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0
                                    ${selected ? "bg-orange-500/20" : "bg-white/5"}
                                `}>
                                    {opt.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`font-bold text-sm ${selected ? "text-orange-400" : "text-white"}`}>
                                        {opt.label}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-0.5">{opt.desc}</p>
                                </div>
                                {selected && (
                                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                                        <Check size={13} className="text-black" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Navigation */}
                {(current.type === "multi" || isLast) && (
                    <button
                        disabled={!canProceed()}
                        onClick={() => {
                            if (isLast) handleFinish();
                            else setStep((s) => s + 1);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-base transition shadow-lg shadow-orange-500/20"
                    >
                        {isLast ? (
                            <>
                                <Sparkles size={18} />
                                Find My Bikes
                            </>
                        ) : (
                            <>
                                Continue
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

// =====================================================
// BIKE RESULT CARD
// =====================================================
function BikeResultCard({ bike, rank }) {
    const navigate = useNavigate();
    const img = bike.images?.[0]?.url || bike.image || null;

    return (
        <div
            onClick={() => navigate(`/motorcycles/${bike._id}`)}
            className="group relative bg-[#111] border border-white/8 rounded-2xl overflow-hidden cursor-pointer hover:border-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/5"
        >
            {/* Rank badge */}
            {rank <= 3 && (
                <div className={`
                    absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-xs font-black border
                    ${rank === 1 ? "bg-amber-500/20 border-amber-500/40 text-amber-400" :
                      rank === 2 ? "bg-zinc-400/20 border-zinc-400/30 text-zinc-300" :
                      "bg-orange-700/20 border-orange-700/30 text-orange-500"}
                `}>
                    #{rank} Match
                </div>
            )}

            {/* Image */}
            <div className="aspect-[16/9] bg-[#0d0d0d] overflow-hidden">
                {img ? (
                    <img
                        src={img}
                        alt={bike.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Bike size={40} className="text-zinc-700" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-4">
                <p className="text-xs text-orange-500 font-semibold uppercase tracking-wider mb-1">
                    {bike.brand}
                </p>
                <h3 className="font-black text-base leading-tight">{bike.name}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs text-zinc-400">{bike.rating ?? "N/A"}</span>
                    <span className="text-zinc-700">•</span>
                    <span className="text-xs text-zinc-500">{bike.category}</span>
                </div>

                <div className="flex items-center justify-between mt-3">
                    <p className="font-black text-lg">₹{Number(bike.price || 0).toLocaleString("en-IN")}</p>
                    {bike.mileage > 0 && (
                        <span className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded-lg">
                            {bike.mileage} km/l
                        </span>
                    )}
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs text-orange-400 font-semibold group-hover:gap-2.5 transition-all">
                    View Details
                    <ChevronRight size={14} />
                </div>
            </div>
        </div>
    );
}
