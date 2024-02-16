const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const hbs = require("express-hbs");
const sendEmail = async (email, subject, payload, template) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    if (payload && template) {
      const source = fs.readFileSync(path.join(__dirname, template), "utf8");
      const compiledTemplate = hbs.compile(source);

      await transporter.sendMail({
        from: `Goals App ${process.env.EMAIL_USER}`,
        to: email,
        subject: subject,
        html: compiledTemplate(payload),
      });
      return true;
    }
  } catch (err) {
    console.log(err, "email not sent");
    throw new Error(err);
  }
};

const generateFieldValidationErrorMessage = (errorsArr) => {
  let errorMessage = "";
  if (errorsArr.length > 0) {
    errorMessage;
    for (let i = 0; i < errorsArr.length; i++) {
      errorMessage += `${errorsArr[i].msg} in ${errorsArr[i].path}. `;
    }
  } else {
    errorMessage = "Error occured!Check your input";
  }
  return errorMessage;
};

const getFormattedDay = (date) => {
  if (date) {
    const formattedToday = `${date.getDate()}-${
      date.getMonth() + 1
    }-${date.getFullYear()}`;
    return formattedToday;
  }
  return null;
};
module.exports = {
  sendEmail,
  generateFieldValidationErrorMessage,
  getFormattedDay,
};
