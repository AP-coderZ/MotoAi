const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        provider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        motorcycle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Motorcycle",
            required: false,
            default: null,
        },

        dealership: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Dealership",
            default: null,
        },

        // Booking type: "service" (legacy provider), "test_ride" (new customer flow)
        bookingType: {
            type: String,
            enum: ["service", "test_ride"],
            default: "service",
        },

        // Scheduled date for test rides
        scheduledDate: {
            type: Date,
            default: null,
        },

        // Time slot for test ride (e.g. "10:00 AM")
        scheduledTime: {
            type: String,
            default: "",
            trim: true,
        },

        bookingDate: {
            type: Date,
            default: Date.now,
        },

        amount: {
            type: Number,
            default: 0,
            min: 0,
        },

        status: {
            type: String,
            enum: [
                "pending",
                "accepted",
                "in-progress",
                "completed",
                "rejected",
                "cancelled",
            ],
            default: "pending",
        },

        notes: {
            type: String,
            default: "",
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient lookup
bookingSchema.index({ customer: 1, bookingType: 1, createdAt: -1 });
bookingSchema.index({ provider: 1, status: 1 });
bookingSchema.index({ dealership: 1, scheduledDate: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
