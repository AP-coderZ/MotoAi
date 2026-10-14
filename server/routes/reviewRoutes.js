const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
    getMotorcycleReviews,
    createReview,
    getMyReview,
    deleteReview,
    getMyReviews,
} = require("../controllers/reviewController");

// Public — fetch reviews for a motorcycle
router.get("/motorcycle/:motorcycleId", getMotorcycleReviews);

// Authenticated — get/create own review for a motorcycle
router.get("/motorcycle/:motorcycleId/mine", protect, getMyReview);
router.post("/motorcycle/:motorcycleId", protect, createReview);

// Authenticated — manage own reviews
router.get("/mine", protect, getMyReviews);
router.delete("/:reviewId", protect, deleteReview);

module.exports = router;
