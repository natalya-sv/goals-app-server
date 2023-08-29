const express = require("express");
const goalRoutes = require("./routes/goal");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const userRoutes = require("./routes/user");
const remindeRoutes = require("./routes/reminder");
require("dotenv").config();

app.use(bodyParser.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
app.use(goalRoutes);
app.use(userRoutes);
app.use(remindeRoutes);

app.use((error, req, res, next) => {
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then((res) => {
    app.listen(8080);
  })
  .catch((err) => {
    console.log("db", process.env.MONGODB_URI);
    console.log("err db conncetion", err);
  });
