import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    BookOpen,
    Zap,
    Fuel,
    Shield,
    Gauge,
    Wrench,
    ChevronRight,
    Check,
    X,
    ArrowLeft,
    ArrowRight,
    Star,
    Trophy,
    Clock,
    Sparkles,
} from "lucide-react";
import Navbar from "../components/Navbar";

// =====================================================
// LEARNING MODULES
// =====================================================
const MODULES = [
    {
        id: "engine-basics",
        icon: Gauge,
        color: "orange",
        title: "Engine Basics",
        duration: "5 min",
        level: "Beginner",
        summary: "Understand how a motorcycle engine works — cc, cylinders, power, and torque.",
        content: [
            {
                heading: "What does engine capacity (cc) mean?",
                text: `Engine displacement, measured in cubic centimetres (cc), is the total volume swept by the pistons in one complete cycle. A larger cc generally means more power and torque, but also higher fuel consumption and cost.

Examples:
• 100–150 cc — Commuters (Honda CB Shine, Bajaj Pulsar 125)
• 150–250 cc — Mid-range (KTM Duke 200, Yamaha FZ25)
• 250–500 cc — Performance (Royal Enfield Meteor 350, KTM Duke 390)
• 500cc+ — Superbikes and large ADVs`,
            },
            {
                heading: "Power vs Torque — What's the difference?",
                text: `Power (bhp or hp) tells you the top-end performance — how fast the bike can go. Torque (Nm) tells you pull or grunt — how effortlessly the bike accelerates from low speeds.

A commuter needs strong low-end torque (for city traffic), while a sportbike prioritizes peak power for highway performance.`,
            },
            {
                heading: "Single vs Multi-cylinder engines",
                text: `Single-cylinder engines are simpler, cheaper to maintain, and fuel efficient. They're ideal for commuters and beginner riders.

Twin-cylinder engines offer smoother power delivery and higher performance. They're common in mid-range and premium bikes. Inline-4 engines, found in superbikes, produce exceptional power but require more maintenance.`,
            },
        ],
        quiz: [
            {
                q: "What does 'cc' stand for in engine specifications?",
                options: ["Cubic Centimetres", "Cooling Capacity", "Cycle Count", "Compression Coefficient"],
                answer: 0,
            },
            {
                q: "Which measurement tells you how well a bike pulls from low speeds?",
                options: ["Top Speed", "Power (bhp)", "Torque (Nm)", "Mileage"],
                answer: 2,
            },
            {
                q: "Which engine type is most fuel efficient?",
                options: ["Inline-4", "V-twin", "Single cylinder", "Parallel-twin"],
                answer: 2,
            },
        ],
    },
    {
        id: "fuel-efficiency",
        icon: Fuel,
        color: "green",
        title: "Fuel Efficiency",
        duration: "4 min",
        level: "Beginner",
        summary: "Learn what affects real-world mileage and how to get the most from every litre.",
        content: [
            {
                heading: "Claimed vs Real-world Mileage",
                text: `Manufacturers test mileage under ideal conditions (steady speed, minimal load, smooth roads). Real-world mileage is typically 15–25% lower due to city traffic, traffic lights, varied speeds, and wind resistance.

Always use real-world owner reports rather than claimed figures for decision-making.`,
            },
            {
                heading: "Factors That Affect Mileage",
                text: `• Riding style — Aggressive acceleration and braking reduce mileage significantly
• Tyre pressure — Under-inflated tyres increase rolling resistance
• Maintenance — Dirty air filter, worn spark plug, or old engine oil hurt mileage
• Speed — Mileage peaks at 50–70 km/h for most bikes
• Load — Carrying a pillion or heavy luggage reduces mileage`,
            },
            {
                heading: "EV Range — How is it different?",
                text: `Electric bikes list range per charge. Like ICE mileage, EV range drops in real use — city range is usually 70–80% of claimed range due to frequent braking, AC accessories, and battery temperature.

The cost per km for an EV is much lower: approximately ₹0.50–1.00/km vs ₹3–5/km for petrol bikes.`,
            },
        ],
        quiz: [
            {
                q: "Why is real-world mileage lower than claimed mileage?",
                options: [
                    "Manufacturers lie about specs",
                    "Tests are done under ideal conditions",
                    "Indian roads are worse",
                    "Fuel quality is different",
                ],
                answer: 1,
            },
            {
                q: "Which riding speed typically gives the best fuel efficiency?",
                options: ["30–40 km/h", "50–70 km/h", "80–100 km/h", "Above 100 km/h"],
                answer: 1,
            },
            {
                q: "What does under-inflated tyre pressure cause?",
                options: ["Better grip", "Lower fuel efficiency", "Better mileage", "Smoother ride"],
                answer: 1,
            },
        ],
    },
    {
        id: "safety-features",
        icon: Shield,
        color: "blue",
        title: "Safety Features",
        duration: "6 min",
        level: "Intermediate",
        summary: "Understand ABS, traction control, ride modes, and what makes a safe motorcycle.",
        content: [
            {
                heading: "ABS — Anti-lock Braking System",
                text: `ABS prevents wheels from locking up during hard braking. Without ABS, a locked front wheel causes loss of steering control and often a crash.

As of April 2019, ABS is mandatory for motorcycles above 125 cc in India. On lower-end bikes, Combined Braking System (CBS) is mandatory — it distributes braking force between front and rear.

Always choose ABS over CBS when your budget allows.`,
            },
            {
                heading: "Traction Control (TC)",
                text: `Traction control prevents the rear wheel from spinning on slippery surfaces during acceleration. It is especially useful on wet roads and gravel.

TC is common on mid-premium and performance bikes (Royal Enfield, KTM, BMW). It can typically be switched off for off-road riding.`,
            },
            {
                heading: "Ride Modes",
                text: `Ride modes (Rain, Road, Sport, Off-road) adjust throttle response, ABS sensitivity, and traction control aggressiveness. They allow one motorcycle to be tuned for different conditions.

Rain mode delivers softer throttle and more aggressive ABS/TC intervention. Sport mode allows higher slip angles and sharper throttle response.`,
            },
            {
                heading: "Other Safety Technologies",
                text: `• Slipper clutch — Prevents rear-wheel hop during aggressive downshifting
• Quickshifter — Allows clutchless upshifts for faster acceleration
• TFT with navigation — Reduces distraction vs phone mounts
• Cornering ABS — Adjusts brake force based on lean angle (high-end bikes)`,
            },
        ],
        quiz: [
            {
                q: "Above what engine size is ABS mandatory in India?",
                options: ["100 cc", "125 cc", "150 cc", "200 cc"],
                answer: 1,
            },
            {
                q: "What does traction control prevent?",
                options: ["Front wheel locking during braking", "Rear wheel spin during acceleration", "Engine overheating", "Battery discharge"],
                answer: 1,
            },
            {
                q: "What does a slipper clutch do?",
                options: [
                    "Makes shifting smoother in rain",
                    "Prevents rear-wheel hop during downshifting",
                    "Reduces fuel consumption",
                    "Controls traction in corners",
                ],
                answer: 1,
            },
        ],
    },
    {
        id: "ownership-costs",
        icon: Wrench,
        color: "amber",
        title: "Ownership Costs",
        duration: "5 min",
        level: "Beginner",
        summary: "Know the true cost of owning a motorcycle — beyond the ex-showroom price.",
        content: [
            {
                heading: "On-road Price vs Ex-showroom Price",
                text: `Ex-showroom price is the base price at the dealership. On-road price includes:
• GST (28% for motorcycles above 350cc, 28% below)
• Registration charges (~8–12% of ex-showroom)
• Road tax (varies by state)
• Insurance (1st year)
• Accessories / number plate

Expect on-road price to be 10–20% above ex-showroom, depending on your state.`,
            },
            {
                heading: "Annual Ownership Costs",
                text: `Beyond the purchase price, budget for:
• Fuel — Typically ₹3–6/km for petrol bikes, ₹0.5–1/km for EVs
• Insurance — ₹3,000–15,000/year depending on IDV and plan
• Servicing — ₹1,500–5,000 per service, typically every 3,000–6,000 km
• Consumables — Tyres every 15,000–25,000 km, chain every 20,000–30,000 km`,
            },
            {
                heading: "Depreciation",
                text: `Motorcycles depreciate quickly in the first 2–3 years:
• Year 1: ~25% drop in value
• Year 2: ~18% additional
• Year 3: ~15% additional

Popular models (Royal Enfield Bullet, Bajaj Pulsar, Hero Splendor) hold resale value better than niche or discontinued models.`,
            },
        ],
        quiz: [
            {
                q: "What does 'on-road price' include that ex-showroom does not?",
                options: ["EMI charges", "Registration, taxes, and insurance", "Accessories only", "Fuel for 1 year"],
                answer: 1,
            },
            {
                q: "Approximately how much do EVs cost per km to run?",
                options: ["₹3–5/km", "₹2–3/km", "₹0.5–1/km", "Same as petrol"],
                answer: 2,
            },
            {
                q: "How much does a typical motorcycle depreciate in its first year?",
                options: ["~5%", "~10%", "~25%", "~50%"],
                answer: 2,
            },
        ],
    },
    {
        id: "choosing-first-bike",
        icon: Star,
        color: "purple",
        title: "Choosing Your First Bike",
        duration: "6 min",
        level: "Beginner",
        summary: "A structured checklist to help first-time buyers make the right choice.",
        content: [
            {
                heading: "Step 1: Define Your Primary Use",
                text: `Before looking at bikes, answer these questions:
• Will you use it mainly for daily commuting or weekend rides?
• How far do you travel daily (short city hops vs long highway stretches)?
• Do you need to carry a pillion regularly?
• Will you park on crowded streets?

Your answers should guide your category choice: commuter, cruiser, sports, or adventure.`,
            },
            {
                heading: "Step 2: Set a Realistic Budget",
                text: `Budget = Purchase cost + Year 1 running costs
• Factor in: On-road price, 1-year insurance, first 3 services, basic riding gear
• Do not forget gear: helmet (₹3,000–15,000), jacket, gloves, and boots add ₹10,000–40,000
• If financing, keep EMI below 15–20% of monthly income`,
            },
            {
                heading: "Step 3: Choose the Right Power Level",
                text: `For beginners:
• 100–150 cc — Very forgiving, ideal for city. Hero Splendor, Honda CB Shine.
• 150–200 cc — Good all-rounder. Bajaj Pulsar 150, Yamaha FZ-S.
• 200–300 cc — Step up after 1–2 years. KTM Duke 200, Royal Enfield Meteor.
• 300cc+ — Only for experienced riders. High power requires skill and responsibility.`,
            },
            {
                heading: "Step 4: Test Ride Before You Buy",
                text: `Always test ride before purchasing. Check:
• Can you flat-foot (both feet on the ground) or is the seat height manageable?
• Is the clutch pull comfortable?
• Does the handlebar position feel natural?
• How is the braking feel?
• Can you manoeuvre it at slow speeds easily?

Schedule a test ride through your dealer or use MOTOAI's test-ride booking feature.`,
            },
        ],
        quiz: [
            {
                q: "What is the recommended EMI limit as a percentage of monthly income?",
                options: ["5–10%", "15–20%", "30–35%", "50%"],
                answer: 1,
            },
            {
                q: "Which engine size is safest for a complete beginner?",
                options: ["300–400 cc", "250–300 cc", "150–200 cc", "100–150 cc"],
                answer: 3,
            },
            {
                q: "What should you check during a test ride?",
                options: [
                    "Only the speed it can reach",
                    "Seat height, clutch, braking, and slow-speed manoeuvring",
                    "How it sounds at high rev",
                    "Only the brand logo",
                ],
                answer: 1,
            },
        ],
    },
];

const COLOR_MAP = {
    orange: {
        badge: "bg-orange-500/10 border-orange-500/20 text-orange-400",
        icon: "bg-orange-500/15 text-orange-400",
        ring: "ring-orange-500/30",
        progress: "bg-orange-500",
    },
    green: {
        badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
        icon: "bg-emerald-500/15 text-emerald-400",
        ring: "ring-emerald-500/30",
        progress: "bg-emerald-500",
    },
    blue: {
        badge: "bg-blue-500/10 border-blue-500/20 text-blue-400",
        icon: "bg-blue-500/15 text-blue-400",
        ring: "ring-blue-500/30",
        progress: "bg-blue-500",
    },
    amber: {
        badge: "bg-amber-500/10 border-amber-500/20 text-amber-400",
        icon: "bg-amber-500/15 text-amber-400",
        ring: "ring-amber-500/30",
        progress: "bg-amber-500",
    },
    purple: {
        badge: "bg-purple-500/10 border-purple-500/20 text-purple-400",
        icon: "bg-purple-500/15 text-purple-400",
        ring: "ring-purple-500/30",
        progress: "bg-purple-500",
    },
};

// =====================================================
// QUIZ COMPONENT
// =====================================================
function Quiz({ questions, onComplete }) {
    const [current, setCurrent] = useState(0);
    const [selected, setSelected] = useState(null);
    const [results, setResults] = useState([]);
    const [done, setDone] = useState(false);

    const q = questions[current];
    const score = results.filter(Boolean).length;

    const handleAnswer = (idx) => {
        if (selected !== null) return;
        setSelected(idx);
    };

    const handleNext = () => {
        const correct = selected === q.answer;
        const newResults = [...results, correct];
        if (current < questions.length - 1) {
            setResults(newResults);
            setSelected(null);
            setCurrent((c) => c + 1);
        } else {
            setResults(newResults);
            setDone(true);
            onComplete(newResults.filter(Boolean).length, questions.length);
        }
    };

    if (done) {
        const pct = Math.round((score / questions.length) * 100);
        return (
            <div className="text-center py-8">
                <Trophy
                    size={48}
                    className={`mx-auto mb-4 ${pct >= 67 ? "text-amber-400" : "text-zinc-500"}`}
                />
                <p className="text-2xl font-black mb-1">
                    {score}/{questions.length} Correct
                </p>
                <p className={`text-sm font-semibold mb-6 ${pct >= 67 ? "text-emerald-400" : "text-orange-400"}`}>
                    {pct >= 100 ? "Perfect score! 🎉" : pct >= 67 ? "Well done!" : "Keep learning!"}
                </p>
                <p className="text-zinc-400 text-sm">You scored {pct}% on this quiz.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-4">
                <span>Question {current + 1} of {questions.length}</span>
                <span>{Math.round(((current) / questions.length) * 100)}% complete</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full mb-5">
                <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${(current / questions.length) * 100}%` }}
                />
            </div>

            <h3 className="font-bold text-base mb-4">{q.q}</h3>

            <div className="space-y-2.5 mb-6">
                {q.options.map((opt, idx) => {
                    let cls = "border-white/8 bg-white/[0.02] hover:border-white/20";
                    if (selected !== null) {
                        if (idx === q.answer) cls = "border-emerald-500 bg-emerald-500/10";
                        else if (idx === selected) cls = "border-red-500 bg-red-500/10";
                        else cls = "border-white/5 opacity-50";
                    }
                    return (
                        <button
                            key={idx}
                            onClick={() => handleAnswer(idx)}
                            disabled={selected !== null}
                            className={`w-full text-left px-4 py-3 rounded-xl border transition text-sm ${cls} flex items-center justify-between`}
                        >
                            <span>{opt}</span>
                            {selected !== null && idx === q.answer && <Check size={15} className="text-emerald-400" />}
                            {selected !== null && idx === selected && idx !== q.answer && <X size={15} className="text-red-400" />}
                        </button>
                    );
                })}
            </div>

            {selected !== null && (
                <button
                    onClick={handleNext}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-sm transition"
                >
                    {current < questions.length - 1 ? (
                        <><span>Next Question</span><ArrowRight size={16} /></>
                    ) : (
                        <><span>See Results</span><Trophy size={16} /></>
                    )}
                </button>
            )}
        </div>
    );
}

// =====================================================
// MODULE CARD
// =====================================================
function ModuleCard({ module, completed, onOpen }) {
    const colors = COLOR_MAP[module.color] || COLOR_MAP.orange;
    const Icon = module.icon;
    return (
        <button
            onClick={onOpen}
            className={`
                group text-left w-full rounded-2xl border border-white/8 bg-white/[0.02] p-5
                hover:border-white/20 hover:bg-white/[0.04] transition-all
                ${completed ? `ring-1 ${colors.ring}` : ""}
            `}
        >
            <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colors.icon}`}>
                    <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-black text-sm">{module.title}</h3>
                        {completed && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                Completed ✓
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-zinc-400 mb-3">{module.summary}</p>
                    <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${colors.badge}`}>
                            {module.level}
                        </span>
                        <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                            <Clock size={10} />
                            {module.duration}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                            {module.quiz.length} quiz questions
                        </span>
                    </div>
                </div>
                <ChevronRight size={17} className="text-zinc-600 group-hover:text-white transition shrink-0" />
            </div>
        </button>
    );
}

// =====================================================
// MODULE READER VIEW
// =====================================================
function ModuleReader({ module, onBack, onQuizComplete }) {
    const [section, setSection] = useState("learn");
    const colors = COLOR_MAP[module.color] || COLOR_MAP.orange;
    const Icon = module.icon;

    return (
        <div className="max-w-2xl mx-auto">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-6"
            >
                <ArrowLeft size={17} />
                Back to Modules
            </button>

            {/* Module header */}
            <div className={`rounded-2xl border border-white/8 p-5 mb-6`}>
                <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.icon}`}>
                        <Icon size={20} />
                    </div>
                    <div>
                        <h2 className="font-black text-lg">{module.title}</h2>
                        <p className="text-xs text-zinc-400">{module.duration} read · {module.level}</p>
                    </div>
                </div>

                {/* Tab switch */}
                <div className="flex gap-2 mt-2">
                    <button
                        onClick={() => setSection("learn")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${section === "learn" ? "bg-orange-500 text-black" : "bg-white/5 text-zinc-400 hover:text-white"}`}
                    >
                        📖 Learn
                    </button>
                    <button
                        onClick={() => setSection("quiz")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${section === "quiz" ? "bg-orange-500 text-black" : "bg-white/5 text-zinc-400 hover:text-white"}`}
                    >
                        🧠 Quiz
                    </button>
                </div>
            </div>

            {section === "learn" ? (
                <div className="space-y-6">
                    {module.content.map((c, i) => (
                        <div key={i} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                            <h3 className="font-black text-sm text-orange-400 mb-3">{c.heading}</h3>
                            <p className="text-sm text-zinc-300 leading-7 whitespace-pre-line">{c.text}</p>
                        </div>
                    ))}
                    <button
                        onClick={() => setSection("quiz")}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-sm transition"
                    >
                        Take the Quiz
                        <ArrowRight size={16} />
                    </button>
                </div>
            ) : (
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                    <h3 className="font-black text-base mb-6">Knowledge Check</h3>
                    <Quiz questions={module.quiz} onComplete={onQuizComplete} />
                </div>
            )}
        </div>
    );
}

// =====================================================
// MAIN PAGE
// =====================================================
export default function LearningHub() {
    const navigate = useNavigate();
    const [activeModule, setActiveModule] = useState(null);
    const [completed, setCompleted] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("motoai_learning_completed") || "{}");
        } catch {
            return {};
        }
    });
    const [quizScores, setQuizScores] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("motoai_quiz_scores") || "{}");
        } catch {
            return {};
        }
    });

    const handleQuizComplete = (score, total) => {
        const newCompleted = { ...completed, [activeModule.id]: true };
        const newScores = { ...quizScores, [activeModule.id]: { score, total } };
        setCompleted(newCompleted);
        setQuizScores(newScores);
        localStorage.setItem("motoai_learning_completed", JSON.stringify(newCompleted));
        localStorage.setItem("motoai_quiz_scores", JSON.stringify(newScores));
    };

    const totalCompleted = Object.values(completed).filter(Boolean).length;
    const totalScore = Object.values(quizScores).reduce((s, v) => s + (v.score || 0), 0);
    const totalQuestions = Object.values(quizScores).reduce((s, v) => s + (v.total || 0), 0);

    if (activeModule) {
        return (
            <div className="min-h-screen bg-[#070707] text-white">
                <Navbar />
                <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
                    <ModuleReader
                        module={activeModule}
                        onBack={() => setActiveModule(null)}
                        onQuizComplete={handleQuizComplete}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar />
            <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">

                {/* Header */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold mb-4">
                        <BookOpen size={13} />
                        Learning Hub
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black">Learn Motorcycles</h1>
                    <p className="text-zinc-400 mt-2 max-w-xl">
                        Free educational modules to help you make a confident, informed motorcycle buying decision.
                    </p>
                </div>

                {/* Progress Banner */}
                {totalCompleted > 0 && (
                    <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-center gap-5 flex-wrap">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <Trophy size={22} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="font-black text-emerald-400">
                                {totalCompleted} / {MODULES.length} Modules Completed
                            </p>
                            {totalQuestions > 0 && (
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Quiz score: {totalScore}/{totalQuestions} ({Math.round((totalScore / totalQuestions) * 100)}%)
                                </p>
                            )}
                        </div>
                        {totalCompleted === MODULES.length && (
                            <div className="ml-auto px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                                All Complete! 🎉
                            </div>
                        )}
                    </div>
                )}

                {/* MotoMind CTA */}
                <div className="mb-6 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <Sparkles size={18} className="text-orange-400 shrink-0" />
                        <p className="text-sm text-zinc-300">
                            Have a question after reading? <span className="text-orange-400 font-semibold">Ask MotoMind AI</span> for a personalised answer.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/ai-advisor")}
                        className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-xs transition"
                    >
                        Open MotoMind →
                    </button>
                </div>

                {/* Modules Grid */}
                <div className="grid sm:grid-cols-2 gap-4">
                    {MODULES.map((mod) => (
                        <ModuleCard
                            key={mod.id}
                            module={mod}
                            completed={!!completed[mod.id]}
                            onOpen={() => setActiveModule(mod)}
                        />
                    ))}
                </div>

                <p className="text-center text-xs text-zinc-600 mt-8">
                    Progress is saved locally in your browser. More modules coming soon.
                </p>
            </div>
        </div>
    );
}
