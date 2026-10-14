const express = require("express");
const { getWallet, claimAdReward } = require("../controllers/aiTokenController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getWallet);
router.post("/reward-ad", claimAdReward);

module.exports = router;
