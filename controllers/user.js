const { validationResult } = require("express-validator");
const User = require("../models/user");
const Token = require("../models/token");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils");
const crypto = require("crypto");
require("dotenv").config();

const bcryptSalt = process.env.BCRYPT_SALT;
exports.createUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, check entered data");
      error.data = errors.array();
      error.statusCode = 422;
      throw error;
    }
    const { email, username, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, bcryptSalt);
    const user = new User({
      username: username,
      email: email,
      password: hashedPassword,
      goals: [],
    });

    const createdUser = await user.save();
    res.status(201).json({ message: "User created", user: createdUser });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    let loadedUser;
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    loadedUser = user;
    const isEqual = await bcrypt.compare(password, user.password);

    if (!isEqual) {
      const error = new Error("Password is not correct");
      error.statusCode = 404;
      throw error;
    }

    const token = jwt.sign(
      {
        email: loadedUser.email,
        userId: loadedUser._id.toString(),
      },
      process.env.SECRET_JWT,
      { expiresIn: "10 days" }
    );
    res.status(200).json({ token: token, userId: loadedUser._id.toString() });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.sendResetPasswordEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    let token = await Token.findOne({ userId: user._id });

    if (token) {
      await token.deleteOne();
    }

    let resetToken = crypto.randomBytes(32).toString("hex");
    const hash = await bcrypt.hash(resetToken, Number(bcryptSalt));

    await new Token({ userId: user._id, token: hash }).save();

    const url = `${process.env.GOALS_URL}/change-password?token=${resetToken}&id=${user._id}`;

    await sendEmail(
      email,
      "Password reset request",
      { name: user.username, link: url },
      "./views/reset-password-request.hbs"
    );

    res.status(200).json({ message: "Check your email to reset password!" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
exports.changePassword = async (req, res, next) => {
  try {
    const { token, id } = req.query;
    res.render("change-password", { token: token, userId: id });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { password, confirm_password, token, userId } = req.body;

    if (password !== confirm_password) {
      throw new Error("Passwords are not the same!");
    }
    if (userId) {
      const passwordResetToken = await Token.findOne({ userId });
      if (passwordResetToken) {
        const isValid = await bcrypt.compare(token, passwordResetToken.token);
        if (isValid) {
          const hash = await bcrypt.hash(password, Number(bcryptSalt));
          await User.updateOne({ _id: userId }, { $set: { password: hash } });
          await passwordResetToken.deleteOne();
          const user = await User.findOne({ _id: userId });

          if (user && user.email) {
            await sendEmail(
              user.email,
              "Password has been reset!",
              { name: user.username },
              "./views/password-reset.hbs"
            );
          }
        } else {
          throw new Error("Invalid or expired password reset token");
        }
      } else {
        throw new Error("Invalid or expired password reset token");
      }
    }

    res.status(200).json({ message: "Password is reset!" });
  } catch (err) {
    next(err);
  }
};
