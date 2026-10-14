const mongoose = require("mongoose");

const dealershipSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        brand: {
            type: String,
            required: true,
            trim: true,
        },

        city: {
            type: String,
            required: true,
            trim: true,
        },

        state: {
            type: String,
            required: true,
            trim: true,
        },

        address: {
            type: String,
            required: true,
            trim: true,
        },

        phone: {
            type: String,
            default: "",
            trim: true,
        },

        email: {
            type: String,
            default: "",
            trim: true,
        },

        // Provider user linked to this dealership (optional)
        provider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // Bikes available for test rides
        availableModels: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Motorcycle",
            },
        ],

        // Operating hours (simple text for demo)
        operatingHours: {
            type: String,
            default: "Mon–Sat: 9:00 AM – 7:00 PM",
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        // Note: seeded sample data, not a real dealership partnership
        isSeedData: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

dealershipSchema.index({ city: 1, brand: 1 });
dealershipSchema.index({ isActive: 1 });

module.exports = mongoose.model("Dealership", dealershipSchema);
