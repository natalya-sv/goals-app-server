const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const goalSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    start_date: {
      type: Date,
      default: null,
    },
    end_date: {
      type: Date,
      default: null,
    },
    category: {
      type: Number,
      required: true,
    },
    status: {
      type: Number,
      required: true,
      default: 0,
    },
    type: {
      type: Number,
      required: true,
      default: 0,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    frequency: {
      type: Number,
      default: null,
    },
    reminders: [
      {
        type: Schema.Types.ObjectId,
        ref: "Reminder",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Goal", goalSchema);
