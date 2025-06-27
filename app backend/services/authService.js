// services/authService.js
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

async function register(email, password, fullName, country, city) {
  const hashed = await bcrypt.hash(password, 10);
  const created = await userModel.createUser(email, hashed, fullName, country, city);
  if (!created) return false;
  // Return the user object after creation
  return await userModel.getUser(email);
}

async function login(email, password) {
  const user = await userModel.getUser(email);
  if (!user || !user.password) return false;

  const match = await bcrypt.compare(password, user.password);
  return match ? user : false;
}

module.exports = {
  register,
  login,
};
