const { validationResult } = require("express-validator");
const User = require("../models/user");
const Goal = require("../models/goal");
const Token = require("../models/token");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../utils");
const crypto = require("crypto");
require("dotenv").config();

const bcryptSalt = process.env.BCRYPT_SALT;
exports.createUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed," + errors.msg);
      error.data = errors.array();
      error.statusCode = 422;
      throw error;
    }
    const { email, username, password } = req.body;

    if (password.trim().length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    const hashedPassword = await bcrypt.hash(password.trim(), 12);
    const user = new User({
      username: username,
      email: email,
      password: hashedPassword,
      goals: [],
    });

    const createdUser = await user.save();
    await sendEmail(
      createdUser.email,
      "Welcome to the Goals App!",
      {
        name: createdUser.username,
        content:
          "Welcome to the Goals App! Open the app, add your goals and start reaching your goals!",
      },
      "./views/email-content.hbs"
    );
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

    res.status(200).json({
      token: token,
      user: {
        id: loadedUser._id.toString(),
        username: loadedUser.username,
        email: loadedUser.email,
      },
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.resetPasswordRequest = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("Email is not recognized!");
      error.statusCode = 404;
      throw error;
    }

    let token = await Token.findOne({ userId: user._id });

    if (token) {
      await token.deleteOne();
    }

    let resetToken = crypto.randomBytes(32).toString("hex");
    const hash = await bcrypt.hash(resetToken, 12);

    await new Token({ userId: user._id, token: hash }).save();

    const url = `${process.env.GOALS_URL}/change-password?token=${resetToken}&id=${user._id}`;

    await sendEmail(
      email,
      "Password reset request",
      {
        name: user.username,
        text: "You requested password reset.",
        action: "Please, click the link below to reset your password",
        link: url,
        link_text: "Reset password",
      },
      "./views/email-request.hbs"
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
      return res.render("error.hbs", {
        error: "Passwords are not the same! Try again",
      });
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
              {
                name: user.username,
                action: "You password has been reset.",
                text: "Please, use new password to login in the Goals App",
              },
              "./views/email-request-result.hbs"
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
exports.deleteAccountRequest = async (req, res, next) => {
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

    const url = `${process.env.GOALS_URL}/delete-account?token=${resetToken}&id=${user._id}`;

    await sendEmail(
      email,
      "Account delete request",
      {
        name: user.username,
        text: "You requested to delete your account.",
        action: "Please, click the link below to delete your account",
        link: url,
        link_text: "Delete account",
      },
      "./views/email-request.hbs"
    );

    res
      .status(200)
      .json({ message: "Check your email and follow the instructions!" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
exports.deleteAccount = async (req, res, next) => {
  try {
    const { token, id } = req.query;
    res.render("delete-account", { token: token, userId: id });
  } catch (err) {
    next(err);
  }
};
exports.deleteUserAccount = async (req, res, next) => {
  try {
    const { email, password, token, userId } = req.body;
    if (userId && email) {
      const deleteToken = await Token.findOne({ userId: userId });
      const user = await User.findOne({ _id: userId });
      if (!user) {
        throw new Error("User not found ");
      }
      if (deleteToken) {
        const isValid = await bcrypt.compare(token, deleteToken.token);
        if (isValid) {
          await deleteToken.deleteOne();
          if (user && user.email) {
            const isEqual = await bcrypt.compare(password, user.password);

            if (!isEqual) {
              const error = new Error("Password is not correct");
              error.statusCode = 404;
              throw error;
            }
            await User.findOneAndDelete({ _id: userId });
            await Goal.deleteMany({ author: userId });
            await sendEmail(
              email,
              "Sorry to see you go...",
              {
                name: user.username,
                content: "Sorry to see you go... . Come back soon...",
              },
              "./views/email-content.hbs"
            );
            res.status(200).json({ message: "Account has been deleted!" });
          } else {
            throw new Error("User is not recognized!");
          }
        } else {
          throw new Error("Invalid or expired password reset token");
        }
      } else {
        throw new Error("Invalid or expired password reset token");
      }
    } else {
      throw new Error("Id or email not found ");
    }
  } catch (err) {
    next(err);
  }
};
exports.updateUsername = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, check entered data");
      error.data = errors.array();
      error.statusCode = 422;
      throw error;
    }
    const { username } = req.body;
    const userId = req.params?.userId;
    if (userId) {
      const user = await User.findOne({ _id: userId });
      if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
      }
      user.username = username;
      await user.save();

      res.status(200).json({ message: "Username updated" });
    } else {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const userId = req.params?.userId;
    if (userId && newPassword) {
      const user = await User.findOne({ _id: userId });

      if (user) {
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        if (user.email) {
          await User.updateOne(
            { _id: userId },
            { $set: { newPassword: hashedPassword } }
          );
          await sendEmail(
            user.email,
            "Password has been reset!",
            {
              name: user.username,
              action: "You password has been reset.",
              text: "Please, use new password to login in the Goals App",
            },
            "./views/email-request-result.hbs"
          );
        } else {
          const error = new Error("Email not found");
          error.statusCode = 404;
          throw error;
        }
      }
    } else {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ message: "Password updated" });
  } catch (err) {
    next(err);
  }
};
