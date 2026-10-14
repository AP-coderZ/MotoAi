const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

const authRoutes = require("./routes/authRoutes");
const motorcycleRoutes = require("./routes/motorcycleRoutes");
const providerRoutes = require("./routes/providerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminSubscriptionRoutes = require("./routes/adminSubscriptionRoutes");
const aiAdvisorRoutes = require("./routes/aiAdvisorRoutes");
const chatRoutes = require("./routes/chatRoutes");
const aiTokenRoutes = require("./routes/aiTokenRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const userRoutes = require("./routes/userRoutes");
const comparisonRoutes = require("./routes/comparisonRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const adRoutes = require("./routes/adRoutes");

const app = express();

// ========================================
// Middleware
// ========================================

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

// Raw body for the Razorpay webhook signature check.
// MUST be mounted before express.json().
app.use("/api/subscription/webhook", express.raw({ type: "*/*" }));

app.use(express.json());

// Serve static images (motorcycles, logos, etc.)
app.use("/images", express.static(path.join(__dirname, "../public/images")));



// ========================================
// Routes
// ========================================

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "MOTOAI Backend is running 🚀",
    });
});

// Authentication
app.use("/api/auth", authRoutes);

// Motorcycle routes
app.use("/api/motorcycles", motorcycleRoutes);

// Provider routes
app.use("/api/provider", providerRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminSubscriptionRoutes);

// AI Advisor routes
app.use("/api/ai-advisor", aiAdvisorRoutes);

// Persistent chat routes
app.use("/api/chats", chatRoutes);

// AI token wallet routes
app.use("/api/ai-tokens", aiTokenRoutes);

// Customer panel routes
app.use("/api/user", userRoutes);

// Saved comparisons routes
app.use("/api/comparisons", comparisonRoutes);

// In-app notifications routes
app.use("/api/notifications", notificationRoutes);

// Motorcycle reviews routes
app.use("/api/reviews", reviewRoutes);

// Customer test-ride booking routes
app.use("/api/bookings", bookingRoutes);

// Ad campaign routes
app.use("/api/ads", adRoutes);

// Subscription / Premium routes
app.use("/api/subscription", subscriptionRoutes);


// ========================================
// 404 Handler
// ========================================

app.use((req, res) => {
    res.status(404).json({
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});


// ========================================
// Global Error Handler
// ========================================

app.use((err, req, res, next) => {
    console.error("Server Error:", err);

    res.status(500).json({
        message: "Internal server error",
        error: err.message,
    });
});


// ========================================
// MongoDB Connection
// ========================================

const MONGO_URI =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/motorcycle_ai";
const PORT = process.env.PORT || 5000;

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");

        app.listen(PORT, () => {
            console.log(
                `Server running on http://localhost:${PORT}`
            );
        });
    })
    .catch((error) => {
        console.error(
            "MongoDB connection failed:",
            error
        );
    });