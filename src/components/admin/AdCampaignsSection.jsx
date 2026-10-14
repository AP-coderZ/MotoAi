import React, { useEffect, useState } from "react";
import {
    Megaphone,
    Plus,
    RefreshCw,
    Pencil,
    Trash2,
    Eye,
    MousePointerClick,
    Percent,
    IndianRupee,
    Sparkles,
    Check,
    X,
    ExternalLink,
    AlertCircle,
    TrendingUp,
} from "lucide-react";
import {
    getAdminAdCampaigns,
    createAdminAdCampaign,
    updateAdminAdCampaign,
    deleteAdminAdCampaign,
    getAdminAdAnalytics,
} from "../../services/api";

const PLACEMENT_OPTIONS = [
    { value: "detail_sidebar", label: "Motorcycle Detail (Sidebar)" },
    { value: "motorcycles_sidebar", label: "Motorcycle Catalog (Sidebar)" },
    { value: "compare_bottom", label: "Comparison Page (Bottom)" },
    { value: "ai_advisor_bottom", label: "AI Advisor Chat (Bottom)" },
    { value: "homepage_banner", label: "Homepage Featured Banner" },
];

const emptyCampaignForm = {
    advertiserName: "",
    title: "",
    tagline: "",
    ctaText: "Learn More",
    ctaUrl: "",
    imageUrl: "",
    placement: "detail_sidebar",
    targetBrand: "",
    targetCategory: "",
    totalBudget: 10000,
    cpm: 50,
    status: "active",
};

export default function AdCampaignsSection() {
    const [campaigns, setCampaigns] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");
    const [placementFilter, setPlacementFilter] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyCampaignForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [actionMsg, setActionMsg] = useState("");

    const loadData = async () => {
        setLoading(true);
        setActionMsg("");
        try {
            const [cData, aData] = await Promise.all([
                getAdminAdCampaigns({
                    status: statusFilter || undefined,
                    placement: placementFilter || undefined,
                }),
                getAdminAdAnalytics().catch(() => ({ summary: [], byPlacement: [] })),
            ]);
            setCampaigns(cData.campaigns || []);
            setAnalytics(aData);
        } catch (err) {
            console.error("AdCampaignsSection load error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [statusFilter, placementFilter]);

    const handleOpenAdd = () => {
        setEditingId(null);
        setForm(emptyCampaignForm);
        setFormError("");
        setShowModal(true);
    };

    const handleOpenEdit = (c) => {
        setEditingId(c._id);
        setForm({
            advertiserName: c.advertiserName || "",
            title: c.title || "",
            tagline: c.tagline || "",
            ctaText: c.ctaText || "Learn More",
            ctaUrl: c.ctaUrl || "",
            imageUrl: c.imageUrl || "",
            placement: c.placement || "detail_sidebar",
            targetBrand: c.targetBrand || "",
            targetCategory: c.targetCategory || "",
            totalBudget: c.totalBudget ?? 10000,
            cpm: c.cpm ?? 50,
            status: c.status || "active",
        });
        setFormError("");
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.advertiserName.trim() || !form.title.trim()) {
            setFormError("Advertiser name and campaign title are required.");
            return;
        }
        setSaving(true);
        setFormError("");

        try {
            if (editingId) {
                await updateAdminAdCampaign(editingId, form);
                setActionMsg("Campaign updated successfully.");
            } else {
                await createAdminAdCampaign(form);
                setActionMsg("Campaign created successfully.");
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.message || "Failed to save campaign.");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (c) => {
        const nextStatus = c.status === "active" ? "paused" : "active";
        try {
            await updateAdminAdCampaign(c._id, { status: nextStatus });
            setCampaigns((prev) =>
                prev.map((item) =>
                    item._id === c._id ? { ...item, status: nextStatus } : item
                )
            );
        } catch (err) {
            alert(err.message || "Failed to update status.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this campaign?")) return;
        try {
            await deleteAdminAdCampaign(id);
            setCampaigns((prev) => prev.filter((item) => item._id !== id));
            setActionMsg("Campaign deleted.");
        } catch (err) {
            alert(err.message || "Failed to delete campaign.");
        }
    };

    // Calculate aggregated metrics
    const totalImpressions = campaigns.reduce((acc, c) => acc + (c.impressions || 0), 0);
    const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
    const overallCtr =
        totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
    const activeCount = campaigns.filter((c) => c.status === "active").length;

    return (
        <div className="space-y-6">
            {/* TOP BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <Megaphone className="text-orange-500" size={22} />
                        Contextual Ad Campaigns
                    </h2>
                    <p className="mt-1 text-xs text-zinc-400">
                        Create, track, and manage contextual sponsor promotions across MOTOAI.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-orange-400 shadow-lg shadow-orange-500/10"
                    >
                        <Plus size={16} />
                        New Ad Campaign
                    </button>
                </div>
            </div>

            {actionMsg && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                    {actionMsg}
                </div>
            )}

            {/* METRICS CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-xs uppercase tracking-wider font-semibold">
                            Total Impressions
                        </span>
                        <Eye size={18} className="text-orange-400" />
                    </div>
                    <p className="mt-3 text-2xl font-black text-white">
                        {totalImpressions.toLocaleString("en-IN")}
                    </p>
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                        Across all placement slots
                    </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-xs uppercase tracking-wider font-semibold">
                            Total Clicks
                        </span>
                        <MousePointerClick size={18} className="text-sky-400" />
                    </div>
                    <p className="mt-3 text-2xl font-black text-white">
                        {totalClicks.toLocaleString("en-IN")}
                    </p>
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                        Direct rider engagements
                    </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-xs uppercase tracking-wider font-semibold">
                            Avg. Click-Through Rate
                        </span>
                        <Percent size={18} className="text-emerald-400" />
                    </div>
                    <p className="mt-3 text-2xl font-black text-emerald-400">
                        {overallCtr}%
                    </p>
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                        CTR (Clicks / Views)
                    </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-xs uppercase tracking-wider font-semibold">
                            Active Campaigns
                        </span>
                        <TrendingUp size={18} className="text-purple-400" />
                    </div>
                    <p className="mt-3 text-2xl font-black text-white">
                        {activeCount} <span className="text-xs font-normal text-zinc-500">/ {campaigns.length} total</span>
                    </p>
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                        Serving live traffic
                    </span>
                </div>
            </div>

            {/* FILTERS */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-[#111] p-4">
                <span className="text-xs font-semibold text-zinc-400">Filters:</span>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="draft">Draft</option>
                    <option value="completed">Completed</option>
                </select>

                <select
                    value={placementFilter}
                    onChange={(e) => setPlacementFilter(e.target.value)}
                    className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                >
                    <option value="">All Placements</option>
                    {PLACEMENT_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                            {p.label}
                        </option>
                    ))}
                </select>

                {(statusFilter || placementFilter) && (
                    <button
                        onClick={() => {
                            setStatusFilter("");
                            setPlacementFilter("");
                        }}
                        className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                    >
                        Reset
                    </button>
                )}
            </div>

            {/* CAMPAIGNS TABLE */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-white/10 bg-white/[0.02] text-zinc-400">
                            <tr>
                                <th className="px-5 py-3.5 font-bold uppercase tracking-wider">
                                    Campaign / Advertiser
                                </th>
                                <th className="px-5 py-3.5 font-bold uppercase tracking-wider">
                                    Placement Slot
                                </th>
                                <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-right">
                                    Impressions
                                </th>
                                <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-right">
                                    Clicks
                                </th>
                                <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-right">
                                    CTR
                                </th>
                                <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-center">
                                    Status
                                </th>
                                <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center text-zinc-500">
                                        Loading ad campaigns...
                                    </td>
                                </tr>
                            ) : campaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center">
                                        <Megaphone size={28} className="mx-auto text-zinc-600 mb-2" />
                                        <p className="text-sm font-bold text-white">No campaigns found</p>
                                        <p className="text-xs text-zinc-500 mt-1">
                                            Create your first contextual sponsor ad campaign.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                campaigns.map((c) => {
                                    const ctr =
                                        c.impressions > 0
                                            ? ((c.clicks / c.impressions) * 100).toFixed(2)
                                            : "0.00";
                                    const placementLabel =
                                        PLACEMENT_OPTIONS.find((p) => p.value === c.placement)
                                            ?.label || c.placement;

                                    return (
                                        <tr
                                            key={c._id}
                                            className="transition hover:bg-white/[0.02]"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    {c.imageUrl ? (
                                                        <img
                                                            src={c.imageUrl}
                                                            alt={c.title}
                                                            className="h-10 w-16 rounded-lg object-cover bg-black/40 border border-white/5 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-600">
                                                            <Megaphone size={16} />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-white truncate">
                                                            {c.title}
                                                        </p>
                                                        <p className="text-[11px] text-zinc-400 truncate">
                                                            {c.advertiserName}
                                                        </p>
                                                        {c.targetBrand && (
                                                            <span className="mt-1 inline-block rounded bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-bold text-orange-400 border border-orange-500/20">
                                                                Target: {c.targetBrand}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 text-zinc-300">
                                                <span className="font-medium">{placementLabel}</span>
                                            </td>

                                            <td className="px-5 py-4 text-right font-bold text-white">
                                                {(c.impressions || 0).toLocaleString("en-IN")}
                                            </td>

                                            <td className="px-5 py-4 text-right font-bold text-white">
                                                {(c.clicks || 0).toLocaleString("en-IN")}
                                            </td>

                                            <td className="px-5 py-4 text-right font-bold text-emerald-400">
                                                {ctr}%
                                            </td>

                                            <td className="px-5 py-4 text-center">
                                                <button
                                                    onClick={() => handleToggleStatus(c)}
                                                    title={`Click to ${c.status === "active" ? "pause" : "activate"}`}
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase transition ${
                                                        c.status === "active"
                                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                                                            : c.status === "paused"
                                                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                                                            : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/30"
                                                    }`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${
                                                            c.status === "active"
                                                                ? "bg-emerald-400"
                                                                : c.status === "paused"
                                                                ? "bg-amber-400"
                                                                : "bg-zinc-400"
                                                        }`}
                                                    />
                                                    {c.status}
                                                </button>
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenEdit(c)}
                                                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
                                                        title="Edit Campaign"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(c._id)}
                                                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
                                                        title="Delete Campaign"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CREATE / EDIT MODAL */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-[#121212] p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-5 right-5 h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
                        >
                            <X size={16} />
                        </button>

                        <h3 className="text-xl font-black text-white">
                            {editingId ? "Edit Ad Campaign" : "New Contextual Ad Campaign"}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1">
                            Configure advertiser details, target slot, and creatives.
                        </p>

                        {formError && (
                            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleSave} className="mt-6 space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Advertiser Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.advertiserName}
                                        onChange={(e) =>
                                            setForm({ ...form, advertiserName: e.target.value })
                                        }
                                        placeholder="e.g. Castrol India"
                                        className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Campaign Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={(e) =>
                                            setForm({ ...form, title: e.target.value })
                                        }
                                        placeholder="e.g. Power1 Ultimate Synthetic"
                                        className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Tagline / Description
                                </label>
                                <input
                                    type="text"
                                    value={form.tagline}
                                    onChange={(e) =>
                                        setForm({ ...form, tagline: e.target.value })
                                    }
                                    placeholder="e.g. Engineered for maximum acceleration and engine life."
                                    className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Placement Slot *
                                    </label>
                                    <select
                                        value={form.placement}
                                        onChange={(e) =>
                                            setForm({ ...form, placement: e.target.value })
                                        }
                                        className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                                    >
                                        {PLACEMENT_OPTIONS.map((p) => (
                                            <option key={p.value} value={p.value}>
                                                {p.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Campaign Status
                                    </label>
                                    <select
                                        value={form.status}
                                        onChange={(e) =>
                                            setForm({ ...form, status: e.target.value })
                                        }
                                        className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                                    >
                                        <option value="active">Active (Serving)</option>
                                        <option value="paused">Paused</option>
                                        <option value="draft">Draft</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        CTA Button Text
                                    </label>
                                    <input
                                        type="text"
                                        value={form.ctaText}
                                        onChange={(e) =>
                                            setForm({ ...form, ctaText: e.target.value })
                                        }
                                        placeholder="e.g. Learn More / Buy Now"
                                        className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Destination URL
                                    </label>
                                    <input
                                        type="text"
                                        value={form.ctaUrl}
                                        onChange={(e) =>
                                            setForm({ ...form, ctaUrl: e.target.value })
                                        }
                                        placeholder="https://..."
                                        className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Creative Image URL
                                </label>
                                <input
                                    type="text"
                                    value={form.imageUrl}
                                    onChange={(e) =>
                                        setForm({ ...form, imageUrl: e.target.value })
                                    }
                                    placeholder="https://images.unsplash.com/..."
                                    className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Target Brand (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={form.targetBrand}
                                        onChange={(e) =>
                                            setForm({ ...form, targetBrand: e.target.value })
                                        }
                                        placeholder="e.g. Royal Enfield (leave blank for all)"
                                        className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Target Category (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={form.targetCategory}
                                        onChange={(e) =>
                                            setForm({ ...form, targetCategory: e.target.value })
                                        }
                                        placeholder="e.g. Electric (leave blank for all)"
                                        className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-xl bg-orange-500 px-6 py-2 text-xs font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : editingId ? "Update Campaign" : "Create Campaign"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
