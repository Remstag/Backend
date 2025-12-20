const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // người nhận
    },

    actor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // người gây hành động
    },

    type: {
      type: String,
      enum: ["follow", "comment"],
      required: true,
    },

    post_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photo",
      default: null,
    },

    is_read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: "created_at" },
  }
);

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
