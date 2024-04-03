const jwt = require("jsonwebtoken");
const { NOT_AUTHENTICATED } = require("../constants");
require("dotenv").config();

//checks if user is authorized
module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    const error = new Error(NOT_AUTHENTICATED);
    error.statusCode = 401;
    throw error;
  }
  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.SECRET_JWT);
  } catch (err) {
    err.statusCode = 500;
    throw err;
  }
  if (!decodedToken) {
    const error = new Error(NOT_AUTHENTICATED);
    error.statusCode = 401;
    throw error;
  }
  req.userId = decodedToken.userId;
  next();
};
