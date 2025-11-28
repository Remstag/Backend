const express = require("express");
const router = express.Router();

const User = require("../db/userModel.js");
const Photo = require("../db/photoModel.js");

// 1. /user/list
router.get("/user/list", async (req, res) => {
  try {
    const users = await User.find({}, "_id first_name last_name").lean();
    res.status(200).send(users);
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch user list." });
  }
});

// 2. /user/:id
router.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();

    if (!user) {
      return res.status(400).send({ error: "User not found." });
    }

    // Chỉ trả về đúng các field yêu cầu
    const response = {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      location: user.location,
      description: user.description,
      occupation: user.occupation,
    };

    res.status(200).send(response);
  } catch (err) {
    res.status(400).send({ error: "Invalid user ID." });
  }
});

module.exports = router;
