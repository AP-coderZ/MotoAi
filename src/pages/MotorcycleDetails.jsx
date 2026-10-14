import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import Navbar from "../components/Navbar";
import AdBanner from "../components/AdBanner";
import {
    ArrowLeft,
    Bike,
    BatteryCharging,
    ChevronLeft,
    ChevronRight,
    Fuel,
    Gauge,
    Heart,
    Maximize2,
    Route,
    Settings2,
    Star,
    Weight,
    X,
    Zap,
    Calendar,
    Sparkles,
    IndianRupee,
    MapPin,
    Clock,
    Phone,
    Check,
    MessageSquare,
    AlertCircle,
    UserCheck,
} from "lucide-react";
import {
    getMotorcycleReviews,
    getMyReview,
    createReview,
    getDealerships,
    getDealershipSlots,
    createTestRideBooking,
    addUserFavorite,
    removeUserFavorite,
    getUserFavorites,
} from "../services/api";

const API_URL = "http://localhost:5000/api/motorcycles";

// Sensible default colors if a motorcycle has no colors configured
const DEFAULT_COLORS = [
    { name: "Stealth Black", hex: "#18181b" },
    { name: "Racing Red", hex: "#dc2626" },
    { name: "Metallic Blue", hex: "#2563eb" },
    { name: "Pearl White", hex: "#f4f4f5" },
];

const MotorcycleDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [bike, setBike] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [activeImage, setActiveImage] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Color variant selection
    const [selectedColor, setSelectedColor] = useState(null);

    // Reviews state
    const [reviews, setReviews] = useState([]);
    const [reviewStats, setReviewStats] = useState({ average: 0, count: 0 });
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [userExistingReview, setUserExistingReview] = useState(null);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewTitle, setReviewTitle] = useState("");
    const [reviewComment, setReviewComment] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewError, setReviewError] = useState("");
    const [reviewSuccess, setReviewSuccess] = useState("");

    // Test Ride Modal state
    const [isTestRideModalOpen, setIsTestRideModalOpen] = useState(false);
    const [dealerships, setDealerships] = useState([]);
    const [selectedCity, setSelectedCity] = useState("");
    const [selectedDealership, setSelectedDealership] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState("");
    const [bookingNotes, setBookingNotes] = useState("");
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [bookingSubmitting, setBookingSubmitting] = useState(false);
    const [bookingSuccessMsg, setBookingSuccessMsg] = useState("");
    const [bookingErrorMsg, setBookingErrorMsg] = useState("");

    const token = localStorage.getItem("token");

    // =====================================================
    // FETCH MOTORCYCLE & INITIAL REVIEWS
    // =====================================================
    useEffect(() => {
        const fetchMotorcycle = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(`${API_URL}/${id}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Failed to fetch motorcycle");
                }

                setBike(data.motorcycle);
                setActiveImage(0);

                // Initialize default color
                if (data.motorcycle.colors && data.motorcycle.colors.length > 0) {
                    setSelectedColor(data.motorcycle.colors[0]);
                } else {
                    setSelectedColor(DEFAULT_COLORS[0]);
                }
            } catch (err) {
                console.error("Motorcycle details error:", err);
                setError(err.message || "Something went wrong");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchMotorcycle();
            loadReviews();
            if (token) {
                checkFavorite();
                checkUserReview();
            }
        }
    }, [id]);

    const checkFavorite = async () => {
        try {
            const data = await getUserFavorites();
            const favs = data.favorites || [];
            setIsFavorite(favs.some((f) => (f._id || f) === id));
        } catch {
            /* ignore */
        }
    };

    const toggleFavorite = async () => {
        if (!token) {
            navigate("/login");
            return;
        }
        try {
            if (isFavorite) {
                await removeUserFavorite(id);
                setIsFavorite(false);
            } else {
                await addUserFavorite(id);
                setIsFavorite(true);
            }
        } catch {
            setIsFavorite(!isFavorite);
        }
    };

    // =====================================================
    // REVIEWS LOADING & SUBMISSION
    // =====================================================
    const loadReviews = async () => {
        setLoadingReviews(true);
        try {
            const data = await getMotorcycleReviews(id);
            setReviews(data.reviews || []);
            setReviewStats({
                average: data.averageRating || 0,
                count: data.totalReviews || 0,
            });
        } catch (err) {
            console.error("Failed to load reviews:", err);
        } finally {
            setLoadingReviews(false);
        }
    };

    const checkUserReview = async () => {
        try {
            const data = await getMyReview(id);
            if (data?.review) {
                setUserExistingReview(data.review);
            }
        } catch {
            /* no review yet */
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!token) {
            navigate("/login");
            return;
        }
        if (!reviewComment.trim()) {
            setReviewError("Please write a few words about your experience.");
            return;
        }
        setSubmittingReview(true);
        setReviewError("");
        setReviewSuccess("");

        try {
            const res = await createReview(id, {
                rating: reviewRating,
                title: reviewTitle.trim(),
                comment: reviewComment.trim(),
            });
            setReviewSuccess("Review submitted successfully! Thank you for sharing.");
            setUserExistingReview(res.review);
            setShowReviewForm(false);
            setReviewComment("");
            setReviewTitle("");
            loadReviews();
        } catch (err) {
            setReviewError(err.message || "Failed to submit review.");
        } finally {
            setSubmittingReview(false);
        }
    };

    // =====================================================
    // TEST RIDE BOOKING HANDLERS
    // =====================================================
    const openTestRideModal = async () => {
        if (!token) {
            navigate("/login");
            return;
        }
        setIsTestRideModalOpen(true);
        setBookingSuccessMsg("");
        setBookingErrorMsg("");
        try {
            const data = await getDealerships({ brand: bike?.brand });
            setDealerships(data.dealerships || []);
            if (data.dealerships && data.dealerships.length > 0) {
                setSelectedDealership(data.dealerships[0]._id);
                setSelectedCity(data.dealerships[0].city);
            }
        } catch (err) {
            setBookingErrorMsg("Failed to load dealerships. Please try again.");
        }
    };

    // Whenever dealership or date changes, load available time slots
    useEffect(() => {
        if (!selectedDealership || !selectedDate) {
            setAvailableSlots([]);
            return;
        }
        setLoadingSlots(true);
        getDealershipSlots(selectedDealership, selectedDate)
            .then((data) => {
                const slots = data.slots || [];
                setAvailableSlots(slots);
                if (slots.length > 0) setSelectedSlot(slots[0]);
                else setSelectedSlot("");
            })
            .catch(() => {
                setAvailableSlots([]);
            })
            .finally(() => setLoadingSlots(false));
    }, [selectedDealership, selectedDate]);

    const handleConfirmBooking = async (e) => {
        e.preventDefault();
        if (!selectedDealership || !selectedDate || !selectedSlot) {
            setBookingErrorMsg("Please choose dealership, date, and a time slot.");
            return;
        }
        setBookingSubmitting(true);
        setBookingErrorMsg("");
        try {
            await createTestRideBooking({
                motorcycleId: bike._id,
                dealershipId: selectedDealership,
                scheduledDate: selectedDate,
                scheduledTime: selectedSlot,
                notes: bookingNotes.trim(),
            });
            setBookingSuccessMsg(
                "Test ride booked successfully! A confirmation notification has been sent."
            );
        } catch (err) {
            setBookingErrorMsg(err.message || "Failed to book test ride.");
        } finally {
            setBookingSubmitting(false);
        }
    };

    // =====================================================
    // CREATE IMAGE LIST
    // =====================================================
    const bikeImages = useMemo(() => {
        if (!bike) return [];
        if (Array.isArray(bike.images) && bike.images.length > 0) {
            return bike.images;
        }
        if (bike.image) {
            return [{ url: bike.image, label: "Main View" }];
        }
        return [];
    }, [bike]);

    const nextImage = () => {
        if (bikeImages.length === 0) return;
        setActiveImage((current) =>
            current === bikeImages.length - 1 ? 0 : current + 1
        );
    };

    const previousImage = () => {
        if (bikeImages.length === 0) return;
        setActiveImage((current) =>
            current === 0 ? bikeImages.length - 1 : current - 1
        );
    };

    // Keyboard navigation in fullscreen
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isFullScreen) return;
            if (e.key === "ArrowRight") nextImage();
            if (e.key === "ArrowLeft") previousImage();
            if (e.key === "Escape") setIsFullScreen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isFullScreen, bikeImages]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#070707] text-white flex flex-col items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                <p className="mt-4 text-sm text-zinc-500 font-semibold">
                    Loading motorcycle details...
                </p>
            </div>
        );
    }

    if (error || !bike) {
        return (
            <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <Bike className="w-14 h-14 text-orange-500 mx-auto mb-5" />
                    <h1 className="text-2xl font-bold mb-3">Motorcycle Not Found</h1>
                    <p className="text-gray-400 mb-7">
                        {error || "The requested motorcycle could not be found."}
                    </p>
                    <button
                        onClick={() => navigate("/motorcycles")}
                        className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition"
                    >
                        Back to Motorcycles
                    </button>
                </div>
            </div>
        );
    }

    const isEV = bike.category === "Electric";
    const currentImage = bikeImages[activeImage];
    const availableColors =
        bike.colors && bike.colors.length > 0 ? bike.colors : DEFAULT_COLORS;

    // Filter dealerships by selected city if any
    const filteredDealerships = selectedCity
        ? dealerships.filter(
              (d) => d.city.toLowerCase() === selectedCity.toLowerCase()
          )
        : dealerships;

    const uniqueCities = Array.from(new Set(dealerships.map((d) => d.city)));

    // Min date for booking: tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minBookingDate = tomorrow.toISOString().split("T")[0];

    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar activeTab="Motorcycles" />

            {/* TOP BREADCRUMBS */}
            <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-6">
                <button
                    onClick={() => navigate("/motorcycles")}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition font-medium"
                >
                    <ArrowLeft size={16} />
                    Back to Motorcycles
                </button>
            </div>

            {/* MAIN DETAILS GRID */}
            <main className="max-w-7xl mx-auto px-5 sm:px-8 py-7">
                <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10">
                    {/* LEFT COLUMN — IMAGE GALLERY */}
                    <div>
                        {/* MAIN IMAGE */}
                        <div className="relative bg-[#111] border border-white/10 rounded-3xl overflow-hidden group">
                            <div
                                className="aspect-[16/10] relative cursor-pointer"
                                onClick={() => setIsFullScreen(true)}
                            >
                                {currentImage ? (
                                    <img
                                        src={currentImage.url}
                                        alt={`${bike.name} - ${currentImage.label || "View"}`}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                                        <Bike size={54} />
                                        <p className="mt-3 text-sm">No photo available</p>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-80" />

                                {currentImage?.label && (
                                    <div className="absolute bottom-4 left-4 z-10 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-semibold text-white">
                                        {currentImage.label}
                                    </div>
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsFullScreen(true);
                                    }}
                                    className="absolute bottom-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-orange-500 transition shadow-lg"
                                    title="View Fullscreen"
                                >
                                    <Maximize2 size={16} />
                                </button>
                            </div>

                            {/* PREV/NEXT ARROWS */}
                            {bikeImages.length > 1 && (
                                <>
                                    <button
                                        onClick={previousImage}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-orange-500 transition"
                                        title="Previous"
                                    >
                                        <ChevronLeft size={22} />
                                    </button>
                                    <button
                                        onClick={nextImage}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-orange-500 transition"
                                        title="Next"
                                    >
                                        <ChevronRight size={22} />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* THUMBNAIL ROW */}
                        {bikeImages.length > 1 && (
                            <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-2">
                                {bikeImages.map((image, index) => (
                                    <button
                                        key={`thumb-${image.url}-${index}`}
                                        onClick={() => setActiveImage(index)}
                                        className={`relative h-16 w-24 rounded-2xl overflow-hidden border shrink-0 transition-all ${
                                            activeImage === index
                                                ? "border-orange-500 ring-2 ring-orange-500/40"
                                                : "border-white/10 opacity-60 hover:opacity-100"
                                        }`}
                                    >
                                        <img
                                            src={image.url}
                                            alt={image.label || `Photo ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 5-YEAR OWNERSHIP COST CTA */}
                        <div className="mt-8 rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/10 via-[#111] to-[#131313] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400">
                                    <IndianRupee size={15} />
                                    5-Year Cost of Ownership
                                </div>
                                <h3 className="mt-1 text-base font-black text-white">
                                    Calculate EMI, Fuel, Insurance & Maintenance
                                </h3>
                                <p className="text-xs text-zinc-400 mt-1">
                                    Estimate monthly out-of-pocket costs and calculate depreciation before visiting the dealership.
                                </p>
                            </div>
                            <button
                                onClick={() =>
                                    navigate(
                                        `/ownership-cost?bike=${encodeURIComponent(
                                            bike.name
                                        )}&price=${bike.price}&mileage=${
                                            bike.mileage || 40
                                        }&category=${bike.category}`
                                    )
                                }
                                className="shrink-0 rounded-xl bg-orange-500 px-5 py-3 text-xs font-bold text-black transition hover:bg-orange-400 shadow-md shadow-orange-500/10"
                            >
                                Calculate Ownership Cost →
                            </button>
                        </div>

                        {/* CONTEXTUAL AD BANNER */}
                        <AdBanner
                            placement="detail_sidebar"
                            brand={bike.brand}
                            category={bike.category}
                            className="mt-6"
                        />
                    </div>

                    {/* RIGHT COLUMN — SPECS, COLOR SELECTOR & ACTIONS */}
                    <div>
                        {/* BRAND LOGO & BADGE */}
                        <div className="flex items-center gap-3 mb-3">
                            <BrandLogo
                                brand={bike.brand}
                                logoUrl={bike.brandLogo}
                                className="w-7 h-7"
                            />
                            <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
                                {bike.brand}
                            </span>
                        </div>

                        {/* NAME & FAVORITE */}
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                                    {bike.name}
                                </h1>
                                <p className="text-sm text-zinc-400 mt-1">
                                    {bike.category} Motorcycle
                                </p>
                            </div>

                            <button
                                aria-label="Save to favorites"
                                onClick={toggleFavorite}
                                className={`shrink-0 w-12 h-12 rounded-2xl border flex items-center justify-center transition ${
                                    isFavorite
                                        ? "bg-orange-500/10 border-orange-500 text-orange-500"
                                        : "border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                            >
                                <Heart
                                    size={20}
                                    fill={isFavorite ? "currentColor" : "none"}
                                />
                            </button>
                        </div>

                        {/* RATING BADGE */}
                        <div className="flex items-center gap-3 mt-4">
                            <div className="flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 px-3 py-1 text-amber-400 text-xs font-bold">
                                <Star size={13} fill="currentColor" />
                                <span>{reviewStats.count > 0 ? reviewStats.average.toFixed(1) : (bike.rating ?? 4.5)}</span>
                            </div>
                            <span className="text-xs text-zinc-500">
                                {reviewStats.count > 0
                                    ? `${reviewStats.count} customer ${reviewStats.count === 1 ? "review" : "reviews"}`
                                    : "MOTOAI Verified Rating"}
                            </span>
                        </div>

                        {/* PRICE */}
                        <div className="mt-6 border-y border-white/5 py-4">
                            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                                Ex-Showroom Price (India)
                            </p>
                            <p className="text-3xl font-black text-white mt-1">
                                ₹{Number(bike.price || 0).toLocaleString("en-IN")}
                            </p>
                        </div>

                        {/* COLOR VARIANT SELECTOR */}
                        <div className="mt-6">
                            <div className="flex items-center justify-between text-xs mb-2.5">
                                <span className="font-bold uppercase tracking-wider text-zinc-400">
                                    Color Variant
                                </span>
                                <span className="font-semibold text-white">
                                    {selectedColor?.name || "Standard"}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                                {availableColors.map((col, idx) => {
                                    const isSelected =
                                        selectedColor?.name === col.name;
                                    return (
                                        <button
                                            key={`col-${idx}`}
                                            onClick={() => {
                                                setSelectedColor(col);
                                                if (col.image) {
                                                    const imgIdx = bikeImages.findIndex(
                                                        (img) => img.url === col.image
                                                    );
                                                    if (imgIdx >= 0) setActiveImage(imgIdx);
                                                }
                                            }}
                                            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                                                isSelected
                                                    ? "border-orange-500 bg-orange-500/10 text-white ring-1 ring-orange-500/40"
                                                    : "border-white/10 bg-[#141414] text-zinc-300 hover:border-white/20"
                                            }`}
                                        >
                                            <span
                                                className="h-3.5 w-3.5 rounded-full border border-white/20 shrink-0"
                                                style={{ backgroundColor: col.hex }}
                                            />
                                            <span>{col.name}</span>
                                            {isSelected && (
                                                <Check size={12} className="text-orange-400" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* DESCRIPTION */}
                        {bike.description && (
                            <p className="text-xs leading-relaxed text-zinc-400 mt-5">
                                {bike.description}
                            </p>
                        )}

                        {/* SPECIFICATIONS GRID */}
                        <div className="grid grid-cols-2 gap-2.5 mt-6">
                            {isEV ? (
                                <>
                                    <SpecCard
                                        icon={<BatteryCharging size={18} />}
                                        label="Battery"
                                        value={
                                            bike.batteryCapacity
                                                ? `${bike.batteryCapacity} kWh`
                                                : "N/A"
                                        }
                                    />
                                    <SpecCard
                                        icon={<Route size={18} />}
                                        label="Riding Range"
                                        value={
                                            bike.range ? `${bike.range} km` : "N/A"
                                        }
                                    />
                                    <SpecCard
                                        icon={<Zap size={18} />}
                                        label="Charging Time"
                                        value={
                                            bike.chargingTime
                                                ? `${bike.chargingTime} hrs`
                                                : "N/A"
                                        }
                                    />
                                </>
                            ) : (
                                <>
                                    <SpecCard
                                        icon={<Gauge size={18} />}
                                        label="Engine"
                                        value={
                                            bike.engine ? `${bike.engine} cc` : "N/A"
                                        }
                                    />
                                    <SpecCard
                                        icon={<Zap size={18} />}
                                        label="Power"
                                        value={
                                            bike.power ? `${bike.power} bhp` : "N/A"
                                        }
                                    />
                                    <SpecCard
                                        icon={<Gauge size={18} />}
                                        label="Torque"
                                        value={
                                            bike.torque ? `${bike.torque} Nm` : "N/A"
                                        }
                                    />
                                    <SpecCard
                                        icon={<Fuel size={18} />}
                                        label="Mileage"
                                        value={
                                            bike.mileage
                                                ? `${bike.mileage} km/l`
                                                : "N/A"
                                        }
                                    />
                                    <SpecCard
                                        icon={<Fuel size={18} />}
                                        label="Fuel"
                                        value={bike.fuel || "Petrol"}
                                    />
                                </>
                            )}

                            <SpecCard
                                icon={<Settings2 size={18} />}
                                label="Transmission"
                                value={bike.transmission || "Manual"}
                            />
                            <SpecCard
                                icon={<Weight size={18} />}
                                label="Kerb Weight"
                                value={bike.weight ? `${bike.weight} kg` : "N/A"}
                            />
                            {bike.topSpeed ? (
                                <SpecCard
                                    icon={<Gauge size={18} />}
                                    label="Top Speed"
                                    value={`${bike.topSpeed} km/h`}
                                />
                            ) : null}
                        </div>

                        {/* PRIMARY ACTION BUTTONS */}
                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={openTestRideModal}
                                className="w-full py-4 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg"
                            >
                                <Calendar size={18} />
                                Book a Test Ride
                            </button>

                            <button
                                onClick={() =>
                                    navigate("/ai-advisor", {
                                        state: {
                                            askAbout: {
                                                brand: bike.brand,
                                                name: bike.name,
                                            },
                                        },
                                    })
                                }
                                className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-black font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10"
                            >
                                <Sparkles size={18} />
                                Ask MotoMind AI
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* =====================================================
                CUSTOMER REVIEWS & RATINGS SECTION
            ===================================================== */}
            <section className="border-t border-white/10 bg-[#0b0b0b] py-14">
                <div className="max-w-7xl mx-auto px-5 sm:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-8 border-b border-white/5">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400">
                                <MessageSquare size={14} />
                                Rider Community Reviews
                            </div>
                            <h2 className="text-2xl font-black mt-1">
                                Customer Ratings & Reviews
                            </h2>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Real verified feedback from riders across India.
                            </p>
                        </div>

                        <div>
                            {userExistingReview ? (
                                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400 flex items-center gap-2">
                                    <Check size={14} />
                                    You reviewed this motorcycle
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        if (!token) navigate("/login");
                                        else setShowReviewForm(!showReviewForm);
                                    }}
                                    className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-orange-400"
                                >
                                    {showReviewForm ? "Cancel Review" : "Write a Review"}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* REVIEW SUBMISSION FORM */}
                    {showReviewForm && !userExistingReview && (
                        <div className="mt-8 rounded-2xl border border-white/10 bg-[#121212] p-6 max-w-2xl">
                            <h3 className="text-base font-bold text-white">
                                Share Your Experience with {bike.name}
                            </h3>
                            <p className="text-xs text-zinc-400 mt-1">
                                How does the bike handle in traffic? What's the real-world mileage?
                            </p>

                            {reviewError && (
                                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                                    {reviewError}
                                </div>
                            )}

                            <form onSubmit={handleReviewSubmit} className="mt-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                                        Your Rating
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setReviewRating(star)}
                                                className="p-1 text-zinc-600 hover:text-amber-400 transition"
                                            >
                                                <Star
                                                    size={24}
                                                    className={
                                                        star <= reviewRating
                                                            ? "text-amber-400 fill-amber-400"
                                                            : "text-zinc-600"
                                                    }
                                                />
                                            </button>
                                        ))}
                                        <span className="ml-3 text-sm font-bold text-white">
                                            {reviewRating} of 5 Stars
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Headline / Title (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={reviewTitle}
                                        onChange={(e) => setReviewTitle(e.target.value)}
                                        placeholder="e.g. Excellent daily commuter with punchy mid-range"
                                        className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                                        maxLength={100}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Your Detailed Review
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={reviewComment}
                                        onChange={(e) => setReviewComment(e.target.value)}
                                        placeholder="Share insights on comfort, pickup, braking, service experience, and fuel economy..."
                                        className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                                        maxLength={1500}
                                        required
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowReviewForm(false)}
                                        className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-white/5"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingReview}
                                        className="rounded-xl bg-orange-500 px-6 py-2 text-xs font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
                                    >
                                        {submittingReview ? "Submitting..." : "Post Review"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {reviewSuccess && (
                        <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300">
                            {reviewSuccess}
                        </div>
                    )}

                    {/* REVIEWS LIST */}
                    <div className="mt-8">
                        {loadingReviews ? (
                            <div className="py-8 text-center text-xs text-zinc-500">
                                Loading rider reviews...
                            </div>
                        ) : reviews.length === 0 ? (
                            <div className="rounded-2xl border border-white/5 bg-[#121212] p-10 text-center">
                                <MessageSquare size={32} className="mx-auto text-zinc-600" />
                                <h4 className="mt-3 text-base font-bold text-white">
                                    No reviews yet for {bike.name}
                                </h4>
                                <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                                    Be the first to share your experience with this model to help fellow bikers make an informed decision.
                                </p>
                                <button
                                    onClick={() => {
                                        if (!token) navigate("/login");
                                        else setShowReviewForm(true);
                                    }}
                                    className="mt-5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-5 py-2.5 text-xs font-bold text-orange-400 hover:bg-orange-500 hover:text-black transition"
                                >
                                    Write the First Review
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {reviews.map((rev) => (
                                    <div
                                        key={rev._id}
                                        className="rounded-2xl border border-white/10 bg-[#121212] p-5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-8 w-8 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-xs font-black text-orange-400">
                                                    {(rev.user?.name || "R")[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-white">
                                                            {rev.user?.name || "Verified Rider"}
                                                        </span>
                                                        <UserCheck size={12} className="text-emerald-400" />
                                                    </div>
                                                    <span className="text-[10px] text-zinc-500">
                                                        {rev.createdAt
                                                            ? new Date(rev.createdAt).toLocaleDateString("en-IN", {
                                                                  month: "short",
                                                                  day: "numeric",
                                                                  year: "numeric",
                                                              })
                                                            : ""}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star
                                                        key={s}
                                                        size={12}
                                                        className={
                                                            s <= rev.rating
                                                                ? "text-amber-400 fill-amber-400"
                                                                : "text-zinc-700"
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {rev.title && (
                                            <h4 className="mt-3 font-semibold text-white text-xs">
                                                {rev.title}
                                            </h4>
                                        )}
                                        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                                            {rev.comment}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* =====================================================
                TEST RIDE BOOKING MODAL
            ===================================================== */}
            {isTestRideModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    onClick={() => setIsTestRideModalOpen(false)}
                >
                    <div
                        className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-[#121212] p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setIsTestRideModalOpen(false)}
                            className="absolute top-5 right-5 h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white">
                                    Book a Free Test Ride
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    {bike.brand} {bike.name}
                                </p>
                            </div>
                        </div>

                        {bookingSuccessMsg ? (
                            <div className="mt-6 text-center py-6">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <Check size={28} />
                                </div>
                                <h4 className="mt-4 text-lg font-bold text-white">
                                    Booking Confirmed!
                                </h4>
                                <p className="mt-2 text-xs text-zinc-400 max-w-md mx-auto">
                                    {bookingSuccessMsg}
                                </p>
                                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                                    <button
                                        onClick={() => {
                                            setIsTestRideModalOpen(false);
                                            navigate("/user/bookings");
                                        }}
                                        className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-black hover:bg-orange-400 transition"
                                    >
                                        View in Dashboard
                                    </button>
                                    <button
                                        onClick={() => setIsTestRideModalOpen(false)}
                                        className="rounded-xl border border-white/10 px-5 py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/5"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleConfirmBooking} className="mt-6 space-y-4">
                                {bookingErrorMsg && (
                                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                                        {bookingErrorMsg}
                                    </div>
                                )}

                                {/* City Filter */}
                                {uniqueCities.length > 1 && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Select City
                                        </label>
                                        <select
                                            value={selectedCity}
                                            onChange={(e) => setSelectedCity(e.target.value)}
                                            className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                                        >
                                            <option value="">All Cities</option>
                                            {uniqueCities.map((c) => (
                                                <option key={c} value={c}>
                                                    {c}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Dealership Selector */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Select Authorized Dealership
                                    </label>
                                    {filteredDealerships.length === 0 ? (
                                        <p className="text-xs text-zinc-500 p-3 bg-black/30 rounded-xl">
                                            No dealerships found for this brand in the selected city.
                                        </p>
                                    ) : (
                                        <select
                                            value={selectedDealership}
                                            onChange={(e) => setSelectedDealership(e.target.value)}
                                            className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                                            required
                                        >
                                            {filteredDealerships.map((d) => (
                                                <option key={d._id} value={d._id}>
                                                    {d.name} ({d.city}) — {d.address}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Date Picker */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Preferred Date
                                    </label>
                                    <input
                                        type="date"
                                        min={minBookingDate}
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                                        required
                                    />
                                </div>

                                {/* Available Time Slots */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Time Slot {loadingSlots && "(Checking availability...)"}
                                    </label>
                                    {selectedDate ? (
                                        availableSlots.length === 0 ? (
                                            <p className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                                                All slots are booked for this date. Please pick another date.
                                            </p>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-2">
                                                {availableSlots.map((s) => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => setSelectedSlot(s)}
                                                        className={`rounded-xl border py-2 text-xs font-semibold transition ${
                                                            selectedSlot === s
                                                                ? "border-orange-500 bg-orange-500 text-black font-bold"
                                                                : "border-white/10 bg-black/40 text-zinc-300 hover:border-white/20"
                                                        }`}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        )
                                    ) : (
                                        <p className="text-xs text-zinc-500">
                                            Pick a date above to view available showroom slots.
                                        </p>
                                    )}
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Special Requests / Notes (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={bookingNotes}
                                        onChange={(e) => setBookingNotes(e.target.value)}
                                        placeholder="e.g. Also interested in on-road EMI schemes"
                                        className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                                        maxLength={300}
                                    />
                                </div>

                                <div className="pt-3">
                                    <button
                                        type="submit"
                                        disabled={
                                            bookingSubmitting ||
                                            !selectedDealership ||
                                            !selectedDate ||
                                            !selectedSlot
                                        }
                                        className="w-full rounded-xl bg-orange-500 py-3 text-xs font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {bookingSubmitting
                                            ? "Submitting Booking..."
                                            : "Confirm Test Ride Booking"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* =====================================================
                FULL SCREEN PHOTO MODAL
            ===================================================== */}
            {isFullScreen && currentImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6"
                    onClick={() => setIsFullScreen(false)}
                >
                    {/* TOP BAR */}
                    <div className="flex items-center justify-between z-10">
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-white">
                                {bike.brand} {bike.name}
                            </span>
                            {currentImage.label && (
                                <span className="px-3.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-semibold">
                                    {currentImage.label}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {bikeImages.length > 0 && (
                                <span className="text-xs text-gray-400">
                                    {activeImage + 1} / {bikeImages.length}
                                </span>
                            )}
                            <button
                                onClick={() => setIsFullScreen(false)}
                                className="w-11 h-11 rounded-full bg-white/10 hover:bg-orange-500 text-white transition flex items-center justify-center shadow-lg"
                                title="Close Full Screen (Esc)"
                            >
                                <X size={22} />
                            </button>
                        </div>
                    </div>

                    {/* MAIN IMAGE VIEW */}
                    <div
                        className="relative flex-1 flex items-center justify-center my-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {bikeImages.length > 1 && (
                            <button
                                onClick={previousImage}
                                className="absolute left-2 sm:left-6 z-10 w-12 h-12 rounded-full bg-black/70 border border-white/20 hover:bg-orange-500 hover:border-orange-500 transition text-white flex items-center justify-center shadow-2xl"
                                title="Previous Photo"
                            >
                                <ChevronLeft size={28} />
                            </button>
                        )}

                        <img
                            src={currentImage.url}
                            alt={`${bike.name} - ${currentImage.label}`}
                            className="max-h-[76vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl transition-all duration-300 select-none"
                        />

                        {bikeImages.length > 1 && (
                            <button
                                onClick={nextImage}
                                className="absolute right-2 sm:right-6 z-10 w-12 h-12 rounded-full bg-black/70 border border-white/20 hover:bg-orange-500 hover:border-orange-500 transition text-white flex items-center justify-center shadow-2xl"
                                title="Next Photo"
                            >
                                <ChevronRight size={28} />
                            </button>
                        )}
                    </div>

                    {/* BOTTOM THUMBNAILS BAR */}
                    {bikeImages.length > 0 && (
                        <div
                            className="flex items-center justify-center gap-3 overflow-x-auto py-2 z-10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {bikeImages.map((image, index) => (
                                <button
                                    key={`fs-${image.url}-${index}`}
                                    onClick={() => setActiveImage(index)}
                                    className={`relative h-14 w-20 rounded-xl overflow-hidden border transition-all shrink-0 ${
                                        activeImage === index
                                            ? "border-orange-500 ring-2 ring-orange-500/50 scale-105"
                                            : "border-white/20 opacity-60 hover:opacity-100"
                                    }`}
                                >
                                    <img
                                        src={image.url}
                                        alt={image.label}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// =====================================================
// SPECIFICATION CARD COMPONENT
// =====================================================
const SpecCard = ({ icon, label, value }) => {
    return (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-orange-500 mb-1.5">
                {icon}
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                    {label}
                </span>
            </div>
            <p className="font-bold text-white text-sm">{value}</p>
        </div>
    );
};

export default MotorcycleDetails;