const { validationResult } = require("express-validator");
const User = require("../models/user");
const Goal = require("../models/goal");
const Token = require("../models/token");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendEmail, generateFieldValidationErrorMessage } = require("../utils");
const crypto = require("crypto");
const {
  VALIDATION_FAILED,
  PASSWORD_LENGTH,
  WELCOME,
  WELCOME_CONTENT,
  USER_CREATED,
  USER_NOT_FOUND,
  PASSWORD_IS_INCORRECT,
  EMAIL_NOT_RECOGNIZED,
  PASSWORD_RESET,
  PASSWORD_RESET_TEXT,
  PASSWORD_RESET_ACTION,
  CHECK_EMAIL_TO_RESET,
  PASSWORDS_NOT_THE_SAME,
  PASSWORD_IS_RESET,
  PASSWORD_IS_RESET_ACTION,
  PASSWORD_IS_RESET_TEXT,
  EXPIRED_TOKEN,
  ACCOUNT_DELETE_REQUEST,
  ACCOUNT_DELETE_REQUEST_TEXT,
  ACCOUNT_DELETE_REQUEST_ACTION,
  RESET_PASSWORD_LINK_TEXT,
  DELETE_ACCOUNT_LINK_TEXT,
  CHECK_EMAIL_FOLLOW_INSTRUCTIONS,
  SORRY_TO_SEE_YOU_GO,
  SORRY_TO_SEE_YOU_GO_CONTENT,
  ACCOUNT_DELETED,
  ID_OR_EMAIL_NOT_FOUND,
  USERNAME_UPDATED,
  EMAIL_NOT_FOUND,
  PASSWORD_UPDATED,
  USER_NOT_RECOGNIZED,
} = require("../constants");
require("dotenv").config();

const bcryptSalt = process.env.BCRYPT_SALT;
exports.createUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error(VALIDATION_FAILED);
      error.statusCode = 422;
      error.message = generateFieldValidationErrorMessage(errors.errors);
      throw error;
    }
    const { email, username, password } = req.body;

    if (password.trim().length < 6) {
      throw new Error(PASSWORD_LENGTH);
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
      WELCOME,
      {
        name: createdUser.username,
        content: WELCOME_CONTENT,
      },
      "./views/email-content.hbs"
    );
    res.status(201).json({ message: USER_CREATED, user: createdUser });
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
      const error = new Error(USER_NOT_FOUND);
      error.statusCode = 404;
      throw error;
    }
    loadedUser = user;
    const isEqual = await bcrypt.compare(password, user.password);

    if (!isEqual) {
      const error = new Error(PASSWORD_IS_INCORRECT);
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
      const error = new Error(EMAIL_NOT_RECOGNIZED);
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
      PASSWORD_RESET,
      {
        name: user.username,
        text: PASSWORD_RESET_TEXT,
        action: PASSWORD_RESET_ACTION,
        link: url,
        link_text: RESET_PASSWORD_LINK_TEXT,
      },
      "./views/email-request.hbs"
    );

    res.status(200).json({ message: CHECK_EMAIL_TO_RESET });
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
        error: PASSWORDS_NOT_THE_SAME,
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
              PASSWORD_IS_RESET,
              {
                name: user.username,
                action: PASSWORD_IS_RESET_ACTION,
                text: PASSWORD_IS_RESET_TEXT,
              },
              "./views/email-request-result.hbs"
            );
          }
        } else {
          throw new Error(EXPIRED_TOKEN);
        }
      } else {
        throw new Error(EXPIRED_TOKEN);
      }
    }

    res.status(200).json({ message: PASSWORD_IS_RESET });
  } catch (err) {
    next(err);
  }
};
exports.deleteAccountRequest = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error(USER_NOT_FOUND);
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
      ACCOUNT_DELETE_REQUEST,
      {
        name: user.username,
        text: ACCOUNT_DELETE_REQUEST_TEXT,
        action: ACCOUNT_DELETE_REQUEST_ACTION,
        link: url,
        link_text: DELETE_ACCOUNT_LINK_TEXT,
      },
      "./views/email-request.hbs"
    );

    res.status(200).json({ message: CHECK_EMAIL_FOLLOW_INSTRUCTIONS });
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
        throw new Error(USER_NOT_FOUND);
      }
      if (deleteToken) {
        const isValid = await bcrypt.compare(token, deleteToken.token);
        if (isValid) {
          await deleteToken.deleteOne();
          if (user && user.email) {
            const isEqual = await bcrypt.compare(password, user.password);

            if (!isEqual) {
              const error = new Error(PASSWORD_IS_INCORRECT);
              error.statusCode = 404;
              throw error;
            }
            await User.findOneAndDelete({ _id: userId });
            await Goal.deleteMany({ author: userId });
            await sendEmail(
              email,
              SORRY_TO_SEE_YOU_GO,
              {
                name: user.username,
                content: SORRY_TO_SEE_YOU_GO_CONTENT,
              },
              "./views/email-content.hbs"
            );
            res.status(200).json({ message: ACCOUNT_DELETED });
          } else {
            throw new Error(USER_NOT_RECOGNIZED);
          }
        } else {
          throw new Error(EXPIRED_TOKEN);
        }
      } else {
        throw new Error(EXPIRED_TOKEN);
      }
    } else {
      throw new Error(ID_OR_EMAIL_NOT_FOUND);
    }
  } catch (err) {
    next(err);
  }
};
exports.updateUsername = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error(VALIDATION_FAILED);
      error.data = errors.array();
      error.statusCode = 422;
      throw error;
    }
    const { username } = req.body;
    const userId = req.params?.userId;
    if (userId) {
      const user = await User.findOne({ _id: userId });
      if (!user) {
        const error = new Error(USER_NOT_FOUND);
        error.statusCode = 404;
        throw error;
      }
      user.username = username;
      await user.save();

      res.status(200).json({ message: USERNAME_UPDATED });
    } else {
      const error = new Error(USER_NOT_FOUND);
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
            PASSWORD_IS_RESET,
            {
              name: user.username,
              action: PASSWORD_IS_RESET_ACTION,
              text: PASSWORD_IS_RESET_TEXT,
            },
            "./views/email-request-result.hbs"
          );
        } else {
          const error = new Error(EMAIL_NOT_FOUND);
          error.statusCode = 404;
          throw error;
        }
      }
    } else {
      const error = new Error(USER_NOT_FOUND);
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ message: PASSWORD_UPDATED });
  } catch (err) {
    next(err);
  }
};
