const express = require("express");
const router = express.Router();

const User = require("../db/userModel.js");
const Photo = require("../db/photoModel.js");

// /photosOfUser/:id
router.get("/photosOfUser/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(400).send({ error: "User not found." });
    }

    const photos = await Photo.find({ user_id: req.params.id }).lean();

    const result = photos.map((photo) => {
      const comments = photo.comments.map((c) => ({
        comment: c.comment,
        date_time: c.date_time,
        _id: c._id,
        user: {
          _id: c.user_id._id || c.user_id,
          first_name: c.user_id.first_name,
          last_name: c.user_id.last_name,
        },
      }));

      return {
        _id: photo._id,
        user_id: photo.user_id,
        comments: comments,
        file_name: photo.file_name,
        date_time: photo.date_time,
      };
    });

    res.status(200).send(result);
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "Invalid user ID." });
  }
});

module.exports = router;
