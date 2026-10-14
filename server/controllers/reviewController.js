const Review = require("../models/Review");
const Motorcycle = require("../models/Motorcycle");
const mongoose = require("mongoose");

// =====================================================
// GET REVIEWS FOR A MOTORCYCLE
// GET /api/reviews/motorcycle/:motorcycleId
// =====================================================
const getMotorcycleReviews = async (req, res) => {
    try {
        const { motorcycleId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(motorcycleId)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID" });
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(20, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        const sort = req.query.sort === "helpful" ? { helpful: -1 }
            : req.query.sort === "rating-high" ? { rating: -1 }
            : req.query.sort === "rating-low" ? { rating: 1 }
            : { createdAt: -1 };

        const filter = { motorcycle: motorcycleId, isDeleted: false };

        const [reviews, total] = await Promise.all([
            Review.find(filter)
                .populate("user", "name profileImage")
                .sort(sort)
                .skip(skip)
                .limit(limit),
            Review.countDocuments(filter),
        ]);

        // Aggregate summary
        const summary = await Review.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: "$rating" },
                    avgMileage: { $avg: "$ratingMileage" },
                    avgComfort: { $avg: "$ratingComfort" },
                    avgPerformance: { $avg: "$ratingPerformance" },
                    avgMaintenance: { $avg: "$ratingMaintenance" },
                    count: { $sum: 1 },
                    dist: { $push: "$rating" },
                },
            },
        ]);

        let ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        if (summary[0]) {
            summary[0].dist.forEach((r) => {
                ratingDistribution[Math.round(r)] = (ratingDistribution[Math.round(r)] || 0) + 1;
            });
        }

        res.json({
            success: true,
            reviews,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            summary: summary[0]
                ? {
                      avgRating: Number((summary[0].avgRating || 0).toFixed(1)),
                      avgMileage: summary[0].avgMileage ? Number(summary[0].avgMileage.toFixed(1)) : null,
                      avgComfort: summary[0].avgComfort ? Number(summary[0].avgComfort.toFixed(1)) : null,
                      avgPerformance: summary[0].avgPerformance ? Number(summary[0].avgPerformance.toFixed(1)) : null,
                      avgMaintenance: summary[0].avgMaintenance ? Number(summary[0].avgMaintenance.toFixed(1)) : null,
                      total: summary[0].count,
                      distribution: ratingDistribution,
                  }
                : { avgRating: 0, total: 0, distribution: ratingDistribution },
        });
    } catch (err) {
        console.error("getMotorcycleReviews error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch reviews" });
    }
};

// =====================================================
// CREATE OR UPDATE A REVIEW
// POST /api/reviews/motorcycle/:motorcycleId
// (One review per user per motorcycle — upsert)
// =====================================================
const createReview = async (req, res) => {
    try {
        const { motorcycleId } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(motorcycleId)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID" });
        }

        const motorcycle = await Motorcycle.findById(motorcycleId);
        if (!motorcycle) {
            return res.status(404).json({ success: false, message: "Motorcycle not found" });
        }

        const {
            rating,
            title,
            body,
            ratingMileage,
            ratingComfort,
            ratingPerformance,
            ratingMaintenance,
            ownershipDuration,
            rideType,
        } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
        }
        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: "Review title is required" });
        }
        if (!body || body.trim().length < 20) {
            return res.status(400).json({
                success: false,
                message: "Review body must be at least 20 characters",
            });
        }

        const clamp = (v) => {
            const n = Number(v);
            if (!n || n < 1 || n > 5) return null;
            return Math.round(n);
        };

        const filter = { motorcycle: motorcycleId, user: userId };
        const update = {
            rating: Math.round(Number(rating)),
            title: title.trim().slice(0, 120),
            body: body.trim().slice(0, 2000),
            ratingMileage: clamp(ratingMileage),
            ratingComfort: clamp(ratingComfort),
            ratingPerformance: clamp(ratingPerformance),
            ratingMaintenance: clamp(ratingMaintenance),
            ownershipDuration: ownershipDuration || null,
            rideType: rideType || null,
            isDeleted: false,
        };

        const review = await Review.findOneAndUpdate(filter, update, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
            runValidators: true,
        }).populate("user", "name profileImage");

        res.status(201).json({
            success: true,
            message: "Review submitted successfully",
            review,
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "You have already reviewed this motorcycle. Edit your existing review.",
            });
        }
        console.error("createReview error:", err);
        res.status(500).json({ success: false, message: "Failed to submit review" });
    }
};

// =====================================================
// GET MY REVIEW FOR A MOTORCYCLE
// GET /api/reviews/motorcycle/:motorcycleId/mine
// =====================================================
const getMyReview = async (req, res) => {
    try {
        const { motorcycleId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(motorcycleId)) {
            return res.status(400).json({ success: false, message: "Invalid motorcycle ID" });
        }
        const review = await Review.findOne({
            motorcycle: motorcycleId,
            user: req.user._id,
            isDeleted: false,
        });
        res.json({ success: true, review: review || null });
    } catch (err) {
        console.error("getMyReview error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch your review" });
    }
};

// =====================================================
// DELETE MY REVIEW
// DELETE /api/reviews/:reviewId
// =====================================================
const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({ success: false, message: "Invalid review ID" });
        }

        const filter = { _id: reviewId };
        // Admins can delete any review; users can only delete their own
        if (req.user.role !== "admin") {
            filter.user = req.user._id;
        }

        const review = await Review.findOneAndUpdate(
            filter,
            { isDeleted: true },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found" });
        }

        res.json({ success: true, message: "Review deleted" });
    } catch (err) {
        console.error("deleteReview error:", err);
        res.status(500).json({ success: false, message: "Failed to delete review" });
    }
};

// =====================================================
// GET USER'S OWN REVIEWS
// GET /api/reviews/mine
// =====================================================
const getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ user: req.user._id, isDeleted: false })
            .populate("motorcycle", "name brand category images image price")
            .sort({ createdAt: -1 });
        res.json({ success: true, reviews });
    } catch (err) {
        console.error("getMyReviews error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch your reviews" });
    }
};

module.exports = {
    getMotorcycleReviews,
    createReview,
    getMyReview,
    deleteReview,
    getMyReviews,
};
