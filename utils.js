const nodemailer = require("nodemailer");
const sendEmail = async (email, subject, text, url) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        // TODO: replace `user` and `pass` values from <https://forwardemail.net>
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `Goals App ${process.env.EMAIL_USER}`,
      to: email,
      subject: subject,
      text: text,
      html: `<p>Click <a href="http://${process.env.GOALS_URL}/${url}">here</a> to reset your password</p>`,
    });
    return true;
  } catch (err) {
    console.log(err, "email not sent");
    throw new Error(err);
  }
};
module.exports = sendEmail;
