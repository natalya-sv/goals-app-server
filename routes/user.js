const express = require("express");
const router = express.Router();
const userController = require("../controllers/user");
const { body } = require("express-validator");
const User = require("../models/user");

router.post(
  "/signup",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter valid email")
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject("Email already exists");
          }
        });
      })
      .normalizeEmail(),
    body("password").trim().isLength({ min: 5 }),
    body("username").trim().not().isEmpty(),
  ],
  userController.createUser
);

router.post("/login", userController.login);
router.post("/reset-password-email", userController.sendResetPasswordEmail);
router.get("/change-password", userController.changePassword);
router.post("/reset-password", userController.resetPassword);

module.exports = router;
