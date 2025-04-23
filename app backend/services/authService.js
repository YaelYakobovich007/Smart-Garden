// services/authService.js
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

async function register(email, password) {
  const hashed = await bcrypt.hash(password, 10);
  return userModel.createUser(email, hashed);
}

module.exports = {
  register
};
