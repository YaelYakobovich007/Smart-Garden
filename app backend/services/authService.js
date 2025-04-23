// services/authService.js
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function register(email, password) {
  const hashed = await bcrypt.hash(password, 10);
  return userModel.createUser(email, hashed);
}

async function verifyGoogleToken(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  return {
    email: payload.email,
    name: payload.name,
  };
}

module.exports = {
  register,
  verifyGoogleToken
};
