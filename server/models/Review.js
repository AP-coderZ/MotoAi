const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        motorcycle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Motorcycle",
            required: true,
            index: true,
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },

        body: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },

        // Structured sub-ratings
        ratingMileage: {
            type: Number,
            default: null,
            min: 1,
            max: 5,
        },

        ratingComfort: {
            type: Number,
            default: null,
            min: 1,
            max: 5,
        },

        ratingPerformance: {
            type: Number,
            default: null,
            min: 1,
            max: 5,
        },

        ratingMaintenance: {
            type: Number,
            default: null,
            min: 1,
            max: 5,
        },

        // Rider context
        ownershipDuration: {
            type: String,
            enum: ["lt3m", "3m_1y", "1y_2y", "2y_5y", "gt5y"],
            default: null,
        },

        rideType: {
            type: String,
            enum: ["commute", "touring", "weekend", "mixed"],
            default: null,
        },

        verified: {
            type: Boolean,
            default: false,
        },

        helpful: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Soft delete
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// One review per user per motorcycle
reviewSchema.index({ motorcycle: 1, user: 1 }, { unique: true });
reviewSchema.index({ motorcycle: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ rating: -1 });

module.exports = mongoose.model("Review", reviewSchema);
