/**
 * Auth Service
 *
 * Wraps user registration and login with hashing and normalization.
 */
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

/** Register user, returning the created user object or false if exists */
async function register(email, password, fullName, country, city) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  const hashed = await bcrypt.hash(password, 10);
  const created = await userModel.createUser(normalizedEmail, hashed, fullName, country, city);
  if (!created) return false;
  return await userModel.getUser(normalizedEmail);
}

/** Validate credentials and return user or false */
async function login(email, password) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  const user = await userModel.getUser(normalizedEmail);
  if (!user || !user.password) return false;

  const match = await bcrypt.compare(password, user.password);
  return match ? user : false;
}

module.exports = {
  register,
  login,
};
