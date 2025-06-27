const authService = require('../services/authService');
const userModel = require('../models/userModel');
const { verifyGoogleToken } = require('../services/googleService'); 
const { isValidEmail } = require('../utils/validators');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { addUserSession } = require('../models/userSessions');

const authHandlers = {
  REGISTER: handleRegister,
  LOGIN: handleLogin,
  LOGIN_GOOGLE: handleGoogleLogin,
};

async function handleAuthMessage(data, ws) {
  const handler = authHandlers[data.type];
  if (handler) {
    await handler(data, ws);
  } else {
    ws.send(JSON.stringify({ type: 'UNKNOWN_TYPE', reason: `Unknown message type: ${data.type}` }));
  }
}

async function handleRegister(data, ws) {
  if (!data.email || !data.password) {
    return sendError(ws, 'REGISTER_FAIL', 'Email and password are required');
  }

  if (!isValidEmail(data.email)) {
    return sendError(ws, 'REGISTER_FAIL', 'Invalid email format');
  }

  if (data.password.length < 6) {
    return sendError(ws, 'REGISTER_FAIL', 'Password must be at least 6 characters long');
  }

  if (!data.fullName || !data.country || !data.city) {
    return sendError(ws, 'REGISTER_FAIL', 'Full name, country, and city are required');
  }

  try {
    const success = await authService.register(
      data.email,
      data.password,
      data.fullName,
      data.country,
      data.city
    );
    return sendSuccess(ws, success ? 'REGISTER_SUCCESS' : 'REGISTER_FAIL', {
      message: success ? 'User created' : 'Email already exists',
    });
  } catch (err) {
    console.error('Registration failed:', err);
    return sendError(ws, 'REGISTER_FAIL', 'Internal server error');
  }
}

async function handleLogin(data, ws) {
  try {
    const user = await authService.login(data.email, data.password);

    if (user) {
      addUserSession(ws, user.email);
      return sendSuccess(ws, 'LOGIN_SUCCESS', { userId: user.email });
    } else {
      return sendError(ws, 'LOGIN_FAIL', 'Invalid email or password');
    }
  } catch (err) {
    console.error('LOGIN error:', err);
    return sendError(ws, 'LOGIN_FAIL', 'Something went wrong during login');
  }
}

async function handleGoogleLogin(data, ws) {
  if (!data.googleToken) {
    return sendError(ws, 'LOGIN_FAIL', 'Google token is required');
  }

  try {
    const userData = await verifyGoogleToken(data.googleToken);
    let user = await userModel.getUser(userData.email);

    if (!user) {
      await userModel.createUser(userData.email, null); // No password needed for Google login
      user = await userModel.getUser(userData.email);
    }

    addUserSession(ws, user.email);
    return sendSuccess(ws, 'LOGIN_SUCCESS', {userId: userData.email, name: userData.name,});
  } catch (err) {
    console.error('Google login failed:', err);
    return sendError(ws, 'LOGIN_FAIL', 'Google authentication failed');
  }
}

module.exports = {
  handleAuthMessage,
};
