const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    goals: [
      {
        type: Schema.Types.ObjectId,
        ref: "Goal",
      },
    ],
  },
  { timestamps: true }
);
module.exports = mongoose.model("User", userSchema);
