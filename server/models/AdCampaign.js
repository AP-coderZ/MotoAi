const mongoose = require("mongoose");

const adCampaignSchema = new mongoose.Schema(
    {
        // Advertiser info
        advertiserName: {
            type: String,
            required: true,
            trim: true,
        },

        // Campaign name
        title: {
            type: String,
            required: true,
            trim: true,
        },

        // Short tagline shown to users
        tagline: {
            type: String,
            default: "",
            trim: true,
        },

        // Call-to-action text
        ctaText: {
            type: String,
            default: "Learn More",
            trim: true,
        },

        // URL where clicking the ad goes
        ctaUrl: {
            type: String,
            default: "",
            trim: true,
        },

        // Image URL for the ad creative
        imageUrl: {
            type: String,
            default: "",
            trim: true,
        },

        // Video URL for playable video ads
        videoUrl: {
            type: String,
            default: "",
            trim: true,
        },

        // Placement context: which page / section the ad appears in
        placement: {
            type: String,
            enum: [
                "motorcycles_sidebar",  // Motorcycles listing sidebar
                "compare_bottom",       // Bottom of compare page
                "detail_sidebar",       // Motorcycle detail sidebar
                "ai_advisor_bottom",    // Below AI Advisor chat
                "homepage_banner",      // Homepage featured banner
            ],
            required: true,
        },

        // Optional — only show when user is viewing a specific brand
        targetBrand: {
            type: String,
            default: "",
            trim: true,
        },

        // Optional — only show when user is viewing a specific category
        targetCategory: {
            type: String,
            default: "",
            trim: true,
        },

        // Budget and billing
        totalBudget: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Cost per 1000 impressions (CPM in INR)
        cpm: {
            type: Number,
            default: 50,
            min: 0,
        },

        // Analytics
        impressions: {
            type: Number,
            default: 0,
            min: 0,
        },

        clicks: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Campaign scheduling
        startDate: {
            type: Date,
            default: null,
        },

        endDate: {
            type: Date,
            default: null,
        },

        status: {
            type: String,
            enum: ["draft", "active", "paused", "completed"],
            default: "draft",
        },

        // All campaigns are sample / demo — no real payments
        isSampleCampaign: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

adCampaignSchema.index({ placement: 1, status: 1 });
adCampaignSchema.index({ status: 1, startDate: 1, endDate: 1 });
adCampaignSchema.index({ targetBrand: 1, status: 1 });

module.exports = mongoose.model("AdCampaign", adCampaignSchema);
