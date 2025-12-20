const express = require("express");
const app = express();
const cors = require("cors");
const session = require("express-session");
const dbConnect = require("./db/dbConnect");
const UserRouter = require("./routes/UserRouter");
const PhotoRouter = require("./routes/PhotoRouter");
const NotificationRouter = require("./routes/NotificationRouter");

dbConnect();

// ==============================
// CORS CONFIG
// ==============================
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options(
  "*",
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// ==============================
// BODY PARSER
// ==============================
app.use(express.json());

// ==============================
// SERVE IMAGE FOLDER
// ==============================
app.use("/images", express.static("images"));
app.use("/uploads", express.static("uploads"));

// ==============================
// SESSION CONFIG  ⭐⭐⭐ SỬA Ở ĐÂY
// ==============================
app.use(
  session({
    secret: "photo-app-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax", // ⭐ BẮT BUỘC
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// ==============================
// LOGIN MIDDLEWARE
// ==============================
function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// ==============================
// ROUTES
// ==============================
app.use("/", UserRouter);
app.use("/", PhotoRouter);

app.use("/notifications", requireLogin, NotificationRouter); // ⭐ ĐÚNG VỊ TRÍ
app.use("/follow", requireLogin, require("./routes/FollowRouter"));

// ==============================
// API LẤY USER ĐANG LOGIN
// ==============================
app.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.json(null);
  }
  res.json(req.session.user);
});

// ==============================
// TEST API
// ==============================
app.get("/", (req, res) => {
  res.send({ message: "Hello from API" });
});

// ==============================
// START SERVER
// ==============================
app.listen(8081, () => {
  console.log("server listening on port 8081");
});
