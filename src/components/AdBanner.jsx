import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Sparkles, Volume2, VolumeX, Play, Pause, Crown, Gift } from "lucide-react";
import { getAdPlacement, recordAdClick, getSubscriptionStatus } from "../services/api";

/**
 * Check if the locally stored user profile has active Premium status
 */
export const isUserPremium = () => {
    try {
        const token = localStorage.getItem("token");
        if (!token) return false;
        const stored = localStorage.getItem("user");
        if (!stored) return false;
        const u = JSON.parse(stored);
        if (u.role === "admin") return true;
        if (u.aiPlan === "premium" || u.plan === "premium" || u.isPremium === true) return true;
        if (u.aiPlanType === "monthly" || u.aiPlanType === "yearly") return true;
        return false;
    } catch {
        return false;
    }
};

/**
 * AdBanner — Contextual Sponsored Banner with Rich Video & Image Playback
 *
 * Displays an active contextual ad for a given placement ONLY for free-tier users.
 * Automatically hides completely (renders null) for Premium users and upon upgrading.
 * Records impressions on load and clicks on interaction.
 * If no ad is active for this placement or user is Premium, renders null.
 */
export default function AdBanner({
    placement,
    brand = "",
    category = "",
    className = "",
    compact = false,
    showUpgradeLink = true,
    onWatchReward = null,
}) {
    const [isPremium, setIsPremium] = useState(isUserPremium);
    const [ad, setAd] = useState(null);
    const [clicked, setClicked] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const videoRef = useRef(null);

    // Sync premium status dynamically with localStorage, server, and events
    useEffect(() => {
        let mounted = true;

        const syncPremium = () => {
            const premium = isUserPremium();
            if (mounted) {
                setIsPremium(premium);
                if (premium) {
                    setAd(null);
                }
            }
        };

        syncPremium();

        // Check authoritative subscription status if logged in
        const token = localStorage.getItem("token");
        if (token) {
            getSubscriptionStatus()
                .then((data) => {
                    if (!mounted || !data || !data.success) return;
                    const serverPremium =
                        data.plan === "premium" ||
                        data.planType === "monthly" ||
                        data.planType === "yearly" ||
                        data.active === true;
                    if (serverPremium) {
                        setIsPremium(true);
                        setAd(null);
                        try {
                            const stored = JSON.parse(localStorage.getItem("user") || "{}");
                            localStorage.setItem(
                                "user",
                                JSON.stringify({
                                    ...stored,
                                    aiPlan: data.plan,
                                    aiPlanType: data.planType,
                                })
                            );
                        } catch {
                            /* ignore */
                        }
                    }
                })
                .catch(() => {});
        }

        window.addEventListener("subscriptionUpdated", syncPremium);
        window.addEventListener("storage", syncPremium);
        window.addEventListener("focus", syncPremium);

        return () => {
            mounted = false;
            window.removeEventListener("subscriptionUpdated", syncPremium);
            window.removeEventListener("storage", syncPremium);
            window.removeEventListener("focus", syncPremium);
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        if (!placement) return;

        // Premium accounts do not fetch or display ads
        if (isPremium) {
            setAd(null);
            return;
        }

        getAdPlacement(placement, brand, category)
            .then((data) => {
                if (!mounted) return;
                if (data?.isPremium) {
                    setIsPremium(true);
                    setAd(null);
                    return;
                }
                if (data?.success && data?.ad) {
                    setAd(data.ad);
                } else {
                    setAd(null);
                }
            })
            .catch(() => {
                /* silent failure — non-intrusive ad */
            });

        return () => {
            mounted = false;
        };
    }, [placement, brand, category, isPremium]);

    if (isPremium || !ad) return null;

    const handleClick = () => {
        if (!clicked) {
            setClicked(true);
            recordAdClick(ad._id);
        }

        if (ad.ctaUrl) {
            if (ad.ctaUrl.startsWith("http://") || ad.ctaUrl.startsWith("https://")) {
                window.open(ad.ctaUrl, "_blank", "noopener,noreferrer");
            } else {
                window.location.href = ad.ctaUrl;
            }
        }
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const togglePlay = (e) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                videoRef.current.play();
                setIsPlaying(true);
            }
        }
    };

    if (compact) {
        return (
            <div
                onClick={handleClick}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-orange-950/20 via-[#111] to-[#141414] p-3 transition-all hover:border-orange-500/40 cursor-pointer ${className}`}
            >
                <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 rounded-md bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-orange-400 border border-orange-500/20">
                            Ad
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-white group-hover:text-orange-300">
                                {ad.title}
                            </p>
                            {ad.tagline && (
                                <p className="truncate text-[10px] text-zinc-400">
                                    {ad.tagline}
                                </p>
                            )}
                        </div>
                    </div>
                    <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-orange-400 group-hover:text-orange-300">
                        {ad.ctaText || "Explore"}
                        <ExternalLink size={11} />
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={handleClick}
            className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-[#111] transition-all hover:border-orange-500/40 hover:shadow-xl hover:shadow-orange-500/5 cursor-pointer ${className}`}
        >
            {/* Top Bar with Sponsored tag and Upgrade link */}
            <div className="flex items-center justify-between px-4 pt-3 text-[10px] uppercase tracking-wider text-zinc-500">
                <span className="flex items-center gap-1 font-bold text-orange-400/90">
                    <Sparkles size={11} />
                    Sponsored Partner • Free Plan
                </span>
                <div className="flex items-center gap-3">
                    {onWatchReward && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onWatchReward(ad);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500 hover:text-black transition"
                        >
                            <Gift size={10} />
                            Earn +5 Tokens
                        </button>
                    )}
                    {showUpgradeLink && (
                        <Link
                            to="/ai-plan"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500 hover:text-orange-400 transition"
                        >
                            <Crown size={10} />
                            Remove ads
                        </Link>
                    )}
                </div>
            </div>

            <div className="p-4 sm:p-5">
                {/* Media Creative: Video if available, else Image */}
                {ad.videoUrl ? (
                    <div className="relative mb-3.5 aspect-[21/9] w-full overflow-hidden rounded-xl bg-black border border-white/5 group">
                        <video
                            ref={videoRef}
                            src={ad.videoUrl}
                            poster={ad.imageUrl}
                            autoPlay
                            muted={isMuted}
                            loop
                            playsInline
                            className="h-full w-full object-cover"
                        />
                        {/* Video Controls Overlay */}
                        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-black/70 px-2 py-1 backdrop-blur-md">
                            <button
                                type="button"
                                onClick={togglePlay}
                                aria-label={isPlaying ? "Pause video" : "Play video"}
                                className="text-zinc-300 hover:text-white transition p-0.5"
                            >
                                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                            </button>
                            <button
                                type="button"
                                onClick={toggleMute}
                                aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                                className="text-zinc-300 hover:text-white transition p-0.5"
                            >
                                {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                            </button>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-orange-400 ml-1">
                                Video Ad
                            </span>
                        </div>
                    </div>
                ) : ad.imageUrl ? (
                    <div className="mb-3.5 aspect-[21/9] w-full overflow-hidden rounded-xl bg-black/50 border border-white/5">
                        <img
                            src={ad.imageUrl}
                            alt={ad.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                                e.target.style.display = "none";
                            }}
                        />
                    </div>
                ) : null}

                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h4 className="text-base font-black text-white group-hover:text-orange-300 transition-colors">
                            {ad.title}
                        </h4>
                        {ad.tagline && (
                            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                                {ad.tagline}
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-500 group-hover:text-zinc-400">
                        {ad.advertiserName || "Official Partner"}
                    </span>
                    <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 px-3.5 py-1.5 text-xs font-bold text-orange-400 transition-all group-hover:bg-orange-500 group-hover:text-black"
                    >
                        {ad.ctaText || "Learn More"}
                        <ExternalLink size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}
