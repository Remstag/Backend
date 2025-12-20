const express = require("express");
const Follow = require("../db/FollowModel.js");
const Notification = require("../db/Notification"); // ✅ THÊM

const router = express.Router();
require("../db/UserModel");

// POST /follow/:userId
router.post("/:userId", async (req, res) => {
  const follower = req.session.user._id;
  const following = req.params.userId;

  if (follower.toString() === following.toString()) {
    return res.status(400).json({ message: "Cannot follow yourself" });
  }

  try {
    await Follow.create({ follower, following });

    // ✅ TẠO NOTIFICATION FOLLOW
    await Notification.create({
      user_id: following, // người được follow
      actor_id: follower, // người follow
      type: "follow",
    });

    res.json({ message: "Followed" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Already followed" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /follow/:userId
router.delete("/:userId", async (req, res) => {
  const follower = req.session.user._id;
  const following = req.params.userId;

  await Follow.findOneAndDelete({ follower, following });
  res.json({ message: "Unfollowed" });
});

// GET /follow/status/:userId
router.get("/status/:userId", async (req, res) => {
  const follower = req.session.user._id;
  const following = req.params.userId;

  const follow = await Follow.findOne({ follower, following });
  res.json({ following: !!follow });
});

// GET /follow/following
router.get("/following", async (req, res) => {
  try {
    const me = req.session.user._id;
    const follows = await Follow.find({ follower: me })
      .populate("following", "first_name last_name avatar")
      .exec();

    res.json(follows.map((f) => f.following));
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

module.exports = router;
