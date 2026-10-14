import React, { useState, useEffect, useRef } from "react";
import {
    X,
    Shield,
    ShieldCheck,
    Lock,
    QrCode,
    CreditCard,
    Building2,
    Wallet,
    Zap,
    Smartphone,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Sparkles,
    Eye,
    EyeOff,
    Check,
    Receipt,
    Clock,
    Info,
    ExternalLink,
} from "lucide-react";
import {
    SiGooglepay,
    SiPhonepe,
    SiPaytm,
    SiApplepay,
} from "react-icons/si";
import { FaUniversity, FaRegCreditCard } from "react-icons/fa";
import { verifySubscriptionPayment } from "../services/api";

const TOP_BANKS = [
    { id: "hdfc", name: "HDFC Bank", code: "HDFC", color: "from-blue-900 to-blue-700", badge: "Popular" },
    { id: "sbi", name: "State Bank of India", code: "SBI", color: "from-sky-700 to-cyan-600", badge: "Govt." },
    { id: "icici", name: "ICICI Bank", code: "ICICI", color: "from-amber-700 to-orange-600", badge: "Popular" },
    { id: "axis", name: "Axis Bank", code: "AXIS", color: "from-pink-900 to-rose-700", badge: "" },
    { id: "kotak", name: "Kotak Mahindra", code: "KOTAK", color: "from-red-800 to-red-600", badge: "" },
    { id: "pnb", name: "Punjab National", code: "PNB", color: "from-yellow-700 to-amber-600", badge: "" },
];

const ALL_OTHER_BANKS = [
    "Bank of Baroda",
    "Canara Bank",
    "Union Bank of India",
    "IndusInd Bank",
    "Federal Bank",
    "IDFC FIRST Bank",
    "Yes Bank",
    "Bank of India",
    "Central Bank of India",
    "Indian Bank",
    "RBL Bank",
    "South Indian Bank",
    "AU Small Finance Bank",
];

const POPULAR_WALLETS = [
    { id: "amazonpay", name: "Amazon Pay", icon: "🛒", offer: "₹25 Cashback" },
    { id: "paytm", name: "Paytm Wallet", icon: "📱", offer: "Instant Refund" },
    { id: "phonepe", name: "PhonePe Wallet", icon: "⚡", offer: "Zero Surcharge" },
    { id: "mobikwik", name: "MobiKwik", icon: "👛", offer: "SuperCash Valid" },
];

const EMI_OPTIONS = [
    { id: "lazypay", name: "LazyPay", desc: "Pay in 30 days • 0% Interest", logo: "⚡" },
    { id: "simpl", name: "Simpl", desc: "1-Tap Checkout • Pay next month", logo: "🟢" },
    { id: "icici_paylater", name: "ICICI PayLater", desc: "Pre-approved credit line", logo: "🏦" },
];

export default function DummyPaymentGateway({
    open,
    onClose,
    order,
    selectedPlan = "monthly",
    planConfig,
    onSuccess,
}) {
    if (!open || !order) return null;

    const amount = Number(order.amount || (selectedPlan === "yearly" ? 999 : 100));
    const orderId = order.orderId || order.order?.id || `ord_${Date.now()}`;
    const planName = selectedPlan === "yearly" ? "MOTOAI Premium (Annual)" : "MOTOAI Premium (Monthly)";
    const tokens = planConfig?.tokens || (selectedPlan === "yearly" ? 6000 : 500);
    const days = planConfig?.days || (selectedPlan === "yearly" ? 365 : 30);

    // Flow states: 'select' | 'processing' | 'otp' | 'upi_approval' | 'verifying' | 'success' | 'failed'
    const [stage, setStage] = useState("select");
    const [activeMode, setActiveMode] = useState("upi"); // 'upi' | 'card' | 'netbanking' | 'wallet' | 'emi'
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // UPI Mode state
    const [upiSubMode, setUpiSubMode] = useState("qr"); // 'qr' | 'vpa'
    const [vpaInput, setVpaInput] = useState("rider@okhdfcbank");
    const [qrTimeLeft, setQrTimeLeft] = useState(299);

    // Card Mode state
    const [cardNumber, setCardNumber] = useState("4532 8912 3456 7890");
    const [cardHolder, setCardHolder] = useState("MOTOAI RIDER");
    const [expiry, setExpiry] = useState("12/28");
    const [cvv, setCvv] = useState("892");
    const [showCvv, setShowCvv] = useState(false);
    const [saveCard, setSaveCard] = useState(true);

    // Net Banking state
    const [selectedBank, setSelectedBank] = useState("HDFC Bank");

    // Wallet state
    const [selectedWallet, setSelectedWallet] = useState("amazonpay");
    const [walletPhone, setWalletPhone] = useState("9876543210");

    // EMI state
    const [selectedEmi, setSelectedEmi] = useState("lazypay");

    // Simulation / OTP state
    const [otpCode, setOtpCode] = useState("");
    const [otpSecondsLeft, setOtpSecondsLeft] = useState(30);
    const [generatedPaymentId, setGeneratedPaymentId] = useState("");
    const [finalReceipt, setFinalReceipt] = useState(null);

    // QR countdown
    useEffect(() => {
        if (!open || stage !== "select" || upiSubMode !== "qr") return;
        const interval = setInterval(() => {
            setQrTimeLeft((prev) => (prev > 0 ? prev - 1 : 300));
        }, 1000);
        return () => clearInterval(interval);
    }, [open, stage, upiSubMode]);

    // OTP countdown
    useEffect(() => {
        if (stage !== "otp") return;
        const interval = setInterval(() => {
            setOtpSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [stage]);

    // Detect card brand
    const getCardBrand = (num) => {
        const clean = num.replace(/\s+/g, "");
        if (clean.startsWith("4")) return "Visa";
        if (clean.startsWith("5")) return "Mastercard";
        if (clean.startsWith("6")) return "RuPay";
        if (clean.startsWith("3")) return "Amex";
        return "Card";
    };

    // Auto-format card number
    const handleCardNumberChange = (e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 16);
        const parts = v.match(/.{1,4}/g);
        setCardNumber(parts ? parts.join(" ") : v);
    };

    // Auto-format expiry
    const handleExpiryChange = (e) => {
        let v = e.target.value.replace(/\D/g, "").slice(0, 4);
        if (v.length > 2) {
            v = `${v.slice(0, 2)}/${v.slice(2)}`;
        }
        setExpiry(v);
    };

    // Card fill presets
    const applyTestCard = (brand) => {
        if (brand === "visa") {
            setCardNumber("4111 2222 3333 4444");
            setExpiry("08/29");
            setCvv("741");
            setCardHolder("ALEX RIDER");
        } else if (brand === "mastercard") {
            setCardNumber("5200 8912 7654 3210");
            setExpiry("11/28");
            setCvv("512");
            setCardHolder("JORDAN MOTO");
        } else if (brand === "rupay") {
            setCardNumber("6071 5283 9104 2289");
            setExpiry("05/30");
            setCvv("389");
            setCardHolder("VIKRAM SINGH");
        }
    };

    // Start payment simulation
    const handleInitiatePayment = () => {
        setErrorMsg("");

        if (activeMode === "card") {
            const clean = cardNumber.replace(/\s+/g, "");
            if (clean.length < 15) {
                setErrorMsg("Please enter a valid 16-digit card number.");
                return;
            }
            if (expiry.length < 5) {
                setErrorMsg("Please enter valid card expiry (MM/YY).");
                return;
            }
            if (cvv.length < 3) {
                setErrorMsg("Please enter 3-digit CVV.");
                return;
            }
        } else if (activeMode === "upi" && upiSubMode === "vpa") {
            if (!vpaInput || !vpaInput.includes("@")) {
                setErrorMsg("Please enter a valid UPI ID (e.g. yourname@okhdfcbank).");
                return;
            }
        }

        // Generate realistic transaction reference
        const prefixMap = {
            upi: "UPI",
            card: "CARD",
            netbanking: "NB",
            wallet: "WLT",
            emi: "EMI",
        };
        const randomHex = Math.random().toString(36).substring(2, 9).toUpperCase();
        const payId = `pay_${prefixMap[activeMode] || "TXN"}_${Date.now().toString(36).toUpperCase()}${randomHex}`;
        setGeneratedPaymentId(payId);

        setStage("processing");

        // After quick TLS handshake, route to authentication simulation
        setTimeout(() => {
            if (activeMode === "card" || activeMode === "netbanking") {
                setOtpCode("");
                setOtpSecondsLeft(30);
                setStage("otp");
            } else if (activeMode === "upi") {
                setStage("upi_approval");
            } else {
                // Wallet or EMI direct authorization
                processFinalVerification(payId);
            }
        }, 1200);
    };

    // Process final verification via API
    const processFinalVerification = async (payId) => {
        const idToVerify = payId || generatedPaymentId || `pay_DUMMY_${Date.now()}`;
        setStage("verifying");

        try {
            const payload = {
                orderId,
                paymentId: idToVerify,
                paymentMethod: activeMode,
            };

            const response = await verifySubscriptionPayment(payload);

            const receiptData = {
                paymentId: idToVerify,
                orderId,
                amount,
                plan: planName,
                tokens,
                days,
                paymentMethod: activeMode.toUpperCase(),
                methodDetails:
                    activeMode === "upi"
                        ? upiSubMode === "qr"
                            ? "BHIM / UPI Dynamic QR"
                            : vpaInput
                        : activeMode === "card"
                        ? `${getCardBrand(cardNumber)} ending with ${cardNumber.slice(-4)}`
                        : activeMode === "netbanking"
                        ? selectedBank
                        : activeMode === "wallet"
                        ? POPULAR_WALLETS.find((w) => w.id === selectedWallet)?.name || "Wallet"
                        : "LazyPay PayLater",
                timestamp: new Date().toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                }),
            };

            setFinalReceipt(receiptData);
            setStage("success");

            // Update user in localStorage immediately so all components see premium status synchronously
            try {
                const stored = JSON.parse(localStorage.getItem("user") || "{}");
                localStorage.setItem(
                    "user",
                    JSON.stringify({
                        ...stored,
                        aiPlan: response.plan || "premium",
                        aiPlanType: response.planType || "monthly",
                        aiTokens: response.tokens,
                    })
                );
            } catch (storageErr) {
                console.warn("Could not sync user to localStorage:", storageErr);
            }

            // Dispatch global event for navbar and listeners
            window.dispatchEvent(new Event("subscriptionUpdated"));

            if (onSuccess) {
                onSuccess(response.wallet || response);
            }
        } catch (err) {
            setErrorMsg(err.message || "Payment verification failed. Please try again.");
            setStage("failed");
        }
    };

    // Format seconds into MM:SS
    const formatTimer = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    };

    const baseAmount = (amount / 1.18).toFixed(2);
    const gstAmount = (amount - Number(baseAmount)).toFixed(2);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-3 md:p-6 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-white/10 bg-[#0b0e14] shadow-2xl overflow-hidden text-white font-sans">
                {/* ============================================================== */}
                {/* 1. SECURE GATEWAY HEADER                                       */}
                {/* ============================================================== */}
                <div className="flex items-center justify-between border-b border-white/10 bg-[#0e131d] px-5 py-3.5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-black shadow-lg shadow-orange-500/20 font-black text-sm">
                            M
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm tracking-wide text-white">
                                    MOTOAI Pay
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                                    <ShieldCheck size={11} /> Verified Merchant
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-400">
                                MOTOAI Technologies Pvt. Ltd. • ISO 27001
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-400 bg-white/[0.04] px-3 py-1.5 rounded-full border border-white/5">
                            <Lock size={12} className="text-emerald-400" />
                            <span>256-Bit SSL • PCI-DSS Level 1</span>
                        </div>

                        {stage !== "verifying" && stage !== "processing" && (
                            <button
                                onClick={onClose}
                                aria-label="Cancel Payment"
                                className="rounded-xl p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* ============================================================== */}
                {/* 2. ORDER SUMMARY BAR                                           */}
                {/* ============================================================== */}
                <div className="border-b border-white/5 bg-[#0f1420]/80 px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-zinc-200">
                                    {planName}
                                </span>
                                <span className="rounded-md bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                                    +{tokens.toLocaleString("en-IN")} AI Tokens
                                </span>
                            </div>
                            <p className="text-[11px] font-mono text-zinc-500">
                                Order ID: <span className="text-zinc-400">{orderId}</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-lg font-black text-white tracking-tight">
                                    ₹{amount.toLocaleString("en-IN")}.00
                                </div>
                                <button
                                    onClick={() => setShowBreakdown(!showBreakdown)}
                                    className="inline-flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 font-medium"
                                >
                                    {showBreakdown ? "Hide Breakdown" : "Price Details"}
                                    {showBreakdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {showBreakdown && (
                        <div className="mt-3 rounded-xl border border-white/5 bg-black/40 p-3 text-xs space-y-1.5 text-zinc-400 animate-fade-in">
                            <div className="flex justify-between">
                                <span>Base Plan Subscription ({days} Days):</span>
                                <span className="font-mono text-zinc-300">₹{baseAmount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>GST (18% Integrated GST):</span>
                                <span className="font-mono text-zinc-300">₹{gstAmount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Platform Convenience Fee:</span>
                                <span className="font-semibold text-emerald-400">FREE (Waived)</span>
                            </div>
                            <div className="border-t border-white/10 pt-1.5 flex justify-between font-bold text-white">
                                <span>Total Payable:</span>
                                <span className="font-mono text-orange-400">₹{amount.toLocaleString("en-IN")}.00</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* ============================================================== */}
                {/* 3. DYNAMIC CONTENT AREA BASED ON STAGE                         */}
                {/* ============================================================== */}
                <div className="flex-1 overflow-y-auto">
                    {/* ---------------------------------------------------------- */}
                    {/* STAGE A: PAYMENT METHOD SELECTION & INPUT                  */}
                    {/* ---------------------------------------------------------- */}
                    {stage === "select" && (
                        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
                            {/* LEFT COLUMN: Payment Methods Menu */}
                            <div className="md:col-span-4 border-r border-white/5 bg-[#0a0d13] p-3 space-y-1.5">
                                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                    Payment Methods
                                </div>

                                {/* UPI / QR */}
                                <button
                                    onClick={() => {
                                        setActiveMode("upi");
                                        setErrorMsg("");
                                    }}
                                    className={`w-full flex items-center justify-between rounded-2xl p-3 text-left transition ${
                                        activeMode === "upi"
                                            ? "bg-gradient-to-r from-orange-500/20 to-orange-500/5 border border-orange-500/40 text-white shadow-sm"
                                            : "hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${activeMode === "upi" ? "bg-orange-500 text-black font-bold" : "bg-white/5 text-zinc-400"}`}>
                                            <QrCode size={18} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-xs">UPI / QR Code</div>
                                            <div className="text-[10px] text-zinc-500">Google Pay, PhonePe, Paytm</div>
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
                                        Instant
                                    </span>
                                </button>

                                {/* Cards */}
                                <button
                                    onClick={() => {
                                        setActiveMode("card");
                                        setErrorMsg("");
                                    }}
                                    className={`w-full flex items-center justify-between rounded-2xl p-3 text-left transition ${
                                        activeMode === "card"
                                            ? "bg-gradient-to-r from-orange-500/20 to-orange-500/5 border border-orange-500/40 text-white shadow-sm"
                                            : "hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${activeMode === "card" ? "bg-orange-500 text-black font-bold" : "bg-white/5 text-zinc-400"}`}>
                                            <CreditCard size={18} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-xs">Cards (Credit/Debit)</div>
                                            <div className="text-[10px] text-zinc-500">Visa, Mastercard, RuPay</div>
                                        </div>
                                    </div>
                                </button>

                                {/* Net Banking */}
                                <button
                                    onClick={() => {
                                        setActiveMode("netbanking");
                                        setErrorMsg("");
                                    }}
                                    className={`w-full flex items-center justify-between rounded-2xl p-3 text-left transition ${
                                        activeMode === "netbanking"
                                            ? "bg-gradient-to-r from-orange-500/20 to-orange-500/5 border border-orange-500/40 text-white shadow-sm"
                                            : "hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${activeMode === "netbanking" ? "bg-orange-500 text-black font-bold" : "bg-white/5 text-zinc-400"}`}>
                                            <Building2 size={18} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-xs">Net Banking</div>
                                            <div className="text-[10px] text-zinc-500">All Indian Banks</div>
                                        </div>
                                    </div>
                                </button>

                                {/* Wallets */}
                                <button
                                    onClick={() => {
                                        setActiveMode("wallet");
                                        setErrorMsg("");
                                    }}
                                    className={`w-full flex items-center justify-between rounded-2xl p-3 text-left transition ${
                                        activeMode === "wallet"
                                            ? "bg-gradient-to-r from-orange-500/20 to-orange-500/5 border border-orange-500/40 text-white shadow-sm"
                                            : "hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${activeMode === "wallet" ? "bg-orange-500 text-black font-bold" : "bg-white/5 text-zinc-400"}`}>
                                            <Wallet size={18} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-xs">Wallets</div>
                                            <div className="text-[10px] text-zinc-500">Paytm, Amazon Pay</div>
                                        </div>
                                    </div>
                                </button>

                                {/* EMI & Pay Later */}
                                <button
                                    onClick={() => {
                                        setActiveMode("emi");
                                        setErrorMsg("");
                                    }}
                                    className={`w-full flex items-center justify-between rounded-2xl p-3 text-left transition ${
                                        activeMode === "emi"
                                            ? "bg-gradient-to-r from-orange-500/20 to-orange-500/5 border border-orange-500/40 text-white shadow-sm"
                                            : "hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${activeMode === "emi" ? "bg-orange-500 text-black font-bold" : "bg-white/5 text-zinc-400"}`}>
                                            <Zap size={18} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-xs">EMI / Pay Later</div>
                                            <div className="text-[10px] text-zinc-500">LazyPay, Simpl, Flexi</div>
                                        </div>
                                    </div>
                                </button>

                                <div className="mt-8 pt-4 border-t border-white/5 px-3">
                                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                        <Shield size={12} className="text-zinc-400" />
                                        <span>RBI Certified Payment Protocol</span>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Mode-Specific Form */}
                            <div className="md:col-span-8 p-5 md:p-6 flex flex-col justify-between bg-[#0c1018]">
                                <div>
                                    {errorMsg && (
                                        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400 flex items-center gap-2">
                                            <AlertCircle size={15} />
                                            <span>{errorMsg}</span>
                                        </div>
                                    )}

                                    {/* ---------------- MODE 1: UPI ---------------- */}
                                    {activeMode === "upi" && (
                                        <div className="space-y-4">
                                            {/* Submode Switcher */}
                                            <div className="flex rounded-xl bg-white/[0.04] p-1 border border-white/10 max-w-sm">
                                                <button
                                                    onClick={() => setUpiSubMode("qr")}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                                                        upiSubMode === "qr"
                                                            ? "bg-orange-500 text-black shadow"
                                                            : "text-zinc-400 hover:text-white"
                                                    }`}
                                                >
                                                    Scan QR Code
                                                </button>
                                                <button
                                                    onClick={() => setUpiSubMode("vpa")}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                                                        upiSubMode === "vpa"
                                                            ? "bg-orange-500 text-black shadow"
                                                            : "text-zinc-400 hover:text-white"
                                                    }`}
                                                >
                                                    Enter UPI ID / VPA
                                                </button>
                                            </div>

                                            {upiSubMode === "qr" ? (
                                                <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-white/10 bg-black/40 text-center">
                                                    {/* Authentic QR Visual */}
                                                    <div className="relative p-3 rounded-2xl bg-white shadow-xl shadow-orange-500/5 border-4 border-orange-500/30">
                                                        {/* Scanning Laser Line */}
                                                        <div className="absolute inset-x-3 top-3 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse" />

                                                        <svg width="170" height="170" viewBox="0 0 170 170" fill="none">
                                                            {/* Background QR matrix simulation */}
                                                            <rect width="170" height="170" fill="white" />
                                                            {/* Top Left Marker */}
                                                            <rect x="15" y="15" width="40" height="40" rx="6" fill="#111827" />
                                                            <rect x="23" y="23" width="24" height="24" rx="2" fill="white" />
                                                            <rect x="29" y="29" width="12" height="12" rx="2" fill="#f97316" />
                                                            {/* Top Right Marker */}
                                                            <rect x="115" y="15" width="40" height="40" rx="6" fill="#111827" />
                                                            <rect x="123" y="23" width="24" height="24" rx="2" fill="white" />
                                                            <rect x="129" y="29" width="12" height="12" rx="2" fill="#f97316" />
                                                            {/* Bottom Left Marker */}
                                                            <rect x="15" y="115" width="40" height="40" rx="6" fill="#111827" />
                                                            <rect x="23" y="123" width="24" height="24" rx="2" fill="white" />
                                                            <rect x="29" y="129" width="12" height="12" rx="2" fill="#f97316" />

                                                            {/* Simulated Data Blocks */}
                                                            <circle cx="70" cy="25" r="4" fill="#1f2937" />
                                                            <circle cx="85" cy="25" r="4" fill="#1f2937" />
                                                            <circle cx="100" cy="25" r="4" fill="#1f2937" />
                                                            <rect x="65" y="38" width="38" height="6" rx="2" fill="#374151" />
                                                            <circle cx="25" cy="70" r="4" fill="#1f2937" />
                                                            <circle cx="25" cy="85" r="4" fill="#1f2937" />
                                                            <circle cx="25" cy="100" r="4" fill="#1f2937" />
                                                            <rect x="115" y="65" width="6" height="38" rx="2" fill="#374151" />

                                                            {/* Center Logo Shield */}
                                                            <rect x="65" y="65" width="40" height="40" rx="10" fill="#f97316" />
                                                            <text x="85" y="89" fill="black" fontSize="14" fontWeight="bold" textAnchor="middle">MOTO</text>

                                                            {/* Bottom Right Scatter */}
                                                            <circle cx="125" cy="125" r="5" fill="#1f2937" />
                                                            <circle cx="145" cy="125" r="5" fill="#1f2937" />
                                                            <circle cx="125" cy="145" r="5" fill="#1f2937" />
                                                            <circle cx="145" cy="145" r="5" fill="#1f2937" />
                                                            <rect x="65" y="120" width="38" height="6" rx="2" fill="#374151" />
                                                            <circle cx="85" cy="138" r="4" fill="#1f2937" />
                                                        </svg>
                                                    </div>

                                                    <p className="mt-3 text-xs font-semibold text-zinc-200">
                                                        Scan with GPay, PhonePe, Paytm, or any UPI App
                                                    </p>
                                                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400">
                                                        <Clock size={12} className="text-orange-400" />
                                                        <span>QR code valid for {formatTimer(qrTimeLeft)}</span>
                                                    </div>

                                                    <div className="mt-3 flex items-center gap-3 text-zinc-400 text-xs">
                                                        <SiGooglepay size={22} title="Google Pay" className="text-zinc-300" />
                                                        <SiPhonepe size={18} title="PhonePe" className="text-purple-400" />
                                                        <SiPaytm size={24} title="Paytm" className="text-sky-400" />
                                                        <span className="font-bold text-[10px] text-zinc-400">BHIM</span>
                                                        <span className="font-bold text-[10px] text-zinc-400">CRED</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                                            Virtual Payment Address (UPI ID)
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={vpaInput}
                                                                onChange={(e) => setVpaInput(e.target.value)}
                                                                placeholder="e.g. yourname@okhdfcbank"
                                                                className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                                            />
                                                            {vpaInput.includes("@") && (
                                                                <span className="absolute right-3 top-3.5 flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                                                                    <Check size={14} /> Verified
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Quick handle pills */}
                                                    <div>
                                                        <p className="text-[11px] text-zinc-400 mb-1.5">Quick Handles:</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {["@okhdfcbank", "@oksbi", "@paytm", "@ybl", "@upi"].map((handle) => (
                                                                <button
                                                                    key={handle}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const base = vpaInput.split("@")[0] || "rider";
                                                                        setVpaInput(`${base}${handle}`);
                                                                    }}
                                                                    className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-white/10 hover:text-white transition"
                                                                >
                                                                    {handle}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-zinc-400">
                                                        💡 A payment notification of <strong className="text-white">₹{amount}</strong> will be sent to your UPI app for 1-click confirmation.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ---------------- MODE 2: CARDS ---------------- */}
                                    {activeMode === "card" && (
                                        <div className="space-y-4">
                                            {/* Virtual Metallic Card Preview */}
                                            <div className="relative mx-auto w-full max-w-sm rounded-2xl bg-gradient-to-tr from-zinc-900 via-neutral-800 to-zinc-900 p-5 border border-white/15 shadow-2xl text-white">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-9 rounded bg-amber-400/80 border border-amber-300 shadow-inner flex items-center justify-center text-[8px] font-bold text-black">
                                                            CHIP
                                                        </div>
                                                        <span className="text-[10px] text-zinc-400 font-mono tracking-widest">
                                                            DEBIT / CREDIT
                                                        </span>
                                                    </div>
                                                    <span className="font-extrabold text-sm tracking-wider text-orange-400">
                                                        {getCardBrand(cardNumber)}
                                                    </span>
                                                </div>

                                                <div className="mt-4 font-mono text-base font-bold tracking-widest text-zinc-100">
                                                    {cardNumber || "•••• •••• •••• ••••"}
                                                </div>

                                                <div className="mt-4 flex items-center justify-between text-xs">
                                                    <div>
                                                        <div className="text-[9px] uppercase tracking-wider text-zinc-400">Card Holder</div>
                                                        <div className="font-bold tracking-wide truncate max-w-[150px]">
                                                            {cardHolder || "MOTOAI RIDER"}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] uppercase tracking-wider text-zinc-400">Expires</div>
                                                        <div className="font-mono font-bold">{expiry || "MM/YY"}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Test Card Quick Fill Buttons */}
                                            <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                                <span>Quick Test Presets:</span>
                                                <div className="flex gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => applyTestCard("visa")}
                                                        className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-zinc-300 hover:text-white hover:bg-white/10 transition"
                                                    >
                                                        Visa
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyTestCard("mastercard")}
                                                        className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-zinc-300 hover:text-white hover:bg-white/10 transition"
                                                    >
                                                        Mastercard
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyTestCard("rupay")}
                                                        className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-zinc-300 hover:text-white hover:bg-white/10 transition"
                                                    >
                                                        RuPay
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Card Input Form */}
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                                        Card Number
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={cardNumber}
                                                        onChange={handleCardNumberChange}
                                                        placeholder="4532 8912 3456 7890"
                                                        className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 font-mono text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                                            Valid Thru (MM/YY)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={expiry}
                                                            onChange={handleExpiryChange}
                                                            placeholder="MM/YY"
                                                            className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 font-mono text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                                            CVV / CVC
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type={showCvv ? "text" : "password"}
                                                                value={cvv}
                                                                maxLength={4}
                                                                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                                                                placeholder="•••"
                                                                className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 font-mono text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowCvv(!showCvv)}
                                                                className="absolute right-3 top-3 text-zinc-400 hover:text-white"
                                                            >
                                                                {showCvv ? <EyeOff size={15} /> : <Eye size={15} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                                                        Cardholder Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={cardHolder}
                                                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                                                        placeholder="Name on card"
                                                        className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm uppercase text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                                                    />
                                                </div>

                                                <label className="flex items-center gap-2 cursor-pointer pt-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={saveCard}
                                                        onChange={(e) => setSaveCard(e.target.checked)}
                                                        className="rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-0"
                                                    />
                                                    <span className="text-[11px] text-zinc-400">
                                                        Save card securely as per RBI tokenization guidelines
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* ---------------- MODE 3: NET BANKING ---------------- */}
                                    {activeMode === "netbanking" && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-zinc-400">
                                                Select your bank to authorize payment via secure net banking gateway:
                                            </p>

                                            {/* Popular Banks Grid */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                {TOP_BANKS.map((b) => (
                                                    <button
                                                        key={b.id}
                                                        type="button"
                                                        onClick={() => setSelectedBank(b.name)}
                                                        className={`relative flex flex-col items-center justify-center p-3.5 rounded-2xl border transition text-center ${
                                                            selectedBank === b.name
                                                                ? "bg-orange-500/10 border-orange-500 text-white shadow-md shadow-orange-500/10"
                                                                : "border-white/10 bg-black/40 hover:bg-white/5 text-zinc-300"
                                                        }`}
                                                    >
                                                        {b.badge && (
                                                            <span className="absolute top-2 right-2 text-[9px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.2 rounded-full border border-orange-500/20">
                                                                {b.badge}
                                                            </span>
                                                        )}
                                                        <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${b.color} text-white font-black text-xs flex items-center justify-center shadow`}>
                                                            {b.code.slice(0, 2)}
                                                        </div>
                                                        <span className="mt-2 text-xs font-bold leading-tight">
                                                            {b.name}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* All Other Banks Dropdown */}
                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                                    Or Choose Other Bank
                                                </label>
                                                <select
                                                    value={selectedBank}
                                                    onChange={(e) => setSelectedBank(e.target.value)}
                                                    className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                                                >
                                                    <option value={selectedBank}>{selectedBank} (Selected)</option>
                                                    {ALL_OTHER_BANKS.map((bank) => (
                                                        <option key={bank} value={bank}>
                                                            {bank}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* ---------------- MODE 4: WALLETS ---------------- */}
                                    {activeMode === "wallet" && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-zinc-400">
                                                Link your digital wallet for instant 1-click debits:
                                            </p>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {POPULAR_WALLETS.map((w) => (
                                                    <button
                                                        key={w.id}
                                                        type="button"
                                                        onClick={() => setSelectedWallet(w.id)}
                                                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                                                            selectedWallet === w.id
                                                                ? "bg-orange-500/10 border-orange-500 text-white"
                                                                : "border-white/10 bg-black/40 hover:bg-white/5 text-zinc-300"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-2xl">{w.icon}</span>
                                                            <div className="text-left">
                                                                <div className="text-xs font-bold">{w.name}</div>
                                                                <div className="text-[10px] text-emerald-400">{w.offer}</div>
                                                            </div>
                                                        </div>
                                                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                                            selectedWallet === w.id ? "border-orange-500 bg-orange-500 text-black" : "border-zinc-600"
                                                        }`}>
                                                            {selectedWallet === w.id && <Check size={10} />}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                                    Linked Mobile Number
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={walletPhone}
                                                    onChange={(e) => setWalletPhone(e.target.value)}
                                                    placeholder="10-digit mobile number"
                                                    className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 font-mono text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* ---------------- MODE 5: EMI / PAY LATER ---------------- */}
                                    {activeMode === "emi" && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-zinc-400">
                                                Checkout now, pay later with 0% interest convenience credit lines:
                                            </p>

                                            <div className="space-y-2.5">
                                                {EMI_OPTIONS.map((e) => (
                                                    <button
                                                        key={e.id}
                                                        type="button"
                                                        onClick={() => setSelectedEmi(e.id)}
                                                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition ${
                                                            selectedEmi === e.id
                                                                ? "bg-orange-500/10 border-orange-500 text-white"
                                                                : "border-white/10 bg-black/40 hover:bg-white/5 text-zinc-300"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xl">{e.logo}</span>
                                                            <div className="text-left">
                                                                <div className="text-xs font-bold">{e.name}</div>
                                                                <div className="text-[11px] text-zinc-400">{e.desc}</div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                                            Pre-Approved
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Main Action Bar */}
                                <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div className="text-xs text-zinc-400 text-center sm:text-left">
                                        Amount to pay: <span className="font-bold text-white text-sm">₹{amount.toLocaleString("en-IN")}.00</span>
                                    </div>

                                    <div className="flex w-full sm:w-auto items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="flex-1 sm:flex-none px-4 py-3 rounded-xl border border-white/10 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleInitiatePayment}
                                            className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-extrabold text-xs tracking-wide shadow-lg shadow-orange-500/25 hover:from-orange-400 hover:to-amber-400 transition flex items-center justify-center gap-2"
                                        >
                                            <span>Pay ₹{amount.toLocaleString("en-IN")}.00</span>
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ---------------------------------------------------------- */}
                    {/* STAGE B: CONNECTING & INITIAL AUTHORIZING                  */}
                    {/* ---------------------------------------------------------- */}
                    {stage === "processing" && (
                        <div className="flex flex-col items-center justify-center p-12 text-center min-h-[460px] space-y-4">
                            <div className="relative flex h-20 w-20 items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
                                <Lock size={28} className="text-orange-400 animate-pulse" />
                            </div>
                            <h3 className="text-lg font-bold text-white">
                                Connecting to Payment Gateway...
                            </h3>
                            <p className="text-xs text-zinc-400 max-w-sm">
                                Establishing 256-bit encrypted handshake with {activeMode === "upi" ? "NPCI UPI Gateway" : activeMode === "card" ? "Visa / Mastercard 3D Secure" : selectedBank}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                <ShieldCheck size={14} className="text-emerald-400" />
                                <span>Do not refresh or close this browser window</span>
                            </div>
                        </div>
                    )}

                    {/* ---------------------------------------------------------- */}
                    {/* STAGE C: CARD / NETBANKING 3D-SECURE ACS OTP PROMPT         */}
                    {/* ---------------------------------------------------------- */}
                    {stage === "otp" && (
                        <div className="p-6 md:p-8 max-w-lg mx-auto text-center min-h-[460px] flex flex-col justify-center">
                            <div className="rounded-2xl border border-white/10 bg-[#0e131d] p-6 text-left shadow-2xl">
                                {/* Bank Header */}
                                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                    <div className="flex items-center gap-2 font-black text-sm text-white">
                                        <Building2 size={18} className="text-orange-500" />
                                        <span>{activeMode === "card" ? `${getCardBrand(cardNumber)} 3D Secure ACS` : selectedBank}</span>
                                    </div>
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                                        Verified
                                    </span>
                                </div>

                                <div className="py-4 space-y-2 text-xs text-zinc-300">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Merchant:</span>
                                        <span className="font-bold text-white">MOTOAI Technologies Pvt. Ltd.</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Amount:</span>
                                        <span className="font-mono font-bold text-orange-400">₹{amount.toLocaleString("en-IN")}.00</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Card / Account:</span>
                                        <span className="font-mono text-zinc-300">
                                            {activeMode === "card" ? `•••• •••• •••• ${cardNumber.slice(-4)}` : `${selectedBank} ••••9102`}
                                        </span>
                                    </div>
                                </div>

                                <div className="border-t border-white/10 pt-4">
                                    <label className="block text-xs font-semibold text-zinc-300 mb-2">
                                        Enter 6-digit OTP sent to registered mobile ending with ••••8912:
                                    </label>
                                    <div className="flex gap-2 justify-center my-3">
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                                            placeholder="482910"
                                            className="w-full text-center text-xl tracking-[0.4em] font-mono font-bold py-2.5 rounded-xl border border-orange-500/50 bg-black/60 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        />
                                    </div>

                                    {/* Auto-fill Helper */}
                                    <div className="flex items-center justify-between text-[11px] mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setOtpCode("482910")}
                                            className="text-orange-400 hover:text-orange-300 font-semibold underline underline-offset-2"
                                        >
                                            ⚡ Auto-Fill Demo OTP: 482910
                                        </button>
                                        <span className="text-zinc-500">
                                            Resend in {otpSecondsLeft}s
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setStage("select")}
                                        className="flex-1 rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => processFinalVerification(generatedPaymentId)}
                                        className="flex-1 rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-black hover:bg-orange-400 shadow-lg shadow-orange-500/20"
                                    >
                                        Submit OTP & Pay
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ---------------------------------------------------------- */}
                    {/* STAGE D: UPI APPROVAL PUSH NOTIFICATION SIMULATION         */}
                    {/* ---------------------------------------------------------- */}
                    {stage === "upi_approval" && (
                        <div className="p-6 md:p-8 max-w-lg mx-auto text-center min-h-[460px] flex flex-col justify-center space-y-5">
                            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                <Smartphone size={32} className="animate-bounce" />
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-white">
                                    Approve Request on Your UPI App
                                </h3>
                                <p className="mt-1 text-xs text-zinc-400">
                                    We sent a collect request of <strong className="text-white">₹{amount}</strong> to{" "}
                                    <span className="font-mono text-orange-400">{upiSubMode === "qr" ? "your mobile UPI App" : vpaInput}</span>
                                </p>
                            </div>

                            {/* Simulated Mobile Push Banner */}
                            <div className="rounded-2xl border border-white/10 bg-[#0e131d] p-4 text-left shadow-xl animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 font-bold text-sm border border-purple-500/30">
                                        UPI
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xs text-white">Google Pay / PhonePe</span>
                                            <span className="text-[10px] text-zinc-500">Just now</span>
                                        </div>
                                        <p className="text-[11px] text-zinc-300 mt-0.5">
                                            MOTOAI Technologies requested ₹{amount}.00 for {planName}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => processFinalVerification(generatedPaymentId)}
                                    className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-xs font-bold text-black hover:from-orange-400 hover:to-amber-400 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                                >
                                    <span>Simulate Instant Approval in UPI App</span>
                                    <CheckCircle2 size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStage("select")}
                                    className="text-xs text-zinc-500 hover:text-zinc-300 py-1"
                                >
                                    Choose different payment method
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ---------------------------------------------------------- */}
                    {/* STAGE E: VERIFYING DIGITAL SIGNATURE                       */}
                    {/* ---------------------------------------------------------- */}
                    {stage === "verifying" && (
                        <div className="flex flex-col items-center justify-center p-12 text-center min-h-[460px] space-y-4">
                            <div className="relative flex h-20 w-20 items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                                <ShieldCheck size={32} className="text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white">
                                Verifying Payment & Activating Premium...
                            </h3>
                            <p className="text-xs text-zinc-400 max-w-sm">
                                Recording cryptographic receipt in database and crediting your token wallet.
                            </p>
                        </div>
                    )}

                    {/* ---------------------------------------------------------- */}
                    {/* STAGE F: SUCCESS RECEIPT & ACTIVATION CELEBRATION         */}
                    {/* ---------------------------------------------------------- */}
                    {stage === "success" && (
                        <div className="p-6 md:p-8 max-w-lg mx-auto text-center min-h-[460px] flex flex-col justify-center space-y-4 animate-scale-up">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-xl shadow-emerald-500/20">
                                <CheckCircle2 size={36} />
                            </div>

                            <div>
                                <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-400">
                                    Payment Confirmed • Transaction Authorized
                                </span>
                                <h3 className="mt-2 text-2xl font-black text-white">
                                    Premium Plan Activated!
                                </h3>
                                <p className="mt-1 text-xs text-zinc-400">
                                    Your account now has full access to the AI Advisor without ads and with premium token allowances.
                                </p>
                            </div>

                            {/* Digital Receipt Card */}
                            {finalReceipt && (
                                <div className="rounded-2xl border border-white/10 bg-[#0e131d] p-4 text-left text-xs space-y-2 font-sans shadow-lg">
                                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                        <span className="font-bold text-zinc-400">Transaction ID:</span>
                                        <span className="font-mono text-zinc-200 font-bold">{finalReceipt.paymentId}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Payment Mode:</span>
                                        <span className="text-zinc-200 font-semibold">{finalReceipt.methodDetails}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Amount Paid:</span>
                                        <span className="font-mono font-black text-emerald-400">₹{finalReceipt.amount}.00</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">AI Tokens Added:</span>
                                        <span className="font-bold text-orange-400">+{finalReceipt.tokens.toLocaleString("en-IN")} Tokens</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Plan Validity:</span>
                                        <span className="text-zinc-200">{finalReceipt.days} Days</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Timestamp:</span>
                                        <span className="text-zinc-400 font-mono text-[11px]">{finalReceipt.timestamp}</span>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-black transition hover:bg-orange-400 shadow-lg shadow-orange-500/25"
                            >
                                Start Exploring MOTOAI Premium
                            </button>
                        </div>
                    )}

                    {/* ---------------------------------------------------------- */}
                    {/* STAGE G: PAYMENT FAILED                                    */}
                    {/* ---------------------------------------------------------- */}
                    {stage === "failed" && (
                        <div className="p-8 text-center min-h-[460px] flex flex-col justify-center space-y-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/30">
                                <AlertCircle size={36} />
                            </div>
                            <h3 className="text-xl font-bold text-white">Payment Incomplete</h3>
                            <p className="text-xs text-red-400 max-w-sm mx-auto">
                                {errorMsg || "The transaction could not be processed by the gateway."}
                            </p>
                            <div className="flex justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStage("select")}
                                    className="px-5 py-2.5 rounded-xl bg-white/10 text-xs font-bold text-white hover:bg-white/15"
                                >
                                    Try Again
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 text-xs text-zinc-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ============================================================== */}
                {/* 4. GATEWAY FOOTER TRUST MARKS                                  */}
                {/* ============================================================== */}
                <div className="flex flex-wrap items-center justify-between border-t border-white/5 bg-[#090c12] px-5 py-2.5 text-[10px] text-zinc-500">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <Lock size={10} className="text-emerald-400" /> End-to-End Encrypted
                        </span>
                        <span>•</span>
                        <span>RBI / NPCI Compliant</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                        <span>POWERED BY MOTOAI GATEWAY</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
