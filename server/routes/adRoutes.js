const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const AdCampaign = require("../models/AdCampaign");
const User = require("../models/User");
const { effectivePlan } = require("../utils/aiTokens");

const adminOnly = authorize("admin");

// =====================================================
// PUBLIC / USER — Get active ad for a placement
// (Returns no ad if user is authenticated and on a premium plan)
// GET /api/ads?placement=motorcycles_sidebar&brand=Royal+Enfield
// =====================================================
router.get("/", async (req, res) => {
    try {
        const { placement, brand, category } = req.query;
        if (!placement) {
            return res.status(400).json({ success: false, message: "placement is required" });
        }

        // Check if requester is authenticated and has a premium subscription
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer ")
        ) {
            try {
                const token = req.headers.authorization.split(" ")[1];
                if (token && process.env.JWT_SECRET) {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    if (decoded && decoded.id) {
                        const user = await User.findById(decoded.id);
                        if (user) {
                            const plan = await effectivePlan(user);
                            if (plan === "premium" || user.role === "admin") {
                                return res.json({
                                    success: true,
                                    ad: null,
                                    isPremium: true,
                                    message: "Ads are disabled for premium users.",
                                });
                            }
                        }
                    }
                }
            } catch (authErr) {
                // Ignore invalid or expired token — proceed as free/guest
            }
        }

        const now = new Date();
        const filter = {
            placement,
            status: "active",
            $or: [
                { startDate: null },
                { startDate: { $lte: now } },
            ],
            $and: [
                {
                    $or: [
                        { endDate: null },
                        { endDate: { $gte: now } },
                    ],
                },
            ],
        };

        if (brand) {
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [{ targetBrand: "" }, { targetBrand: new RegExp(brand, "i") }],
            });
        }
        if (category) {
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [{ targetCategory: "" }, { targetCategory: new RegExp(category, "i") }],
            });
        }

        // Return one random active ad for the placement
        const count = await AdCampaign.countDocuments(filter);
        if (count === 0) return res.json({ success: true, ad: null });

        const skip = Math.floor(Math.random() * count);
        const ad = await AdCampaign.findOne(filter).skip(skip).select(
            "-isSampleCampaign -totalBudget -cpm -advertiserName -status"
        );

        if (ad) {
            await AdCampaign.findByIdAndUpdate(ad._id, { $inc: { impressions: 1 } });
        }

        res.json({ success: true, ad: ad || null });
    } catch (err) {
        console.error("getAd error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch ad" });
    }
});

// =====================================================
// PUBLIC — Record a click
// POST /api/ads/:id/click
// =====================================================
router.post("/:id/click", async (req, res) => {
    try {
        await AdCampaign.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
        res.json({ success: true });
    } catch (err) {
        console.error("recordClick error:", err);
        res.status(500).json({ success: false, message: "Failed to record click" });
    }
});

// =====================================================
// ADMIN — List all campaigns
// GET /api/ads/admin
// =====================================================
router.get("/admin", protect, adminOnly, async (req, res) => {
    try {
        const { status, placement } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (placement) filter.placement = placement;

        const campaigns = await AdCampaign.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, campaigns });
    } catch (err) {
        console.error("adminGetCampaigns error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch campaigns" });
    }
});

// =====================================================
// ADMIN — Create campaign
// POST /api/ads/admin
// =====================================================
router.post("/admin", protect, adminOnly, async (req, res) => {
    try {
        const campaign = await AdCampaign.create({
            ...req.body,
            impressions: 0,
            clicks: 0,
            isSampleCampaign: true,
        });
        res.status(201).json({ success: true, campaign });
    } catch (err) {
        console.error("adminCreateCampaign error:", err);
        res.status(500).json({ success: false, message: "Failed to create campaign" });
    }
});

// =====================================================
// ADMIN — Update campaign
// PUT /api/ads/admin/:id
// =====================================================
router.put("/admin/:id", protect, adminOnly, async (req, res) => {
    try {
        const campaign = await AdCampaign.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!campaign) return res.status(404).json({ success: false, message: "Campaign not found" });
        res.json({ success: true, campaign });
    } catch (err) {
        console.error("adminUpdateCampaign error:", err);
        res.status(500).json({ success: false, message: "Failed to update campaign" });
    }
});

// =====================================================
// ADMIN — Delete campaign
// DELETE /api/ads/admin/:id
// =====================================================
router.delete("/admin/:id", protect, adminOnly, async (req, res) => {
    try {
        const campaign = await AdCampaign.findByIdAndDelete(req.params.id);
        if (!campaign) return res.status(404).json({ success: false, message: "Campaign not found" });
        res.json({ success: true, message: "Campaign deleted" });
    } catch (err) {
        console.error("adminDeleteCampaign error:", err);
        res.status(500).json({ success: false, message: "Failed to delete campaign" });
    }
});

// =====================================================
// ADMIN — Analytics summary
// GET /api/ads/admin/analytics
// =====================================================
router.get("/admin/analytics", protect, adminOnly, async (req, res) => {
    try {
        const summary = await AdCampaign.aggregate([
            {
                $group: {
                    _id: "$status",
                    totalImpressions: { $sum: "$impressions" },
                    totalClicks: { $sum: "$clicks" },
                    count: { $sum: 1 },
                },
            },
        ]);

        const byPlacement = await AdCampaign.aggregate([
            {
                $group: {
                    _id: "$placement",
                    impressions: { $sum: "$impressions" },
                    clicks: { $sum: "$clicks" },
                    active: {
                        $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
                    },
                },
            },
            { $sort: { impressions: -1 } },
        ]);

        res.json({ success: true, summary, byPlacement });
    } catch (err) {
        console.error("adminAdAnalytics error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch analytics" });
    }
});

module.exports = router;
