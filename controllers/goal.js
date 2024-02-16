const { validationResult } = require("express-validator");
const Goal = require("../models/goal");
const User = require("../models/user");
const { GoalStatus } = require("../enums/goalStatus");
const {
  generateFieldValidationErrorMessage,
  getFormattedDay,
} = require("../utils");

exports.getGoal = async (req, res, next) => {
  try {
    const goalId = req.params.goalId;
    const goal = await Goal.findById(goalId);
    if (!goal) {
      const error = new Error("Goal not found");
      error.statusCode = 404;
      throw error;
    }
    if (goal.author.toString() !== req.userId) {
      const error = new Error("Not authorized");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      message: "Goal fetched",
      goal: goal,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getGoals = async (req, res, next) => {
  try {
    const goals = await Goal.find({ author: req.userId });
    res.status(200).json({ message: "Goals fetched", goals: goals });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createGoal = async (req, res, next) => {
  try {
    const { title, category, description, type } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, check entered data");
      error.statusCode = 422;
      error.message = generateFieldValidationErrorMessage(errors.errors);

      throw error;
    }

    const newGoal = new Goal({
      title: title,
      category: category,
      description: description,
      status: GoalStatus.NOT_STARTED,
      start_date: null,
      end_date: null,
      type: type,
      author: req.userId,
      frequency: null,
      push_token: null,
      reminder: null,
      events: [],
    });

    const result = await newGoal.save();

    if (result) {
      const user = await User.findById(req.userId);
      if (user) {
        user.goals.push(newGoal);
        await user.save();
        res.status(201).json({
          message: "Goal created!",
          goal: newGoal,
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

exports.updateGoal = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, check entered data");
      error.statusCode = 422;
      error.message = generateFieldValidationErrorMessage(errors.errors);

      throw error;
    }
    const goalId = req.params.goalId;
    const { title, category, description, type, frequency } = req.body;

    const goal = await Goal.findById(goalId);

    if (!goal) {
      const error = new Error("Goal not found");
      error.statusCode = 404;
      throw error;
    }
    if (goal.author.toString() !== req.userId) {
      const error = new Error("Not authorized");
      error.statusCode = 404;
      throw error;
    }
    goal.title = title ?? goal.title;
    goal.category = category ?? goal.category;
    goal.description = description ?? goal.description;
    goal.type = type ?? goal.type;
    goal.frequency = frequency ?? goal.frequency;
    const updatedGoal = await goal.save();

    res.status(200).json({ message: "Goal updated!", goal: updatedGoal });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteGoal = async (req, res, next) => {
  try {
    const goalId = req.params.goalId;
    const goal = await Goal.findById(goalId);
    const userId = goal.author;

    if (!goal) {
      const error = new Error("Goal not found");
      error.statusCode = 404;
      throw error;
    }
    if (goal.author.toString() !== req.userId) {
      const error = new Error("Not authorized");
      error.statusCode = 404;
      throw error;
    }
    await Goal.findByIdAndRemove(goalId);

    const user = await User.findById(userId);
    user.goals.pull(goalId);
    await user.save();

    res.status(200).json({ message: "Goal deleted!", goal: goal });
  } catch (err) {
    console.log("error deleting goal by id:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.startGoal = async (req, res, next) => {
  try {
    const goalId = req.params.goalId;
    const { status } = req.body;

    const goal = await Goal.findById(goalId);

    if (!goal) {
      const error = new Error("Goal not found");
      error.statusCode = 404;
      throw error;
    }
    if (goal.author.toString() !== req.userId) {
      const error = new Error("Not authorized");
      error.statusCode = 404;
      throw error;
    }

    if (status === "started" && goal.start_date === null) {
      goal.start_date = new Date().toISOString();

      goal.status = status ?? goal.status;

      const updatedGoal = await goal.save();

      res
        .status(200)
        .json({ message: "Goal start date saved!", goal: updatedGoal });
    } else {
      throw new Error("Status not correct");
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.addEventGoal = async (req, res, next) => {
  try {
    const goalId = req.params.goalId;
    const goal = await Goal.findById(goalId);

    if (!goal) {
      const error = new Error("Goal not found");
      error.statusCode = 404;
      throw error;
    }
    if (goal.author.toString() !== req.userId) {
      const error = new Error("Not authorized");
      error.statusCode = 404;
      throw error;
    }

    const today = new Date();
    const formattedToday = getFormattedDay(today);
    if (goal.events.includes(formattedToday)) {
      throw new Error("Day already saved");
    }

    goal.events.push(formattedToday);
    if (goal.status === "started") {
      goal.status = "in progress";
    }
    await goal.save();
    res.status(201).json({ message: "Goal event added!", goal: goal });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
exports.updateStatusGoal = async (req, res, next) => {
  try {
    const goalId = req.params.goalId;
    const { status } = req.body;

    const goal = await Goal.findById(goalId);

    if (!goal) {
      const error = new Error("Goal not found");
      error.statusCode = 404;
      throw error;
    }
    if (goal.author.toString() !== req.userId) {
      const error = new Error("Not authorized");
      error.statusCode = 404;
      throw error;
    }

    if (status === 1) {
      goal.start_date = new Date().toISOString();
    } else if (status === 4) {
      goal.end_date = new Date().toISOString();
    }
    goal.status = status ?? goal.status;

    const updatedGoal = await goal.save();

    res
      .status(200)
      .json({ message: "Goal start date saved!", updatedGoal: updatedGoal });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
