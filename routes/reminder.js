const express = require("express");
const router = express.Router();
const reminderController = require("../controllers/reminder");
const { body } = require("express-validator");
const isAuth = require("../middleware/isAuth");

router.get("/reminder/:reminderId", isAuth, reminderController.getReminder);
router.post("/reminder/:goalId", isAuth, reminderController.createReminder);
router.put("/reminder/:reminderId", isAuth, reminderController.updateReminder);
router.delete(
  "/reminder/:reminderId",
  isAuth,
  reminderController.deleteReminder
);
module.exports = router;
