const { validationResult } = require("express-validator");
const Reminder = require("../models/reminder");
const reminder = require("../models/reminder");
const User = require("../models/user");
const Goal = require("../models/goal");
const { GoalReminder } = require("../enums/reminder");

exports.getReminder = async (req, res, next) => {
  const reminderId = req.params.reminderId;

  try {
    const reminder = await Reminder.findById(reminderId);
    if (!reminderId) {
      const error = new Error("Schedule not found");
      error.statusCode = 404;
      throw error;
    }
    if (reminder.author.toString() !== req.userId) {
      const error = new Error("Not authorized");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      message: "Reminder fetched",
      reminder: reminder,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createReminder = async (req, res, next) => {
  try {
    const { type, weekday, time } = req.body;
    const goalId = req.params.goalId;
    //   const errors = validationResult(req);
    //   if (!errors.isEmpty()) {
    //     const error = new Error("Validation failed,check entered data");
    //     error.statusCode = 422;
    //     throw error;
    //   }
    const newReminder = new Reminder({
      type: type,
      weekday: weekday,
      goal: goalId,
      time: time,
    });
    const result = await newReminder.save();

    if (result) {
      const goal = await Goal.findById(goalId);

      if (goal) {
        goal.reminders.push(newReminder);
        await goal.save();
        res.status(201).json({
          message: "Reminder created!",
          newReminder: newReminder,
        });
      }
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
exports.updateReminder = async (req, res, next) => {
  try {
    //   const errors = validationResult(req);
    //   if (!errors.isEmpty()) {
    //     const error = new Error("Validation failed, check entered data");
    //     error.statusCode = 422;
    //     throw error;
    //   }
    const reminderId = req.params.reminderId;
    const { type, weekday, time } = req.body;

    const reminder = await Reminder.findById(reminderId);

    if (!reminder) {
      const error = new Error("Reminder not found");
      error.statusCode = 404;
      throw error;
    }
    if (reminder.author.toString() !== req.userId) {
      const error = new Error("Not authorized");
      error.statusCode = 404;
      throw error;
    }
    reminder.type = type;
    reminder.weekday = weekday;
    reminder.time = time;

    const updatedReminder = await reminder.save();

    res
      .status(200)
      .json({ message: "Reminder updated!", updatedReminder: updatedReminder });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
exports.deleteReminder = async (req, res, next) => {
  try {
    const reminderId = req.params.reminderId;
    const reminder = await Reminder.findById(reminderId);

    if (!reminder) {
      const error = new Error("Reminder not found");
      error.statusCode = 404;
      throw error;
    }
    if (reminder.author.toString() !== req.userId) {
      const error = new Error("Not authorized");
      error.statusCode = 404;
      throw error;
    }
    await Reminder.findByIdAndRemove(reminderId);

    const goal = await Goal.findById(req.goalId);
    goal.reminders.pull(reminderId);
    await goal.save();

    res.status(200).json({ message: "Reminder deleted!" });
  } catch (err) {
    console.log("error deleting goal by id:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
