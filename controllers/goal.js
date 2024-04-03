const { validationResult } = require("express-validator");
const Goal = require("../models/goal");
const User = require("../models/user");
const { GoalStatus } = require("../enums/goalStatus");
const { generateFieldValidationErrorMessage } = require("../utils");
const {
  GOAL_NOT_FOUND,
  NOT_AUTHORIZED,
  GOAL_FETCHED,
  GOALS_FETCHED,
  VALIDATION_FAILED,
  GOAL_CREATED,
  GOAL_UPDATED,
  GOAL_DELETED,
  GOAL_ACCOMPLISHED,
  GOAL_ABORTED,
  STATUS_NOT_CORRECT,
  DAY_ALREADY_SAVED,
} = require("../constants");

exports.getGoal = async (req, res, next) => {
  try {
    const goalId = req.params.goalId;
    const goal = await Goal.findById(goalId);
    if (!goal) {
      const error = new Error(GOAL_NOT_FOUND);
      error.statusCode = 404;
      throw error;
    }
    if (goal.author.toString() !== req.userId) {
      const error = new Error(NOT_AUTHORZED);
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      message: GOAL_FETCHED,
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
    res.status(200).json({ message: GOALS_FETCHED, goals: goals });
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
      const error = new Error(VALIDATION_FAILED);
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
          message: GOAL_CREATED,
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
      const error = new Error(VALIDATION_FAILED);
      error.statusCode = 422;
      error.message = generateFieldValidationErrorMessage(errors.errors);

      throw error;
    }
    const goalId = req.params.goalId;
    const { title, category, description, type, frequency } = req.body;

    const goal = await Goal.findById(goalId);

    if (!goal) {
      const error = new Error(GOAL_NOT_FOUND);
      error.statusCode = 404;
      throw error;
    }
    if (goal.author.toString() !== req.userId) {
      const error = new Error(NOT_AUTHORIZED);
      error.statusCode = 404;
      throw error;
    }
    goal.title = title ?? goal.title;
    goal.category = category ?? goal.category;
    goal.description = description ?? goal.description;
    goal.type = type ?? goal.type;
    goal.frequency = frequency ?? goal.frequency;
    const updatedGoal = await goal.save();

    res.status(200).json({ message: GOAL_UPDATED, goal: updatedGoal });
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
      const error = new Error(GOAL_NOT_FOUND);
      error.statusCode = 404;
      throw error;
    }
    if (goal.author.toString() !== req.userId) {
      const error = new Error(NOT_AUTHORIZED);
      error.statusCode = 404;
      throw error;
    }
    await Goal.findByIdAndRemove(goalId);

    const user = await User.findById(userId);
    user.goals.pull(goalId);
    await user.save();

    res.status(200).json({ message: GOAL_DELETED, goal: goal });
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
      const error = new Error(GOAL_NOT_FOUND);
      error.statusCode = 404;
      throw error;
    }
    if (goal.author.toString() !== req.userId) {
      const error = new Error(NOT_AUTHORIZED);
      error.statusCode = 404;
      throw error;
    }
    if (status === GoalStatus.IN_PROGRESS && goal.start_date === null) {
      goal.start_date = new Date().toISOString();

      goal.status = status ?? goal.status;

      const updatedGoal = await goal.save();

      res.status(200).json({ message: GOAL_UPDATED, goal: updatedGoal });
    } else if (
      status === GoalStatus.PAUSED &&
      goal.status === GoalStatus.IN_PROGRESS
    ) {
      goal.status = status;
      goal.start_date = null;
      const updatedGoal = await goal.save();

      res.status(200).json({ message: GOAL_UPDATED, goal: updatedGoal });
    } else if (
      (goal.status = GoalStatus.PAUSED && status === GoalStatus.IN_PROGRESS)
    ) {
      goal.status = status;
      goal.events = [];
      goal.start_date = new Date();
      const updatedGoal = await goal.save();

      res.status(200).json({ message: GOAL_UPDATED, goal: updatedGoal });
    } else if (status === GoalStatus.ACCOMPLISHED) {
      goal.end_date = new Date();
      goal.status = status;
      const updatedGoal = await goal.save();

      res.status(200).json({ message: GOAL_ACCOMPLISHED, goal: updatedGoal });
    } else if (status === GoalStatus.ABORTED) {
      goal.status = GoalStatus.NOT_STARTED;
      goal.start_date = null;
      goal.events = [];
      const updatedGoal = await goal.save();

      res.status(200).json({ message: GOAL_ABORTED, goal: updatedGoal });
    } else {
      throw new Error(STATUS_NOT_CORRECT);
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
    const { date } = req.body;

    if (!goal) {
      const error = new Error(GOAL_NOT_FOUND);
      error.statusCode = 404;
      throw error;
    }
    if (goal.author.toString() !== req.userId) {
      const error = new Error(NOT_AUTHORIZED);
      error.statusCode = 404;
      throw error;
    }

    const today = date ?? new Date();
    if (goal.events.includes(today)) {
      throw new Error(DAY_ALREADY_SAVED);
    }

    goal.events.push(today);
    if (goal.status === GoalStatus.STARTED) {
      goal.status = GoalStatus.IN_PROGRESS;
    }
    await goal.save();
    res.status(201).json({ message: GOAL_UPDATED, goal: goal });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
