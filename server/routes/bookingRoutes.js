const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const protect = require("../middleware/authMiddleware");
const Booking = require("../models/Booking");
const Dealership = require("../models/Dealership");
const Notification = require("../models/Notification");

// =====================================================
// TIME SLOTS
// =====================================================
const TIME_SLOTS = [
    "09:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "02:00 PM", "03:00 PM",
    "04:00 PM", "05:00 PM", "06:00 PM",
];

// =====================================================
// GET ALL DEALERSHIPS
// GET /api/bookings/dealerships?city=&brand=
// =====================================================
router.get("/dealerships", async (req, res) => {
    try {
        const filter = { isActive: true };
        if (req.query.city) {
            filter.city = { $regex: req.query.city.trim(), $options: "i" };
        }
        if (req.query.brand) {
            filter.brand = { $regex: req.query.brand.trim(), $options: "i" };
        }
        const dealerships = await Dealership.find(filter)
            .populate("availableModels", "name brand category price")
            .sort({ city: 1, name: 1 });
        res.json({ success: true, dealerships });
    } catch (err) {
        console.error("getDealerships error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch dealerships" });
    }
});

// =====================================================
// GET AVAILABLE TIME SLOTS FOR A DATE
// GET /api/bookings/slots?dealershipId=&date=
// =====================================================
router.get("/slots", async (req, res) => {
    try {
        const { dealershipId, date } = req.query;
        if (!dealershipId || !date) {
            return res.status(400).json({ success: false, message: "dealershipId and date are required" });
        }

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const existingBookings = await Booking.find({
            dealership: dealershipId,
            scheduledDate: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ["pending", "accepted"] },
        }).select("scheduledTime");

        const bookedSlots = existingBookings.map((b) => b.scheduledTime);
        const available = TIME_SLOTS.filter((s) => !bookedSlots.includes(s));

        res.json({ success: true, slots: available, allSlots: TIME_SLOTS });
    } catch (err) {
        console.error("getSlots error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch slots" });
    }
});

// =====================================================
// CREATE TEST-RIDE BOOKING
// POST /api/bookings/test-ride
// =====================================================
router.post("/test-ride", protect, async (req, res) => {
    try {
        const { motorcycleId, dealershipId, scheduledDate, scheduledTime, notes } = req.body;

        if (!dealershipId || !scheduledDate || !scheduledTime) {
            return res.status(400).json({
                success: false,
                message: "dealershipId, scheduledDate, and scheduledTime are required",
            });
        }
        if (!TIME_SLOTS.includes(scheduledTime)) {
            return res.status(400).json({ success: false, message: "Invalid time slot" });
        }

        const dealership = await Dealership.findById(dealershipId);
        if (!dealership || !dealership.isActive) {
            return res.status(404).json({ success: false, message: "Dealership not found" });
        }

        const scheduledDateObj = new Date(scheduledDate);
        if (scheduledDateObj < new Date()) {
            return res.status(400).json({ success: false, message: "Cannot book a past date" });
        }

        // Check slot availability
        const startOfDay = new Date(scheduledDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(scheduledDate);
        endOfDay.setHours(23, 59, 59, 999);

        const slotTaken = await Booking.findOne({
            dealership: dealershipId,
            scheduledDate: { $gte: startOfDay, $lte: endOfDay },
            scheduledTime,
            status: { $in: ["pending", "accepted"] },
        });
        if (slotTaken) {
            return res.status(409).json({ success: false, message: "This time slot is already booked. Please choose another." });
        }

        // Prevent duplicate booking on same day at same dealership by same user
        const duplicate = await Booking.findOne({
            customer: req.user._id,
            dealership: dealershipId,
            scheduledDate: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ["pending", "accepted"] },
        });
        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: "You already have a test-ride booking at this dealership on this date.",
            });
        }

        const booking = await Booking.create({
            customer: req.user._id,
            provider: dealership.provider || null,
            motorcycle: motorcycleId || null,
            dealership: dealershipId,
            bookingType: "test_ride",
            scheduledDate: scheduledDateObj,
            scheduledTime,
            notes: (notes || "").trim().slice(0, 500),
            status: "pending",
        });

        // Create a notification for the user
        await Notification.create({
            user: req.user._id,
            title: "Test Ride Booked!",
            message: `Your test ride at ${dealership.name} on ${scheduledDateObj.toLocaleDateString("en-IN")} at ${scheduledTime} is pending confirmation.`,
            type: "info",
            link: "/user/bookings",
        }).catch(() => {}); // non-fatal

        const populated = await Booking.findById(booking._id)
            .populate("motorcycle", "name brand category")
            .populate("dealership", "name city address operatingHours");

        res.status(201).json({
            success: true,
            message: "Test ride booked successfully!",
            booking: populated,
        });
    } catch (err) {
        console.error("createTestRideBooking error:", err);
        res.status(500).json({ success: false, message: "Failed to book test ride" });
    }
});

// =====================================================
// GET MY BOOKINGS
// GET /api/bookings/mine
// =====================================================
router.get("/mine", protect, async (req, res) => {
    try {
        const bookings = await Booking.find({
            customer: req.user._id,
            bookingType: "test_ride",
        })
            .populate("motorcycle", "name brand category images image price")
            .populate("dealership", "name city address phone operatingHours")
            .sort({ createdAt: -1 });

        res.json({ success: true, bookings });
    } catch (err) {
        console.error("getMyBookings error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch bookings" });
    }
});

// =====================================================
// CANCEL MY BOOKING
// PUT /api/bookings/:id/cancel
// =====================================================
router.put("/:id/cancel", protect, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid booking ID" });
        }

        const booking = await Booking.findOne({
            _id: req.params.id,
            customer: req.user._id,
            bookingType: "test_ride",
        });

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        if (["completed", "cancelled"].includes(booking.status)) {
            return res.status(400).json({ success: false, message: `Booking is already ${booking.status}` });
        }

        booking.status = "cancelled";
        await booking.save();

        res.json({ success: true, message: "Booking cancelled", booking });
    } catch (err) {
        console.error("cancelBooking error:", err);
        res.status(500).json({ success: false, message: "Failed to cancel booking" });
    }
});

module.exports = router;
