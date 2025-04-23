// services/authService.js
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function register(email, password) {
  const hashed = await bcrypt.hash(password, 10);
  return userModel.createUser(email, hashed);
}

async function login(email, password) {
  const user = userModel.getUser(email);
  if (!user || !user.password) return false;

  const match = await bcrypt.compare(password, user.password);
  return match ? user : false;
}

module.exports = {
  register,
  login,
};
