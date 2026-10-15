import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
    ArrowLeft,
    IndianRupee,
    Calculator,
    Calendar,
    Percent,
    PieChart,
    Sparkles,
    ChevronDown,
    Building2,
    ShieldCheck,
    TrendingUp,
    Info,
    Bike,
    ArrowRight,
    RefreshCw,
    Wallet,
} from "lucide-react";
import Navbar from "../components/Navbar";

// =====================================================
// HELPERS & CONSTANTS
// =====================================================
const inr = (n) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
const pct = (n) => `${Number(n || 0).toFixed(1)}%`;

const BANK_RATES = [
    {
        name: "HDFC Bank",
        rate: 9.90,
        rateRange: "9.50% – 13.00%",
        processingFee: "Up to 2.5%",
        tenure: "Up to 5 Years",
        tag: "Lowest Interest",
    },
    {
        name: "State Bank of India (SBI)",
        rate: 10.15,
        rateRange: "10.05% – 12.50%",
        processingFee: "Up to 1.5%",
        tenure: "Up to 5 Years",
        tag: "Public Sector Pick",
    },
    {
        name: "ICICI Bank",
        rate: 10.25,
        rateRange: "9.90% – 13.50%",
        processingFee: "Up to 2.0%",
        tenure: "Up to 4 Years",
        tag: "Instant Approval",
    },
    {
        name: "Bajaj Auto Finance",
        rate: 11.20,
        rateRange: "10.99% – 15.00%",
        processingFee: "Up to 3.0%",
        tenure: "Up to 4 Years",
        tag: "High LTV Up to 95%",
    },
    {
        name: "TVS Credit",
        rate: 11.50,
        rateRange: "11.25% – 16.00%",
        processingFee: "Up to 2.5%",
        tenure: "Up to 3 Years",
        tag: "Minimal Paperwork",
    },
];

export default function EMICalculator() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Available bikes loaded from API for quick selection
    const [bikesList, setBikesList] = useState([]);
    const [loadingBikes, setLoadingBikes] = useState(false);
    const [selectedBikeId, setSelectedBikeId] = useState("");
    const [selectedBikeName, setSelectedBikeName] = useState(searchParams.get("bike") || "");

    // Form inputs
    const initialPrice = Number(searchParams.get("price")) || 150000;
    const [price, setPrice] = useState(initialPrice);
    const [includeOnRoad, setIncludeOnRoad] = useState(false);
    const [downPaymentPct, setDownPaymentPct] = useState(20);
    const [interestRate, setInterestRate] = useState(10.5);
    const [tenureYears, setTenureYears] = useState(3);
    const [showAmortization, setShowAmortization] = useState(false);

    // Fetch motorcycles for quick picker
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
                console.warn("Could not load bikes list:", err.message);
            } finally {
                if (isMounted) setLoadingBikes(false);
            }
        };
        fetchBikes();
        return () => { isMounted = false; };
    }, []);

    // Sync from URL search params if present
    useEffect(() => {
        const bikeParam = searchParams.get("bike");
        const priceParam = Number(searchParams.get("price"));
        const rateParam = Number(searchParams.get("rate"));
        const tenureParam = Number(searchParams.get("tenure"));
        const downParam = Number(searchParams.get("down"));

        if (bikeParam) setSelectedBikeName(bikeParam);
        if (priceParam && priceParam > 0) setPrice(priceParam);
        if (rateParam && rateParam > 0) setInterestRate(rateParam);
        if (tenureParam && tenureParam > 0) setTenureYears(tenureParam);
        if (downParam && downParam > 0) setDownPaymentPct(downParam);
    }, [searchParams]);

    // Handle motorcycle dropdown selection
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
            if (b.price) setPrice(Number(b.price));
        }
    };

    // Calculations
    const calculations = useMemo(() => {
        const basePrice = Math.max(0, Number(price) || 0);
        // If on-road is selected, add approx 15% (8% RTO + 4% Insurance + 3% fees/gst)
        const effectivePrice = includeOnRoad ? basePrice * 1.15 : basePrice;

        const downPaymentAmount = effectivePrice * (Number(downPaymentPct) / 100);
        const loanAmount = Math.max(0, effectivePrice - downPaymentAmount);

        const r = (Number(interestRate) || 0) / 100 / 12; // monthly rate
        const n = (Number(tenureYears) || 1) * 12; // total months

        let monthlyEmi = 0;
        if (loanAmount > 0 && n > 0) {
            if (r > 0) {
                monthlyEmi = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            } else {
                monthlyEmi = loanAmount / n;
            }
        }

        const totalPayableWithInterest = monthlyEmi * n;
        const totalInterest = Math.max(0, totalPayableWithInterest - loanAmount);
        const totalOverallCost = downPaymentAmount + totalPayableWithInterest;

        const principalPct = totalPayableWithInterest > 0
            ? (loanAmount / totalPayableWithInterest) * 100
            : 100;
        const interestPct = totalPayableWithInterest > 0
            ? (totalInterest / totalPayableWithInterest) * 100
            : 0;

        // Recommended minimum monthly salary (where EMI is <= 20% of income)
        const recommendedMinSalary = monthlyEmi > 0 ? monthlyEmi * 5 : 0;

        // Year-by-year Amortization
        const yearlySchedule = [];
        let balance = loanAmount;
        for (let yr = 1; yr <= tenureYears; yr++) {
            let yearlyPrincipal = 0;
            let yearlyInterest = 0;
            const openingBalance = balance;

            for (let m = 1; m <= 12; m++) {
                if (balance <= 0) break;
                const interestForMonth = balance * r;
                const principalForMonth = Math.min(balance, monthlyEmi - interestForMonth);
                yearlyInterest += interestForMonth;
                yearlyPrincipal += principalForMonth;
                balance = Math.max(0, balance - principalForMonth);
            }

            yearlySchedule.push({
                year: yr,
                openingBalance,
                emiPaid: yearlyPrincipal + yearlyInterest,
                principalPaid: yearlyPrincipal,
                interestPaid: yearlyInterest,
                closingBalance: balance,
            });
        }

        return {
            effectivePrice,
            downPaymentAmount,
            loanAmount,
            monthlyEmi,
            totalInterest,
            totalPayableWithInterest,
            totalOverallCost,
            principalPct,
            interestPct,
            recommendedMinSalary,
            totalMonths: n,
            yearlySchedule,
        };
    }, [price, includeOnRoad, downPaymentPct, interestRate, tenureYears]);

    // Handle asking AI advisor
    const askMotoMind = () => {
        const bikeStr = selectedBikeName ? ` for ${selectedBikeName}` : "";
        const prompt = `I am planning to buy a motorcycle${bikeStr} costing ${inr(calculations.effectivePrice)}. With a down payment of ${inr(calculations.downPaymentAmount)} (at ${downPaymentPct}%), a loan of ${inr(calculations.loanAmount)} at ${interestRate}% interest over ${tenureYears} years results in an EMI of ${inr(calculations.monthlyEmi)}/month. Total interest paid will be ${inr(calculations.totalInterest)}. Can you give me advice on whether this is a financially sound loan structure and tips to reduce interest?`;
        navigate("/ai-advisor", { state: { prefill: prompt } });
    };

    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar activeTab="calculators" />

            <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10">
                {/* Back button & Navigation Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-5 flex items-center gap-2 text-zinc-400 transition hover:text-white"
                    >
                        <ArrowLeft size={17} />
                        Back
                    </button>

                    {/* Dual Calculator Switch Tabs */}
                    <div className="mb-6 flex flex-wrap gap-2">
                        <div className="inline-flex items-center gap-2 rounded-xl bg-orange-500/15 border border-orange-500/30 px-4 py-2 text-xs font-bold text-orange-400 shadow-sm">
                            <Calculator size={14} />
                            EMI Calculator
                        </div>
                        <Link
                            to="/ownership-cost"
                            className="inline-flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/10 px-4 py-2 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
                        >
                            <TrendingUp size={14} />
                            5-Year Ownership Cost
                        </Link>
                    </div>

                    <h1 className="text-3xl font-black sm:text-4xl">
                        Motorcycle Loan & EMI Calculator
                    </h1>
                    <p className="mt-2 max-w-2xl text-zinc-400">
                        Calculate exact monthly payments, loan interest, down payment requirements,
                        and compare interest rates from top banks in India.
                    </p>

                    {/* Active Bike Banner if coming from details page */}
                    {selectedBikeName && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3">
                            <div className="flex items-center gap-2.5">
                                <Bike size={18} className="text-orange-400" />
                                <span className="text-xs font-medium text-zinc-300">
                                    Calculating loan for:{" "}
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

                {/* Main 2-Column Grid */}
                <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">

                    {/* LEFT COLUMN: Controls & Sliders */}
                    <div className="space-y-6">

                        {/* Card: Bike Quick Picker */}
                        <div className="rounded-2xl border border-white/10 bg-[#111]/80 p-5 backdrop-blur-xl">
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">
                                Select Motorcycle Preset (Optional)
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedBikeId}
                                    onChange={handleBikeSelect}
                                    className="w-full appearance-none rounded-xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                                >
                                    <option value="">-- Choose a bike from database or enter price below --</option>
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
                                <p className="mt-2 text-xs text-zinc-500">Loading bike database...</p>
                            )}
                        </div>

                        {/* Card: Price & On-road */}
                        <div className="rounded-2xl border border-white/10 bg-[#111]/80 p-5 space-y-4 backdrop-blur-xl">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-white">
                                    Motorcycle Price (₹)
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-400">On-road (+15%)</span>
                                    <button
                                        type="button"
                                        onClick={() => setIncludeOnRoad(!includeOnRoad)}
                                        className={`relative h-5 w-9 rounded-full transition-colors ${
                                            includeOnRoad ? "bg-orange-500" : "bg-white/20"
                                        }`}
                                    >
                                        <span
                                            className={`block h-4 w-4 rounded-full bg-black shadow transition-transform ${
                                                includeOnRoad ? "translate-x-4" : "translate-x-0.5"
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="relative">
                                <span className="absolute left-4 top-3 text-zinc-400">₹</span>
                                <input
                                    type="number"
                                    min={20000}
                                    max={3000000}
                                    step={5000}
                                    value={price}
                                    onChange={(e) => setPrice(Number(e.target.value))}
                                    className="w-full rounded-xl border border-white/10 bg-[#0d0d0f] py-2.5 pl-8 pr-4 text-base font-bold text-white focus:border-orange-500/50 focus:outline-none"
                                />
                            </div>

                            <input
                                type="range"
                                min={30000}
                                max={1500000}
                                step={5000}
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                                className="w-full accent-orange-500 cursor-pointer"
                            />

                            <div className="flex justify-between text-xs text-zinc-500">
                                <span>₹30,000</span>
                                <span>₹5,00,000</span>
                                <span>₹15,00,000+</span>
                            </div>
                        </div>

                        {/* Card: Down Payment */}
                        <div className="rounded-2xl border border-white/10 bg-[#111]/80 p-5 space-y-4 backdrop-blur-xl">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-white">
                                    Down Payment
                                </label>
                                <span className="text-xs font-bold text-orange-400">
                                    {downPaymentPct}% ({inr(calculations.downPaymentAmount)})
                                </span>
                            </div>

                            <input
                                type="range"
                                min={5}
                                max={80}
                                step={5}
                                value={downPaymentPct}
                                onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                                className="w-full accent-orange-500 cursor-pointer"
                            />

                            {/* Quick Presets */}
                            <div className="flex flex-wrap gap-2">
                                {[10, 20, 30, 40, 50].map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setDownPaymentPct(preset)}
                                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                                            downPaymentPct === preset
                                                ? "bg-orange-500 text-black font-bold"
                                                : "bg-white/5 text-zinc-400 hover:text-white"
                                        }`}
                                    >
                                        {preset}%
                                    </button>
                                ))}
                            </div>

                            <div className="rounded-xl bg-white/[0.03] p-3 text-xs text-zinc-400 flex items-center justify-between">
                                <span>Financed Loan Principal:</span>
                                <span className="font-bold text-white">{inr(calculations.loanAmount)}</span>
                            </div>
                        </div>

                        {/* Card: Interest Rate & Loan Tenure */}
                        <div className="rounded-2xl border border-white/10 bg-[#111]/80 p-5 space-y-5 backdrop-blur-xl">
                            {/* Tenure */}
                            <div>
                                <label className="mb-2 block text-sm font-bold text-white">
                                    Loan Tenure (Duration)
                                </label>
                                <div className="grid grid-cols-5 gap-2">
                                    {[1, 2, 3, 4, 5].map((yrs) => (
                                        <button
                                            key={yrs}
                                            type="button"
                                            onClick={() => setTenureYears(yrs)}
                                            className={`flex flex-col items-center justify-center rounded-xl py-2.5 transition ${
                                                tenureYears === yrs
                                                    ? "bg-orange-500 text-black font-black shadow-lg shadow-orange-500/20"
                                                    : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                                            }`}
                                        >
                                            <span className="text-sm font-bold">{yrs} {yrs === 1 ? "Yr" : "Yrs"}</span>
                                            <span className={`text-[10px] ${tenureYears === yrs ? "text-zinc-900" : "text-zinc-500"}`}>
                                                {yrs * 12} mo
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Interest Rate */}
                            <div className="space-y-3 pt-2 border-t border-white/10">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-white">
                                        Interest Rate (% p.a.)
                                    </label>
                                    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#0d0d0f] px-2.5 py-1">
                                        <input
                                            type="number"
                                            step={0.1}
                                            min={5}
                                            max={25}
                                            value={interestRate}
                                            onChange={(e) => setInterestRate(Number(e.target.value))}
                                            className="w-12 bg-transparent text-right text-xs font-bold text-white focus:outline-none"
                                        />
                                        <span className="text-xs text-zinc-400">%</span>
                                    </div>
                                </div>

                                <input
                                    type="range"
                                    min={7}
                                    max={18}
                                    step={0.1}
                                    value={interestRate}
                                    onChange={(e) => setInterestRate(Number(e.target.value))}
                                    className="w-full accent-orange-500 cursor-pointer"
                                />

                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: "Prime (9.5%)", rate: 9.5 },
                                        { label: "Standard (10.5%)", rate: 10.5 },
                                        { label: "NBFC (12.5%)", rate: 12.5 },
                                    ].map((item) => (
                                        <button
                                            key={item.label}
                                            type="button"
                                            onClick={() => setInterestRate(item.rate)}
                                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                                                interestRate === item.rate
                                                    ? "bg-orange-500 text-black font-bold"
                                                    : "bg-white/5 text-zinc-400 hover:text-white"
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Output & Analytics */}
                    <div className="space-y-6">

                        {/* Hero EMI Display Card */}
                        <div className="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 via-[#141416] to-[#0d0d0f] p-6 shadow-2xl">
                            <div className="flex items-center justify-between">
                                <span className="rounded-full bg-orange-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-orange-400">
                                    Estimated Monthly EMI
                                </span>
                                <span className="text-xs text-zinc-400">
                                    {calculations.totalMonths} Monthly Installments
                                </span>
                            </div>

                            <div className="my-5 flex items-baseline gap-2">
                                <h2 className="text-4xl font-black text-white sm:text-5xl">
                                    {inr(calculations.monthlyEmi)}
                                </h2>
                                <span className="text-base text-zinc-400">/ month</span>
                            </div>

                            {/* Dual breakdown visual bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-zinc-400">
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                                        Principal: {pct(calculations.principalPct)}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                                        Interest: {pct(calculations.interestPct)}
                                    </span>
                                </div>
                                <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className="h-full bg-orange-500 transition-all duration-300"
                                        style={{ width: `${calculations.principalPct}%` }}
                                    />
                                    <div
                                        className="h-full bg-amber-300 transition-all duration-300"
                                        style={{ width: `${calculations.interestPct}%` }}
                                    />
                                </div>
                            </div>

                            {/* Quick Metrics Grid */}
                            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
                                <div>
                                    <p className="text-[11px] uppercase tracking-wider text-zinc-500">Loan Principal</p>
                                    <p className="text-base font-bold text-white">{inr(calculations.loanAmount)}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-wider text-zinc-500">Total Interest</p>
                                    <p className="text-base font-bold text-amber-400">{inr(calculations.totalInterest)}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-wider text-zinc-500">Total Loan Cost</p>
                                    <p className="text-base font-bold text-white">{inr(calculations.totalPayableWithInterest)}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-wider text-zinc-500">Down Payment</p>
                                    <p className="text-base font-bold text-zinc-300">{inr(calculations.downPaymentAmount)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Salary & Affordability Insight Card */}
                        <div className="rounded-2xl border border-white/10 bg-[#111]/80 p-5 backdrop-blur-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Wallet size={16} className="text-orange-400" />
                                <h3 className="text-sm font-bold text-white">Affordability Rule of Thumb</h3>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Financial advisors recommend that your two-wheeler EMI should not exceed{" "}
                                <strong className="text-white">15%–20%</strong> of your take-home monthly salary.
                            </p>
                            <div className="mt-3 flex items-center justify-between rounded-xl bg-orange-500/10 border border-orange-500/20 p-3 text-xs">
                                <span className="text-zinc-300">Suggested Minimum Monthly Income:</span>
                                <span className="font-black text-orange-400">
                                    {inr(calculations.recommendedMinSalary)}+ /mo
                                </span>
                            </div>
                        </div>

                        {/* Bank Comparison Widget */}
                        <div className="rounded-2xl border border-white/10 bg-[#111]/80 p-5 backdrop-blur-xl">
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Building2 size={16} className="text-orange-400" />
                                    <h3 className="text-sm font-bold text-white">Popular Bank Loan Rates</h3>
                                </div>
                                <span className="text-[10px] text-zinc-500">Indicative rates</span>
                            </div>

                            <div className="space-y-2.5">
                                {BANK_RATES.map((bank) => (
                                    <div
                                        key={bank.name}
                                        className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs transition hover:border-orange-500/30"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white">{bank.name}</span>
                                                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold text-orange-400">
                                                    {bank.tag}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-[11px] text-zinc-400">
                                                Rates: {bank.rateRange} · Fee: {bank.processingFee}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setInterestRate(bank.rate)}
                                            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                                                interestRate === bank.rate
                                                    ? "bg-orange-500 text-black"
                                                    : "bg-white/5 text-zinc-300 hover:bg-orange-500/20 hover:text-orange-400"
                                            }`}
                                        >
                                            {interestRate === bank.rate ? "Applied" : "Apply Rate"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Amortization Schedule Toggle */}
                        <div className="rounded-2xl border border-white/10 bg-[#111]/80 p-5 backdrop-blur-xl">
                            <button
                                type="button"
                                onClick={() => setShowAmortization(!showAmortization)}
                                className="flex w-full items-center justify-between text-left"
                            >
                                <span className="flex items-center gap-2 text-sm font-bold text-white">
                                    <Calendar size={16} className="text-orange-400" />
                                    Yearly Amortization Schedule ({tenureYears} Years)
                                </span>
                                <ChevronDown
                                    size={16}
                                    className={`text-zinc-400 transition-transform ${
                                        showAmortization ? "rotate-180" : ""
                                    }`}
                                />
                            </button>

                            {showAmortization && (
                                <div className="mt-4 overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-white/10 text-zinc-500">
                                                <th className="pb-2">Year</th>
                                                <th className="pb-2">Opening</th>
                                                <th className="pb-2">Principal</th>
                                                <th className="pb-2">Interest</th>
                                                <th className="pb-2">Closing</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-zinc-300">
                                            {calculations.yearlySchedule.map((row) => (
                                                <tr key={row.year} className="hover:bg-white/[0.02]">
                                                    <td className="py-2.5 font-bold text-white">Yr {row.year}</td>
                                                    <td className="py-2.5">{inr(row.openingBalance)}</td>
                                                    <td className="py-2.5 text-orange-400">{inr(row.principalPaid)}</td>
                                                    <td className="py-2.5 text-amber-400">{inr(row.interestPaid)}</td>
                                                    <td className="py-2.5">{inr(row.closingBalance)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Ask MotoMind AI Button */}
                        <button
                            type="button"
                            onClick={askMotoMind}
                            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-orange-500 py-4 text-sm font-black text-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-400"
                        >
                            <Sparkles size={18} />
                            Ask MotoMind AI: Is This Loan Good For Me?
                        </button>

                        {/* Cross-Link Card to Ownership Cost */}
                        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                            <div>
                                <p className="text-xs font-bold text-white">Need to factor in fuel & maintenance?</p>
                                <p className="text-[11px] text-zinc-400">Calculate 5-year running costs beyond just loan EMI.</p>
                            </div>
                            <Link
                                to={`/ownership-cost?${selectedBikeName ? `bike=${encodeURIComponent(selectedBikeName)}&` : ""}price=${price}`}
                                className="flex shrink-0 items-center gap-1 rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-orange-400 transition hover:bg-orange-500/10"
                            >
                                Ownership Cost
                                <ArrowRight size={13} />
                            </Link>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
}
