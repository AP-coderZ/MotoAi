import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { X, Gift, Volume2, VolumeX, Sparkles, CheckCircle2, Crown, Play, Pause } from "lucide-react";
import { getAdPlacement, claimAdReward, recordAdClick } from "../services/api";

export default function RewardedAdModal({ open, onClose, onRewardClaimed }) {
    const [ad, setAd] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(5);
    const [canClaim, setCanClaim] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [claimed, setClaimed] = useState(false);
    const [error, setError] = useState("");
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const videoRef = useRef(null);

    useEffect(() => {
        if (!open) {
            setSecondsLeft(5);
            setCanClaim(false);
            setClaimed(false);
            setError("");
            return;
        }

        // Fetch an active ad for the rewarded session
        getAdPlacement("ai_advisor_bottom")
            .then((res) => {
                if (res?.success && res?.ad) {
                    setAd(res.ad);
                } else {
                    // Fallback sponsor ad
                    setAd({
                        _id: "sample_reward_ad",
                        advertiserName: "Motul India",
                        title: "Motul 300V Factory Line Synthetic Racing Oil",
                        tagline: "Ester Core® technology for maximum power output and extreme engine protection across all rev ranges.",
                        videoUrl: "https://vjs.zencdn.net/v/oceans.mp4",
                        imageUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80",
                        ctaText: "Explore Motul 300V",
                        ctaUrl: "https://www.motul.com/",
                    });
                }
            })
            .catch(() => {
                setAd({
                    _id: "sample_reward_ad",
                    advertiserName: "GoPro India",
                    title: "GoPro HERO12 Black — Ultimate Moto Vlogging Camera",
                    tagline: "HyperSmooth 6.0 stabilization and rugged waterproof helmet mounts built for motorcycle riders.",
                    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
                    imageUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
                    ctaText: "View Moto Mounts",
                    ctaUrl: "https://gopro.com/",
                });
            });

        // 5-second countdown timer for rewarded ad completion
        const timer = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setCanClaim(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [open]);

    if (!open) return null;

    const handleClaim = async () => {
        if (!canClaim || claiming || claimed) return;
        setClaiming(true);
        setError("");
        try {
            const data = await claimAdReward();
            if (data?.success) {
                setClaimed(true);
                // Dispatch subscriptionUpdated so all components sync tokens
                window.dispatchEvent(new Event("subscriptionUpdated"));
                if (onRewardClaimed) {
                    onRewardClaimed(data.wallet);
                }
                setTimeout(() => {
                    onClose();
                }, 1800);
            } else {
                throw new Error(data?.message || "Failed to claim reward.");
            }
        } catch (err) {
            setError(err.message || "Could not claim reward. Please try again.");
        } finally {
            setClaiming(false);
        }
    };

    const handleAdClick = () => {
        if (ad?._id && ad._id !== "sample_reward_ad") {
            recordAdClick(ad._id);
        }
        if (ad?.ctaUrl) {
            window.open(ad.ctaUrl, "_blank", "noopener,noreferrer");
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const togglePlay = () => {
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

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-orange-500/30 bg-[#0e0e11] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
                        <Gift size={16} className="text-orange-500 animate-bounce" />
                        <span>Watch Sponsored Ad • Earn +5 AI Tokens</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {canClaim && (
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Video / Creative Area */}
                <div className="relative aspect-video w-full bg-black overflow-hidden group">
                    {ad?.videoUrl ? (
                        <video
                            ref={videoRef}
                            src={ad.videoUrl}
                            poster={ad?.imageUrl}
                            autoPlay
                            muted={isMuted}
                            loop
                            playsInline
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <img
                            src={ad?.imageUrl || "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80"}
                            alt={ad?.title || "Sponsored Ad"}
                            className="h-full w-full object-cover"
                        />
                    )}

                    {/* Controls Overlay */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-[11px] font-bold text-orange-400 backdrop-blur-md">
                        <Sparkles size={12} />
                        Sponsored Partner
                    </div>

                    <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-xl bg-black/80 px-2.5 py-1.5 backdrop-blur-md">
                        {ad?.videoUrl && (
                            <>
                                <button
                                    type="button"
                                    onClick={togglePlay}
                                    aria-label={isPlaying ? "Pause video" : "Play video"}
                                    className="text-zinc-300 hover:text-white transition"
                                >
                                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleMute}
                                    aria-label={isMuted ? "Unmute sound" : "Mute sound"}
                                    className="text-zinc-300 hover:text-white transition"
                                >
                                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </button>
                            </>
                        )}
                        <span className="text-[10px] font-bold text-zinc-300">
                            {canClaim ? "✓ Completed" : `Reward in ${secondsLeft}s`}
                        </span>
                    </div>
                </div>

                {/* Ad Details & Action */}
                <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                                {ad?.advertiserName || "Featured Partner"}
                            </span>
                            <h3 className="mt-1 text-base font-black text-white">
                                {ad?.title || "Special Motorcycle Promotion"}
                            </h3>
                            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                                {ad?.tagline || "Exclusive offers and high-performance accessories curated for riders."}
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                            className="h-full bg-gradient-to-r from-orange-500 to-emerald-400 transition-all duration-1000 ease-linear"
                            style={{ width: `${((5 - secondsLeft) / 5) * 100}%` }}
                        />
                    </div>

                    {/* Claim Button / Status */}
                    <div className="mt-5 flex flex-col gap-2">
                        {claimed ? (
                            <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/20 py-3 text-sm font-bold text-emerald-400">
                                <CheckCircle2 size={18} />
                                +5 AI Tokens Successfully Added!
                            </div>
                        ) : canClaim ? (
                            <button
                                onClick={handleClaim}
                                disabled={claiming}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 py-3.5 text-sm font-black text-black shadow-lg shadow-orange-500/20 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
                            >
                                <Gift size={18} />
                                {claiming ? "Claiming..." : "Claim +5 AI Tokens Now!"}
                            </button>
                        ) : (
                            <button
                                disabled
                                className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/5 py-3 text-center text-xs font-bold text-zinc-500"
                            >
                                Watch {secondsLeft} more second{secondsLeft === 1 ? "" : "s"} to claim reward
                            </button>
                        )}

                        <div className="flex items-center justify-between pt-2 text-xs">
                            <button
                                type="button"
                                onClick={handleAdClick}
                                className="font-semibold text-orange-400 hover:text-orange-300 transition"
                            >
                                {ad?.ctaText || "Visit Advertiser"} ↗
                            </button>
                            <Link
                                to="/ai-plan"
                                onClick={onClose}
                                className="flex items-center gap-1 font-semibold text-zinc-500 hover:text-zinc-300 transition"
                            >
                                <Crown size={12} className="text-orange-400" />
                                Go Ad-Free with Premium
                            </Link>
                        </div>
                    </div>

                    {error && (
                        <p className="mt-2 text-center text-xs text-red-400">{error}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
