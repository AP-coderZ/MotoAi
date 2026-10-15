import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
    ArrowLeft,
    IndianRupee,
    Fuel,
    Wrench,
    Shield,
    Calendar,
    TrendingDown,
    TrendingUp,
    Info,
    ChevronDown,
    Sparkles,
    Download,
    RefreshCw,
    Bike,
    Zap,
    Calculator,
    ArrowRight,
} from "lucide-react";
import Navbar from "../components/Navbar";

// =====================================================
// CONSTANTS & HELPERS
// =====================================================
const inr = (n) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
const pct = (n) => `${Number(n || 0).toFixed(1)}%`;

const FUEL_PRICE_PETROL = 105;   // ₹/litre (national average)
const FUEL_PRICE_ELEC   = 8;     // ₹/kWh (home charging)
const FUEL_PRICE_EV     = FUEL_PRICE_ELEC;

// Insurance as % of ex-showroom price (IDV-based approximation)
const INSURANCE_RATES = {
    year1: 0.032,
    year2: 0.026,
    year3: 0.024,
    year4: 0.022,
    year5: 0.020,
};

// Depreciation rates (Indian market)
const DEPRECIATION = {
    year1: 0.25,
    year2: 0.18,
    year3: 0.15,
    year4: 0.12,
    year5: 0.10,
};

// Registration & road tax estimate (% of ex-showroom for private)
const REGISTRATION_PCT = 0.08;
// On-road charges multiplier
const GST_PCT = 0.28;

const MAINTENANCE_PRESETS = {
    entry:   { annual: 4500,  desc: "Simple commuters, single cylinder" },
    mid:     { annual: 8000,  desc: "150–350cc bikes" },
    premium: { annual: 15000, desc: "400cc+ premium & performance bikes" },
    ev:      { annual: 2500,  desc: "Electric (minimal mechanical maintenance)" },
};

// =====================================================
// COST SECTION CARD
// =====================================================
function CostCard({ icon, label, value, sub, accent = false }) {
    return (
        <div className={`rounded-2xl border p-4 ${accent
            ? "border-orange-500/30 bg-orange-500/5"
            : "border-white/8 bg-white/[0.02]"}`
        }>
            <div className="flex items-center gap-2 mb-2">
                <span className={`${accent ? "text-orange-400" : "text-zinc-400"}`}>{icon}</span>
                <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
            </div>
            <p className={`text-xl font-black ${accent ? "text-orange-400" : "text-white"}`}>{value}</p>
            {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
        </div>
    );
}

// =====================================================
// INPUT FIELD
// =====================================================
function Field({ label, hint, children }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-1.5">{label}</label>
            {hint && <p className="text-xs text-zinc-600 mb-2">{hint}</p>}
            {children}
        </div>
    );
}

const inputCls = "w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50 transition";
const selectCls = inputCls + " appearance-none";

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function OwnershipCost() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Bikes list from backend for preset selection
    const [bikesList, setBikesList] = useState([]);
    const [loadingBikes, setLoadingBikes] = useState(false);
    const [selectedBikeId, setSelectedBikeId] = useState("");
    const [selectedBikeName, setSelectedBikeName] = useState(searchParams.get("bike") || "");

    const [form, setForm] = useState({
        exShowroom:    Number(searchParams.get("price")) || 150000,
        fuelType:      searchParams.get("category")?.toLowerCase() === "electric" ? "electric" : "petrol",
        mileage:       Number(searchParams.get("mileage")) || 45,        // km/l for petrol; range km for EV
        batteryKwh:    3.5,                                              // for EV
        dailyKm:       40,
        ownership:     3,                                                // years
        maintenanceTier: "mid",
        loanPct:       0,                                                // % financed
        loanRatePA:    10.5,                                             // % p.a.
        loanYears:     3,
        emiDownPct:    20,
    });

    const set = useCallback((key, val) => setForm((f) => ({ ...f, [key]: val })), []);

    // Sync from searchParams if they update
    useEffect(() => {
        const bikeParam = searchParams.get("bike");
        const priceParam = Number(searchParams.get("price"));
        const mileageParam = Number(searchParams.get("mileage"));
        const categoryParam = searchParams.get("category");

        if (bikeParam) setSelectedBikeName(bikeParam);
        if (priceParam && priceParam > 0) setForm((f) => ({ ...f, exShowroom: priceParam }));
        if (mileageParam && mileageParam > 0) setForm((f) => ({ ...f, mileage: mileageParam }));
        if (categoryParam) {
            const isCatEV = categoryParam.toLowerCase() === "electric";
            setForm((f) => ({ ...f, fuelType: isCatEV ? "electric" : "petrol" }));
        }
    }, [searchParams]);

    // Fetch motorcycles from API for picker
    useEffect(() => {
        let isMounted = true;
        const fetchBikes = async () => {
            setLoadingBikes(true);
            try {
                const res = await fetch("http://localhost:5000/api/motorcycles?limit=100");
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted && data.motorcycles) {
                        setBikesList(data.motorcycles);
                    }
                }
            } catch (err) {
                console.warn("Could not load bikes:", err.message);
            } finally {
                if (isMounted) setLoadingBikes(false);
            }
        };
        fetchBikes();
        return () => { isMounted = false; };
    }, []);

    // Handle selecting a bike from dropdown
    const handleBikeSelect = (e) => {
        const id = e.target.value;
        setSelectedBikeId(id);
        if (!id) {
            setSelectedBikeName("");
            return;
        }
        const b = bikesList.find((item) => String(item._id) === String(id));
        if (b) {
            setSelectedBikeName(b.name);
            const isEvBike = (b.category || "").toLowerCase() === "electric";
            setForm((f) => ({
                ...f,
                exShowroom: Number(b.price) || f.exShowroom,
                mileage: Number(b.mileage || b.range) || f.mileage,
                fuelType: isEvBike ? "electric" : "petrol",
                maintenanceTier: isEvBike ? "ev" : (Number(b.engine) > 350 ? "premium" : Number(b.engine) > 150 ? "mid" : "entry"),
            }));
        }
    };

    const isEV = form.fuelType === "electric";

    // =====================================================
    // CALCULATIONS (memoized)
    // =====================================================
    const calc = useMemo(() => {
        const ex = Number(form.exShowroom) || 0;
        const years = Math.min(Math.max(Number(form.ownership) || 1, 1), 5);
        const dailyKm = Number(form.dailyKm) || 0;
        const annualKm = dailyKm * 365;

        // On-road price
        const gst = ex * GST_PCT;
        const registration = ex * REGISTRATION_PCT;
        const onRoad = ex + gst + registration;

        // Fuel/energy cost per year
        let annualFuel = 0;
        if (isEV) {
            const kwh = Number(form.batteryKwh) || 3;
            const rangePerCharge = Number(form.mileage) || 100; // km range
            const chargesPerYear = rangePerCharge > 0 ? annualKm / rangePerCharge : 0;
            annualFuel = chargesPerYear * kwh * FUEL_PRICE_ELEC;
        } else {
            const mileage = Number(form.mileage) || 1;
            const litresPerYear = mileage > 0 ? annualKm / mileage : 0;
            annualFuel = litresPerYear * FUEL_PRICE_PETROL;
        }

        // Maintenance per year
        const maintenanceTier = MAINTENANCE_PRESETS[isEV ? "ev" : form.maintenanceTier] || MAINTENANCE_PRESETS.mid;
        const annualMaintenance = maintenanceTier.annual;

        // Insurance per year (calculated by year for accuracy)
        const insuranceByYear = [];
        for (let y = 1; y <= years; y++) {
            const rate = INSURANCE_RATES[`year${y}`] || INSURANCE_RATES.year5;
            // IDV reduces each year
            const depKey = `year${y}`;
            const dep = DEPRECIATION[depKey] || DEPRECIATION.year5;
            const idv = ex * (1 - dep);
            insuranceByYear.push(idv * rate);
        }
        const totalInsurance = insuranceByYear.reduce((s, v) => s + v, 0);
        const avgAnnualInsurance = totalInsurance / years;

        // Loan EMI
        let totalLoanInterest = 0;
        let monthlyEmi = 0;
        if (form.loanPct > 0) {
            const principal = onRoad * (Number(form.loanPct) / 100);
            const r = (Number(form.loanRatePA) || 10) / 100 / 12;
            const n = (Number(form.loanYears) || 3) * 12;
            if (r > 0) {
                monthlyEmi = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
            } else {
                monthlyEmi = principal / n;
            }
            totalLoanInterest = monthlyEmi * n - principal;
        }

        // Depreciation (residual value)
        let cumulativeDep = 1;
        for (let y = 1; y <= years; y++) {
            cumulativeDep *= (1 - (DEPRECIATION[`year${y}`] || 0.10));
        }
        const residualValue = ex * cumulativeDep;
        const valueDropped = ex - residualValue;

        // Totals
        const totalFuel = annualFuel * years;
        const totalMaintenance = annualMaintenance * years;
        const totalOwnershipCost = onRoad + totalFuel + totalInsurance + totalMaintenance + totalLoanInterest;
        const annualTotalCost = totalOwnershipCost / years;
        const monthlyCost = annualTotalCost / 12;
        const costPerKm = (dailyKm > 0 && annualKm > 0) ? (annualTotalCost / annualKm) : 0;

        return {
            ex, onRoad, gst, registration,
            annualFuel, totalFuel,
            annualMaintenance, totalMaintenance,
            avgAnnualInsurance, totalInsurance,
            monthlyEmi, totalLoanInterest,
            residualValue, valueDropped,
            totalOwnershipCost, annualTotalCost, monthlyCost,
            costPerKm, annualKm, years,
        };
    }, [form, isEV]);

    const breakdown = [
        { label: "On-road Price",         value: inr(calc.onRoad),              pct: calc.onRoad / calc.totalOwnershipCost * 100 },
        { label: `Fuel / Energy (${calc.years}y)`, value: inr(calc.totalFuel), pct: calc.totalFuel / calc.totalOwnershipCost * 100 },
        { label: `Insurance (${calc.years}y)`,     value: inr(calc.totalInsurance), pct: calc.totalInsurance / calc.totalOwnershipCost * 100 },
        { label: `Maintenance (${calc.years}y)`,   value: inr(calc.totalMaintenance), pct: calc.totalMaintenance / calc.totalOwnershipCost * 100 },
        { label: "Loan Interest",         value: inr(calc.totalLoanInterest),   pct: calc.totalLoanInterest / calc.totalOwnershipCost * 100 },
    ].filter((r) => !r.value.includes("₹0"));

    const askMotoMind = () => {
        const bikeStr = selectedBikeName ? ` for ${selectedBikeName}` : "";
        const prompt = `I've calculated the ownership cost${bikeStr} with an ex-showroom price of ${inr(form.exShowroom)}. Over ${calc.years} years with ${form.dailyKm} km/day, the total cost of ownership comes to approximately ${inr(calc.totalOwnershipCost)} (about ${inr(calc.monthlyCost)}/month). This includes fuel (${inr(calc.totalFuel)}), insurance (${inr(calc.totalInsurance)}), and maintenance (${inr(calc.totalMaintenance)}). Can you help me understand if this is reasonable and suggest ways to reduce these costs?`;
        navigate("/ai-advisor", { state: { prefill: prompt } });
    };

    // =====================================================
    // RENDER
    // =====================================================
    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar activeTab="calculators" />
            <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">

                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-5"
                    >
                        <ArrowLeft size={17} />
                        Back
                    </button>

                    {/* Dual Calculator Switch Tabs */}
                    <div className="mb-6 flex flex-wrap gap-2">
                        <Link
                            to="/emi-calculator"
                            className="inline-flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/10 px-4 py-2 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
                        >
                            <Calculator size={14} />
                            EMI Calculator
                        </Link>
                        <div className="inline-flex items-center gap-2 rounded-xl bg-orange-500/15 border border-orange-500/30 px-4 py-2 text-xs font-bold text-orange-400 shadow-sm">
                            <TrendingUp size={14} />
                            5-Year Ownership Cost
                        </div>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-black">Total Cost of Ownership Calculator</h1>
                    <p className="text-zinc-400 mt-2 max-w-xl">
                        Understand what a motorcycle really costs over its lifetime — beyond just the sticker price.
                        Factor in on-road taxes, fuel, regular maintenance, insurance, and depreciation.
                    </p>

                    {/* Active Bike Selection Banner */}
                    {selectedBikeName && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3">
                            <div className="flex items-center gap-2.5">
                                <Bike size={18} className="text-orange-400" />
                                <span className="text-xs font-medium text-zinc-300">
                                    Calculating ownership costs for:{" "}
                                    <strong className="font-bold text-white">{selectedBikeName}</strong>
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedBikeName("");
                                    setSelectedBikeId("");
                                }}
                                className="text-xs font-semibold text-orange-400 underline hover:text-orange-300"
                            >
                                Clear Selection
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8">

                    {/* LEFT — Input Form */}
                    <div className="space-y-5">

                        {/* Preset Bike Selector */}
                        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-3">
                            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                                Select Motorcycle Preset (Optional)
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedBikeId}
                                    onChange={handleBikeSelect}
                                    className="w-full appearance-none rounded-xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                                >
                                    <option value="">-- Choose a bike to auto-fill specs or enter below --</option>
                                    {bikesList.map((bike) => (
                                        <option key={bike._id} value={bike._id}>
                                            {bike.name} ({bike.brand}) — {inr(bike.price)}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={16}
                                    className="pointer-events-none absolute right-4 top-3.5 text-zinc-500"
                                />
                            </div>
                            {loadingBikes && (
                                <p className="text-xs text-zinc-500">Loading bike database...</p>
                            )}
                        </div>

                        {/* Bike Details */}
                        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-4">
                            <h3 className="font-black text-base">Motorcycle Details</h3>

                            <Field label="Ex-showroom Price (₹)" hint="Base price before GST, registration, and insurance">
                                <input
                                    id="ex-showroom-price"
                                    type="number"
                                    value={form.exShowroom}
                                    onChange={(e) => set("exShowroom", e.target.value)}
                                    className={inputCls}
                                    min={0}
                                    step={5000}
                                />
                            </Field>

                            <Field label="Fuel Type">
                                <select
                                    id="fuel-type"
                                    value={form.fuelType}
                                    onChange={(e) => set("fuelType", e.target.value)}
                                    className={selectCls}
                                >
                                    <option value="petrol">Petrol</option>
                                    <option value="electric">Electric</option>
                                </select>
                            </Field>

                            {isEV ? (
                                <>
                                    <Field label="Battery Capacity (kWh)" hint="From the spec sheet">
                                        <input
                                            id="battery-kwh"
                                            type="number"
                                            value={form.batteryKwh}
                                            onChange={(e) => set("batteryKwh", e.target.value)}
                                            className={inputCls}
                                            min={0}
                                            step={0.5}
                                        />
                                    </Field>
                                    <Field label="Range per Charge (km)" hint="Manufacturer claimed or real-world">
                                        <input
                                            id="ev-range"
                                            type="number"
                                            value={form.mileage}
                                            onChange={(e) => set("mileage", e.target.value)}
                                            className={inputCls}
                                            min={1}
                                        />
                                    </Field>
                                </>
                            ) : (
                                <Field label="Fuel Efficiency (km/l)" hint="Real-world average mileage">
                                    <input
                                        id="mileage"
                                        type="number"
                                        value={form.mileage}
                                        onChange={(e) => set("mileage", e.target.value)}
                                        className={inputCls}
                                        min={1}
                                    />
                                </Field>
                            )}
                        </div>

                        {/* Usage */}
                        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-4">
                            <h3 className="font-black text-base">Usage & Ownership</h3>

                            <Field label="Daily Distance (km)" hint="Average km you ride per day">
                                <input
                                    id="daily-km"
                                    type="number"
                                    value={form.dailyKm}
                                    onChange={(e) => set("dailyKm", e.target.value)}
                                    className={inputCls}
                                    min={1}
                                />
                            </Field>

                            <Field label="Years of Ownership">
                                <select
                                    id="ownership-years"
                                    value={form.ownership}
                                    onChange={(e) => set("ownership", e.target.value)}
                                    className={selectCls}
                                >
                                    {[1, 2, 3, 4, 5].map((y) => (
                                        <option key={y} value={y}>{y} Year{y > 1 ? "s" : ""}</option>
                                    ))}
                                </select>
                            </Field>

                            {!isEV && (
                                <Field label="Maintenance Category">
                                    <select
                                        id="maintenance-tier"
                                        value={form.maintenanceTier}
                                        onChange={(e) => set("maintenanceTier", e.target.value)}
                                        className={selectCls}
                                    >
                                        {Object.entries(MAINTENANCE_PRESETS).filter(([k]) => k !== "ev").map(([k, v]) => (
                                            <option key={k} value={k}>
                                                {k.charAt(0).toUpperCase() + k.slice(1)} — {v.desc} (~{inr(v.annual)}/yr)
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            )}
                        </div>

                        {/* Loan / Financing */}
                        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-base">Financing (Optional Loan)</h3>
                                <Link
                                    to={`/emi-calculator?price=${form.exShowroom}${selectedBikeName ? `&bike=${encodeURIComponent(selectedBikeName)}` : ""}`}
                                    className="text-xs font-bold text-orange-400 hover:underline flex items-center gap-1"
                                >
                                    Full EMI Calculator
                                    <ArrowRight size={12} />
                                </Link>
                            </div>

                            <Field label="Loan Amount (% of on-road)" hint="Set to 0 for full cash purchase">
                                <input
                                    id="loan-pct"
                                    type="number"
                                    value={form.loanPct}
                                    onChange={(e) => set("loanPct", e.target.value)}
                                    className={inputCls}
                                    min={0}
                                    max={100}
                                />
                            </Field>

                            {Number(form.loanPct) > 0 && (
                                <>
                                    <Field label="Interest Rate (% p.a.)">
                                        <input
                                            id="loan-rate"
                                            type="number"
                                            value={form.loanRatePA}
                                            onChange={(e) => set("loanRatePA", e.target.value)}
                                            className={inputCls}
                                            min={1}
                                            step={0.5}
                                        />
                                    </Field>
                                    <Field label="Loan Tenure (years)">
                                        <select
                                            id="loan-years"
                                            value={form.loanYears}
                                            onChange={(e) => set("loanYears", e.target.value)}
                                            className={selectCls}
                                        >
                                            {[1, 2, 3, 4, 5].map((y) => (
                                                <option key={y} value={y}>{y} Year{y > 1 ? "s" : ""}</option>
                                            ))}
                                        </select>
                                    </Field>
                                </>
                            )}
                        </div>

                        <div className="flex items-start gap-2 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300">
                            <Info size={14} className="shrink-0 mt-0.5" />
                            <span>
                                All figures are estimates. Petrol price assumed ₹{FUEL_PRICE_PETROL}/litre.
                                Electricity assumed ₹{FUEL_PRICE_EV}/kWh. Insurance uses IDV-based approximation.
                                Actual costs may vary depending on state road taxes and personal driving conditions.
                            </span>
                        </div>
                    </div>

                    {/* RIGHT — Results */}
                    <div className="space-y-5">

                        {/* Top cost numbers */}
                        <div className="grid grid-cols-2 gap-3">
                            <CostCard
                                icon={<IndianRupee size={18} />}
                                label={`Total ${calc.years}yr Cost`}
                                value={inr(calc.totalOwnershipCost)}
                                sub="Including purchase & running"
                                accent
                            />
                            <CostCard
                                icon={<Calendar size={18} />}
                                label="Monthly Outflow"
                                value={inr(calc.monthlyCost)}
                                sub="Average per month"
                            />
                            <CostCard
                                icon={<Bike size={18} />}
                                label="Cost Per Km"
                                value={calc.costPerKm > 0 ? `₹${calc.costPerKm.toFixed(2)}` : "—"}
                                sub="All-inclusive expense"
                            />
                            <CostCard
                                icon={<TrendingDown size={18} />}
                                label="Residual Value"
                                value={inr(calc.residualValue)}
                                sub={`After ${calc.years} yr depreciation`}
                            />
                        </div>

                        {/* Loan EMI highlight if enabled */}
                        {Number(form.loanPct) > 0 && calc.monthlyEmi > 0 && (
                            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs text-indigo-400 font-bold uppercase tracking-wide">Financed Loan EMI</p>
                                    <Link
                                        to={`/emi-calculator?price=${form.exShowroom}&tenure=${form.loanYears}&rate=${form.loanRatePA}`}
                                        className="text-[11px] font-semibold text-indigo-300 hover:underline"
                                    >
                                        Detailed Amortization →
                                    </Link>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-3xl font-black">{inr(calc.monthlyEmi)}</p>
                                    <span className="text-sm text-zinc-500">/month</span>
                                </div>
                                <p className="text-xs text-zinc-400 mt-1">
                                    Total interest paid: {inr(calc.totalLoanInterest)} over {form.loanYears} years
                                </p>
                            </div>
                        )}

                        {/* Breakdown */}
                        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                            <h3 className="font-black text-base mb-4">Cost Breakdown (Lifetime)</h3>
                            <div className="space-y-3">
                                {breakdown.map((item) => (
                                    <div key={item.label}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="text-zinc-400">{item.label}</span>
                                            <span className="font-bold">{item.value}</span>
                                        </div>
                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(item.pct || 0, 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-zinc-600 mt-0.5">
                                            {pct(item.pct)} of total
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Annual breakdown */}
                        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                            <h3 className="font-black text-base mb-4">Annual Running Costs</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <p className="text-xs text-zinc-500 mb-1">
                                        {isEV ? "Electricity" : "Fuel"}
                                    </p>
                                    <p className="font-black">{inr(calc.annualFuel)}</p>
                                    <p className="text-xs text-zinc-600">{Math.round(calc.annualKm).toLocaleString("en-IN")} km/yr</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <p className="text-xs text-zinc-500 mb-1">Insurance</p>
                                    <p className="font-black">{inr(calc.avgAnnualInsurance)}</p>
                                    <p className="text-xs text-zinc-600">IDV-based estimate</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <p className="text-xs text-zinc-500 mb-1">Maintenance</p>
                                    <p className="font-black">{inr(calc.annualMaintenance)}</p>
                                    <p className="text-xs text-zinc-600">Service + regular parts</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <p className="text-xs text-zinc-500 mb-1">Total Annual</p>
                                    <p className="font-black">{inr(calc.annualTotalCost)}</p>
                                    <p className="text-xs text-zinc-600">Running expense / year</p>
                                </div>
                            </div>
                        </div>

                        {/* Ask MotoMind */}
                        <button
                            type="button"
                            onClick={askMotoMind}
                            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-sm transition shadow-lg shadow-orange-500/20"
                        >
                            <Sparkles size={18} />
                            Ask MotoMind to Analyse This Ownership Plan
                        </button>

                        {/* Switch to EMI Calculator link */}
                        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-white">Compare bank interest rates?</p>
                                <p className="text-[11px] text-zinc-400">View SBI, HDFC, ICICI rates & custom amortization.</p>
                            </div>
                            <Link
                                to={`/emi-calculator?price=${form.exShowroom}${selectedBikeName ? `&bike=${encodeURIComponent(selectedBikeName)}` : ""}`}
                                className="flex items-center gap-1 rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-orange-400 hover:bg-orange-500/10 transition shrink-0"
                            >
                                EMI Calculator
                                <ArrowRight size={13} />
                            </Link>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
