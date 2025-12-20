const express = require("express");
const router = express.Router();
const multer = require("multer");
const User = require("../db/userModel.js");
const Photo = require("../db/photoModel.js");
const Notification = require("../db/Notification"); // ✅ THÊM

// ========= MIDDLEWARE: yêu cầu login =========
router.use((req, res, next) => {
  if (req.session?.user) return next();
  res.status(401).send({ error: "Unauthorized" });
});

// ========= MULTER cấu hình upload =========
const storage = multer.diskStorage({
  destination: "./images/",
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "_" + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// ========= Lấy ảnh của user =========
router.get("/photosOfUser/:id", async (req, res) => {
  try {
    const photos = await Photo.find({ user_id: req.params.id })
      .populate("comments.user_id", "first_name last_name")
      .sort({ date_time: -1 })
      .lean();

    photos.forEach((p) => {
      p.comments.forEach((c) => {
        c.user = c.user_id;
      });
    });

    res.send(photos);
  } catch (err) {
    res.status(500).send({ error: "Failed to load photos" });
  }
});

// ========= Thêm comment =========
router.post("/commentsOfPhoto/:photo_id", async (req, res) => {
  const { comment } = req.body;

  if (!comment?.trim()) {
    return res.status(400).send({ error: "Empty comment" });
  }

  try {
    const photo = await Photo.findById(req.params.photo_id);
    if (!photo) {
      return res.status(404).send({ error: "Photo not found" });
    }

    photo.comments.push({
      comment,
      user_id: req.session.user._id,
      date_time: new Date(),
    });

    await photo.save();

    // ✅ TẠO NOTIFICATION COMMENT (KHÔNG TỰ COMMENT TỰ NOTIFY)
    if (photo.user_id.toString() !== req.session.user._id.toString()) {
      await Notification.create({
        user_id: photo.user_id, // chủ ảnh
        actor_id: req.session.user._id, // người comment
        type: "comment",
        post_id: photo._id, // ⭐ CỰC KỲ QUAN TRỌNG
        is_read: false,
        created_at: new Date(),
      });
    }

    res.send({ status: "OK" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to add comment" });
  }
});

// ========= Upload ảnh + content =========
router.post("/photos/new", upload.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).send({ error: "No file uploaded" });

  try {
    await Photo.create({
      file_name: req.file.filename,
      content: req.body.content || "",
      user_id: req.session.user._id,
      date_time: new Date(),
    });

    res.send({
      status: "OK",
      file_name: req.file.filename,
      content: req.body.content || "",
    });
  } catch (err) {
    res.status(500).send({ error: "Upload failed" });
  }
});

// ========= XÓA ẢNH =========
router.delete("/photos/:photoId", async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.photoId);
    if (!photo) return res.status(404).send({ error: "Photo not found" });

    if (photo.user_id.toString() !== req.session.user._id) {
      return res.status(403).send({ error: "Access denied" });
    }

    await Photo.findByIdAndDelete(req.params.photoId);
    res.send({ status: "OK" });
  } catch (err) {
    res.status(500).send({ error: "Failed to delete" });
  }
});

// ========= EDIT ẢNH + CONTENT =========
router.put("/photos/:photoId", upload.single("photo"), async (req, res) => {
  try {
    const { content } = req.body;

    const photo = await Photo.findById(req.params.photoId);
    if (!photo) return res.status(404).send({ error: "Photo not found" });

    if (photo.user_id.toString() !== req.session.user._id) {
      return res.status(403).send({ error: "Access denied" });
    }

    if (content !== undefined) {
      photo.content = content;
    }

    if (req.file) {
      photo.file_name = req.file.filename;
    }

    await photo.save();

    res.send({ status: "OK", photo });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to update photo" });
  }
});

module.exports = router;
