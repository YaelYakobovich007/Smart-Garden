/**
 * Authentication Controller
 *
 * Handles WebSocket messages related to authentication:
 * - REGISTER: create a new user after validating inputs
 * - LOGIN: email/password login
 * - LOGIN_GOOGLE: Google OAuth token login (creates user on first login)
 */
const authService = require('../services/authService');
const userModel = require('../models/userModel');
const { verifyGoogleToken } = require('../services/googleService');
const { isValidEmail, isValidPassword, isValidName, isValidLocation, isValidCountryAndCity } = require('../utils/validators');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { addUserSession } = require('../models/userSessions');

const authHandlers = {
  REGISTER: handleRegister,
  LOGIN: handleLogin,
  LOGIN_GOOGLE: handleGoogleLogin,
};

/**
 * Route incoming auth message to the relevant handler.
 * @param {Object} data - The parsed WebSocket message.
 * @param {import('ws')} ws - WebSocket connection to the client.
 */
async function handleAuthMessage(data, ws) {
  const handler = authHandlers[data.type];
  if (handler) {
    await handler(data, ws);
  } else {
    ws.send(JSON.stringify({ type: 'UNKNOWN_TYPE', reason: `Unknown message type: ${data.type}` }));
  }
}

/**
 * Handle user registration.
 * Validates email/password/name/location and creates the user.
 * @param {Object} data - { email, password, fullName, country, city }
 * @param {import('ws')} ws - WebSocket connection
 */
async function handleRegister(data, ws) {
  if (!data.email || !data.password) {
    return sendError(ws, 'REGISTER_FAIL', 'Email and password are required');
  }

  if (!isValidEmail((data.email || '').toLowerCase().trim())) {
    return sendError(ws, 'REGISTER_FAIL', 'Invalid email format');
  }

  if (!isValidPassword(data.password)) {
    return sendError(ws, 'REGISTER_FAIL', 'Password must be at least 8 characters with at least one letter and one number');
  }

  if (!data.fullName || !data.country || !data.city) {
    return sendError(ws, 'REGISTER_FAIL', 'Full name, country, and city are required');
  }

  if (!isValidName(data.fullName)) {
    return sendError(ws, 'REGISTER_FAIL', 'Invalid name format. Name should be 2-50 characters with letters, spaces, hyphens, and apostrophes only');
  }

  if (!isValidLocation(data.country, data.city)) {
    return sendError(ws, 'REGISTER_FAIL', 'Country and city are required');
  }

  if (!isValidCountryAndCity(data.country, data.city)) {
    return sendError(ws, 'REGISTER_FAIL', 'Invalid country or city');
  }

  try {
    const success = await authService.register(
      (data.email || '').toLowerCase().trim(),
      data.password,
      data.fullName.trim(),
      data.country.trim(),
      data.city.trim()
    );
    return sendSuccess(ws, success ? 'REGISTER_SUCCESS' : 'REGISTER_FAIL', {
      message: success ? 'User created' : 'Email already exists',
    });
  } catch (err) {
    console.log(`[AUTH] Error: Registration failed - ${err.message}`);
    return sendError(ws, 'REGISTER_FAIL', 'Internal server error');
  }
}

/**
 * Handle email/password login. On success stores the session.
 * @param {Object} data - { email, password }
 * @param {import('ws')} ws - WebSocket connection
 */
async function handleLogin(data, ws) {
  try {
    const user = await authService.login((data.email || '').toLowerCase().trim(), data.password);

    if (user) {
      addUserSession(ws, user.email);
      return sendSuccess(ws, 'LOGIN_SUCCESS', { userId: user.email });
    } else {
      return sendError(ws, 'LOGIN_FAIL', 'Invalid email or password');
    }
  } catch (err) {
    console.log(`[AUTH] Error: Login failed - ${err.message}`);
    return sendError(ws, 'LOGIN_FAIL', 'Something went wrong during login');
  }
}

/**
 * Handle Google OAuth login using an ID token. If user does not exist, create it.
 * @param {Object} data - { googleToken }
 * @param {import('ws')} ws - WebSocket connection
 */
async function handleGoogleLogin(data, ws) {
  if (!data.googleToken) {
    return sendError(ws, 'LOGIN_FAIL', 'Google token is required');
  }

  try {
    const userData = await verifyGoogleToken(data.googleToken);
    const normalizedEmail = (userData.email || '').toLowerCase().trim();
    let user = await userModel.getUser(normalizedEmail);

    if (!user) {
      await userModel.createUser(normalizedEmail, null); // No password needed for Google login
      user = await userModel.getUser(normalizedEmail);
    }

    addUserSession(ws, user.email);
    return sendSuccess(ws, 'LOGIN_SUCCESS', { userId: normalizedEmail, name: userData.name, });
  } catch (err) {
    console.log(`[AUTH] Error: Google login failed - ${err.message}`);
    return sendError(ws, 'LOGIN_FAIL', 'Google authentication failed');
  }
}

module.exports = {
  handleAuthMessage,
};
