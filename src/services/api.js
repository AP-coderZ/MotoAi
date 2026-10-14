const API_BASE = "http://localhost:5000/api";

export const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

// Central authenticated request helper.
// 401 → clears session and redirects to login.
// Throws ApiError { status, message } otherwise.
export class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

export const apiFetch = async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...(options.headers || {}),
        },
    });

    if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        throw new ApiError(401, "Session expired. Please login again.");
    }

    let data = {};
    try {
        data = await response.json();
    } catch {
        /* non-JSON body */
    }

    if (!response.ok || data.success === false) {
        throw new ApiError(
            response.status,
            data.message || `Request failed (${response.status})`
        );
    }

    return data;
};

// ==========================================
// Subscription & Plans API
// ==========================================

export const getSubscriptionPlans = async () => {
    const response = await fetch(`${API_BASE}/subscription/plans`);
    if (!response.ok) {
        throw new Error("Failed to fetch subscription plans");
    }
    return response.json();
};

export const getSubscriptionStatus = async () => {
    const response = await fetch(`${API_BASE}/subscription/status`, {
        headers: getAuthHeaders(),
    });
    if (!response.ok) {
        throw new Error("Failed to fetch subscription status");
    }
    return response.json();
};

export const createSubscriptionOrder = async (plan) => {
    const response = await fetch(`${API_BASE}/subscription/create-order`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to create subscription order");
    }
    return data;
};

export const verifySubscriptionPayment = async (payload) => {
    const response = await fetch(`${API_BASE}/subscription/verify-payment`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || "Payment verification failed");
    }
    return data;
};

// ==========================================
// AI Token API
// ==========================================

export const getAiTokens = async () => {
    const response = await fetch(`${API_BASE}/ai-tokens`, {
        headers: getAuthHeaders(),
    });
    if (!response.ok) {
        throw new Error("Failed to fetch AI tokens");
    }
    return response.json();
};

// ==========================================
// User Panel API (all MongoDB-driven)
// ==========================================

export const getUserDashboard = () => apiFetch("/user/dashboard");

export const getUserProfile = () => apiFetch("/user/profile");

export const updateUserProfile = (payload) =>
    apiFetch("/user/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
    });

export const getUserFavorites = () => apiFetch("/user/favorites");

export const addUserFavorite = (motorcycleId) =>
    apiFetch(`/user/favorites/${motorcycleId}`, { method: "POST" });

export const removeUserFavorite = (motorcycleId) =>
    apiFetch(`/user/favorites/${motorcycleId}`, { method: "DELETE" });

export const changeUserPassword = (payload) =>
    apiFetch("/user/change-password", {
        method: "PUT",
        body: JSON.stringify(payload),
    });

export const deleteUserAccount = () =>
    apiFetch("/user/account", {
        method: "DELETE",
        body: JSON.stringify({ confirm: true }),
    });

// ==========================================
// Comparisons API
// ==========================================

export const getComparisons = () => apiFetch("/comparisons");

export const getComparison = (id) => apiFetch(`/comparisons/${id}`);

export const createComparison = (motorcycleIds) =>
    apiFetch("/comparisons", {
        method: "POST",
        body: JSON.stringify({ motorcycleIds }),
    });

export const deleteComparison = (id) =>
    apiFetch(`/comparisons/${id}`, { method: "DELETE" });

// ==========================================
// Motorcycles API (existing backend)
// ==========================================

export const searchMotorcycles = async (query) => {
    const params = new URLSearchParams();
    if (query && query.trim()) params.set("search", query.trim());
    const response = await fetch(
        `${API_BASE}/motorcycles?${params.toString()}`
    );
    if (!response.ok) {
        throw new Error("Failed to search motorcycles");
    }
    const data = await response.json();
    return data.motorcycles || [];
};

export const getAllMotorcycles = async () => searchMotorcycles("");

export const getMotorcycle = async (id) => {
    const response = await fetch(`${API_BASE}/motorcycles/${id}`);
    if (!response.ok) {
        throw new Error("Motorcycle not found");
    }
    const data = await response.json();
    return data.motorcycle;
};

// ==========================================
// Notifications API (in-app only)
// ==========================================

export const getNotifications = () => apiFetch("/notifications");

export const markNotificationRead = (id) =>
    apiFetch(`/notifications/${id}/read`, { method: "PUT" });

export const markAllNotificationsRead = () =>
    apiFetch("/notifications/read-all", { method: "PUT" });

export const deleteNotification = (id) =>
    apiFetch(`/notifications/${id}`, { method: "DELETE" });

// ==========================================
// Subscriptions API
// ==========================================

export const getSubscriptionHistory = () =>
    apiFetch("/subscription/history");

// ==========================================
// Chats API (existing chat system)
// ==========================================

export const getChats = () => apiFetch("/chats");

export const renameChat = (id, title) =>
    apiFetch(`/chats/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title }),
    });

export const deleteChat = (id) =>
    apiFetch(`/chats/${id}`, { method: "DELETE" });

// ==========================================
// Admin AI Subscription & Analytics API
// ==========================================

export const getAdminSubscriptionStats = () =>
    apiFetch("/admin/subscription-stats");

export const getAdminSubscriptionAnalytics = (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    const query = qs.toString();
    return apiFetch(`/admin/subscription-analytics${query ? `?${query}` : ""}`);
};

export const getAdminSubscriptions = (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    const query = qs.toString();
    return apiFetch(`/admin/subscriptions${query ? `?${query}` : ""}`);
};

export const getAdminSubscriptionDetails = (id) =>
    apiFetch(`/admin/subscriptions/${id}`);

export const getAdminExpiringSubscriptions = (days = 7) =>
    apiFetch(`/admin/subscriptions/expiring?days=${days}`);

export const getAdminLowTokenUsers = (threshold = 5) =>
    apiFetch(`/admin/subscriptions/low-tokens?threshold=${threshold}`);

export const exportAdminSubscriptionsCsv = async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    const query = qs.toString();
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/admin/subscriptions/export${query ? `?${query}` : ""}`, {
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    if (!response.ok) throw new Error("Failed to download CSV");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `motoai_subscriptions_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

// ==========================================
// Bookings & Test Rides API
// ==========================================

export const getMyBookings = () => apiFetch("/bookings/mine");

export const cancelBooking = (id) =>
    apiFetch(`/bookings/${id}/cancel`, { method: "PUT" });

export const createTestRideBooking = (payload) =>
    apiFetch("/bookings/test-ride", {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const getDealerships = async (params = {}) => {
    const qs = new URLSearchParams();
    if (params.city) qs.set("city", params.city);
    if (params.brand) qs.set("brand", params.brand);
    const query = qs.toString();
    const res = await fetch(`${API_BASE}/bookings/dealerships${query ? `?${query}` : ""}`);
    if (!res.ok) throw new Error("Failed to fetch dealerships");
    return res.json();
};

export const getDealershipSlots = async (dealershipId, date) => {
    const res = await fetch(
        `${API_BASE}/bookings/slots?dealershipId=${encodeURIComponent(dealershipId)}&date=${encodeURIComponent(date)}`
    );
    if (!res.ok) throw new Error("Failed to fetch available slots");
    return res.json();
};

// ==========================================
// Reviews API
// ==========================================

export const getMotorcycleReviews = async (motorcycleId, page = 1) => {
    const res = await fetch(`${API_BASE}/reviews/motorcycle/${motorcycleId}?page=${page}`);
    if (!res.ok) throw new Error("Failed to fetch reviews");
    return res.json();
};

export const getMyReview = (motorcycleId) =>
    apiFetch(`/reviews/motorcycle/${motorcycleId}/mine`);

export const createReview = (motorcycleId, payload) =>
    apiFetch(`/reviews/motorcycle/${motorcycleId}`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const getMyReviews = () => apiFetch("/reviews/mine");

export const deleteReview = (reviewId) =>
    apiFetch(`/reviews/${reviewId}`, { method: "DELETE" });

// ==========================================
// Contextual Ads API
// ==========================================

export const getAdPlacement = async (placement, brand = "", category = "") => {
    const qs = new URLSearchParams({ placement });
    if (brand) qs.set("brand", brand);
    if (category) qs.set("category", category);
    try {
        const res = await fetch(`${API_BASE}/ads?${qs.toString()}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) return { success: false, ad: null };
        return await res.json();
    } catch {
        return { success: false, ad: null };
    }
};

export const recordAdClick = async (adId) => {
    try {
        await fetch(`${API_BASE}/ads/${adId}/click`, { method: "POST" });
    } catch {
        /* non-fatal */
    }
};

export const claimAdReward = () =>
    apiFetch("/ai-tokens/reward-ad", { method: "POST" });

// Admin Ad Campaigns
export const getAdminAdCampaigns = (params = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.placement) qs.set("placement", params.placement);
    const query = qs.toString();
    return apiFetch(`/ads/admin${query ? `?${query}` : ""}`);
};

export const createAdminAdCampaign = (payload) =>
    apiFetch("/ads/admin", {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const updateAdminAdCampaign = (id, payload) =>
    apiFetch(`/ads/admin/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

export const deleteAdminAdCampaign = (id) =>
    apiFetch(`/ads/admin/${id}`, { method: "DELETE" });

export const getAdminAdAnalytics = () => apiFetch("/ads/admin/analytics");

