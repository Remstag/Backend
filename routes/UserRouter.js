const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const User = require("../db/userModel.js");
const Photo = require("../db/photoModel.js");

// ===============================
// AUTO CREATE UPLOAD FOLDER
// ===============================
const uploadBase = "uploads/avatars";
if (!fs.existsSync(uploadBase)) {
  fs.mkdirSync(uploadBase, { recursive: true });
}

// ===============================
// MULTER SETUP FOR AVATAR
// ===============================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadBase);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ===============================
// PUBLIC PATHS
// ===============================
const publicPaths = ["/admin/login", "/admin/logout", "/signup"];

// ===============================
// LOGIN MIDDLEWARE
// ===============================
router.use((req, res, next) => {
  if (publicPaths.includes(req.path)) return next();

  if (!req.session || !req.session.user) {
    return res.status(401).send({ error: "Unauthorized" });
  }
  next();
});

// ===============================
// LOGIN
// ===============================
router.post("/admin/login", async (req, res) => {
  const { login_name, password } = req.body;

  if (!login_name || !password) {
    return res.status(400).send({ error: "Missing login_name or password" });
  }

  const user = await User.findOne({ login_name }).lean();
  if (!user) return res.status(400).send({ error: "Invalid" });

  const ok = await bcrypt.compare(password, user.password || "");
  if (!ok) return res.status(400).send({ error: "Incorrect" });

  req.session.user = {
    _id: user._id,
    login_name: user.login_name,
    first_name: user.first_name,
    last_name: user.last_name,
    avatar: user.avatar || "",
  };

  res.status(200).send(req.session.user);
});

// ===============================
// LOGOUT
// ===============================
router.post("/admin/logout", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(400).send({ error: "Not logged in" });
  }

  req.session.destroy(() => {
    res.status(200).send({ result: "OK" });
  });
});

// ===============================
// SIGNUP + AVATAR UPLOAD
// ===============================
router.post("/signup", upload.single("avatar"), async (req, res) => {
  try {
    const {
      login_name,
      password,
      first_name,
      last_name,
      location,
      description,
      occupation,
    } = req.body;

    if (!login_name || !password || !first_name || !last_name) {
      return res.status(400).send({ error: "Missing required fields" });
    }

    const exists = await User.findOne({ login_name });
    if (exists) {
      return res.status(400).send({ error: "login_name already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const avatarPath = req.file ? "/uploads/avatars/" + req.file.filename : "";

    const newUser = new User({
      login_name,
      password: hashed,
      first_name,
      last_name,
      location: location || "",
      description: description || "",
      occupation: occupation || "",
      avatar: avatarPath,
    });

    await newUser.save();

    req.session.user = {
      _id: newUser._id,
      login_name: newUser.login_name,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      avatar: newUser.avatar,
    };

    res.status(200).send({
      message: "User created successfully",
      user: req.session.user,
    });
  } catch (err) {
    res.status(500).send({ error: "Server error" });
  }
});

// ===============================
// USER LIST
// ===============================
router.get("/user/list", async (req, res) => {
  try {
    const users = await User.find({}, "_id first_name last_name avatar").lean();
    res.status(200).send(users);
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch user list." });
  }
});

// ===============================
// USER DETAIL
// ===============================
router.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();

    if (!user) {
      return res.status(400).send({ error: "User not found." });
    }

    res.status(200).send({
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      location: user.location,
      description: user.description,
      occupation: user.occupation,
      avatar: user.avatar || "",
    });
  } catch (err) {
    res.status(400).send({ error: "Invalid user ID." });
  }
});

// ===============================
// UPDATE USER INFO
// ===============================
router.put("/user/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // Chỉ cho phép sửa chính mình
    if (req.session.user._id !== userId) {
      return res.status(403).send({ error: "Forbidden" });
    }

    const { first_name, last_name, location, occupation, description } =
      req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        first_name,
        last_name,
        location,
        occupation,
        description,
      },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(400).send({ error: "User not found" });
    }

    // Cập nhật session
    req.session.user.first_name = updatedUser.first_name;
    req.session.user.last_name = updatedUser.last_name;

    res.status(200).send({
      message: "Profile updated",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).send({ error: "Server error" });
  }
});

// ===============================
// UPDATE USER AVATAR
// ===============================
router.put("/user/:id/avatar", upload.single("avatar"), async (req, res) => {
  try {
    const userId = req.params.id;

    if (req.session.user._id !== userId) {
      return res.status(403).send({ error: "Forbidden" });
    }

    if (!req.file) {
      return res.status(400).send({ error: "No file uploaded" });
    }

    const avatarPath = "/uploads/avatars/" + req.file.filename;

    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarPath },
      { new: true }
    ).lean();

    // Update session
    req.session.user.avatar = avatarPath;

    res.status(200).send({
      message: "Avatar updated",
      avatar: avatarPath,
    });
  } catch (err) {
    res.status(500).send({ error: "Server error" });
  }
});

// ===============================
// CHANGE PASSWORD
// ===============================
router.put("/user/:id/password", async (req, res) => {
  try {
    // chỉ cho đổi mật khẩu của chính mình
    if (req.session.user._id !== req.params.id) {
      return res.status(403).send({ error: "Forbidden" });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).send({ error: "Missing password fields" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(400).send({ error: "User not found" });

    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) {
      return res.status(400).send({ error: "Old password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).send({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).send({ error: "Server error" });
  }
});
module.exports = router;
