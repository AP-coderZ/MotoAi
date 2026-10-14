const {
    effectivePlan,
    walletOf,
    planConfig,
} = require("../utils/aiTokens");

// =====================================================
// GET WALLET — GET /api/ai-tokens
// =====================================================
const getWallet = async (req, res) => {
    try {
        await effectivePlan(req.user);

        res.status(200).json({
            success: true,
            ...walletOf(req.user),
            config: planConfig(),
        });
    } catch (error) {
        console.error("Get wallet error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load token balance.",
        });
    }
};

// =====================================================
// CLAIM AD REWARD — POST /api/ai-tokens/reward-ad
// Watching a sponsored ad awards +5 AI tokens to Free Plan users
// =====================================================
const claimAdReward = async (req, res) => {
    try {
        await effectivePlan(req.user);

        // Only Free plan users can earn ad rewards (Premium users already have hundreds/thousands of tokens)
        const REWARD_AMOUNT = 5;
        req.user.aiTokens = (req.user.aiTokens || 0) + REWARD_AMOUNT;
        await req.user.save();

        res.status(200).json({
            success: true,
            message: `Awesome! You earned +${REWARD_AMOUNT} AI tokens for watching the sponsored partner video.`,
            rewardTokens: REWARD_AMOUNT,
            wallet: walletOf(req.user),
        });
    } catch (error) {
        console.error("Claim ad reward error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not credit ad reward tokens.",
        });
    }
};

module.exports = { getWallet, claimAdReward };
