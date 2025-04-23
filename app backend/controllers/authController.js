const authService = require('../services/authService');
const userModel = require('../models/userModel');

async function handleAuthMessage(data, ws) {
  if (data.type === 'REGISTER') {
    if (!data.email || !data.password) {
      sendError(ws, 'REGISTER_FAIL', 'Email and password are required');
      return;
    }

    if (!isValidEmail(data.email)) {
      sendError(ws, 'REGISTER_FAIL', 'Invalid email format');
      return;
    }

    if (data.password.length < 6) {
      sendError(ws, 'REGISTER_FAIL', 'Password must be at least 6 characters long');
      return;
    }

    try {
      const success = await authService.register(data.email, data.password);
      sendSuccess(ws, success ? 'REGISTER_SUCCESS' : 'REGISTER_FAIL', {
        message: success ? 'User created' : 'Email already exists',
      });
    } catch (err) {
      console.error('Registration failed:', err);
      sendError(ws, 'REGISTER_FAIL', 'Internal server error');
    }
  }

  if (data.type === 'LOGIN_GOOGLE') {
    if (!data.googleToken) {
      sendError(ws, 'LOGIN_FAIL', 'Google token is required');
      return;
    }

    try {
      const userData = await verifyGoogleToken(data.googleToken);
      let user = await userModel.getUser(userData.email);

      if (!user) {
        await userModel.createUser(userData.email, null); // No password needed for Google login
        user = await userModel.getUser(userData.email);
      }

      sendSuccess(ws, 'LOGIN_SUCCESS', {
        userId: userData.email,
        name: userData.name,
      });
    } catch (err) {
      console.error('Google login failed:', err);
      sendError(ws, 'LOGIN_FAIL', 'Google authentication failed');
    }
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sendSuccess(ws, type, payload) {
  ws.send(JSON.stringify({ type, ...payload }));
}

function sendError(ws, type, reason) {
  ws.send(JSON.stringify({ type, reason }));
}

module.exports = {
  handleAuthMessage,
};