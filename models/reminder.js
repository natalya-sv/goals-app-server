const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reminderSchema = new Schema(
  {
    type: {
      type: Number,
      required: true,
    },
    weekday: {
      type: Number,
    },
    time: {
      type: { hour: Number, minute: Number },
      required: true,
    },
    goal: {
      type: Schema.Types.ObjectId,
      ref: "Goal",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reminder", reminderSchema);
