const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  comment: { type: String, required: true },
  date_time: { type: Date, default: Date.now },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const photoSchema = new mongoose.Schema({
  file_name: { type: String, required: true },
  date_time: { type: Date, default: Date.now },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: { type: String, default: "" }, // ⬅️ Thêm mô tả ảnh
  comments: [commentSchema],
});

module.exports =
  mongoose.models.Photos || mongoose.model("Photos", photoSchema);
