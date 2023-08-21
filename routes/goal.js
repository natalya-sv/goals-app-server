const express = require("express");
const router = express.Router();
const goalsController = require("../controllers/goal");
const { body } = require("express-validator");
const isAuth = require("../middleware/isAuth");

router.get("/goals", isAuth, goalsController.getGoals);

router.get("/goals/:goalId", isAuth, goalsController.getGoal);

router.put(
  "/goals/:goalId",
  [
    body("title").optional().trim().isLength({ min: 5 }),
    body("description").optional().trim().isLength({ min: 5 }),
  ],
  isAuth,
  goalsController.updateGoal
);

router.post(
  "/goals",
  [
    body("title").trim().isLength({ min: 5 }),
    body("description").trim().isLength({ min: 5 }),
  ],
  isAuth,
  goalsController.createGoal
);

router.delete("/goals/:goalId", isAuth, goalsController.deleteGoal);

module.exports = router;
