const express = require("express");
const router = express.Router();
const Notification = require("../db/Notification");

router.get("/", async (req, res) => {
  const userId = req.session.user._id;

  const notifications = await Notification.find({ user_id: userId })
    .populate("actor_id", "login_name avatar")
    .sort({ created_at: -1 })
    .limit(20);

  res.json(notifications);
});

router.get("/unread-count", async (req, res) => {
  const userId = req.session.user._id;

  const count = await Notification.countDocuments({
    user_id: userId,
    is_read: false,
  });

  res.json({ count });
});

router.put("/read", async (req, res) => {
  const userId = req.session.user._id;

  await Notification.updateMany(
    { user_id: userId, is_read: false },
    { is_read: true }
  );

  res.json({ message: "ok" });
});
module.exports = router;
